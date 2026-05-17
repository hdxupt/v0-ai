/**
 * 模型路由分层（控制成本，质量优先在批改场景）
 *
 * 这是项目里所有 AI 模型选型的唯一来源。改这里就够了，业务代码不要 hardcode。
 *
 * 通过 Vercel AI Gateway 调用；所有模型字符串遵循 "{provider}/{model}" 协议。
 */
export const AI_MODELS = {
  /**
   * 单卷批改模型：Anthropic Claude Opus 4.7。
   *
   * 选择理由：手写中文 / 数学符号 / 几何图形批阅极重视觉精度，
   * Opus 系列是 Anthropic 当前在视觉理解 + 长 JSON 结构化输出上最稳的模型。
   * 走 AI Gateway 默认 provider，无需额外 API key。若 Gateway 暂不可用，
   * 可在 .env 设置 ANTHROPIC_API_KEY 并改用 createAnthropic 直连。
   */
  grading: "anthropic/claude-opus-4.7",
  /** 班级学情报告：用 sonnet 4.5 控制成本，质量足够 */
  classReport: "anthropic/claude-sonnet-4.5",
  /** 教师 AI 助教：轻量问答，gpt-5-mini 即可 */
  chat: "openai/gpt-5-mini",
} as const

/** 批改并发上限（同一份作业批量批阅时） */
export const GRADING_CONCURRENCY = 3

/** 单次批改最长时间。opus 比 sonnet 慢，给到 180s 缓冲。 */
export const GRADING_TIMEOUT_MS = 180_000

/**
 * 批改时的最大输出 token。
 * opus 4.7 对带有"原文片段引用 + 多维度 radar + 大段 teacher_comment"的批改任务通常稳定在 4~6k，
 * 给到 8k 上限保证不被截断。
 */
export const GRADING_MAX_OUTPUT_TOKENS = 8000
