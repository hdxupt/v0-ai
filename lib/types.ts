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
  /** 教师上传的标准答案图片（公开 URL 数组）。批改时作为参照注入。 */
  answer_key_urls?: string[]
  /** 教师录入的标准答案文本（可与图片二选一或并用）。 */
  answer_key_text?: string | null
  /** 关键得分点 / 评分备注。留空则 AI 自动评估。 */
  scoring_notes?: string | null
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
  /** 定位来源：ocr 行框求并集 / vlm 视觉补位。旧数据可能缺失。 */
  box_source?: "ocr" | "vlm"
  /**
   * 题型分类，决定前端如何标注出错位置：
   * - objective：客观题（填空/选择/判断）→ 题号旁贴标签，不画框
   * - subjective：主观题/作文/解答 → 行级波浪下划线，不画框
   * 旧数据可能缺失，缺失时按 subjective 处理（更通用、更轻）。
   */
  question_type?: "objective" | "subjective"
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
  /**
   * AI 变式题闭环数据。学生点"生成练习"后按需写入。
   * 旧数据 / 未生成时为 null。
   */
  practice_data?: PracticeSet | null
}

/* ============================== AI 变式题闭环（Practice Loop） ============================== */

/** 题型：单选客观题 / 主观解答题 */
export type PracticeQuestionType = "choice" | "open"

export interface PracticeQuestion {
  /** 稳定 id，用于学生作答状态映射 */
  id: string
  /** 关联的能力维度（来自错题归因） */
  dimension?: RubricDimension
  /** 该题针对的知识点 / 错因，用于"为什么练这道"展示 */
  knowledge: string
  type: PracticeQuestionType
  /** 题干 */
  stem: string
  /** 客观题选项（type=choice 时必填），如 ["A. ...", "B. ...", ...] */
  options?: string[]
  /** 标准答案：choice 为选项前缀(如 "A")，open 为参考答案要点 */
  answer: string
  /** 解析：讲清正确思路，呼应原错题 */
  explanation: string
}

