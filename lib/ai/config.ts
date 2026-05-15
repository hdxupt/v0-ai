/**
 * 模型路由分层（控制成本，质量优先在批改场景）
 *
 * 这是项目里所有 AI 模型选型的唯一来源。改这里就够了，业务代码不要 hardcode。
 *
 * 通过 Vercel AI Gateway 调用；所有模型字符串遵循 "{provider}/{model}" 协议。
 */
export const AI_MODELS = {
  /**
   * 单卷批改模型。
   *
   * 视觉最强是 opus 4.6，但 Vercel AI Gateway 当前对 free credits 限制了 opus 系列，
   * 调用会返回 403 RestrictedModelsError。一旦团队充值了 paid credits
   * (vercel.com/[team]/~/ai)，把下面这行改成
   *   "anthropic/claude-opus-4.6"
   * 即可获得更精准的 bbox 视觉定位。
   *
   * 当前回退到 sonnet 4.5：free credits 可用，bbox 像素精度受限但语义批改一致。
   */
  grading: "anthropic/claude-sonnet-4.5",
  /** 班级学情报告：暂同 grading；有 paid credits 后可单独升 opus */
  classReport: "anthropic/claude-sonnet-4.5",
  /** 教师 AI 助教：轻量问答，gpt-5-mini 即可 */
  chat: "openai/gpt-5-mini",
} as const

/** 批改并发上限（同一份作业批量批阅时） */
export const GRADING_CONCURRENCY = 5

/** 单次批改最长时间。opus 比 sonnet 慢，给到 150s 缓冲。 */
export const GRADING_TIMEOUT_MS = 150_000

/**
 * 批改时的最大输出 token。
 * opus 4.6 对带有"原文片段引用 + 多维度 radar + 大段 teacher_comment"的批改任务通常稳定在 4~6k，
 * 给到 8k 上限保证不被截断。
 */
export const GRADING_MAX_OUTPUT_TOKENS = 8000
