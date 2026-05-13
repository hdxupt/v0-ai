import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { getCurrentUser } from "@/lib/auth-server"
import { supabase } from "@/lib/supabase/client"

export const maxDuration = 30

async function buildClassSnapshot(teacherId: string, teacherClassId: string | null) {
  if (!teacherClassId) return "暂无班级上下文。"
  const sb = supabase()
  const [{ data: students }, { data: tasks }, { data: subs }] = await Promise.all([
    sb.from("app_users").select("id, name").eq("role", "student").eq("class_id", teacherClassId),
    sb
      .from("tasks")
      .select("id, title, subject, due_at, created_at")
      .contains("class_ids", [teacherClassId])
      .order("created_at", { ascending: false })
      .limit(8),
    sb
      .from("submissions")
      .select("id, task_id, student_id, status, score, weak_points, submitted_at")
      .eq("class_id", teacherClassId)
      .order("submitted_at", { ascending: false })
      .limit(80),
  ])

  const studentCount = students?.length ?? 0
  const taskList = (tasks ?? []).map((t: any) => `《${t.title}》(${t.subject})`).join("、")

  // 完成率
  const recentTaskIds = (tasks ?? []).map((t: any) => t.id)
  const submittedByTask = new Map<string, number>()
  for (const s of subs ?? []) {
    if (recentTaskIds.includes(s.task_id)) {
      submittedByTask.set(s.task_id, (submittedByTask.get(s.task_id) ?? 0) + 1)
    }
  }
  const completionLines = (tasks ?? [])
    .map((t: any) => {
      const c = submittedByTask.get(t.id) ?? 0
      const rate = studentCount ? Math.round((c / studentCount) * 100) : 0
      return `  · 《${t.title}》：${c}/${studentCount}（${rate}%）`
    })
    .join("\n")

  // 平均分
  const graded = (subs ?? []).filter((s: any) => s.status === "graded" && typeof s.score === "number")
  const avg = graded.length ? Math.round(graded.reduce((sum: number, s: any) => sum + s.score, 0) / graded.length) : null

  // 学生平均分排序
  const scoreMap = new Map<string, number[]>()
  for (const s of graded) {
    const arr = scoreMap.get(s.student_id) ?? []
    arr.push(s.score)
    scoreMap.set(s.student_id, arr)
  }
  const studentAverages = Array.from(scoreMap.entries())
    .map(([sid, arr]) => {
      const stu = students?.find((u: any) => u.id === sid)
      return {
        name: stu?.name ?? sid,
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      }
    })
    .sort((a, b) => a.avg - b.avg)
  const watchList = studentAverages.slice(0, 3).map((s) => `${s.name}(${s.avg}分)`).join("、")
  const topList = studentAverages.slice(-3).reverse().map((s) => `${s.name}(${s.avg}分)`).join("、")

  // 薄弱知识点（聚合）
  const weakCount = new Map<string, number>()
  for (const s of graded) {
    for (const w of (s.weak_points as any[]) ?? []) {
      if (w?.knowledge) weakCount.set(w.knowledge, (weakCount.get(w.knowledge) ?? 0) + 1)
    }
  }
  const weakList = Array.from(weakCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, c]) => `${k}(${c}次)`)
    .join("、")

  return `# 当前班级学情快照
- 班级人数：${studentCount}
- 近期作业：${taskList || "暂无"}
- 各作业完成率：
${completionLines || "  · 暂无"}
- 班级平均分：${avg !== null ? `${avg} 分` : "暂无已批阅作业"}
- 需重点关注的后三位学生：${watchList || "暂无"}
- 表现优秀的前三位学生：${topList || "暂无"}
- 高频薄弱知识点：${weakList || "暂无"}
`
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "teacher") {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }
  const { messages }: { messages: UIMessage[] } = await req.json()
  const snapshot = await buildClassSnapshot(user.id, user.class_id ?? null)

  const system = `你是希沃 AI 教研助手，专为中学教师服务。你的核心能力：
1. 基于真实班级学情数据回答问题（数据见下方快照）
2. 帮助教师快速定位需要关注的学生与薄弱知识点
3. 提供有针对性的教学建议、出题建议、复习重点
4. 生成班级周报、学情简报

回答原则：
- 用简洁、专业的中文回答，避免冗长开场
- 引用快照中的真实数据时，使用 markdown 列表或表格
- 给出具体可执行的行动建议，不空谈
- 当数据不足时直接说"当前数据暂不足以判断"，不要编造

${snapshot}

教师姓名：${user.name}
当前时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`

  const result = streamText({
    model: "openai/gpt-5-mini",
    system,
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
}
