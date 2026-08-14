import { generateObject } from "ai"
import type { Submission, Task, PracticeSet, PracticeQuestion } from "@/lib/types"
import { isAIGradingV2 } from "@/lib/types"
import { buildPracticeSystemPrompt, buildPracticeUserPrompt, resolveSubject } from "./prompts"
import { PracticeSetResultSchema } from "./schemas"
import { AI_MODELS } from "./config"
import { resolveModel } from "./gateway"

/** 变式题生成超时（qwen-plus 出 3 道题实测约 40~60s，放宽到 110s） */
const PRACTICE_TIMEOUT_MS = 110_000
const PRACTICE_MAX_OUTPUT_TOKENS = 4000

/**
 * 基于一份已批改 submission 的错题，生成同知识点变式题。
 * 纯文本调用，成本低；用 sonnet 控本。
 */
export async function generatePracticeSet(submission: Submission, task: Task): Promise<PracticeSet> {
  const subject = resolveSubject(task.subject)
  const field = submission.ai_issues

  // 从 v2 批改结果里抽取错题（error / partial / missing，跳过 highlight 亮点）
  const mistakes: Array<{
    question_text: string
    process_analysis: string
    correct_answer?: string
    dimension?: string
  }> = []
  let weakPoints: string[] = []

  if (isAIGradingV2(field)) {
    weakPoints = field.summary?.weak_points ?? []
    for (const d of field.correction_details ?? []) {
      if (d.type === "highlight") continue
      mistakes.push({
        question_text: d.question_text,
        process_analysis: d.process_analysis,
        correct_answer: d.correct_answer,
        dimension: d.rubric_dimension,
      })
    }
  }

  const system = buildPracticeSystemPrompt(subject)
  const userText = buildPracticeUserPrompt({
    subject,
    studentName: submission.student_name,
    score: submission.score ?? 0,
    weakPoints,
    mistakes: mistakes.slice(0, 8),
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PRACTICE_TIMEOUT_MS)
  try {
    const model = resolveModel(AI_MODELS.classReport) // qwen-plus：纯文本生成，控成本
    let object: (typeof PracticeSetResultSchema)["_output"]
    try {
      const result = await generateObject({
        model,
        schema: PracticeSetResultSchema,
        maxOutputTokens: PRACTICE_MAX_OUTPUT_TOKENS,
        system,
        messages: [{ role: "user", content: userText }],
        abortSignal: controller.signal,
        maxRetries: 1,
      })
      object = result.object
    } catch (e: any) {
      // generateObject 不跑 schema 上的 z.preprocess（questions 可能是 JSON 字符串等）。
      // 从 e.cause.value 取原始输出，手动 safeParse 走 preprocess 恢复（与报告端点同款兜底）。
      const rawValue = e?.cause?.value ?? e?.value ?? null
      const looksLikeValidationError =
        e?.name === "AI_TypeValidationError" ||
        e?.cause?.name === "ZodError" ||
        (e?.message ?? "").includes("response did not match schema")
      console.log(
        "[v0] practice generateObject failed:",
        JSON.stringify({
          errName: e?.name,
          causeName: e?.cause?.name,
          msg: (e?.message ?? "").slice(0, 150),
          hasRaw: rawValue != null,
          rawPreview: rawValue ? JSON.stringify(rawValue).slice(0, 400) : null,
        }),
      )
      if (!looksLikeValidationError || rawValue == null) throw e
      const parsed = PracticeSetResultSchema.safeParse(rawValue)
      if (!parsed.success) {
        console.log("[v0] practice schema recovery failed:", JSON.stringify(parsed.error.issues.slice(0, 3)))
        throw e
      }
      object = parsed.data
    }

    // 给每题补稳定 id，转成存储结构
    const questions: PracticeQuestion[] = object.questions.map((q, i) => ({
      id: `pq-${i + 1}`,
      dimension: q.dimension,
      knowledge: q.knowledge,
      type: q.type,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
    }))

    return {
      version: 1,
      generated_at: new Date().toISOString(),
      basis: object.basis,
      questions,
    }
  } finally {
    clearTimeout(timer)
  }
}
