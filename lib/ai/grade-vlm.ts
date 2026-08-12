import "server-only"
import type { Submission, Task, AIQuestionVerdict, VerdictStatus } from "@/lib/types"
import { VERDICT_CONFIDENCE_THRESHOLD } from "@/lib/types"
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

interface RawVerdict {
  label?: string
  verdict?: string
  answer_bbox_2d?: number[]
  correct_answer?: string
  score_text?: string
  confidence?: number
}

interface BlockGradeResult {
  verdicts?: RawVerdict[]
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

  // 通用抗干扰指令：隔绝纸张背景与无关杂物，只判作答本身
  const NOISE_GUARD = `【看图须知】只针对学生的"作答内容"判分。请主动忽略：纸张阴影/折痕、背面透出的笔迹、扫描噪点、装订线/打印框线、与本题作答无关的涂鸦或污渍。若某处是上述杂物而非作答，不要当作错误。`

  // 逐小题判定：原卷红笔留痕（✓/✗/半对）的数据源。所有题型通用。
  const VERDICT_BLOCK = `
【逐小题判定 verdicts（必填，用于在原卷上打红笔勾叉）】
除了 issues，你还必须输出 "verdicts" 数组：把这张小图里的每一道小题逐一判定（客观题每小题一条；解答大题整题一条；作文整篇一条）：
- "label": 题号文本（如 "6"、"(2)"），看不清给 ""
- "verdict": "correct"(完全正确) | "wrong"(错误) | "partial"(半对/有过程分) | "unanswered"(未作答)
- "answer_bbox_2d": [x1,y1,x2,y2] —— 紧贴【学生作答内容本身】的位置（选择题是括号里写的字母，填空题是手写的答案，解答题是整个解答过程），不要框题干
- "correct_answer": verdict=wrong 时必填，给最简短的正确答案（选择题就一个字母如 "B"；填空给正确词），≤15字
- "score_text": verdict=partial 时给该题得分，格式 "得分/满分" 如 "2/4"
- "confidence": 0~1，你对这个判定的把握程度。【诚实原则】如果学生字迹潦草到你无法确认他写的是什么，不要猜，直接给低置信度（<0.6），系统会把这道题转交老师人工批改——宁可交给老师，不可乱判。
`

