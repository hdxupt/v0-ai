import "server-only"
import type { Submission, Task } from "@/lib/types"
import { resolveSubject } from "./prompts"
import type { AIGradePayload } from "./grade"
import type {
  CorrectionDetail,
  GradingResult,
  RubricDimension,
  BboxType,
} from "./schemas"
import {
  callQwenJSON,
  qwenBoxToPercent,
  type QwenMessage,
} from "./qwen"
import { segmentPage, type QuestionBlock, type BlockType } from "./segment"
import {
  cropRegionFromBuffer,
  localBoxToGlobal,
  bufferToDataUrl,
  fetchImageBuffer,
  type RegionPct,
} from "@/lib/image/crop"
import { pMapLimit } from "./grade"

/* ============================================================
 * 多阶段 VLM 批改编排
 *
 * Stage 1  分块：Qwen3-VL 把每页切成题块并分类（segment.ts）
 * Stage 2  分流批改：按题型走不同处理
 *           - math         裁剪出小图 → VLM 在小图上精确定位错误步骤
 *           - english_essay裁剪 → VLM 定位错误词
 *           - objective    裁剪 → VLM/直接判对错（定位需求低）
 *           - chinese_essay裁剪 → VLM 段落级点评（长文本，定位粗即可）
 *           每块产出的局部坐标统一换算回原图全局坐标
 * Stage 3  聚合：汇总所有错误 → 算总分/计数 → 一次文本调用产出评语+雷达
 *
 * 产出与旧链路完全相同的 AIGradePayload，前端无需任何改动。
 * 任一环节抛错，由上层 gradeSubmission 回退到旧 OCR+LLM 链路。
 * ============================================================ */

/** 每页最多处理的题块数，防止异常分块拖垮调用数 */
const MAX_BLOCKS_PER_PAGE = 12
/** 题块批改并发数 */
const BLOCK_CONCURRENCY = 4

interface RawIssue {
  type?: string
  question_text?: string
  process_analysis?: string
  correct_answer?: string
  score_delta?: number
  rubric_dimension?: string
  bbox_2d?: number[]
  confidence?: number
}

interface BlockGradeResult {
  issues: RawIssue[]
}

function normalizeBboxType(t: string | undefined): BboxType {
  switch (t) {
    case "error":
    case "partial":
    case "highlight":
    case "missing":
      return t
    default:
      return "error"
  }
}

function normalizeDimension(d: string | undefined): RubricDimension | undefined {
  switch (d) {
    case "basics":
    case "logic":
    case "knowledge":
    case "application":
    case "presentation":
      return d
    default:
      return undefined
  }
}

/* ----------------------- 各题型批改提示词 ----------------------- */

function blockGradePrompt(type: BlockType, subjectHint: string, answerCtx?: string): string {
  const COORD = `坐标说明：把这张【题块小图】看成 1000×1000 网格（左上角原点，x 向右，y 向下）。bbox_2d=[x1,y1,x2,y2] 是错误内容在这张小图里的位置，要紧贴出错的那一小块（一行算式 / 一个公式 / 一个错词），不要框整道题。`

  // 教师提供了标准答案/得分点时，作为权威参照注入——以教师标准为准
  const ANSWER_BLOCK = answerCtx
    ? `\n【教师标准答案与得分点（权威参照，严格据此判分）】\n${answerCtx}\n务必对照上述标准答案逐条核对，按关键得分点判断对错与扣分；与标准不一致即为错误。\n`
    : ""

  const COMMON_TAIL = `${ANSWER_BLOCK}
对每一处问题输出一个对象：
- "type": "error"(错) | "partial"(半对) | "highlight"(亮点) | "missing"(漏做)
- "question_text": 简要题干或学生原句（≤40字）
- "process_analysis": 精炼解析，一针见血指出错在哪、为何错（≤120字，不要长篇大论）
- "correct_answer": 正确做法/正确答案（可选）
- "score_delta": 该项扣/加分整数。error/partial/missing 给负数（如 -3），highlight 给 0
- "rubric_dimension": basics(计算基础)|logic(逻辑)|knowledge(知识)|application(应用)|presentation(书写) 之一
- "bbox_2d": [x1,y1,x2,y2] 错误位置（1000 网格，相对这张小图）
- "confidence": 0~1
${COORD}
严格只返回 JSON：{"issues":[ ... ]}，不要任何解释文字。`

  switch (type) {
    case "math":
      return `你是资深数学老师，正在批改这道数学题的学生作答（图为单题裁剪图）。
请逐步核对解题过程：找出计算错误、公式用错、跳步、逻辑漏洞、漏做的小问；也可标出做得好的关键步骤(highlight)。
${COMMON_TAIL}`
    case "english_essay":
      return `你是资深英语老师，正在批改这段英语写作（图为裁剪图）。
请定位到【具体出错的单词或短语】：拼写、语法、时态、搭配、用词不当；也可标出亮点表达(highlight)。
${COMMON_TAIL}`
    case "chinese_essay":
      return `你是资深语文老师，正在批改这段中文写作（图为裁剪图）。
请按句/段定位问题：错别字、病句、标点、表达与结构问题；也可标出精彩句子(highlight)。定位到句即可。
${COMMON_TAIL}`
    case "objective":
    default:
      return `你是资深${subjectHint}老师，正在批改这部分客观题（填空/选择/判断，图为裁剪图）。
请判断每小题对错，找出做错的题并给出正确答案；定位到该小题所在行即可。
${COMMON_TAIL}`
  }
}

