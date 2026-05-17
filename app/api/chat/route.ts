import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { getCurrentTeacher } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/client"
import { resolveModel } from "@/lib/ai/gateway"
import { AI_MODELS } from "@/lib/ai/config"

export const maxDuration = 30

/**
 * 构造"全班级最近 8 个作业"汇总学情快照（默认场景）。
 * 当用户在 AI 助手里选择了具体某个作业时，会改走 buildSingleTaskSnapshot。
 */
async function buildClassSnapshot(teacherId: string, teacherClassId: string | null) {
  if (!teacherClassId) return "暂无班级上下文。"
  const sb = createClient()
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

  return `# 当前班级学情快照（最近 ${(tasks ?? []).length} 次作业聚合）
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

/**
 * 构造"单个作业"维度的学情快照。
 * 学生数量固定为该班级花名册；提交/批改/未交均以本作业为基准统计。
 */
async function buildSingleTaskSnapshot(teacherClassId: string | null, taskId: string) {
  if (!teacherClassId) return "暂无班级上下文。"
  const sb = createClient()

  const [{ data: task }, { data: students }, { data: subs }] = await Promise.all([
    sb.from("tasks").select("id, title, subject, due_at, created_at").eq("id", taskId).maybeSingle(),
    sb.from("app_users").select("id, name").eq("role", "student").eq("class_id", teacherClassId),
    sb
      .from("submissions")
      .select("id, student_id, status, score, weak_points, submitted_at, ai_comment")
      .eq("task_id", taskId)
      .eq("class_id", teacherClassId),
  ])

  if (!task) return "未找到该作业。"

  const studentCount = students?.length ?? 0
  const submittedSet = new Set((subs ?? []).map((s: any) => s.student_id))
  const submittedCount = submittedSet.size
  const notSubmitted = (students ?? [])
    .filter((s: any) => !submittedSet.has(s.id))
    .map((s: any) => s.name)

  const graded = (subs ?? []).filter(
    (s: any) => s.status === "graded" && typeof s.score === "number",
  )
  const avg = graded.length
    ? Math.round(graded.reduce((sum: number, s: any) => sum + s.score, 0) / graded.length)
    : null

  // 分数分段
  const dist = { excellent: 0, good: 0, pass: 0, fail: 0 }
  for (const s of graded) {
    const sc = s.score as number
    if (sc >= 90) dist.excellent++
    else if (sc >= 75) dist.good++
    else if (sc >= 60) dist.pass++
    else dist.fail++
  }

  // 学生分数排序
  const scoreById = new Map<string, number>()
  for (const s of graded) scoreById.set(s.student_id, s.score as number)
  const scored = (students ?? [])
    .filter((s: any) => scoreById.has(s.id))
    .map((s: any) => ({ name: s.name, score: scoreById.get(s.id)! }))
    .sort((a, b) => a.score - b.score)
  const watchList = scored.slice(0, 3).map((s) => `${s.name}(${s.score}分)`).join("、")
  const topList = scored.slice(-3).reverse().map((s) => `${s.name}(${s.score}分)`).join("、")

  // 薄弱知识点
  const weakCount = new Map<string, number>()
  for (const s of graded) {
    for (const w of (s.weak_points as any[]) ?? []) {
      if (typeof w === "string") weakCount.set(w, (weakCount.get(w) ?? 0) + 1)
      else if (w?.knowledge) weakCount.set(w.knowledge, (weakCount.get(w.knowledge) ?? 0) + 1)
    }
  }
  const weakList = Array.from(weakCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, c]) => `${k}(${c}次)`)
    .join("、")

  const completionRate = studentCount ? Math.round((submittedCount / studentCount) * 100) : 0
  const gradedRate = submittedCount ? Math.round((graded.length / submittedCount) * 100) : 0

  return `# 单作业学情快照
- 作业：《${(task as any).title}》（${(task as any).subject}）
- 班级人数：${studentCount}
- 提交情况：${submittedCount}/${studentCount}（完成率 ${completionRate}%）
- 批改进度：${graded.length}/${submittedCount || 0}（已批改率 ${gradedRate}%）
- 未提交学生：${notSubmitted.length ? notSubmitted.join("、") : "全员已交"}
- 平均分：${avg !== null ? `${avg} 分` : "暂无已批阅"}
- 分数分布：优秀(≥90) ${dist.excellent} 人、良好(75~89) ${dist.good} 人、及格(60~74) ${dist.pass} 人、不及格 ${dist.fail} 人
- 需重点关注：${watchList || "暂无"}
- 表现优秀：${topList || "暂无"}
- 高频薄弱知识点：${weakList || "暂无"}

回答时请把分析严格限定在本次作业上，不要泛化到其他作业；可结合分数分布给出分层教学建议。
`
}

export async function POST(req: Request) {
  const user = await getCurrentTeacher()
  if (!user || user.role !== "teacher") {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }
  const body = await req.json()
  const messages: UIMessage[] = body.messages ?? []
  const taskId: string | null = typeof body.taskId === "string" && body.taskId ? body.taskId : null

  const snapshot = taskId
    ? await buildSingleTaskSnapshot(user.class_id ?? null, taskId)
    : await buildClassSnapshot(user.id, user.class_id ?? null)

  const scopeHint = taskId
    ? "当前对话的分析范围已被锁定为某一次具体作业；当用户提到'本班/学情'时，请明确指代该作业，而不是历史汇总。"
    : "当前对话的分析范围是教师班级最近 8 次作业的聚合数据。"

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

${scopeHint}

${snapshot}

教师姓名：${user.name}
当前时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`

  const result = streamText({
    model: resolveModel(AI_MODELS.chat),
    system,
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
}
