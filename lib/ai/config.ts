/**
 * 模型路由分层（控制成本，质量优先在批改场景）
 *
 * 这是项目里所有 AI 模型选型的唯一来源。改这里就够了，业务代码不要 hardcode。
 *
 * 通过 Vercel AI Gateway 调用；所有模型字符串遵循 "{provider}/{model}" 协议。
 */
export const AI_MODELS = {
  /** 单卷批改：sonnet 性价比最优，配合 vision + 结构化输出 */
  grading: "anthropic/claude-sonnet-4.5",
  /** 班级学情报告：需要更强推理，用 opus；调用次数少，可承受 */
  classReport: "anthropic/claude-opus-4.6",
  /** 教师 AI 助教：轻量问答，gpt-5-mini 即可 */
  chat: "openai/gpt-5-mini",
} as const

/** 批改并发上限（同一份作业批量批阅时） */
export const GRADING_CONCURRENCY = 5

/** 单次批改最长时间 */
export const GRADING_TIMEOUT_MS = 90_000
