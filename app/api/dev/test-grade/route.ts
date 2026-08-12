import { NextResponse } from "next/server"
import { gradeSubmissionWithVLM } from "@/lib/ai/grade-vlm"
import type { Submission, Task } from "@/lib/types"

export const maxDuration = 300

/**
 * 金标准测试路由（仅开发环境）：
 * 对 public/samples 下的样卷跑真实 VLM 批改链路，返回完整 ai_issues（含 question_verdicts），
 * 用于验证红笔留痕坐标质量。生产环境直接 404。
 *
 * 用法：GET /api/dev/test-grade?img=/samples/math-83-student.jpg&subject=math
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const img = searchParams.get("img")
  const subject = searchParams.get("subject") ?? "math"
  if (!img || !img.startsWith("/samples/")) {
    return NextResponse.json({ error: "img must be a /samples/ path" }, { status: 400 })
  }

  // 用本机可达的绝对 URL，走链路里现成的 http 下载分支
  const origin = new URL(req.url).origin
  const imageUrl = `${origin}${img}`

  const submission = {
    id: "dev-test",
    image_urls: [imageUrl],
  } as unknown as Submission

  const task = {
    id: "dev-test-task",
    title: `金标准测试 ${img}`,
    subject,
    answer_key_text: searchParams.get("answer") ?? "",
    answer_key_urls: [],
    scoring_notes: "",
  } as unknown as Task

  const t0 = Date.now()
  try {
    const payload = await gradeSubmissionWithVLM(submission, task)
    return NextResponse.json({
      elapsed_ms: Date.now() - t0,
      score: payload.score,
      summary: payload.ai_issues.summary,
      verdict_count: payload.ai_issues.question_verdicts?.length ?? 0,
      question_verdicts: payload.ai_issues.question_verdicts ?? [],
      correction_count: payload.ai_issues.correction_details.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "grade failed", elapsed_ms: Date.now() - t0 }, { status: 500 })
  }
}
