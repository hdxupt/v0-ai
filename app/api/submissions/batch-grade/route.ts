import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/client"
import { updateSubmissionGrading } from "@/lib/db"

const sb = createClient()

function mockAIGrade(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const rand = (n: number) => {
    h = (h * 1103515245 + 12345) | 0
    return Math.abs(h) % n
  }
  const score = 75 + rand(21)
  const issuesPool = [
    { knowledge: "计算粗心", description: "运算过程中符号错误", severity: "minor", location: "" },
    { knowledge: "概念理解", description: "公式应用不熟练", severity: "moderate", location: "" },
    { knowledge: "解题思路", description: "缺少关键步骤推理", severity: "moderate", location: "" },
    { knowledge: "审题不细", description: "未注意题目隐含条件", severity: "minor", location: "" },
  ]
  const weakPool = [
    { knowledge: "三角函数化简", mastery: 60 + rand(20) },
    { knowledge: "二倍角公式", mastery: 55 + rand(25) },
    { knowledge: "辅助角公式", mastery: 50 + rand(30) },
  ]
  const numIssues = 1 + rand(2)
  const numWeak = 1 + rand(2)
  return {
    score,
    ai_comment:
      score >= 90
        ? "答题工整，思路清晰，知识掌握扎实。继续保持！"
        : score >= 80
          ? "整体掌握较好，部分细节需注意，建议复习薄弱知识点。"
          : "基础知识需要加强，建议针对薄弱点专项练习。",
    teacher_comment: "",
    ai_issues: issuesPool.slice(0, numIssues).map((i) => ({ ...i, location: `第 ${1 + rand(5)} 题` })),
    weak_points: weakPool.slice(0, numWeak),
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.submissionIds) ? body.submissionIds : []
  if (ids.length === 0) {
    return NextResponse.json({ error: "missing submissionIds" }, { status: 400 })
  }

  // 查 submissions 及关联 task + student 信息
  const { data: submissions, error } = await sb
    .from("submissions")
    .select("id, task_id, student_id")
    .in("id", ids)
  if (error || !submissions?.length) {
    return NextResponse.json({ error: "submissions not found" }, { status: 404 })
  }

  const taskIds = Array.from(new Set(submissions.map((s: any) => s.task_id)))
  const studentIds = Array.from(new Set(submissions.map((s: any) => s.student_id)))
  const [{ data: tasks }, { data: students }] = await Promise.all([
    sb.from("tasks").select("id, title, class_ids").in("id", taskIds),
    sb.from("app_users").select("id, name, class_id").in("id", studentIds),
  ])
  const taskMap = new Map((tasks ?? []).map((t: any) => [t.id, t]))
  const studentMap = new Map((students ?? []).map((s: any) => [s.id, s]))

  const results: Array<{ id: string; score: number }> = []
  for (const sub of submissions as any[]) {
    const task = taskMap.get(sub.task_id) as any
    const stu = studentMap.get(sub.student_id) as any
    if (!task || !stu) continue
    const grade = mockAIGrade(sub.id)
    await updateSubmissionGrading(sub.id, {
      ...grade,
      student_id: stu.id,
      student_name: stu.name,
      task_id: task.id,
      task_title: task.title,
      class_id: stu.class_id,
      teacher_name: user.name,
    })
    results.push({ id: sub.id, score: grade.score })
  }

  const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length))
  return NextResponse.json({ count: results.length, average: avg, results })
}
