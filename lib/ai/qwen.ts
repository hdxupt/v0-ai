import "server-only"

/**
 * 阿里云百炼 Qwen3-VL 客户端（OpenAI 兼容接口）
 *
 * 为什么独立成文件：百炼不走 Vercel AI Gateway，而是用 DashScope 的
 * OpenAI 兼容 endpoint + DASHSCOPE_API_KEY 鉴权。把它和 gateway.ts 隔离，
 * 避免污染现有 Anthropic/OpenAI 调用路径。
 *
 * 核心能力：Qwen3-VL 具备原生视觉定位(grounding)，可对图片输出目标 bbox。
 * 我们统一要求它以「1000×1000 归一化网格」输出坐标，再由调用方转成项目内部
 * 的百分比 bbox（[y, x, h, w]，0~100）。
 */

const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

/** 视觉定位/分块主力模型 */
export const QWEN_VL_MODEL = "qwen3-vl-plus"

/** 单次 Qwen 调用超时（ms）。VL 推理较慢，给足时间但要可控。 */
export const QWEN_TIMEOUT_MS = 60_000

/** Qwen 使用的归一化坐标系上限（prompt 中固定为 1000 网格）。 */
export const QWEN_GRID = 1000

export interface QwenContentPart {
  type: "text" | "image_url"
  text?: string
  image_url?: { url: string }
}

export interface QwenMessage {
  role: "system" | "user" | "assistant"
  content: string | QwenContentPart[]
}

function getApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY
  if (!key) throw new Error("缺少 DASHSCOPE_API_KEY，无法调用 Qwen3-VL")
  return key
}

/**
 * 调用 Qwen3-VL（chat/completions），返回纯文本输出。
 * 失败抛错，由调用方决定是否回退到旧链路。
 */
export async function callQwenVL(
  messages: QwenMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const controller = new AbortController()
  const timeout = opts.timeoutMs ?? QWEN_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: QWEN_VL_MODEL,
        messages,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.maxTokens ?? 2048,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Qwen HTTP ${res.status}: ${errText.slice(0, 300)}`)
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error("Qwen 返回空内容")
    return content
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 调用 Qwen3-VL 并把输出解析为 JSON。
 * Qwen 偶尔会用 ```json ``` 包裹或夹带说明文字，这里做剥离 + 容错。
 */
export async function callQwenJSON<T = unknown>(
  messages: QwenMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<T> {
  const raw = await callQwenVL(messages, opts)
  return parseLooseJSON<T>(raw)
}

/** 从可能含 markdown 围栏/前后缀文字的字符串里抠出 JSON。 */
export function parseLooseJSON<T = unknown>(raw: string): T {
  let s = raw.trim()

  // 去掉 ```json ... ``` 或 ``` ... ``` 围栏
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()

  // 直接尝试
  try {
    return JSON.parse(s) as T
  } catch {
    // 退一步：截取第一个 { 或 [ 到最后一个 } 或 ]
    const firstObj = s.indexOf("{")
    const firstArr = s.indexOf("[")
    let start = -1
    if (firstObj === -1) start = firstArr
    else if (firstArr === -1) start = firstObj
    else start = Math.min(firstObj, firstArr)

    const lastObj = s.lastIndexOf("}")
    const lastArr = s.lastIndexOf("]")
    const end = Math.max(lastObj, lastArr)

    if (start !== -1 && end !== -1 && end > start) {
      const sliced = s.slice(start, end + 1)
      try {
        return JSON.parse(sliced) as T
      } catch {
        // 落到下面的截断恢复
      }
    }

    // 截断恢复：VLM 输出被 max_tokens 砍断时，JSON 不完整。
    // 用括号配平扫描，在「最后一个完整闭合括号」处截断，再补齐未闭合的括号，
    // 从而保住已经完整输出的数组元素（如 issues 列表的前几条），避免整块归零。
    const repaired = repairTruncatedJSON(start !== -1 ? s.slice(start) : s)
    if (repaired) {
      try {
        return JSON.parse(repaired) as T
      } catch {
        // ignore
      }
    }
    throw new Error(`无法解析 Qwen JSON 输出: ${raw.slice(0, 200)}`)
  }
}

/**
 * 修复被截断的 JSON 字符串。
 * 扫描时跟踪字符串/转义状态与括号栈，记录最后一个「安全截断点」
 * （即栈处于某层数组/对象内、刚完成一个元素的位置），在该点截断并补齐闭合括号。
 * 返回可被 JSON.parse 的字符串；无法修复时返回 null。
 */
export function repairTruncatedJSON(input: string): string | null {
  const s = input
  let inStr = false
  let esc = false
  const stack: string[] = [] // '{' or '['
  // 安全截断点：在数组/对象内部刚完成一个元素（遇到完整的 } ] 或者其后的 ,）的索引
  let safeEnd = -1
  let safeStack: string[] = []

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === "\\") esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') {
      inStr = true
    } else if (c === "{" || c === "[") {
      stack.push(c)
    } else if (c === "}" || c === "]") {
      stack.pop()
      // 一个元素/容器刚闭合，是安全点
      safeEnd = i
      safeStack = [...stack]
    } else if (c === ",") {
      // 逗号前的元素已完整，也是安全点（截断时丢掉逗号）
      safeEnd = i - 1
      safeStack = [...stack]
    }
  }

  if (safeEnd < 0 || safeStack.length === 0) return null

  let head = s.slice(0, safeEnd + 1)
  // 补齐未闭合的括号（从栈顶到栈底）
  for (let i = safeStack.length - 1; i >= 0; i--) {
    head += safeStack[i] === "{" ? "}" : "]"
  }
  return head
}

/**
 * 把 Qwen 的 [x1, y1, x2, y2]（0~QWEN_GRID 归一化）转成
 * 项目内部 bbox 格式 [y, x, h, w]（0~100 百分比，整数）。
 *
 * grid 默认 1000；做了越界钳制与最小尺寸保护。
 */
export function qwenBoxToPercent(
  box: number[],
  grid: number = QWEN_GRID,
): [number, number, number, number] | null {
  if (!Array.isArray(box) || box.length !== 4) return null
  let [x1, y1, x2, y2] = box.map((n) => (Number.isFinite(n) ? n : NaN))
  if ([x1, y1, x2, y2].some((n) => Number.isNaN(n))) return null

  // 保证 x1<x2, y1<y2
  if (x2 < x1) [x1, x2] = [x2, x1]
  if (y2 < y1) [y1, y2] = [y2, y1]

  const toPct = (v: number) => (v / grid) * 100
  let xPct = toPct(x1)
  let yPct = toPct(y1)
  let wPct = toPct(x2 - x1)
  let hPct = toPct(y2 - y1)

  // 钳制进页面
  xPct = Math.max(0, Math.min(98, xPct))
  yPct = Math.max(0, Math.min(98, yPct))
  wPct = Math.max(2, Math.min(100 - xPct, wPct))
  hPct = Math.max(2, Math.min(100 - yPct, hPct))

  return [Math.round(yPct), Math.round(xPct), Math.round(hPct), Math.round(wPct)]
}