  const COMMON_TAIL = `${NOISE_GUARD}${ANSWER_BLOCK}${VERDICT_BLOCK}
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
严格只返回 JSON：{"verdicts":[ ... ], "issues":[ ... ]}，不要任何解释文字。全对的小题也要出现在 verdicts 里（verdict="correct"），但不需要出现在 issues 里。`

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
判分规则（重要）：客观题只看三样东西——【题干】【选项或填空处的最终作答】【对错】。学生在题目旁边写的演算过程、草稿、列竖式、辅助计算等，一律忽略，不参与判分、不指出错误（客观题只认最终答案对不对，过程不扣分）。
请判断每小题对错，找出做错的题并给出正确答案；定位到该小题所在行即可。
${COMMON_TAIL}`
  }
}

interface BlockGradeOutput {
  details: Omit<CorrectionDetail, "id">[]
  verdicts: Omit<AIQuestionVerdict, "id">[]
}

/** 对单个题块批改，返回换算回全局坐标的批注明细 + 逐小题判定（均不含全局 id）。 */
async function gradeBlock(
  block: QuestionBlock,
  pageBuffer: Buffer,
  subjectHint: string,
  answerCtx?: string,
): Promise<BlockGradeOutput> {
  // 裁剪出题块小图（数学/作文需精确定位，裁剪后定位更准）
  // 复用已下载的整页 Buffer，避免对同一页重复下载
  const cropped = await cropRegionFromBuffer(pageBuffer, block.region, 3)
  if (!cropped) return { details: [], verdicts: [] }

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
    return { details: [], verdicts: [] }
  }

  const issues = Array.isArray(result?.issues) ? result.issues : []
  const rawVerdicts = Array.isArray(result?.verdicts) ? result.verdicts : []
  const out: Omit<CorrectionDetail, "id">[] = []

  /* ---- 解析逐小题判定：坐标换算 + 置信度分流 ---- */
  const verdicts: Omit<AIQuestionVerdict, "id">[] = []
  for (const v of rawVerdicts) {
    const localPct = qwenBoxToPercent(v.answer_bbox_2d ?? [])
    // 没有作答区坐标的判定无法留痕，退化到整个题块区域
    const region = localPct ? localBoxToGlobal(localPct, cropped.region) : block.region
    if (!region) continue

    const conf =
      typeof v.confidence === "number" ? Math.max(0, Math.min(1, v.confidence)) : 0.8
    let status: VerdictStatus
    switch (v.verdict) {
      case "correct":
      case "wrong":
      case "partial":
      case "unanswered":
        status = v.verdict
        break
      default:
        status = "uncertain"
    }
    // 置信度分流：AI 把握不足 → 转教师人工批改（unanswered 不分流，空白不需要辨认）
    if (conf < VERDICT_CONFIDENCE_THRESHOLD && status !== "unanswered") {
      status = "uncertain"
    }

    verdicts.push({
      label: v.label?.trim() || undefined,
      verdict: status,
      answer_box: [region[0], region[1], region[2], region[3]],
      page_index: block.page_index,
      correct_answer:
        status === "wrong" && v.correct_answer ? v.correct_answer.slice(0, 30) : undefined,
      score_text: status === "partial" && v.score_text ? v.score_text.slice(0, 12) : undefined,
      confidence: conf,
    })
  }

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
  return { details: out, verdicts }
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
  const verdictsRaw: Omit<AIQuestionVerdict, "id">[] = []
  for (const r of blockResults) {
    if (r.ok) {
      details.push(...r.value.details)
      verdictsRaw.push(...r.value.verdicts)
    }
  }
  console.log(
    "[v0] grade-vlm: collected",
    details.length,
    "issue(s),",
    verdictsRaw.length,
    "verdict(s)",
  )

  /* ---------- Stage 2.5：算分与计数（verdicts 可用时以其为准） ---------- */
  const deltaSum = details.reduce((s, d) => s + (d.score_delta ?? 0), 0)
  const totalScore = Math.max(0, Math.min(100, 100 + deltaSum))
  const countBy = (s: VerdictStatus) => verdictsRaw.filter((v) => v.verdict === s).length
  const hasVerdicts = verdictsRaw.length > 0
  const wrongCount = hasVerdicts
    ? countBy("wrong") + countBy("unanswered")
    : details.filter((d) => d.type === "error" || d.type === "missing").length
  const partialCount = hasVerdicts
    ? countBy("partial")
    : details.filter((d) => d.type === "partial").length
  const uncertainCount = countBy("uncertain")
  const detectedQuestions = hasVerdicts ? verdictsRaw.length : allBlocks.length
  if (uncertainCount > 0) {
    console.log("[v0] grade-vlm:", uncertainCount, "verdict(s) routed to teacher (low confidence)")
  }

  /* ---------- Stage 3：聚合评语 + 雷达 ---------- */
  const agg = await aggregate(submission.student_name, subjectHint, details, totalScore)

  // 赋全局 id
  const correctionDetails: CorrectionDetail[] = details.map((d, i) => ({
    ...d,
    id: i + 1,
  }))

  // 赋 verdict 全局 id
  const questionVerdicts: AIQuestionVerdict[] = verdictsRaw.map((v, i) => ({
    ...v,
    id: i + 1,
  }))

  const summary = {
    total_score: totalScore,
    correct_count: hasVerdicts
      ? countBy("correct")
      : Math.max(0, detectedQuestions - wrongCount - partialCount),
    wrong_count: wrongCount,
    total_detected_questions: detectedQuestions,
    weak_points: agg.weak_points,
    partial_count: partialCount,
    uncertain_count: uncertainCount,
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
      question_verdicts: questionVerdicts,
    },
    // 新链路不产 OCR 数据；不影响落库（字段可空），重批改会重新走
    ocr_data: null,
    rotated_image_urls: null,
  }
}
