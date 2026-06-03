import { get } from "@vercel/blob"
import { writeFileSync } from "node:fs"

const path = "submissions/submissions_54b3961a-b531-46d6-9eaf-73032e1e2792_s02/s02/1779119178357-nhhy8g.jpg"

const result = await get(path, { access: "private" })
if (!result?.stream) {
  console.error("blob not found")
  process.exit(1)
}
const chunks = []
const reader = result.stream.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  if (value) chunks.push(value)
}
const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)))
writeFileSync("public/images/ab-math-sample.jpg", buf)
console.log("saved", buf.length, "bytes -> public/images/ab-math-sample.jpg")
