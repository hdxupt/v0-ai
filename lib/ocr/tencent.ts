/**
 * 腾讯云 OCR 客户端
 * -------------------------------------------------------------
 * 用途：把学生作业图片转写成 "行级文本 + 行级真实坐标" 列表，
 *      给批改 pipeline 提供两样东西：
 *        1. 行号化纯文本（喂给 LLM，让 LLM 只判断"哪一行有错"）
 *        2. 每一行在原图上的真实 bbox（前端画框时直接用，避免 VLM 估坐标）
 *
 * 接口：通用印刷体 + 中文手写体识别 GeneralHandwritingOCR
 *      文档 https://cloud.tencent.com/document/product/866/36212
 *
 * 调用一次 ¥0.025，每月 1000 次免费额度。
 *
 * 注意：腾讯云 OCR 限制单张图片 base64 后大小 ≤ 7MB、像素 ≤ 8192×8192。
 *      因为上传链路前端已经把图片压到 ≤ 4MB / 长边 2400px，这里不会超限。
 */

import { ocr } from "tencentcloud-sdk-nodejs-ocr"

const OcrClient = ocr.v20181119.Client

/* ----------------------------- 类型 ----------------------------- */

/** 单行 OCR 结果，坐标归一化为 0~100 整数百分比 */
export interface OcrLine {
  /** 全局行号，从 1 开始（多张图片跨页连续递增） */
  index: number
  text: string
  /** [y, x, h, w] 0~100 整数百分比 */
  bbox: [number, number, number, number]
  /** 0~1 */
  confidence: number
}

export interface OcrPage {
  image_url: string
  width: number
  height: number
  lines: OcrLine[]
}

export interface OcrData {
  version: 1
  provider: "tencent"
  ocrd_at: string
  pages: OcrPage[]
}

/* ----------------------------- 单例 client ----------------------------- */

let _client: InstanceType<typeof OcrClient> | null = null

function getClient(): InstanceType<typeof OcrClient> {
  if (_client) return _client
  const SecretId = process.env.TENCENT_SECRET_ID
  const SecretKey = process.env.TENCENT_SECRET_KEY
  if (!SecretId || !SecretKey) {
    throw new Error(
      "[ocr] 缺少环境变量 TENCENT_SECRET_ID / TENCENT_SECRET_KEY，请在项目设置 Vars 里配置",
    )
  }
  _client = new OcrClient({
    credential: { secretId: SecretId, secretKey: SecretKey },
    // 区域：ap-shanghai latency 国内最稳；接口本身全国通用
    region: "ap-shanghai",
    profile: {
      // 60 秒超时（手写体识别单张通常 1~3 秒，留足上传 base64 的余量）
      httpProfile: { reqTimeout: 60 },
    },
  })
  return _client
}

/* ----------------------------- 主函数 ----------------------------- */

/**
 * 把一张图片 base64 发给腾讯云，得到 OCR 行列表。
 * 坐标会从腾讯返回的像素坐标换算到 0~100 整数百分比。
 *
 * @param imageBase64 不带 data: 前缀的纯 base64 字符串
 * @param baseLineIndex 多张图片跨页时，本张图行号应从这个值 + 1 开始
 */
export async function recognizeHandwritingPage(
  imageBase64: string,
  baseLineIndex: number,
): Promise<{ page: Omit<OcrPage, "image_url">; nextBaseIndex: number }> {
  const client = getClient()

  // 腾讯云手写体识别接口：GeneralHandwritingOCR
  // - EnableWordPolygon: true 才会返回每个字的多边形（我们行级就够了，所以 false）
  // - Scene: 'word' 通用场景；'paper' 试卷/作文专用，对手写有专项优化
  const resp = await client.GeneralHandwritingOCR({
    ImageBase64: imageBase64,
    Scene: "paper",
    EnableWordPolygon: false,
  })

  const detections = resp.TextDetections ?? []
  if (detections.length === 0) {
    return {
      page: { width: 0, height: 0, lines: [] },
      nextBaseIndex: baseLineIndex,
    }
  }

  // 腾讯返回的坐标在 ItemPolygon 字段里，单位是像素。
  // 我们要把它换算到 0~100 整数百分比，需要先拿到图片宽高。
  // 同一批 TextDetections 共享一张图片，所以拿任意一个的 Polygon 最大值近似图片宽高即可；
  // 但为了精确，我们让前端在压缩阶段返回真实宽高 — 这里先从 Polygon 推断最大边界作 fallback。
  let maxX = 0
  let maxY = 0
  for (const d of detections) {
    const poly = (d as any).Polygon as Array<{ X: number; Y: number }> | undefined
    if (poly) {
      for (const p of poly) {
        if (p.X > maxX) maxX = p.X
        if (p.Y > maxY) maxY = p.Y
      }
    }
    const item = (d as any).ItemPolygon as
      | { X: number; Y: number; Width: number; Height: number }
      | undefined
    if (item) {
      if (item.X + item.Width > maxX) maxX = item.X + item.Width
      if (item.Y + item.Height > maxY) maxY = item.Y + item.Height
    }
  }
  // 这只是 fallback；上层会用 sharp 解析真实尺寸再覆盖。
  const widthPx = Math.max(maxX, 1)
  const heightPx = Math.max(maxY, 1)

  let idx = baseLineIndex
  const lines: OcrLine[] = []
  for (const d of detections) {
    const text = ((d as any).DetectedText as string | undefined)?.trim()
    if (!text) continue
    const item = (d as any).ItemPolygon as
      | { X: number; Y: number; Width: number; Height: number }
      | undefined
    if (!item) continue
    const xPct = (item.X / widthPx) * 100
    const yPct = (item.Y / heightPx) * 100
    const wPct = (item.Width / widthPx) * 100
    const hPct = (item.Height / heightPx) * 100
    const conf = ((d as any).Confidence as number | undefined) ?? 50
    idx += 1
    lines.push({
      index: idx,
      text,
      bbox: [
        Math.max(0, Math.min(100, Math.round(yPct))),
        Math.max(0, Math.min(100, Math.round(xPct))),
        Math.max(1, Math.min(100, Math.round(hPct))),
        Math.max(1, Math.min(100, Math.round(wPct))),
      ],
      confidence: Math.max(0, Math.min(1, conf / 100)),
    })
  }

  return {
    page: { width: widthPx, height: heightPx, lines },
    nextBaseIndex: idx,
  }
}

/* ----------------------------- 辅助：构造给 LLM 看的转录文本 ----------------------------- */

/**
 * 把多页 OCR 结果拼成一份"带行号的转录稿"，喂给 LLM：
 *
 * 【第 1 页】
 *  L1: 你我之梦，中国之梦
 *  L2: 十八年前，废寝忘食，我朦胧新干
 *  L3: ...
 * 【第 2 页】
 *  L23: ...
 */
export function buildTranscriptForLLM(ocrData: OcrData): string {
  const out: string[] = []
  ocrData.pages.forEach((p, pageIdx) => {
    out.push(`【第 ${pageIdx + 1} 页】`)
    for (const ln of p.lines) {
      out.push(`L${ln.index}: ${ln.text}`)
    }
    out.push("")
  })
  return out.join("\n")
}