/** 对单个题块批改，返回换算回全局坐标的 CorrectionDetail 片段（不含全局 id）。 */
async function gradeBlock(
  block: QuestionBlock,
  pageBuffer: Buffer,
  subjectHint: string,
  answerCtx?: string,
): Promise<Omit<CorrectionDetail, "id">[]> {
  // 裁剪出题块小图（数学/作文需精确定位，裁剪后定位更准）
  // 复用已下载的整页 Buffer，避免对同一页重复下载
  const cropped = await cropRegionFromBuffer(pageBuffer, block.region, 3)
  if (!cropped) return []

  const prompt = blockGradePrompt(block.type, subjectHint, answerCtx)
  const messages: QwenMessage[] = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: cropped.dataUrl } },
        { type: "text", text: prompt },
      ],
    },
  ]

  let result: BlockGradeResult
  try {
    result = await callQwenJSON<BlockGradeResult>(messages, {
      temperature: 0,
      maxTokens: 3200,
    })
  } catch (e: any) {
    console.error("[v0] gradeBlock failed, block", block.index, e?.message)
    return []
  }

  const issues = Array.isArray(result?.issues) ? result.issues : []
  const out: Omit<CorrectionDetail, "id">[] = []

  // 题型分类：客观题（填空/选择/判断）→ 标签标注；其余 → 波浪下划线
  const questionType: "objective" | "subjective" = block.type === "objective" ? "objective" : "subjective"

  for (const it of issues) {
    // 局部坐标（相对小图，1000网格→局部百分比）
    let globalBox: RegionPct | null = null
    let boxSource: "ocr" | "vlm" = "vlm"
    const localPct = qwenBoxToPercent(it.bbox_2d ?? [])
    if (localPct) {
      // 换算回原图全局百分比
      globalBox = localBoxToGlobal(localPct, cropped.region)
    } else {
      // VLM 没给框：退化到整个题块区域
      globalBox = block.region
    }

    out.push({
      type: normalizeBboxType(it.type),
      question_text: (it.question_text ?? "").slice(0, 200) || "（未提供题干）",
      process_analysis: (it.process_analysis ?? "").slice(0, 600) || "（未提供解析）",
      correct_answer: it.correct_answer ? it.correct_answer.slice(0, 400) : undefined,
      score_delta:
        typeof it.score_delta === "number" ? Math.round(it.score_delta) : undefined,
      rubric_dimension: normalizeDimension(it.rubric_dimension),
      line_indexes: [1], // 占位：新链路不依赖 OCR 行号，bbox 直接给
      bounding_box: globalBox,
      box_source: boxSource,
      question_type: questionType,
      page_index: block.page_index,
      confidence: typeof it.confidence === "number" ? Math.max(0, Math.min(1, it.confidence)) : 0.8,
    })
  }
  return out
}

/* ----------------------- 聚合：评语 + 雷达 ----------------------- */

interface AggregateResult {
  teacher_comment: string
  radar_analysis: GradingResult["radar_analysis"]
  weak_points: string[]
}

