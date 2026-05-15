// 直接调腾讯云 SDK 看原始返回结构，定位 0-line 问题
import { ocr } from "tencentcloud-sdk-nodejs-ocr"
import { get } from "@vercel/blob"

const Client = ocr.v20181119.Client
const client = new Client({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: "ap-guangzhou",
  profile: { httpProfile: { endpoint: "ocr.tencentcloudapi.com" } },
})

const pathname = "submissions/submissions_cc186521-2e1f-43bb-a6c3-5d83bd721e8b_student_a/student_a/1778829176932-rkbdvg.jfif"
const result = await get(pathname, { access: "private" })
const chunks = []
const reader = result.stream.getReader()
while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value) }
const buf = Buffer.concat(chunks.map(c => Buffer.from(c)))
console.log("buffer size:", buf.length, "bytes")

const resp = await client.GeneralAccurateOCR({ ImageBase64: buf.toString("base64") })
console.log("--- raw response keys ---")
console.log(Object.keys(resp))
console.log("--- TextDetections length:", resp.TextDetections?.length)
console.log("--- first 2 detections (full structure) ---")
console.log(JSON.stringify(resp.TextDetections?.slice(0, 2), null, 2))