export interface PracticeSet {
  /** 生成版本，便于未来演进 */
  version: 1
  /** 生成时间 ISO */
  generated_at: string
  /** 生成所基于的薄弱点摘要，用于标题展示 */
  basis: string
  questions: PracticeQuestion[]
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
  /** 定位来源：ocr 行框 / vlm 视觉补位，用于前端区分渲染 */
  box_source?: "ocr" | "vlm"
  /** 题型：objective→标签标注，subjective→波浪下划线。缺失按 subjective 处理。 */
  question_type?: "objective" | "subjective"
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
          box_source: d.box_source,
          question_type: d.question_type,
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

/* ============================== 班级典型错例聚合（讲评稿用） ============================== */

export interface TypicalMistake {
  /** 该错点关联的知识点 / 错因短语 */
  knowledge: string
  /** 主要能力维度 */
  dimension?: RubricDimension
  dimensionLabel?: string
  /** 全班犯该类错误的人数 */
  studentCount: number
  /** 代表性错因解析（取最具体的一条） */
  sampleReason: string
  /** 代表性正确答案（若有） */
  sampleCorrect?: string
  /** 出错学生姓名（最多展示若干个） */
  studentNames: string[]
}

/**
 * 从全班已批改 submissions 聚合"典型错例"：按知识点/错因短语归并，统计出错人数。
 * 纯函数、零 AI 调用。用于讲评稿"典型错例"板块。
 */
export function aggregateTypicalMistakes(
  submissions: Array<Pick<Submission, "student_name" | "ai_issues">>,
  limit = 5,
): TypicalMistake[] {
  // key = 归一化后的知识点短语
  const map = new Map<
    string,
    {
      knowledge: string
      dimension?: RubricDimension
      students: Set<string>
      reasons: string[]
      corrects: string[]
    }
  >()

  for (const s of submissions) {
    const field = s.ai_issues
    if (!isAIGradingV2(field)) continue
    // 同一学生同一知识点只计一次
    const seenThisStudent = new Set<string>()
    for (const d of field.correction_details ?? []) {
      if (d.type === "highlight") continue // 亮点不是错例
      const raw = (d.question_text || d.process_analysis || "").trim()
      if (!raw) continue
      // 用前 16 字做聚类键，归并相近错因
      const key = raw.slice(0, 16)
      if (seenThisStudent.has(key)) continue
      seenThisStudent.add(key)

      const entry =
        map.get(key) ??
        {
          knowledge: raw.length > 24 ? raw.slice(0, 24) + "…" : raw,
          dimension: d.rubric_dimension,
          students: new Set<string>(),
          reasons: [] as string[],
          corrects: [] as string[],
        }
      entry.students.add(s.student_name)
      if (d.process_analysis) entry.reasons.push(d.process_analysis)
      if (d.correct_answer) entry.corrects.push(d.correct_answer)
      if (!entry.dimension && d.rubric_dimension) entry.dimension = d.rubric_dimension
      map.set(key, entry)
    }
  }

  return Array.from(map.values())
    .map((e) => ({
      knowledge: e.knowledge,
      dimension: e.dimension,
      dimensionLabel: e.dimension ? RUBRIC_DIMENSION_LABEL[e.dimension] : undefined,
      studentCount: e.students.size,
      // 取最长的一条解析当代表（通常最具体）
      sampleReason: e.reasons.sort((a, b) => b.length - a.length)[0] ?? "",
      sampleCorrect: e.corrects[0],
      studentNames: Array.from(e.students),
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, limit)
}

/* ============================== 纵向学情追踪（成长曲线） ============================== */

export interface GrowthPoint {
  /** 第几次作业（从 1 起） */
  index: number
  /** 横轴标签：批改日期 M/D */
  dateLabel: string
  /** 完整日期 YYYY-MM-DD（tooltip 用） */
  fullDate: string
  /** 总分 0-100 */
  totalScore: number
  /** 五维分数 0-100 */
  basics: number
  logic: number
  knowledge: number
  application: number
  presentation: number
}

export interface GrowthSummary {
  points: GrowthPoint[]
  /** 总分相对首次的提升（正=进步） */
  totalDelta: number
  /** 最新一次的总分 */
  latestScore: number
  /** 进步最大的维度 */
  mostImprovedDimension?: { dimension: RubricDimension; label: string; delta: number }
  /** 仍最薄弱的维度（最新一次最低分） */
  weakestDimension?: { dimension: RubricDimension; label: string; score: number }
}

const GROWTH_DIMENSIONS: RubricDimension[] = [
  "basics",
  "logic",
  "knowledge",
  "application",
  "presentation",
]

/**
 * 从一名学生的多次已批改作业派生成长曲线数据。
 * 纯函数：按批改时间升序，提取每次的总分与五维分。零 AI 调用。
 */
export function buildGrowthSeries(
  submissions: Array<Pick<Submission, "status" | "graded_at" | "submitted_at" | "ai_issues">>,
): GrowthSummary {
  const graded = submissions
    .filter((s) => s.status === "graded" && isAIGradingV2(s.ai_issues))
    .map((s) => ({ ...s, _t: s.graded_at ?? s.submitted_at ?? "" }))
    .sort((a, b) => a._t.localeCompare(b._t))

  const points: GrowthPoint[] = graded.map((s, i) => {
    const field = s.ai_issues as AIGradingV2
    const radar = field.radar_analysis
    const d = s._t ? new Date(s._t) : null
    return {
      index: i + 1,
      dateLabel: d ? `${d.getMonth() + 1}/${d.getDate()}` : `第${i + 1}次`,
      fullDate: d ? d.toISOString().slice(0, 10) : "",
      totalScore: Math.round(field.summary?.total_score ?? 0),
      basics: Math.round(radar?.basics ?? 0),
      logic: Math.round(radar?.logic ?? 0),
      knowledge: Math.round(radar?.knowledge ?? 0),
      application: Math.round(radar?.application ?? 0),
      presentation: Math.round(radar?.presentation ?? 0),
    }
  })

  const first = points[0]
  const latest = points[points.length - 1]

  let mostImprovedDimension: GrowthSummary["mostImprovedDimension"]
  let weakestDimension: GrowthSummary["weakestDimension"]

  if (first && latest && points.length >= 2) {
    let bestDelta = Number.NEGATIVE_INFINITY
    for (const dim of GROWTH_DIMENSIONS) {
      const delta = latest[dim] - first[dim]
      if (delta > bestDelta) {
        bestDelta = delta
        mostImprovedDimension = { dimension: dim, label: RUBRIC_DIMENSION_LABEL[dim], delta }
      }
    }
  }

  if (latest) {
    let lowest = Number.POSITIVE_INFINITY
    for (const dim of GROWTH_DIMENSIONS) {
      if (latest[dim] < lowest) {
        lowest = latest[dim]
        weakestDimension = { dimension: dim, label: RUBRIC_DIMENSION_LABEL[dim], score: latest[dim] }
      }
    }
  }

  return {
    points,
    totalDelta: first && latest ? latest.totalScore - first.totalScore : 0,
    latestScore: latest?.totalScore ?? 0,
    mostImprovedDimension,
    weakestDimension,
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
