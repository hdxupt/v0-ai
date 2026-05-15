/**
 * 模型路由分层（控制成本，质量优先在批改场景）
 *
 * 这是项目里所有 AI 模型选型的唯一来源。改这里就够了，业务代码不要 hardcode。
 *
 * 通过 Vercel AI Gateway 调用；所有模型字符串遵循 "{provider}/{model}" 协议。
 */
export const AI_MODELS = {
  /**
   * 单卷批改：使用 opus 4.6（Anthropic 当前视觉最强模型）。
   * 之前用 sonnet 4.5 在手写中文卷面上 bbox 定位偏差大（语义对、像素差），
   * 升级到 opus 后视觉空间感显著改善，单卷成本约 5×，demo / 真实使用都值得。
   * 注：Anthropic 当前最新就是 opus 4.6 / sonnet 4.5，不存在 opus 4.7。
   */
  grading: "anthropic/claude-opus-4.6",
  /** 班级学情报告：同样用 opus，调用次数少可承受 */
  classReport: "anthropic/claude-opus-4.6",
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
