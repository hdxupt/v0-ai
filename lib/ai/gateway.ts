import { createGateway } from "@ai-sdk/gateway"

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

/**
 * 共享的 Gateway 客户端实例。
 *
 * 注意：这里**故意做成 lazy** —— 只有在第一次真正调用 AI 时才解析 key，
 * 这样模块加载阶段就算 env 缺失也不会让整个服务起不来。
 */
let _cached: ReturnType<typeof createGateway> | null = null
export function getGateway() {
  if (_cached) return _cached
  const apiKey = resolveGatewayApiKey()
  _cached = createGateway({ apiKey })
  return _cached
}
