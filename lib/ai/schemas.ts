import { z } from "zod"

/**
 * 兼容 LLM 偶尔把数组/对象序列化成字符串的情形（Claude 在输出长 JSON 时偶发，
 * 尤其是 Opus 4.7 在 max_output_tokens 较高时也观察到该现象）。
 * 把 `[ {...}, {...} ]` 这种字符串自动解析为真实数组；其它情况原样返回。
 */
function parseMaybeJsonString<T>(val: unknown): unknown {
  if (typeof val !== "string") return val
  const trimmed = val.trim()
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return val
  try {
    return JSON.parse(trimmed)
  } catch {
    return val
  }
}

/* ============================== 单卷批改结果 ============================== */

export const BboxTypeEnum = z.enum(["error", "partial", "highlight", "missing"])
export type BboxType = z.infer<typeof BboxTypeEnum>

/** 评分可追溯：每个扣分点关联到五维能力之一，与 radar_analysis 的 key 完全一致 */
export const RubricDimensionEnum = z.enum([
  "basics",
  "logic",
  "knowledge",
  "application",
  "presentation",
])
export type RubricDimension = z.infer<typeof RubricDimensionEnum>

/**
 * Visual Grounding 框
 * bounding_box = [y, x, h, w]，单位是图片 0~100 相对坐标
 */
export const CorrectionDetailSchema = z.object({
  id: z.number().int().describe("从 1 开始递增"),
  type: BboxTypeEnum.describe("error=错；partial=半对；highlight=亮点；missing=漏做"),
  question_text: z.string().min(1).max(200).describe("简要题干或学生原句，不要超过 100 字"),
  process_analysis: z.string().min(1).max(600).describe("名师解析。要具体到步骤 / 公式 / 词汇"),
  correct_answer: z.string().max(400).optional().describe("正确做法 / 正确答案 / 正确句子；可选"),
  score_delta: z
    .number()
    .int()
    .min(-100)
    .max(100)
    .optional()
    .describe(
      "该项相对满分的扣/加分。error/partial/missing 必须给负整数（如 -3），" +
        "highlight 给 0 或正数。所有 score_delta 之和 + 100 应约等于 summary.total_score。",
    ),
  rubric_dimension: RubricDimensionEnum.optional().describe(
    "该扣分点主要拉低的能力维度，必须是 basics/logic/knowledge/application/presentation 之一，" +
      "与 radar_analysis 对应。用于让学生与老师看清'这一处扣分影响了哪个能力维度'。",
  ),
  /**
   * 该批注覆盖的 OCR 行号（全局唯一，对应 buildTranscriptForLLM 输出里的 L1/L2/...）。
   * 服务端会把这些行号对应的真实 OCR bbox 取并集，得到该批注的最终位置框。
   */
  line_indexes: z.preprocess(
    parseMaybeJsonString,
    z
      .array(z.number().int().min(1))
      .min(1)
      .max(20)
      .describe("批注命中的 OCR 行号数组，至少 1 个；服务端据此合成 bbox"),
  ),
  /**
   * （可选）模型自行估算的 fallback bbox，仅当 line_indexes 全部找不到时使用。
   * [y, x, h, w] 单位 0~100。
   *
   * 注意这里**故意不用 z.tuple**：tuple 在 JSON Schema 里会变成
   * `items: [obj, obj, obj, obj]` 的数组形式，而 Anthropic 直连 API 强制要求
   * `items` 必须是单个 object schema，否则报
   * `output_config.format.schema: Invalid schema: Array types must be specified
   * with a single object schema for 'items'`。改用定长 array 即可两边都通过。
   */
  bounding_box: z
    .array(z.number())
    .length(4)
    .optional()
    .describe("可选 fallback bbox [y,x,h,w]，单位 0~100（line_indexes 优先）"),
  /** （可选）页码索引，0-based；默认 0，多页提交时模型必须明确 */
  page_index: z.number().int().min(0).optional().describe("0-based 页码"),
  confidence: z.number().min(0).max(1).describe("整体置信度"),
  /**
   * （服务端填写，模型无需输出）该框的定位来源：
   * - "ocr"：由命中的 OCR 行真实 bbox 求并集得到，文字定位最可靠；
   * - "vlm"：OCR 未能识别该区域（手写/公式/图块），由视觉大模型 grounding 补位。
   * 前端据此区分渲染（实线 vs 虚线 + "AI 定位"标签）。
   */
  box_source: z.enum(["ocr", "vlm"]).optional().describe("定位来源：ocr 行框 / vlm 视觉补位"),
  /**
   * （服务端填写，模型无需输出）题型分类，决定前端标注方式：
   * - "objective"：客观题（填空/选择/判断）→ 题号旁贴标签，不画框；
   * - "subjective"：主观题/作文/解答 → 行级波浪下划线，不画框。
   */
  question_type: z.enum(["objective", "subjective"]).optional().describe("题型：objective / subjective"),
})
export type CorrectionDetail = z.infer<typeof CorrectionDetailSchema>

