// 本地 OCR 冒烟测试：跑一份真实的 submission 图，打印行号/坐标/置信度
// 用法：pnpm exec dotenv -e /vercel/share/.env.project -- node scripts/ocr-smoke.mjs

import { ocrSubmission, buildTranscriptForLLM } from "../lib/ocr/tencent.ts"

const TEST_PATHNAME =
  "submissions/submissions_cc186521-2e1f-43bb-a6c3-5d83bd721e8b_student_a/student_a/1778829176932-rkbdvg.jfif"

console.log("[smoke] starting OCR for:", TEST_PATHNAME)
const t0 = Date.now()
const data = await ocrSubmission([TEST_PATHNAME])
const dt = Date.now() - t0

console.log(`\n[smoke] OCR done in ${dt}ms`)
console.log(`pages=${data.pages.length}`)
for (const p of data.pages) {
  console.log(`  page ${p.width}x${p.height} lines=${p.lines.length}`)
  for (const ln of p.lines.slice(0, 8)) {
    console.log(
      `    L${ln.index} bbox=[${ln.bbox.join(",")}] conf=${ln.confidence.toFixed(2)} "${ln.text}"`,
    )
  }
  if (p.lines.length > 8) console.log(`    ...(+${p.lines.length - 8} more)`)
}
console.log("\n--- transcript head ---")
console.log(buildTranscriptForLLM(data).split("\n").slice(0, 15).join("\n"))
