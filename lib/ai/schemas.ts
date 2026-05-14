import { z } from "zod"

/* ============================== 单卷批改结果 ============================== */

export const BboxTypeEnum = z.enum(["error", "partial", "highlight", "missing"])
export type BboxType = z.infer<typeof BboxTypeEnum>

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
    .describe("该项相对满分的扣分或加分（错题给负数，亮点给 0 或正数）"),
  bounding_box: z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .describe("[y, x, h, w] 0~100 整数"),
  confidence: z.number().min(0).max(1).describe("bbox 位置的置信度"),
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
  weak_points: z.array(z.string().min(2).max(30)).min(0).max(3).describe("1~3 个核心薄弱知识点短语"),
})
export type GradingSummary = z.infer<typeof GradingSummarySchema>

export const GradingResultSchema = z.object({
  summary: GradingSummarySchema,
  correction_details: z.array(CorrectionDetailSchema).max(40),
  teacher_comment: z.string().min(20).max(1200).describe("整体三段式评语，单一字符串，不含换行"),
  radar_analysis: RadarAnalysisSchema,
})
export type GradingResult = z.infer<typeof GradingResultSchema>

/* ============================== 班级学情报告 ============================== */

export const ScoreDistributionSchema = z.object({
  excellent: z.number().int().min(0).describe("90~100 分人数"),
  good: z.number().int().min(0).describe("75~89 分人数"),
  pass: z.number().int().min(0).describe("60~74 分人数"),
  fail: z.number().int().min(0).describe("0~59 分人数"),
})

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
