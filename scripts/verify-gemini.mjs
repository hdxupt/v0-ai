import { createGateway } from "@ai-sdk/gateway"
import { generateObject } from "ai"
import { z } from "zod"
import fs from "node:fs"

function key() {
  const p = process.env.AI_GATEWAY_PRIVATE_KEY?.trim()
  if (p && p.startsWith("vck_")) return p
  const d = process.env.AI_GATEWAY_API_KEY?.trim()
  if (d && d.startsWith("vck_")) return d
  throw new Error("no vck_ key")
}

const gateway = createGateway({ apiKey: key() })

const candidates = [
  "google/gemini-3-pro",
  "google/gemini-3-flash",
  "google/gemini-2.5-flash",
]

const img = fs.readFileSync("public/images/handwritten-math.png")

const schema = z.object({
  blocks: z.array(
    z.object({
      label: z.string(),
      type: z.enum(["objective", "math", "essay_cn", "essay_en", "other"]),
      bbox: z.array(z.number()).length(4),
    }),
  ),
})

for (const model of candidates) {
  try {
    const t = Date.now()
    const { object } = await generateObject({
      model: gateway(model),
      schema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "把这张作业图按题目分块。整张图视为100x100网格，bbox=[y,x,h,w]，紧贴每个题块。type只能是objective/math/essay_cn/essay_en/other。只分块不批改。",
            },
            { type: "image", image: img },
          ],
        },
      ],
      temperature: 0,
    })
    console.log(`OK  ${model}  ${Date.now() - t}ms  blocks=${object.blocks.length}`)
    console.log(JSON.stringify(object.blocks, null, 2))
    break
  } catch (e) {
    console.log(`FAIL ${model}: ${String(e).slice(0, 160)}`)
  }
}