export const RadarAnalysisSchema = z
  .object({
    basics: z.number().int().min(0).max(100).describe("计算与基础"),
    logic: z.number().int().min(0).max(100).describe("逻辑思维"),
    knowledge: z.number().int().min(0).max(100).describe("知识掌握"),
    application: z.number().int().min(0).max(100).describe("应用能力"),
    presentation: z.number().int().min(0).max(100).describe("书写规范"),
  })
  .describe("五维度评分")
export type RadarAnalysis = z.infer<typeof RadarAnalysisSchema>

export const GradingSummarySchema = z.object({
  total_score: z.number().int().min(0).max(100).describe("学生最终得分（满分按 100 归一）"),
  correct_count: z.number().int().min(0),
  wrong_count: z.number().int().min(0),
  total_detected_questions: z.number().int().min(0),
  weak_points: z.preprocess(
    parseMaybeJsonString,
    z.array(z.string().min(2).max(30)).min(0).max(3).describe("1~3 个核心薄弱知识点短语"),
  ),
})
export type GradingSummary = z.infer<typeof GradingSummarySchema>

export const GradingResultSchema = z.object({
  summary: z.preprocess(parseMaybeJsonString, GradingSummarySchema),
  correction_details: z.preprocess(
    parseMaybeJsonString,
    z.array(CorrectionDetailSchema).max(40),
  ),
  teacher_comment: z
    .string()
    .min(20)
    .max(1200)
    .describe(
      "整体学情评语，单一字符串、不含换行。必须严格按四段式结构串联：" +
        "(1) 开头用 [姓名]同学，… 一句温暖肯定； " +
        "(2) 用'但目前存在 N 个核心问题需要重点突破：'起头，然后用'第一，xxx。…'、'第二，xxx。…'、'第三，xxx。…'分别列出 2~3 条核心问题（每条先一句短标题再展开）； " +
        "(3) 用'建议接下来这样做：'起头给出 1~3 条可执行行动； " +
        "(4) 用'相信下次作业一定会有明显进步！'之类的一句鼓励收����。" +
        "禁止省略'第一/第二/第三'这类序号词，禁止用'第1题/第2题'代替（题号请放进具体描述里）。",
    ),
  radar_analysis: z.preprocess(parseMaybeJsonString, RadarAnalysisSchema),
})
export type GradingResult = z.infer<typeof GradingResultSchema>

/* ============================== AI 变式题闭环 ============================== */

export const PracticeQuestionSchema = z.object({
  dimension: RubricDimensionEnum.optional().describe(
    "该题针对的能力维度，对应错题归因（basics/logic/knowledge/application/presentation）",
  ),
  knowledge: z.string().min(2).max(40).describe("该题针对的知识点 / 错因短语，如'一元二次方程判别式'"),
  type: z.enum(["choice", "open"]).describe("choice=单选客观题；open=主观解答题"),
  stem: z.string().min(5).max(400).describe("题干。数学用纯文本表达式，不要用 LaTeX 反斜杠"),
  options: z.preprocess(
    parseMaybeJsonString,
    z
      .array(z.string().min(1).max(120))
      .min(2)
      .max(4)
      .optional()
      .describe("客观题选项，形如 ['A. xxx','B. xxx','C. xxx','D. xxx']；type=open 时省略"),
  ),
  answer: z.string().min(1).max(300).describe("标准答案：choice 填选项字母如'B'；open 填参考答案要点"),
  explanation: z.string().min(5).max(500).describe("解析：讲清正确思路，呼应学生原错题的错因"),
})
export type PracticeQuestion = z.infer<typeof PracticeQuestionSchema>

