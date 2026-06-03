// 验证阿里云百炼 Qwen3-VL：是否可调用 + 视觉定位(grounding)能力
// 用法: node --env-file-if-exists=/vercel/share/.env.project scripts/verify-qwen.mjs

const KEY = process.env.DASHSCOPE_API_KEY
if (!KEY) {
  console.error("缺少 DASHSCOPE_API_KEY")
  process.exit(1)
}

const BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"

// 内联生成一张简单 PNG（红底白块）作为最小视觉测试图，避免外网图片拉取卡住
// 1x1 透明 png 不足以测 grounding，这里用一张公开的小图 data uri 兜底测"能否看图"
const IMG =
  "https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg"

const candidates = ["qwen3-vl-plus", "qwen-vl-max-latest", "qwen-vl-max", "qwen-vl-plus"]

async function tryModel(model) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: IMG } },
          {
            type: "text",
            text:
              "把这张图看成 1000x1000 网格。框出图中最主要的目标，只返回 JSON：" +
              '{"bbox_2d":[x1,y1,x2,y2],"label":"..."}。不要多余文字。',
          },
        ],
      },
    ],
  }
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const txt = await res.text()
    return { status: res.status, txt }
  } finally {
    clearTimeout(t)
  }
}

for (const m of candidates) {
  process.stdout.write(`\n=== 尝试模型: ${m} ===\n`)
  try {
    const { status, txt } = await tryModel(m)
    console.log("HTTP", status)
    console.log(txt.slice(0, 700))
    if (status === 200) {
      console.log(`\nAVAILABLE_MODEL=${m}`)
      break
    }
  } catch (e) {
    console.log("ERR", e.name, e.message)
  }
}
console.log("\nDONE")
