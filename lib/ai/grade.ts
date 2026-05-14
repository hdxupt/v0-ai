import { generateObject } from "ai"
import { get } from "@vercel/blob"
import type { Submission, Task } from "@/lib/types"
import {
  buildGradeSystemPrompt,
  buildGradeUserPrompt,
  resolveSubject,
} from "./prompts"
import { GradingResultSchema, type GradingResult } from "./schemas"
import { AI_MODELS, GRADING_TIMEOUT_MS } from "./config"
import { getGateway } from "./gateway"

/**
 * 从私有 Blob 拉取图片字节，转成 AI SDK 6 可以直接喂的 data URL。
 * 私有 store 不能让模型直接通过 URL 访问，必须 server 端拿到字节后转 base64。
 */
async function fetchBlobAsDataUrl(pathnameOrUrl: string): Promise<string> {
  // 兼容历史 public URL：直接返回，让 AI SDK 自己抓
  if (/^https?:\/\//i.test(pathnameOrUrl)) return pathnameOrUrl

  const result = await get(pathnameOrUrl, { access: "private" })
  if (!result || !result.stream) throw new Error(`图片不存在: ${pathnameOrUrl}`)

  // 把 stream 收成 Buffer
  const chunks: Uint8Array[] = []
  const reader = result.stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const buf = new Uint8Array(totalLen)
  let off = 0
  for (const c of chunks) {
    buf.set(c, off)
    off += c.byteLength
  }
  const base64 = Buffer.from(buf).toString("base64")
  const mime = result.blob.contentType || "image/jpeg"
  return `data:${mime};base64,${base64}`
}

export interface AIGradePayload {
  /** 0~100 归一化得分 */
  score: number
  /** 评语（来自 AI） */
  ai_comment: string
  /** weak_points 短语数组 */
  weak_points: string[]
  /** 完整 AI 结果（视觉框 + radar + summary） */
  ai_issues: {
    version: 2
    model: string
    graded_subject: ReturnType<typeof resolveSubject>
    summary: GradingResult["summary"]
    correction_details: GradingResult["correction_details"]
    radar_analysis: GradingResult["radar_analysis"]
  }
}

/**
 * 调用 AI Gateway 进行真实批改。
 * 单卷批改与批量批改共用此函数。
 *
 * - System 提示词稳定不变，便于 Anthropic prompt caching。
 * - 用 generateObject + Zod schema 强制结构化输出，避免 JSON 解析失败。
 * - 内置超时控制，防止模型卡死阻塞批量任务。
 */
export async function gradeSubmissionWithAI(
  submission: Submission,
  task: Task,
): Promise<AIGradePayload> {
  const subject = resolveSubject(task.subject)
  const imageUrls = (submission.image_urls ?? []).slice(0, 9)
  if (imageUrls.length === 0) {
    throw new Error("学生未上传任何作业图片，无法批改")
  }

  const system = buildGradeSystemPrompt(subject)
  const userText = buildGradeUserPrompt({
    subject,
    taskTitle: task.title,
    taskRequirements: task.requirements,
    taskNotes: task.notes,
    totalScore: 100,
    studentName: submission.student_name,
    studentNote: submission.note,
  })

  // 把每张私有图片转成 base64 data URL，再喂给视觉模型
  const dataUrls = await Promise.all(imageUrls.map((p) => fetchBlobAsDataUrl(p)))

  const userContent: Array<
    { type: "text"; text: string } | { type: "image"; image: URL | string }
  > = [{ type: "text", text: userText }]
  for (const u of dataUrls) userContent.push({ type: "image", image: u })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GRADING_TIMEOUT_MS)

  try {
    const gateway = getGateway()
    const { object } = await generateObject({
      model: gateway(AI_MODELS.grading),
      schema: GradingResultSchema,
      system,
      messages: [
        {
          role: "user",
          content: userContent,
          // providerOptions 由 AI Gateway 透传到 Anthropic 实现 prompt caching
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
      ],
      abortSignal: controller.signal,
      maxRetries: 1,
    })

    const scaledScore = Math.max(0, Math.min(100, object.summary.total_score))

    return {
      score: scaledScore,
      ai_comment: object.teacher_comment,
      weak_points: object.summary.weak_points,
      ai_issues: {
        version: 2,
        model: AI_MODELS.grading,
        graded_subject: subject,
        summary: object.summary,
        correction_details: object.correction_details,
        radar_analysis: object.radar_analysis,
      },
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 简单的并发限流：limit 个 worker 并行处理 items。
 * 抛错的 item 会作为 { ok: false, error } 进入结果，不会中断整个批次。
 */
export async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: Error }>> {
  const results: Array<{ ok: true; value: R } | { ok: false; error: Error }> = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) break
      try {
        const value = await worker(items[idx]!, idx)
        results[idx] = { ok: true, value }
      } catch (e: any) {
        results[idx] = { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
      }
    }
  })
  await Promise.all(runners)
  return results
}
