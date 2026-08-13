/**
 * 训练数据裁图 v2 —— 用 OCR 文字内容定位，不信 VLM 估算的 bbox
 * ============================================================
 * 背景：205 条 correction_details 里 190 条的 bounding_box 来自 VLM 目测
 * （box_source = "vlm" 或缺失），实测严重错位——裁出来的图和标准答案对不上，
 * 甚至切在半个单词中间，人眼都读不了，完全没法做训练数据。
 *
 * v2 定位策略（优先级从高到低）：
 *   1. text  —— 把 question_text（内含学生原句/题干）拿去和 OCR 行文本做模糊匹配，
 *               命中哪几行就取这几行 OCR 真实 bbox 的并集。不受错误坐标影响，
 *               且天然按整行切，绝不会切在半个词上。【最可靠】
 *   2. line  —— box_source === "ocr" 的那 15 条，line_indexes 本就是真实行号，直接用。
 *   3. snap  —— 文字匹配失败时，把原 bbox 与 OCR 行求重叠，取重叠行的完整行并集。
 *               能修好"切半个词"，但修不了"框在错误位置"，故记为低可信。
 *   4. 失败  —— 三种都不行则跳过，不产出垃圾样本。
 *
 * 用法：
 *   node scripts/build-label-samples-v2.mjs --probe        # 只统计命中率 + 存样例图，不写库
 *   node scripts/build-label-samples-v2.mjs --probe --samples=12
 *   node scripts/build-label-samples-v2.mjs                # 正式跑：裁图 → 传 Blob → 写库
 */

import { createClient } from "@supabase/supabase-js"
import { put } from "@vercel/blob"
import sharp from "sharp"
import { ocr } from "tencentcloud-sdk-nodejs-ocr"
import { writeFile, mkdir } from "node:fs/promises"

const PROBE = process.argv.includes("--probe")
const SAMPLE_N = Number(process.argv.find((a) => a.startsWith("--samples="))?.split("=")[1] ?? 10)
const SAMPLE_DIR = "/tmp/agent-browser/crops"

/** 文字匹配的最低相似度，低于此值不采信 text 定位 */
const TEXT_MATCH_THRESHOLD = 0.62
/** 裁图上下留白（占命中行总高的比例），给手写出头的笔画留余量 */
const PAD_V_RATIO = 0.35
/** 裁图左右留白（占整页宽的百分点） */
const PAD_H_PCT = 1.5
/** 裁出的图高度不足时放大到这个像素，帮助 VLM 看清手写 */
const TARGET_MIN_H = 110
const MAX_SCALE = 3
const MAX_W = 1600

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/* ============================ 工具 ============================ */

let blobOriginPromise = null
async function blobOrigin() {
  if (!blobOriginPromise) {
    blobOriginPromise = (async () => {
      const { list } = await import("@vercel/blob")
      const r = await list({ limit: 1 })
      if (!r.blobs.length) throw new Error("blob store 为空，无法推断域名")
      return new URL(r.blobs[0].url).origin
    })()
  }
  return blobOriginPromise
}

