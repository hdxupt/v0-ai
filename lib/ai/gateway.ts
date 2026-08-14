import { createGateway } from "@ai-sdk/gateway"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"

/**
 * 解析可用的 AI Gateway API key。
 *
 * Vercel 平台在 dev/preview 环境会自动把 `AI_GATEWAY_API_KEY` 注入成
 * OIDC 形式的临时令牌（`v1:team_...`）。在某些团队配置下，这个令牌不具备
 * AI Gateway 调用权限，会直接返回 401 Unauthenticated。
 *
 * 为了规避这种"伪装成 key 的 OIDC"，我们引入一个**自定义环境变量**
 * `AI_GATEWAY_PRIVATE_KEY` 作为首选来源。只要这个变量被显式设置，
 * 就一定使用它；否则才退回去尝试 `AI_GATEWAY_API_KEY`，并且只接受
 * `vck_` 开头的真 key，碰到 OIDC 形式直接报错。
 */
function resolveGatewayApiKey(): string {
  const fromPrivate = process.env.AI_GATEWAY_PRIVATE_KEY?.trim()
  if (fromPrivate) {
    if (!fromPrivate.startsWith("vck_")) {
      throw new Error(
        "AI_GATEWAY_PRIVATE_KEY 必须是 `vck_` 开头的 AI Gateway API Key。" +
          "请到 Vercel → AI Gateway → API Keys 创建一个，然后在项目环境变量中设置。",
      )
    }
    return fromPrivate
  }

  const fromDefault = process.env.AI_GATEWAY_API_KEY?.trim()
  if (fromDefault && fromDefault.startsWith("vck_")) {
    return fromDefault
  }

  throw new Error(
    "未找到可用的 AI Gateway API Key。" +
      "AI_GATEWAY_API_KEY 当前是 OIDC 令牌（`v1:team_...`），不能直接用于调用 Gateway。" +
      "请到 Vercel → AI Gateway → API Keys 创建一个真正的 API Key（`vck_` 开头），" +
      "并把它存到环境变量 `AI_GATEWAY_PRIVATE_KEY` 中。",
  )
}

/* ----------------------------- 客户端缓存 ----------------------------- */

let _gateway: ReturnType<typeof createGateway> | null = null
let _anthropic: ReturnType<typeof createAnthropic> | null = null

function getGatewayClient() {
  if (_gateway) return _gateway
  const apiKey = resolveGatewayApiKey()
  _gateway = createGateway({ apiKey })
  return _gateway
}

let _dashscope: ReturnType<typeof createOpenAICompatible> | null = null

/**
 * DashScope（阿里云百炼）OpenAI 兼容端点。
 * 比赛主批改链路（grade-vlm.ts 的 qwen3-vl）已在用这个 key，付费可用、额度充足，
 * 文本生成（评语/报告/讲评稿/教研助手）也走它，避开 AI Gateway 免费额度限流。
 */
function getDashScopeClient() {
  if (_dashscope) return _dashscope
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("未配置 DASHSCOPE_API_KEY。请到项目 Vars 中添加阿里云百炼 API Key。")
  }
  _dashscope = createOpenAICompatible({
    name: "dashscope",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey,
  })
  return _dashscope
}

function getAnthropicClient() {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "未配置 ANTHROPIC_API_KEY。请到项目 Vars 中添加 `sk-ant-` 开头的 Anthropic API Key。",
    )
  }
  _anthropic = createAnthropic({ apiKey })
  return _anthropic
}

/**
 * 把 `"anthropic/claude-opus-4.7"` 形式的 Gateway 模型 id
 * 转成 Anthropic 直连接受的模型 id（`claude-opus-4-7`）。
 *
 * 直连 API 用 `-` 分隔版本号，不接受 Gateway 那种 `4.7` 的写法。
 */
function toAnthropicDirectModelId(gatewayId: string): string {
  // 去掉 "anthropic/" 前缀
  const base = gatewayId.replace(/^anthropic\//, "")
  // "claude-opus-4.7" → "claude-opus-4-7"
  return base.replace(/(\d+)\.(\d+)/g, "$1-$2")
}

/* ----------------------------- 对外 API ----------------------------- */

/**
 * 老接口保留给少数已经显式调用 `getGateway()` 的代码：
 *   const gateway = getGateway(); const model = gateway("openai/gpt-5-mini")
 *
 * 新代码请直接用 `resolveModel(modelId)`，它会自动选择直连还是走 Gateway。
 */
export function getGateway() {
  return getGatewayClient()
}

/**
 * 统一的模型解析入口。
 *
 * 路由策略：
 *   1. 若 modelId 以 `anthropic/` 开头**并且**配置了 `ANTHROPIC_API_KEY`，
 *      走 Anthropic 官方 API 直连（绕开 AI Gateway free credits 限制）。
 *   2. 否则一律走 AI Gateway（其它 provider，或者用户没设直连 key 的兜底）。
 *
 * 这是项目里所有 streamText / generateObject 调用都应该走的入口。
 */
export function resolveModel(modelId: string): LanguageModel {
  // dashscope/qwen-plus 等 → 阿里云百炼直连（比赛付费 key，无限流之忧）
  if (modelId.startsWith("dashscope/")) {
    return getDashScopeClient()(modelId.replace(/^dashscope\//, ""))
  }
  if (modelId.startsWith("anthropic/") && process.env.ANTHROPIC_API_KEY) {
    const directId = toAnthropicDirectModelId(modelId)
    return getAnthropicClient()(directId)
  }
  return getGatewayClient()(modelId)
}

