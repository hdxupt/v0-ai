export type UserRole = "teacher" | "student"

export interface AppUser {
  id: string
  name: string
  role: UserRole
  /** 学科：仅老师有意义（"数学" / "英语"…），学生为 null。 */
  subject?: string | null
  class_id: string | null
  student_no: string | null
  avatar_color: string
  display_order: number
  created_at?: string
}

export interface ClassInfo {
  id: string
  name: string
  grade: string
  student_count: number
  display_order: number
}

export type TaskStatus = "draft" | "active" | "closed"

export interface Task {
  id: string
  title: string
  subject: string
  class_ids: string[]
  requirements: string
  notes: string | null
  due_at: string
  estimated_minutes: number
  teacher_id: string
  teacher_name: string
  status: TaskStatus
  target_student_count: number
  created_at: string
  /** 软删除时间戳。null 或缺失 = 活跃；非空 = 回收站内。 */
  deleted_at?: string | null
}

export type SubmissionStatus = "submitted" | "grading" | "graded"

/** v1 legacy annotation shape (kept for backward compatibility) */
export interface AIIssueAnnotation {
  id: string
  x: number
  y: number
  w: number
  h: number
  type: "error" | "warning"
  message: string
}

/** v2 — bounding box returned by the real AI (4 类型 + 置信度) */
export type AIBboxType = "error" | "partial" | "highlight" | "missing"

/** 五维能力维度，与 radar_analysis 的 key 一致 */
export type RubricDimension = "basics" | "logic" | "knowledge" | "application" | "presentation"

export interface AICorrectionDetail {
  id: number
  type: AIBboxType
  question_text: string
  process_analysis: string
  correct_answer?: string
  score_delta?: number
  /** 该扣分点主要拉低的能力维度（评分可追溯）。旧数据可能缺失。 */
  rubric_dimension?: RubricDimension
  bounding_box: [number, number, number, number] // [y, x, h, w]
  confidence: number
}

export interface AIRadarAnalysis {
  basics: number
  logic: number
  knowledge: number
  application: number
  presentation: number
}

export interface AIGradingV2 {
  version: 2
  model: string
  graded_subject: "math" | "chinese" | "english" | "generic"
  summary: {
    total_score: number
    correct_count: number
    wrong_count: number
    total_detected_questions: number
    weak_points: string[]
  }
  correction_details: AICorrectionDetail[]
  radar_analysis: AIRadarAnalysis
}

/** ai_issues 字段在 DB 中可以是 v1 数组或 v2 对象 */
export type AIIssuesField = AIIssueAnnotation[] | AIGradingV2

/** weak_points 字段历史上既存过短语，也存过结构化对象，做并集 */
export interface WeakPointObject {
  name?: string
  knowledge?: string
  myScore?: number
  classAverage?: number
  lostPoints?: number
  reason?: string
  mastery?: number
}
export type WeakPointField = string | WeakPointObject

export interface Submission {
  id: string
  task_id: string
  student_id: string
  student_name: string
  class_id: string
  image_urls: string[]
  note: string | null
  status: SubmissionStatus
  score: number | null
  total_score: number
  ai_comment: string | null
  teacher_comment: string | null
  ai_issues: AIIssuesField
  weak_points: WeakPointField[]
  submitted_at: string
  graded_at: string | null
  /**
   * 腾讯云 OCR 转录缓存。
   * 结构见 lib/ocr/tencent.ts:OcrData。重批改时直接复用，避免重复 OCR 调用。
   * 旧数据可能为 null。
   */
  ocr_data?: unknown
}

/* ---- helpers (pure, can be imported from server & client) ---- */

/** v2 判别 */
export function isAIGradingV2(v: unknown): v is AIGradingV2 {
  return (
    !!v && typeof v === "object" && (v as any).version === 2 && Array.isArray((v as any).correction_details)
  )
}

/** 把 v2 的 correction_details 转成 viewer 用的简单 bbox 列表 */
export interface ViewerBox {
  id: string
  /** 0~100 相对坐标 */
  x: number
  y: number
  w: number
  h: number
  type: AIBboxType | "warning" | "error"
  message: string
  /** v2 才有的字段 */
  index?: number
  confidence?: number
  correct_answer?: string
  question_text?: string
  /** 评分可追溯：该项扣/加分与关联维度 */
  score_delta?: number
  rubric_dimension?: RubricDimension
}

export function toViewerBoxes(field: AIIssuesField | null | undefined): ViewerBox[] {
  if (!field) return []
  if (isAIGradingV2(field)) {
    return field.correction_details
      .filter((d) => d.confidence >= 0.55 && d.bounding_box?.length === 4)
      .map((d, i) => {
        const [y, x, h, w] = d.bounding_box
        return {
          id: `v2-${d.id ?? i}`,
          x,
          y,
          w,
          h,
          type: d.type,
          index: i + 1,
          confidence: d.confidence,
          correct_answer: d.correct_answer,
          question_text: d.question_text,
          message: d.process_analysis,
          score_delta: d.score_delta,
          rubric_dimension: d.rubric_dimension,
        }
      })
  }
  if (Array.isArray(field)) {
    return field.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h,
      type: d.type,
      message: d.message,
    }))
  }
  return []
}

