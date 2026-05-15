/**
 * 浏览器端图片压缩工具
 *
 * 目标：把学生上传的原图（iPhone 拍照常见 5~15MB JPEG / HEIC）
 * 压到 ≤ 4MB 同时保留 OCR / AI 视觉批改所需的清晰度。
 *
 * 设计原则：
 * - 纯前端，无外部依赖（Canvas + createImageBitmap + toBlob）。
 * - 长边限制在 2400px：手写作业纸张/答题卡这个分辨率足够 VLM 看清字。
 * - 编码 image/webp，质量 0.85 起，超额则迭代下调（最低 0.6）。
 * - HEIC 在 iOS Safari 上原生可解码；其他浏览器不行——遇到则返回原文件，
 *   让上行链路自然报错给用户（极少见，因为 iOS 上传普通走 <input> 会自动转 JPEG）。
 * - 小于阈值的原图直接返回，不做无谓 re-encode。
 */

export interface CompressOptions {
  /** 目标最大字节数，默认 4MB */
  maxBytes?: number
  /** 长边像素上限，默认 2400 */
  maxDimension?: number
  /** 初始 WebP 质量 */
  initialQuality?: number
  /** 质量下限（再低就放弃压缩，返回最后一次结果） */
  minQuality?: number
}

const DEFAULTS = {
  maxBytes: 4 * 1024 * 1024,
  maxDimension: 2400,
  initialQuality: 0.85,
  minQuality: 0.6,
}

/**
 * 主入口：传入用户选的 File，返回可上传的 File（可能就是原对象，也可能是压缩后的新对象）。
 * 任何异常都会回退到原文件，不阻塞用户。
 */
export async function compressImageForUpload(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const opts = { ...DEFAULTS, ...options }

  // 小于阈值且非 HEIC 直接放行
  const isHeic = /heic|heif/i.test(file.type) || /\.heic$|\.heif$/i.test(file.name)
  if (!isHeic && file.size <= opts.maxBytes) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // 计算等比缩放后的目标尺寸
    const longSide = Math.max(width, height)
    const scale = longSide > opts.maxDimension ? opts.maxDimension / longSide : 1
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH })

    const ctx = (canvas as any).getContext("2d") as CanvasRenderingContext2D | null
    if (!ctx) {
      bitmap.close?.()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close?.()

    // 迭代下调 quality 直到 ≤ maxBytes
    let quality = opts.initialQuality
    let blob = await canvasToBlob(canvas as any, "image/webp", quality)
    while (blob && blob.size > opts.maxBytes && quality > opts.minQuality) {
      quality = Math.max(opts.minQuality, quality - 0.1)
      blob = await canvasToBlob(canvas as any, "image/webp", quality)
    }
    if (!blob) return file

    const newName = file.name.replace(/\.(heic|heif|png|jpe?g|webp)$/i, "") + ".webp"
    return new File([blob], newName, { type: "image/webp", lastModified: Date.now() })
  } catch (err) {
    console.warn("[v0] image compress failed, fallback to original:", err)
    return file
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number,
): Promise<Blob | null> {
  // OffscreenCanvas 有 convertToBlob，HTMLCanvasElement 用 toBlob 回调
  if ("convertToBlob" in canvas) {
    return canvas
      .convertToBlob({ type, quality })
      .catch(() => null)
  }
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality)
  })
}

/** 给 UI 用的人类可读体积 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