export const PracticeSetResultSchema = z.preprocess(
  // Qwen json_object 模式看不到 schema，易漏 knowledge、写超长 basis/explanation。
  // 归一化兜底：截断超长字段、为缺失 knowledge 补默认值。
  // 注意 generateObject 绕过 preprocess，此兜底靠 practice.ts catch 里的 safeParse 生效。
  (val) => {
    if (!val || typeof val !== "object" || Array.isArray(val)) return val
    const o = val as Record<string, unknown>
    const clamp = (s: unknown, max: number) =>
      typeof s === "string" && s.length > max ? s.slice(0, max) : s
    const rawQuestions = parseMaybeJsonString(o.questions)
    const questions = Array.isArray(rawQuestions)
      ? rawQuestions.map((q) => {
          if (!q || typeof q !== "object") return q
          const qq = q as Record<string, unknown>
          return {
            ...qq,
            knowledge: clamp(qq.knowledge ?? qq.knowledge_point ?? qq.topic ?? "综合薄弱点巩固", 40),
            stem: clamp(qq.stem, 400),
            answer: clamp(qq.answer, 300),
            explanation: clamp(qq.explanation, 500),
          }
        })
      : rawQuestions
    return { ...o, basis: clamp(o.basis, 60), questions }
  },
  z.object({
    basis: z.string().min(2).max(60).describe("本组练习针对的薄弱点摘要，用于标题展示"),
    questions: z.preprocess(
      parseMaybeJsonString,
      z.array(PracticeQuestionSchema).min(1).max(5).describe("2~3 道变式题最佳"),
    ),
  }),
)
export type PracticeSetResult = z.infer<typeof PracticeSetResultSchema>

/* ============================== 班级学情报告 ============================== */

export const ScoreDistributionSchema = z.preprocess(
  // Qwen（json_object 模式看不到 schema）时常输出区间键 "90-100" 等，做键名归一化兜底
  (val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const o = val as Record<string, unknown>
      return {
        excellent: o.excellent ?? o["90-100"] ?? o["90~100"] ?? 0,
        good: o.good ?? o["75-89"] ?? o["75-90"] ?? o["75~89"] ?? 0,
        pass: o.pass ?? o["60-74"] ?? o["60-75"] ?? o["60~74"] ?? 0,
        fail: o.fail ?? o["0-59"] ?? o["0-60"] ?? o["0~59"] ?? 0,
      }
    }
    return val
  },
  z.object({
    excellent: z.number().int().min(0).describe("90~100 分人数"),
    good: z.number().int().min(0).describe("75~89 分人数"),
    pass: z.number().int().min(0).describe("60~74 分人数"),
    fail: z.number().int().min(0).describe("0~59 分人数"),
  }),
)

export const TopWeakPointSchema = z.object({
  name: z.string().min(2).max(30),
  student_count: z.number().int().min(0),
  severity: z.enum(["high", "mid", "low"]),
  intervention: z.string().min(10).max(300),
})

export const TieredAdviceSchema = z.object({
  top_tier: z.string().min(10).max(400).describe("优等生拔高建议"),
  mid_tier: z.string().min(10).max(400).describe("中等生巩固建议"),
  need_help: z.string().min(10).max(400).describe("后进生帮扶建议，列出具体学生姓名"),
})

export const ClassReportSchema = z.object({
  summary: z.string().min(20).max(500),
  score_distribution: ScoreDistributionSchema,
  top_weak_points: z.array(TopWeakPointSchema).min(0).max(3),
  tiered_advice: TieredAdviceSchema,
  next_action: z.string().min(5).max(60),
})
export type ClassReport = z.infer<typeof ClassReportSchema>
