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
  /**
   * 注意：ANTHROPIC_API_KEY 组织已被禁用，AI Gateway 免费额度也已限流。
   * 主批改走 Qwen VLM（grade-vlm.ts，DashScope qwen3-vl）；
   * 文本生成类全部走 dashscope/ 前缀 → 阿里云百炼直连（付费 key，稳定）。
   * qwen-plus：结构化输出稳、支持 function calling、便宜（比赛全程用它）。
   */
  grading: "dashscope/qwen-plus",
  /** 班级学情报告/讲评稿/变式练习/评语 */
  classReport: "dashscope/qwen-plus",
  /** 教师 AI 教研助手：需要 function calling 查学情数据 */
  chat: "dashscope/qwen-plus",
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
