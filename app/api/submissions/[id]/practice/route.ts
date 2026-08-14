import { NextResponse } from "next/server"
import { getCurrentStudent } from "@/lib/auth-server"
import { getSubmission, getTask, updateSubmissionPractice } from "@/lib/db"
import { generatePracticeSet } from "@/lib/ai/practice"
import { isAIGradingV2 } from "@/lib/types"

/** AI 变式题生成耗时上限（qwen-plus 实测 40~60s，留足余量） */
export const maxDuration = 120

/**
 * POST /api/submissions/[id]/practice
 * 学生本人针对自己已批改的作业，按需生成同知识点变式题闭环。
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const student = await getCurrentStudent()
  if (!student) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const { id } = await ctx.params

  const submission = await getSubmission(id)
  if (!submission) return NextResponse.json({ error: "提交不存在" }, { status: 404 })

  // 防越权：只能给自己的作业生成练习
  if (submission.student_id !== student.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }
  if (submission.status !== "graded") {
    return NextResponse.json({ error: "作业尚未批改，无法生成练习" }, { status: 400 })
  }
  if (!isAIGradingV2(submission.ai_issues)) {
    return NextResponse.json({ error: "该作业暂无可用的批改详情" }, { status: 400 })
  }

  const task = await getTask(submission.task_id)
  if (!task) return NextResponse.json({ error: "作业不存在" }, { status: 404 })

  try {
    const practice = await generatePracticeSet(submission, task)
    const updated = await updateSubmissionPractice(id, practice)
    return NextResponse.json({ practice: updated.practice_data })
  } catch (err: any) {
    console.error("[v0] practice generation failed:", err)
    return NextResponse.json(
      { error: err?.message ?? "变式题生成失败", code: "PRACTICE_FAILED" },
      { status: 500 },
    )
  }
}