/* ============================== 评分可追溯（Score Provenance） ============================== */

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
  "basics",
  "logic",
  "knowledge",
  "application",
  "presentation",
]

export const RUBRIC_DIMENSION_LABEL: Record<RubricDimension, string> = {
  basics: "计算与基础",
  logic: "逻辑思维",
  knowledge: "知识掌握",
  application: "应用能力",
  presentation: "书写规范",
}

/** 单条扣/加分明细，id 与 ViewerBox 同源，可用于 hover 联动图片 */
export interface ScoreDeductionItem {
  id: string
  ordinal: number
  type: AIBboxType
  /** 带符号：扣分为负、亮点加分为正或 0 */
  delta: number
  reason: string
  dimension?: RubricDimension
}

export interface DimensionBreakdown {
  dimension: RubricDimension
  label: string
  /** 五维雷达得分 0~100 */
  score: number
  /** 归属到该维度的扣分总额（绝对值） */
  deducted: number
  itemCount: number
}

export interface ScoreBreakdown {
  /** 是否有逐项分值数据。false = 早期数据没记 score_delta，UI 走降级展示 */
  available: boolean
  /** 满分基准（按 100 归一） */
  fullScore: number
  /** 最终得分（来自 summary.total_score） */
  finalScore: number
  items: ScoreDeductionItem[]
  /** 所有 delta 之和（通常为负） */
  totalDelta: number
  /** fullScore + totalDelta 是否约等于 finalScore（±1 容差） */
  reconciled: boolean
  /** 综合评定调整 = finalScore - (fullScore + totalDelta)，用于诚实对账 */
  residual: number
  dimensions: DimensionBreakdown[]
}

/**
 * 从 v2 批改结果构造"满分 → 逐条扣分 → 最终分"的可追溯账本。
 * 纯函数，服务端 / 客户端都可调用。非 v2 数据返回 null。
 */
export function buildScoreBreakdown(field: AIIssuesField | null | undefined): ScoreBreakdown | null {
  if (!isAIGradingV2(field)) return null
  const details = field.correction_details ?? []

  const items: ScoreDeductionItem[] = details.map((d, i) => ({
    id: `v2-${d.id ?? i}`,
    ordinal: i + 1,
    type: d.type,
    delta: typeof d.score_delta === "number" ? d.score_delta : 0,
    reason: d.question_text?.trim() || d.process_analysis?.slice(0, 40) || "未命名扣分点",
    dimension: d.rubric_dimension,
  }))

  const hasDelta = details.some((d) => typeof d.score_delta === "number" && d.score_delta !== 0)
  const fullScore = 100
  const finalScore = Math.max(0, Math.min(100, field.summary?.total_score ?? 0))
  const totalDelta = items.reduce((s, it) => s + it.delta, 0)
  const residual = finalScore - (fullScore + totalDelta)

  const dimensions: DimensionBreakdown[] = RUBRIC_DIMENSIONS.map((dim) => {
    const dimDeductions = items.filter((it) => it.dimension === dim && it.delta < 0)
    return {
      dimension: dim,
      label: RUBRIC_DIMENSION_LABEL[dim],
      score: field.radar_analysis?.[dim] ?? 0,
      deducted: Math.abs(dimDeductions.reduce((s, it) => s + it.delta, 0)),
      itemCount: dimDeductions.length,
    }
  })

  return {
    available: hasDelta,
    fullScore,
    finalScore,
    items,
    totalDelta,
    reconciled: Math.abs(residual) <= 1,
    residual,
    dimensions,
  }
}

/** 归一化 weak_points 到字符串数组 */
export function normalizeWeakPoints(field: WeakPointField[] | null | undefined): string[] {
  if (!field) return []
  return field
    .map((w) => (typeof w === "string" ? w : w?.knowledge ?? w?.name ?? ""))
    .filter(Boolean)
    .slice(0, 3) as string[]
}

export type NotificationType =
  | "new_homework"
  | "reminder"
  | "submission_received"
  | "graded"
  | "system"

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  content: string
  related_task_id: string | null
  related_submission_id: string | null
  read: boolean
  urgent: boolean
  created_at: string
}

export type ActivityType =
  | "submit"
  | "view"
  | "graded"
  | "reminder_sent"
  | "new_task"
  | "late_warning"

export interface ActivityEvent {
  id: string
  class_id: string | null
  type: ActivityType
  actor_id: string | null
  actor_name: string | null
  target_id: string | null
  target_name: string | null
  task_id: string | null
  description: string
  metadata: Record<string, any>
  created_at: string
}
