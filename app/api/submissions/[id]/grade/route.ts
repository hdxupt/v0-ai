import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { getSubmission, getTask, updateSubmissionGrading } from "@/lib/db"

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentUser()
  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = await req.json()
  const submission = await getSubmission(id)
  if (!submission) return NextResponse.json({ error: "提交不存在" }, { status: 404 })
  const task = await getTask(submission.task_id)
  if (!task) return NextResponse.json({ error: "作业不存在" }, { status: 404 })

  try {
    const updated = await updateSubmissionGrading(id, {
      score: Number(body.score) || 0,
      ai_comment: String(body.ai_comment ?? ""),
      teacher_comment: String(body.teacher_comment ?? ""),
      ai_issues: Array.isArray(body.ai_issues) ? body.ai_issues : [],
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
