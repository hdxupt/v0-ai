/**
 * 从线上已批改提交中，按 AI 返回的 bounding_box 裁出题块小图，
 * 写入 label_samples 表作为「预标注」，供 /label 页面人工确认成金标准。
 *
 * 运行：
 *   set -a && source /vercel/share/.env.project && set +a && node scripts/build-label-samples.mjs
 *   加 --dry 只打印不写库；加 --limit=20 只处理前 N 条
 */
import { createClient } from "@supabase/supabase-js"
import { put } from "@vercel/blob"
import sharp from "sharp"

const DRY = process.argv.includes("--dry")
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0)

/** bbox 四周留白比例（防止手写笔画出头被切掉） */
const PAD_RATIO = 0.04
/** 裁出的小图最小边长，太小的框放弃（多半是误框） */
const MIN_SIDE_PX = 24

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/**
 * 旧数据 image_urls 里存的是 blob pathname（不含域名），新数据是完整 URL。
 * 这里统一补全成可 fetch 的公开 URL。
 */
let blobHostPromise = null
async function blobHost() {
  if (!blobHostPromise) {
    blobHostPromise = (async () => {
      const { list } = await import("@vercel/blob")
      const r = await list({ limit: 1 })
      if (!r.blobs.length) throw new Error("blob store 为空，无法推断域名")
      return new URL(r.blobs[0].url).origin
    })()
  }
  return blobHostPromise
}

async function toAbsoluteUrl(u) {
  if (/^https?:\/\//.test(u)) return u
  return `${await blobHost()}/${String(u).replace(/^\/+/, "")}`
}

/** 下载原卷图并缓存，避免同一张图重复下载 */
const imageCache = new Map()
async function loadImage(url) {
  if (imageCache.has(url)) return imageCache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败 ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(buf).metadata()
  const entry = { buf, width: meta.width, height: meta.height }
  imageCache.set(url, entry)
  return entry
}

async function main() {
  const { data: subs, error } = await sb
    .from("submissions")
    .select("id, task_id, status, image_urls, ai_issues")
    .eq("status", "graded")

  if (error) throw new Error(error.message)
  console.log(`[v0] graded 提交: ${subs.length}`)

  // 展平成待处理的题块任务
  const jobs = []
  for (const s of subs) {
    const f = s.ai_issues
    if (!f || typeof f !== "object" || f.version !== 2 || !Array.isArray(f.correction_details)) continue
    const urls = Array.isArray(s.image_urls) ? s.image_urls : []
    if (urls.length === 0) continue

    f.correction_details.forEach((d, idx) => {
      // 口径：标准答案是模型输入的必需项，缺失直接跳过
      if (!d?.correct_answer || !String(d.correct_answer).trim()) return
      if (!Array.isArray(d.bounding_box) || d.bounding_box.length !== 4) return
      const page = Number.isInteger(d.page_index) ? d.page_index : 0
      const srcUrl = urls[page] ?? urls[0]
      if (!srcUrl) return
      jobs.push({
        submission_id: s.id,
        detail_index: idx,
        page_index: page,
        source_image_url: srcUrl,
        bounding_box: d.bounding_box,
        question_text: d.question_text ?? null,
        correct_answer: String(d.correct_answer).trim(),
        ai_type: d.type ?? null,
        ai_analysis: d.process_analysis ?? null,
      })
    })
  }

  const todo = LIMIT > 0 ? jobs.slice(0, LIMIT) : jobs
  console.log(`[v0] 可用题块(含标准答案): ${jobs.length}，本次处理: ${todo.length}`)

  let ok = 0
  const skipped = []
  for (const [i, job] of todo.entries()) {
    try {
      const absUrl = await toAbsoluteUrl(job.source_image_url)
      const { buf, width, height } = await loadImage(absUrl)
      const [ry, rx, rh, rw] = job.bounding_box

      // 0-100 相对坐标 → 像素，并加 padding
      const padX = (rw / 100) * width * PAD_RATIO + 6
      const padY = (rh / 100) * height * PAD_RATIO + 6
      let left = Math.round((rx / 100) * width - padX)
      let top = Math.round((ry / 100) * height - padY)
      let w = Math.round((rw / 100) * width + padX * 2)
      let h = Math.round((rh / 100) * height + padY * 2)

      // 夹紧到图片边界内
      left = Math.max(0, Math.min(left, width - 1))
      top = Math.max(0, Math.min(top, height - 1))
      w = Math.max(1, Math.min(w, width - left))
      h = Math.max(1, Math.min(h, height - top))

      if (w < MIN_SIDE_PX || h < MIN_SIDE_PX) {
        skipped.push({ ...job, reason: `裁切区域过小 ${w}x${h}` })
        continue
      }

      const cropBuf = await sharp(buf).extract({ left, top, width: w, height: h }).jpeg({ quality: 92 }).toBuffer()

      if (DRY) {
        console.log(`[v0] #${i + 1} ${w}x${h} ${(cropBuf.length / 1024).toFixed(0)}KB 答案="${job.correct_answer.slice(0, 20)}"`)
        ok++
        continue
      }

      const pathname = `labels/crops/${job.submission_id}-${job.detail_index}.jpg`
      const blob = await put(pathname, cropBuf, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
      })

      const { error: upErr } = await sb.from("label_samples").upsert(
        {
          submission_id: job.submission_id,
          detail_index: job.detail_index,
          page_index: job.page_index,
          crop_url: blob.url,
          source_image_url: absUrl,
          bounding_box: job.bounding_box,
          question_text: job.question_text,
          correct_answer: job.correct_answer,
          ai_type: job.ai_type,
          ai_analysis: job.ai_analysis,
        },
        { onConflict: "submission_id,detail_index" },
      )
      if (upErr) throw new Error(`写库失败: ${upErr.message}`)
      ok++
      if (ok % 25 === 0) console.log(`[v0] 已完成 ${ok}/${todo.length}`)
    } catch (e) {
      skipped.push({ ...job, reason: e.message })
    }
  }

  console.log(`\n[v0] 成功 ${ok} 条，跳过 ${skipped.length} 条`)
  if (skipped.length) {
    const reasons = {}
    for (const s of skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1
    console.log("[v0] 跳过原因:", JSON.stringify(reasons, null, 2))
  }
}

main().catch((e) => {
  console.error("[v0] 失败:", e.message)
  process.exit(1)
})