async function aggregate(
  studentName: string | undefined,
  subjectHint: string,
  details: Omit<CorrectionDetail, "id">[],
  totalScore: number,
): Promise<AggregateResult> {
  // 把错误清单压缩成文本喂给聚合模型
  const issueLines = details
    .map((d, i) => {
      const tag =
        d.type === "highlight" ? "亮点" : d.type === "missing" ? "漏做" : d.type === "partial" ? "半对" : "错误"
      return `${i + 1}. [${tag}|${d.rubric_dimension ?? "-"}] ${d.question_text} —— ${d.process_analysis}`
    })
    .join("\n")

  const name = studentName || "该"
  const prompt = `你是资深${subjectHint}老师。下面是某学生本次作业的逐条批改记录（已含错误/亮点/扣分维度），总分 ${totalScore}/100。请据此产出整体学情。

批改记录：
${issueLines || "（本次未发现明显问题）"}

请严格只返回如下 JSON：
{
  "teacher_comment": "整体评语，单一字符串不含换行，严格四段式：(1)以「${name}同学，」开头一句温暖肯定；(2)以「但目前存在 N 个核心问题需要重点突破：」起头，用「第一，…。」「第二，…。」「第三，…。」列2~3条核心问题；(3)以「建议接下来这样做：」起头给1~3条可执行建议；(4)以一句鼓励收尾。禁止省略第一/第二/第三序号词。",
  "radar_analysis": {"basics":0-100,"logic":0-100,"knowledge":0-100,"application":0-100,"presentation":0-100},
  "weak_points": ["1~3个核心薄弱知识点短语，每个2~30字"]
}`

  try {
    const r = await callQwenJSON<{
      teacher_comment?: string
      radar_analysis?: Partial<GradingResult["radar_analysis"]>
      weak_points?: string[]
    }>([{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 1200 })

    const clampDim = (v: unknown) =>
      typeof v === "number" ? Math.max(0, Math.min(100, Math.round(v))) : 70
    return {
      teacher_comment:
        (r.teacher_comment ?? "").trim() ||
        `${name}同学，本次作业已完成批改。但目前存在一些需要重点突破的问题：请重点订正标注出的错误。建议接下来这样做：逐条订正错题并整理到错题本。相信下次作业一定会有明显进步！`,
      radar_analysis: {
        basics: clampDim(r.radar_analysis?.basics),
        logic: clampDim(r.radar_analysis?.logic),
        knowledge: clampDim(r.radar_analysis?.knowledge),
        application: clampDim(r.radar_analysis?.application),
        presentation: clampDim(r.radar_analysis?.presentation),
      },
      weak_points: Array.isArray(r.weak_points)
        ? r.weak_points.filter((s) => typeof s === "string").slice(0, 3)
        : [],
    }
  } catch (e: any) {
    console.error("[v0] aggregate failed:", e?.message)
    // 聚合失败给一个保底评语，不让整份批改失败
    return {
      teacher_comment: `${name}同学，本次作业已完成批改，请重点订正标注出的错误，逐条整理到错题本。相信下次一定会有进步！`,
      radar_analysis: { basics: 70, logic: 70, knowledge: 70, application: 70, presentation: 70 },
      weak_points: [],
    }
  }
}

/** 把教师上传的标准答案图片转写成文本（一次调用，供全部题块复用，避免每块重复传图）。 */
async function transcribeAnswerImages(urls: string[]): Promise<string> {
  try {
    const buffers = await Promise.all(urls.slice(0, 4).map((u) => fetchImageBuffer(u)))
    const images = await Promise.all(buffers.map((b) => bufferToDataUrl(b)))
    const r = await callQwenJSON<{ text?: string }>(
      [
        {
          role: "user",
          content: [
            ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
            {
              type: "text",
              text: '把图中标准答案完整转写为文本，按题号组织。严格只返回 JSON：{"text":"..."}',
            },
          ],
        },
      ],
      { temperature: 0, maxTokens: 2000 },
    )
    return (r?.text ?? "").trim()
  } catch (e: any) {
    console.error("[v0] transcribeAnswerImages failed:", e?.message)
    return ""
  }
}

/** 组装注入批改 prompt 的标准答案上下文（文本 + 图片转写 + 关键得分点）。 */
async function buildAnswerContext(task: Task): Promise<string | undefined> {
  const parts: string[] = []
  const text = (task.answer_key_text ?? "").trim()
  if (text) parts.push(`标准答案：\n${text}`)

  const urls = task.answer_key_urls ?? []
  if (urls.length > 0) {
    const transcribed = await transcribeAnswerImages(urls)
    if (transcribed) parts.push(`标准答案（图片转写）：\n${transcribed}`)
  }

  const notes = (task.scoring_notes ?? "").trim()
  if (notes) parts.push(`关键得分点：\n${notes}`)

  const ctx = parts.join("\n\n").trim()
  return ctx.length > 0 ? ctx.slice(0, 4000) : undefined
}

/* ----------------------- 主编排 ----------------------- */

export async function gradeSubmissionWithVLM(
  submission: Submission,
  task: Task,
): Promise<AIGradePayload> {
  const subject = resolveSubject(task.subject)
  const subjectHint =
    subject === "math" ? "数学" : subject === "chinese" ? "语文" : subject === "english" ? "英语" : "学科"
  const imageUrls = (submission.image_urls ?? []).slice(0, 9)
  if (imageUrls.length === 0) throw new Error("学生未上传任何作业图片，无法批改")

  // 教师标准答案上下文（一次构建，供全部题块复用）
  const answerCtx = await buildAnswerContext(task)
  if (answerCtx) console.log("[v0] grade-vlm: using teacher answer key, len", answerCtx.length)

  /* ---------- Stage 1：逐页分块（多页并行，每页只下载一次 Buffer 复用） ---------- */
  const pages = await Promise.all(
    imageUrls.map(async (url, p) => {
      const buffer = await fetchImageBuffer(url)
      const dataUrl = await bufferToDataUrl(buffer)
      const blocks = (await segmentPage(dataUrl, p)).slice(0, MAX_BLOCKS_PER_PAGE)
      return { buffer, blocks }
    }),
  )
  const allBlocks: QuestionBlock[] = pages.flatMap((pg) => pg.blocks)
  if (allBlocks.length === 0) throw new Error("VLM 分块未识别到任何题目区域")
  console.log("[v0] grade-vlm: segmented", allBlocks.length, "block(s)")

  /* ---------- Stage 2：分流批改各题块（复用对应页的 Buffer） ---------- */
  const blockResults = await pMapLimit(allBlocks, BLOCK_CONCURRENCY, (block) =>
    gradeBlock(block, pages[block.page_index]!.buffer, subjectHint, answerCtx),
  )

  const details: Omit<CorrectionDetail, "id">[] = []
  for (const r of blockResults) {
    if (r.ok) details.push(...r.value)
  }
  console.log("[v0] grade-vlm: collected", details.length, "issue(s)")

  /* ---------- Stage 2.5：算分与计数 ---------- */
  const deltaSum = details.reduce((s, d) => s + (d.score_delta ?? 0), 0)
  const totalScore = Math.max(0, Math.min(100, 100 + deltaSum))
  const wrongCount = details.filter((d) => d.type === "error" || d.type === "missing").length
  const partialCount = details.filter((d) => d.type === "partial").length
  const detectedQuestions = allBlocks.length

  /* ---------- Stage 3：聚合评语 + 雷达 ---------- */
  const agg = await aggregate(submission.student_name, subjectHint, details, totalScore)

  // 赋全局 id
  const correctionDetails: CorrectionDetail[] = details.map((d, i) => ({
    ...d,
    id: i + 1,
  }))

  const summary: GradingResult["summary"] = {
    total_score: totalScore,
    correct_count: Math.max(0, detectedQuestions - wrongCount - partialCount),
    wrong_count: wrongCount,
    total_detected_questions: detectedQuestions,
    weak_points: agg.weak_points,
  }

  return {
    score: totalScore,
    ai_comment: agg.teacher_comment,
    weak_points: agg.weak_points,
    ai_issues: {
      version: 2,
      model: answerCtx ? `qwen3-vl-plus (segmented, answer-key)` : `qwen3-vl-plus (segmented)`,
      graded_subject: subject,
      summary,
      correction_details: correctionDetails,
      radar_analysis: agg.radar_analysis,
    },
    // 新链路不产 OCR 数据；不影响落库（字段可空），重批改会重新走
    ocr_data: null,
    rotated_image_urls: null,
  }
}
