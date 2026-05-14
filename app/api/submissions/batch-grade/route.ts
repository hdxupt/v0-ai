import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/client"
import { updateSubmissionGrading } from "@/lib/db"
import { gradeSubmissionWithAI, pMapLimit } from "@/lib/ai/grade"
import { GRADING_CONCURRENCY } from "@/lib/ai/config"
import type { Submission, Task } from "@/lib/types"

const sb = createClient()

/** Vercel functions max duration for batch grading. */
export const maxDuration = 300

interface BatchResult {
  id: string
  ok: boolean
  score?: number
  error?: string
  student_name?: string
}

/**
 * POST /api/submissions/batch-grade
 * body: { submissionIds: string[] }
 *
 * 真实 AI 批量批改：
 * - 并发限流（默认 5），避免一次性把 AI Gateway 限速
 * - 单个 submission 失败不中断整批
 * - 返回每条结果状态（成功/失败 + 失败原因），方便前端展示失败列表
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.submissionIds) ? body.submissionIds : []
  if (ids.length === 0) {
    return NextResponse.json({ error: "missing submissionIds" }, { status: 400 })
  }

  // 一次性拉所有相关 submission / task / student
  const { data: submissions, error } = await sb
    .from("submissions")
    .select("*")
    .in("id", ids)
  if (error || !submissions?.length) {
    return NextResponse.json({ error: "submissions not found" }, { status: 404 })
  }

  const taskIds = Array.from(new Set(submissions.map((s: any) => s.task_id)))
  const { data: tasks } = await sb.from("tasks").select("*").in("id", taskIds)
  const taskMap = new Map<string, Task>((tasks ?? []).map((t: any) => [t.id, t as Task]))

  const results = await pMapLimit(
    submissions as Submission[],
    GRADING_CONCURRENCY,
    async (sub) => {
      const task = taskMap.get(sub.task_id)
      if (!task) throw new Error("作业不存在")

      const payload = await gradeSubmissionWithAI(sub, task)
      await updateSubmissionGrading(sub.id, {
        score: payload.score,
        ai_comment: payload.ai_comment,
        teacher_comment: "",
        ai_issues: payload.ai_issues,
        weak_points: payload.weak_points,
        student_id: sub.student_id,
        student_name: sub.student_name,
        task_id: sub.task_id,
        task_title: task.title,
        class_id: sub.class_id,
        teacher_name: user.name,
      })
      return {
        id: sub.id,
        score: payload.score,
        student_name: sub.student_name,
      }
    },
  )

  const flat: BatchResult[] = results.map((r, i) => {
    const sub = (submissions as Submission[])[i]!
    if (r.ok) return { id: sub.id, ok: true, score: r.value.score, student_name: sub.student_name }
    console.error("[v0] batch-grade failed for", sub.id, r.error.message)
    return { id: sub.id, ok: false, error: r.error.message, student_name: sub.student_name }
  })

  const okItems = flat.filter((r) => r.ok)
  const avg =
    okItems.length === 0
      ? 0
      : Math.round(okItems.reduce((s, r) => s + (r.score ?? 0), 0) / okItems.length)

  return NextResponse.json({
    count: okItems.length,
    failed: flat.filter((r) => !r.ok).length,
    average: avg,
    results: flat,
  })
}