/** 旧数据 image_urls 存的是 blob pathname，新数据是完整 URL，统一补全 */
async function toAbsUrl(u) {
  if (/^https?:\/\//.test(u)) return u
  return `${await blobOrigin()}/${String(u).replace(/^\/+/, "")}`
}

const imgCache = new Map()
async function loadImage(absUrl) {
  if (imgCache.has(absUrl)) return imgCache.get(absUrl)
  const res = await fetch(absUrl)
  if (!res.ok) throw new Error(`下载失败 ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(buf).metadata()
  const out = { buf, width: meta.width, height: meta.height }
  imgCache.set(absUrl, out)
  return out
}

/** 归一化：转小写、去掉空白和标点，只留字母数字和 CJK */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
}

/** 最长公共子串长度 */
function lcsLen(a, b) {
  if (!a.length || !b.length) return 0
  let prev = new Uint16Array(b.length + 1)
  let best = 0
  for (let i = 1; i <= a.length; i++) {
    const cur = new Uint16Array(b.length + 1)
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1
        if (cur[j] > best) best = cur[j]
      }
    }
    prev = cur
  }
  return best
}

/* ============================ OCR ============================ */

const OcrClient = ocr.v20181119.Client
let _tc = null
function tencentClient() {
  if (_tc) return _tc
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY
  if (!secretId || !secretKey) throw new Error("缺少 TENCENT_SECRET_ID / TENCENT_SECRET_KEY")
  _tc = new OcrClient({
    credential: { secretId, secretKey },
    region: "ap-shanghai",
    profile: { httpProfile: { reqTimeout: 60 } },
  })
  return _tc
}

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v))

/**
 * 对单图做 OCR，返回行级 bbox（与 lib/ocr/tencent.ts 同口径：[y,x,h,w] 0~100 百分比）。
 * 这里独立实现是因为 lib/ 是 TypeScript，本项目没装 tsx，脚本无法直接 import。
 */
async function ocrImage(absUrl) {
  const { buf, width, height } = await loadImage(absUrl)
  const resp = await tencentClient().GeneralAccurateOCR({ ImageBase64: buf.toString("base64") })
  const lines = []
  for (const d of resp.TextDetections ?? []) {
    const text = (d.DetectedText ?? "").trim()
    if (!text) continue
    const it = d.ItemPolygon ?? d.ItemCoord
    if (!it || it.Width <= 0 || it.Height <= 0) continue
    lines.push({
      text,
      bbox: [
        clamp((it.Y / height) * 100),
        clamp((it.X / width) * 100),
        clamp((it.Height / height) * 100, 0.5),
        clamp((it.Width / width) * 100, 0.5),
      ],
    })
  }
  return lines
}

/* ============================ 文字定位 ============================ */

/**
 * 在一页的 OCR 行里找出与 query 最匹配的连续若干行。
 * 做法：把整页文本拼成一条归一化字符串（记录每个字符属于哪一行），
 * 用滑动窗口按「字符袋交集」快速找出最相似的一段，再用最长公共子串确认，
 * 最后把窗口覆盖到的行号返回。
 */
function locateByText(lines, query) {
  const q = norm(query)
  if (q.length < 6) return null

  const chars = []
  lines.forEach((ln, li) => {
    for (const ch of norm(ln.text)) chars.push({ ch, li })
  })
  if (chars.length < 4) return null

  const qCount = new Map()
  for (const ch of q) qCount.set(ch, (qCount.get(ch) ?? 0) + 1)

  const w = Math.min(q.length, chars.length)
  const win = new Map()
  let overlap = 0
  const add = (ch) => {
    const c = (win.get(ch) ?? 0) + 1
    win.set(ch, c)
    if (c <= (qCount.get(ch) ?? 0)) overlap++
  }
  const remove = (ch) => {
    const c = win.get(ch) ?? 0
    if (c <= (qCount.get(ch) ?? 0)) overlap--
    win.set(ch, c - 1)
  }

  for (let i = 0; i < w; i++) add(chars[i].ch)
  let bestScore = overlap / q.length
  let bestStart = 0
  for (let i = w; i < chars.length; i++) {
    add(chars[i].ch)
    remove(chars[i - w].ch)
    const score = overlap / q.length
    if (score > bestScore) {
      bestScore = score
      bestStart = i - w + 1
    }
  }

  if (bestScore < TEXT_MATCH_THRESHOLD) return null

  // 用最长公共子串确认，排除「字符凑巧重合」的假匹配
  const windowText = chars
    .slice(bestStart, bestStart + w)
    .map((c) => c.ch)
    .join("")
  const lcs = lcsLen(windowText, q)
  if (lcs < Math.max(4, Math.floor(q.length * 0.3))) return null

  const hit = new Set()
  for (let i = bestStart; i < bestStart + w; i++) hit.add(chars[i].li)
  return { lineIdxs: [...hit].sort((a, b) => a - b), score: bestScore }
}

/**
 * 收窄命中行集合。滑动窗口可能横跨不相邻的行、甚至跨到另一栏
 * （数学卷��是双栏排版），直接求并集会裁出跨栏的巨图。
 * 这里以「最像 query 的那一行」为锚，只保留同一栏、纵向邻近的连续行。
 */
function refineLines(lines, idxs, query) {
  if (idxs.length <= 1) return idxs
  const q = norm(query)

  // 锚行：与 query 最长公共子串占比最高的行
  let anchor = idxs[0]
  let bestSim = -1
  for (const i of idxs) {
    const t = norm(lines[i].text)
    if (!t) continue
    const sim = lcsLen(t, q) / Math.max(1, Math.min(t.length, q.length))
    if (sim > bestSim) {
      bestSim = sim
      anchor = i
    }
  }

  const [ay, ax, ah, aw] = lines[anchor].bbox
  const sameColumn = (i) => {
    const [, x, , w] = lines[i].bbox
    const ov = Math.min(ax + aw, x + w) - Math.max(ax, x)
    return ov > 0.25 * Math.min(aw, w)
  }
  const nearVertically = (i) => {
    const [y, , h] = lines[i].bbox
    const gap = Math.max(ay, y) - Math.min(ay + ah, y + h)
    return gap <= ah * 2.5
  }

  // 从锚行向两侧扩展，允许跳过 1 行的空隙
  const keep = new Set([anchor])
  for (const dir of [-1, 1]) {
    let miss = 0
    for (let i = anchor + dir; i >= 0 && i < lines.length && keep.size < 6; i += dir) {
      if (idxs.includes(i) && sameColumn(i) && nearVertically(i)) {
        keep.add(i)
        miss = 0
      } else if (++miss > 1) break
    }
  }
  return [...keep].sort((a, b) => a - b)
}

/** 把原 bbox 吸附到与之重叠的 OCR 行上（修「切半个词」，修不了「框错位置」） */
function snapToLines(lines, bbox) {
  const [by, bx, bh, bw] = bbox
  const y2 = by + bh
  const x2 = bx + bw
  const hits = []
  lines.forEach((ln, li) => {
    const [ly, lx, lh, lw] = ln.bbox
    const oy = Math.min(y2, ly + lh) - Math.max(by, ly)
    const ox = Math.min(x2, lx + lw) - Math.max(bx, lx)
    if (oy > 0 && ox > 0 && oy / lh > 0.3) hits.push(li)
  })
  return hits.length ? { lineIdxs: hits, score: 0 } : null
}

/** 若干行的 bbox 并集 + 留白 */
function unionBox(lines, idxs) {
  let y1 = 100
  let x1 = 100
  let y2 = 0
  let x2 = 0
  for (const i of idxs) {
    const [y, x, h, w] = lines[i].bbox
    y1 = Math.min(y1, y)
    x1 = Math.min(x1, x)
    y2 = Math.max(y2, y + h)
    x2 = Math.max(x2, x + w)
  }
  const padV = (y2 - y1) * PAD_V_RATIO
  return {
    y: clamp(y1 - padV),
    x: clamp(x1 - PAD_H_PCT),
    h: clamp(y2 - y1 + padV * 2, 0.5),
    w: clamp(x2 - x1 + PAD_H_PCT * 2, 0.5),
  }
}

/* ============================ 主流程 ============================ */

const ocrCacheFile = "/tmp/label-ocr-cache.json"
let ocrCache = {}
try {
  ocrCache = JSON.parse(await (await import("node:fs/promises")).readFile(ocrCacheFile, "utf8"))
} catch {
  ocrCache = {}
}
async function saveOcrCache() {
  await writeFile(ocrCacheFile, JSON.stringify(ocrCache), "utf8")
}

/** 取某张图的 OCR 行：优先用批改时缓存的 ocr_data，其次现场调腾讯 OCR（结果落本地缓存） */
async function getLines(absUrl, cachedPage) {
  if (cachedPage?.lines?.length) {
    return cachedPage.lines.map((l) => ({ text: l.text, bbox: l.bbox }))
  }
  if (ocrCache[absUrl]) return ocrCache[absUrl]
  const lines = await ocrImage(absUrl)
  ocrCache[absUrl] = lines
  await saveOcrCache()
  console.log(`[v0]   现场 OCR: ${lines.length} 行  ${absUrl.slice(-40)}`)
  return lines
}

async function main() {
  const { data: subs, error } = await sb
    .from("submissions")
    .select("id, image_urls, ai_issues, ocr_data")
    .eq("status", "graded")
  if (error) throw new Error(error.message)

  const stat = { text: 0, line: 0, snap: 0, failed: 0, dropped: 0, good: 0, review: 0 }
  const results = []

  for (const s of subs) {
    const details = s.ai_issues?.correction_details
    if (!Array.isArray(details)) continue

    const ocrPages = Array.isArray(s.ocr_data?.pages) ? s.ocr_data.pages : []

    /**
     * 页面清单。注意：批改时若做过纠偏（deskew），ocr_data.pages[i].image_url
     * 才是坐标所对应的那张图，必须优先用它，否则坐标会整体错位。
     */
    const pageUrls = []
    const maxPages = Math.max(s.image_urls?.length ?? 0, ocrPages.length)
    for (let i = 0; i < maxPages; i++) {
      const raw = ocrPages[i]?.image_url ?? s.image_urls?.[i]
      if (raw) pageUrls.push(await toAbsUrl(raw))
      else pageUrls.push(null)
    }

    // 预取每页 OCR 行
    const pageLines = []
    for (let i = 0; i < pageUrls.length; i++) {
      if (!pageUrls[i]) {
        pageLines.push([])
        continue
      }
      try {
        pageLines.push(await getLines(pageUrls[i], ocrPages[i]))
      } catch (e) {
        console.log(`[v0]   OCR 失败 page${i}: ${e.message}`)
        pageLines.push([])
      }
    }

    for (let di = 0; di < details.length; di++) {
      const d = details[di]
      if (!d?.correct_answer) continue

      // ---- 1. 文字定位：所有页里找全局最佳匹配 ----
      let hit = null
      let method = null
      for (let pi = 0; pi < pageLines.length; pi++) {
        if (!pageLines[pi].length) continue
        const m = locateByText(pageLines[pi], d.question_text)
        if (m && (!hit || m.score > hit.score)) {
          hit = { ...m, pageIndex: pi }
          method = "text"
        }
      }

      // ---- 2. box_source==="ocr"：line_indexes 是真实行号，可直接采信 ----
      // 注意 ocr_data.pages[].lines[].index 是跨页连续的全局行号，需按 index 反查
      if (!hit && d.box_source === "ocr" && Array.isArray(d.line_indexes)) {
        for (let pi = 0; pi < ocrPages.length; pi++) {
          const arr = ocrPages[pi]?.lines
          if (!arr?.length) continue
          const idxs = []
          d.line_indexes.forEach((gi) => {
            const at = arr.findIndex((l) => l.index === gi)
            if (at >= 0) idxs.push(at)
          })
          if (idxs.length) {
            hit = { lineIdxs: idxs, score: 1, pageIndex: pi }
            method = "line"
            break
          }
        }
      }

      // ---- 3. bbox 吸附到重叠的 OCR 行 ----
      if (!hit && Array.isArray(d.bounding_box) && d.bounding_box.length === 4) {
        const pi = Math.min(d.page_index ?? 0, Math.max(0, pageLines.length - 1))
        if (pageLines[pi]?.length) {
          const m = snapToLines(pageLines[pi], d.bounding_box)
          if (m) {
            hit = { ...m, pageIndex: pi }
            method = "snap"
          }
        }
      }

      if (!hit) {
        stat.failed++
        continue
      }

      const L = pageLines[hit.pageIndex]
      const refined = refineLines(L, hit.lineIdxs, d.question_text || d.correct_answer || "")
      const box = unionBox(L, refined)

      const matchedText = refined.map((i) => L[i].text).join(" / ")
      const normMatched = norm(matchedText)

      /**
       * 只命中印刷题干、没有任何学生作答的样本必须丢掉。
       * 典型形态：数学卷的 question_text 是转述（"题1(1)等腰直角三角形求椭圆方程"），
       * 文字匹配会命中试卷上印刷的小问标题「(1)求椭圆方程.」——裁出来一个字作答都没有，
       * 拿去训练只会教模型瞎猜。判据：内容很短 + 以小问序号开头。
       */
      const stemOnly =
        normMatched.length < 15 && /^[(（]?\d+\s*[)）.、]/.test(matchedText.trim())

      /**
       * 自动分级。裁图质量直接决定训练数据质量，宁可少要也不能要脏的：
       *  - drop   ：跨栏巨图 / 纯印刷题干 / 内容过少 → 直接丢，不进队列
       *  - good   ：靠「文字内容」定位且实质内容充足 → 不受错误坐标影响，最可信
       *  - review ：靠坐标吸附定位（多为数学手写演算区），位置可能偏，排队列后面人工确认
       */
      if (box.h > 45 || (box.w > 92 && box.h > 25) || stemOnly || normMatched.length < 4) {
        stat.dropped++
        continue
      }
      const quality =
        method === "text" && hit.score >= 0.75 && normMatched.length >= 15 && refined.length <= 5
          ? "good"
          : "review"

      stat[method]++
      stat[quality]++

      results.push({
        submission_id: s.id,
        detail_index: di,
        page_index: hit.pageIndex,
        source_image_url: pageUrls[hit.pageIndex],
        box,
        quality,
        line_count: refined.length,
        locate_method: method,
        locate_score: Number(hit.score.toFixed(3)),
        matched_text: matchedText,
        question_text: d.question_text ?? null,
        correct_answer: d.correct_answer,
        ai_type: d.type ?? null,
        ai_analysis: d.process_analysis ?? null,
        bounding_box: d.bounding_box ?? null,
      })
    }
  }

  console.log(
    `\n[v0] 定位方式：text ${stat.text} | line ${stat.line} | snap ${stat.snap}` +
      `　　丢弃：定位失败 ${stat.failed} | 跨栏巨图 ${stat.dropped}`,
  )
  console.log(`[v0] 质量分级：good ${stat.good} 条（可直接标注） | review ${stat.review} 条（需人工确认）`)

  /* ---------------- 裁图 ---------------- */

  async function crop(r) {
    const { buf, width, height } = await loadImage(r.source_image_url)
    let left = Math.round((r.box.x / 100) * width)
    let top = Math.round((r.box.y / 100) * height)
    let w = Math.round((r.box.w / 100) * width)
    let h = Math.round((r.box.h / 100) * height)
    left = Math.max(0, Math.min(left, width - 2))
    top = Math.max(0, Math.min(top, height - 2))
    w = Math.max(2, Math.min(w, width - left))
    h = Math.max(2, Math.min(h, height - top))

    let img = sharp(buf).extract({ left, top, width: w, height: h })
    // 小图放大，帮助 VLM 看清手写笔画
    const scale = Math.min(MAX_SCALE, Math.max(1, TARGET_MIN_H / h), MAX_W / w)
    if (scale > 1.05) {
      img = img.resize({ width: Math.round(w * scale), kernel: "lanczos3" })
    }
    return { out: await img.jpeg({ quality: 92 }).toBuffer(), w, h }
  }

  if (PROBE) {
    await mkdir(SAMPLE_DIR, { recursive: true })
    // 各种定位方式都抽样，便于对比质量
    const picks = []
    for (const q of ["good", "review"]) {
      picks.push(...results.filter((r) => r.quality === q).slice(0, Math.ceil(SAMPLE_N / 2)))
    }
    let i = 0
    for (const r of picks.slice(0, SAMPLE_N)) {
      const { out, w, h } = await crop(r)
      const f = `${SAMPLE_DIR}/${String(++i).padStart(2, "0")}-${r.quality}-${r.locate_method}.jpg`
      await writeFile(f, out)
      console.log(
        `\n#${i} [${r.quality} · ${r.locate_method} ${r.locate_score}] ${w}x${h}px ${r.line_count}行\n` +
          `   标准答案: ${r.correct_answer.slice(0, 60)}\n` +
          `   题干:     ${(r.question_text ?? "").slice(0, 60)}\n` +
          `   OCR命中:  ${r.matched_text.slice(0, 80)}`,
      )
    }
    console.log(`\n[v0] 样例图已存到 ${SAMPLE_DIR}`)
    return
  }

  /* ---------------- 正式写库 ---------------- */

  let ok = 0
  const fails = []
  for (const r of results) {
    try {
      const { out } = await crop(r)
      const blob = await put(`label-crops/v2/${r.submission_id}-${r.detail_index}.jpg`, out, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      })
      const { error: e } = await sb.from("label_samples").upsert(
        {
          submission_id: r.submission_id,
          detail_index: r.detail_index,
          page_index: r.page_index,
          crop_url: blob.url,
          source_image_url: r.source_image_url,
          bounding_box: [r.box.y, r.box.x, r.box.h, r.box.w],
          question_text: r.question_text,
          correct_answer: r.correct_answer,
          ai_type: r.ai_type,
          ai_analysis: r.ai_analysis,
          locate_method: r.locate_method,
          locate_score: r.locate_score,
          matched_text: r.matched_text,
          quality: r.quality,
          line_count: r.line_count,
        },
        { onConflict: "submission_id,detail_index" },
      )
      if (e) throw new Error(e.message)
      ok++
      if (ok % 25 === 0) console.log(`[v0] 已完成 ${ok}/${results.length}`)
    } catch (e) {
      fails.push(`${r.submission_id}#${r.detail_index}: ${e.message}`)
    }
  }
  console.log(`\n[v0] 成功 ${ok} 条，失败 ${fails.length} 条`)
  fails.slice(0, 10).forEach((f) => console.log("  -", f))
}

main().catch((e) => {
  console.error("[v0] 脚本失败:", e.message)
  process.exit(1)
})
