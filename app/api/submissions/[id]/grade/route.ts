import { NextResponse } from "next/server"
import { getCurrentTeacher } from "@/lib/auth-server"
import { getSubmission, getTask, updateSubmissionGrading } from "@/lib/db"
import { gradeSubmissionWithAI } from "@/lib/ai/grade"

/** Vercel functions max duration for AI grading. */
export const maxDuration = 120

/**
 * POST /api/submissions/[id]/grade
 *
 * 两种用法：
 *   1. { action: "ai" }                   → 调用真实 AI 进行批改并落库
 *   2. { score, ai_comment, ... }         → 手动编辑（保留之前的 AI 结果或人工覆盖）
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const submission = await getSubmission(id)
  if (!submission) return NextResponse.json({ error: "提交不存在" }, { status: 404 })
  const task = await getTask(submission.task_id)
  if (!task) return NextResponse.json({ error: "作业不存在" }, { status: 404 })

  /* -------------------------------- AI 批改 -------------------------------- */
  if (body?.action === "ai") {
    try {
      // 复用已有 OCR 缓存（避免重批改时再次烧调用额度）
      const cachedOcr = (submission as any).ocr_data ?? null
      const payload = await gradeSubmissionWithAI(submission, task, {
        cachedOcrData: cachedOcr,
      })
      const updated = await updateSubmissionGrading(id, {
        score: payload.score,
        ai_comment: payload.ai_comment,
        teacher_comment: "",
        ai_issues: payload.ai_issues,
        weak_points: payload.weak_points,
        student_id: submission.student_id,
        student_name: submission.student_name,
        task_id: submission.task_id,
        task_title: task.title,
        class_id: submission.class_id,
        teacher_name: teacher.name,
        ocr_data: payload.ocr_data,
      })
      return NextResponse.json({ submission: updated })
    } catch (err: any) {
      console.error("[v0] AI grading failed:", err)
      return NextResponse.json(
        { error: err?.message ?? "AI 批改失败", code: "AI_FAILED" },
        { status: 500 },
      )
    }
  }

  /* ------------------------------ 手动覆盖保存 ----------------------------- */
  try {
    const updated = await updateSubmissionGrading(id, {
      score: Number(body.score) || 0,
      ai_comment: String(body.ai_comment ?? ""),
      teacher_comment: String(body.teacher_comment ?? ""),
      ai_issues: body.ai_issues ?? [],
      weak_points: Array.isArray(body.weak_points) ? body.weak_points : [],
      student_id: submission.student_id,
      student_name: submission.student_name,
      task_id: submission.task_id,
      task_title: task.title,
      class_id: submission.class_id,
      teacher_name: teacher.name,
    })
    return NextResponse.json({ submission: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "保存失败" }, { status: 500 })
  }
}


