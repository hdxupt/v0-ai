import "server-only"
import sharp from "sharp"
import { get } from "@vercel/blob"

/**
 * 题块裁剪 + 坐标换算
 *
 * 用途：分块阶段拿到「整页内每道题的 bbox」后，对需要精确定位的题型（数学大题），
 * 把该题从原图裁出来单独发给 VLM。在小图上定位错误步骤，远比在整页上准。
 * VLM 在裁剪图内给出的局部坐标，再换算回原图全局坐标用于渲染。
 */

export async function fetchImageBuffer(pathnameOrUrl: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(pathnameOrUrl)) {
    const res = await fetch(pathnameOrUrl)
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  const result = await get(pathnameOrUrl, { access: "public" })
  if (!result || !result.stream) throw new Error(`blob not found: ${pathnameOrUrl}`)
  const chunks: Uint8Array[] = []
  const reader = result.stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const totalLen = chunks.reduce((s, c) => s + c.byteLength, 0)
  const out = Buffer.alloc(totalLen)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}

/**
 * 背景归一化：压平纸张阴影、背面透字、扫描噪点，让作答内容更清晰。
 * 设计原则——"温和"，宁可少处理也不要把浅色笔迹一起抹掉：
 *  - normalize：拉伸明暗对比，把灰蒙蒙的纸张背景推向纯白、笔迹推向更深；
 *  - median(1)：去掉孤立的椒盐噪点/透背小点，对连续笔画几乎无损；
 *  - 保留彩色（不强制灰度），避免丢失红笔订正等信息。
 * 任一步异常则原样返回，绝不因预处理失败而中断批改。
 */
function denoisePipeline(input: sharp.Sharp): sharp.Sharp {
  return input.median(1).normalize()
}

/** 题块在原图中的区域（百分比 0~100，[y, x, h, w]） */
export type RegionPct = [number, number, number, number]

export interface CroppedRegion {
  /** 裁剪图的 data URL（base64 jpeg），可直接喂给 VLM */
  dataUrl: string
  /** 该裁剪图对应原图的区域（百分比），用于把局部坐标换算回全局 */
  region: RegionPct
}

/**
 * 按百分比区域从原图裁剪出子图。
 * 会在四周加一点 padding（默认 3%），避免把题目边缘切掉影响定位。
 * 失败返回 null（调用方回退到整页定位）。
 */
export async function cropRegion(
  pathnameOrUrl: string,
  region: RegionPct,
  paddingPct = 3,
): Promise<CroppedRegion | null> {
  try {
    const buf = await fetchImageBuffer(pathnameOrUrl)
    return await cropRegionFromBuffer(buf, region, paddingPct)
  } catch (e: any) {
    console.error("[v0] cropRegion failed:", e?.message)
    return null
  }
}

/** 与 cropRegion 相同，但直接接受已下载的原图 Buffer，避免对同一页重复下载。 */
export async function cropRegionFromBuffer(
  buf: Buffer,
  region: RegionPct,
  paddingPct = 3,
): Promise<CroppedRegion | null> {
  try {
    const img = sharp(buf, { limitInputPixels: false })
    const meta = await img.metadata()
    const W = meta.width ?? 0
    const H = meta.height ?? 0
    if (!W || !H) return null

    let [yPct, xPct, hPct, wPct] = region
    // 加 padding 并钳制
    xPct = Math.max(0, xPct - paddingPct)
    yPct = Math.max(0, yPct - paddingPct)
    wPct = Math.min(100 - xPct, wPct + paddingPct * 2)
    hPct = Math.min(100 - yPct, hPct + paddingPct * 2)

    const left = Math.round((xPct / 100) * W)
    const top = Math.round((yPct / 100) * H)
    const width = Math.max(1, Math.round((wPct / 100) * W))
    const height = Math.max(1, Math.round((hPct / 100) * H))

    const cropped = await denoisePipeline(img.extract({ left, top, width, height }))
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    const dataUrl = `data:image/jpeg;base64,${cropped.toString("base64")}`
    // 返回实际使用的（含 padding 后）区域，供坐标换算
    return { dataUrl, region: [yPct, xPct, hPct, wPct] }
  } catch (e: any) {
    console.error("[v0] cropRegion failed:", e?.message)
    return null
  }
}

/**
 * 把「裁剪图内的局部 bbox（百分比 0~100，相对裁剪图）」换算回
 * 「原图全局 bbox（百分比 0~100）」。
 *
 * 原理：全局值 = 区域起点 + 局部占比 × 区域尺寸。
 */
export function localBoxToGlobal(
  localBox: RegionPct,
  region: RegionPct,
): RegionPct {
  const [ry, rx, rh, rw] = region
  const [ly, lx, lh, lw] = localBox

  const gy = ry + (ly / 100) * rh
  const gx = rx + (lx / 100) * rw
  const gh = (lh / 100) * rh
  const gw = (lw / 100) * rw

  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))
  const y = clamp(gy, 98)
  const x = clamp(gx, 98)
  return [
    Math.round(y),
    Math.round(x),
    Math.round(clamp(gh, 100 - y)),
    Math.round(clamp(gw, 100 - x)),
  ]
}

/** 把已下载的原图 Buffer 压成 data URL（控制 token），用于分块阶段。 */
export async function bufferToDataUrl(buf: Buffer): Promise<string> {
  // 统一压成 jpeg，控制 token；长边超过 2000 缩放（VL 对超大图收费高且无收益）
  // 同时做背景归一化，压平纸张阴影/透背，让分块与批改更准
  const out = await denoisePipeline(
    sharp(buf, { limitInputPixels: false }).resize(2000, 2000, {
      fit: "inside",
      withoutEnlargement: true,
    }),
  )
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
  return `data:image/jpeg;base64,${out.toString("base64")}`
}

/** 把整张图取出为 data URL（不裁剪），用于分块阶段把整页发给 VLM。 */
export async function imageToDataUrl(pathnameOrUrl: string): Promise<string> {
  return bufferToDataUrl(await fetchImageBuffer(pathnameOrUrl))
}
