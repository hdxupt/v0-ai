// 临时验证脚本：直接调用变式题生成，验证 AI 出题逻辑。验证后删除。
import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const sb = createClient(url, key)
const SUB_ID = "a980cdb2-6a5f-446f-ba9c-33f01803850e"

const { data, error } = await sb.from("submissions").select("*").eq("id", SUB_ID).single()
if (error) {
  console.log("[v0] db error", error)
  process.exit(1)
}

const ai = data.ai_issues
const details = ai?.correction_details ?? []
const mistakes = details
  .filter((d) => d.type === "error" || d.type === "partial" || d.type === "missing")
  .slice(0, 6)
  .map((d) => ({
    question_text: d.question_text,
    process_analysis: d.process_analysis,
    correct_answer: d.correct_answer,
    dimension: d.rubric_dimension,
  }))

console.log("[v0] submission score:", ai?.summary?.total_score)
console.log("[v0] weak_points:", ai?.summary?.weak_points)
console.log("[v0] mistakes count:", mistakes.length)
console.log("[v0] sample mistake:", JSON.stringify(mistakes[0], null, 2))

// 动态导入 TS 生成函数需要走编译，这里直接复刻调用以验证 AI Gateway 出题能力
const { generateObject } = await import("ai")
const { PracticeSetResultSchema } = await import("../lib/ai/schemas.ts")
const { buildPracticeSystemPrompt, buildPracticeUserPrompt } = await import("../lib/ai/prompts.ts")

const subject = "math"
const t0 = Date.now()
const { object } = await generateObject({
  model: "anthropic/claude-sonnet-4.5",
  schema: PracticeSetResultSchema,
  system: buildPracticeSystemPrompt(subject),
  prompt: buildPracticeUserPrompt({
    subject,
    studentName: "李同学",
    score: ai?.summary?.total_score ?? 0,
    weakPoints: ai?.summary?.weak_points ?? [],
    mistakes,
  }),
})
console.log("[v0] generated in", Date.now() - t0, "ms")
console.log("[v0] basis:", object.basis)
console.log("[v0] questions:", JSON.stringify(object.questions, null, 2))
