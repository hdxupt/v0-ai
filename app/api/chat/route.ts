import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai"
import { z } from "zod"
import { getCurrentTeacher } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/client"
import { resolveModel } from "@/lib/ai/gateway"
import { AI_MODELS } from "@/lib/ai/config"
import { normalizeWeakPoints } from "@/lib/types"

export const maxDuration = 60

/* ----------------------------- agent 数据工具 ----------------------------- */

/**
 * 教研助手的实时数据查询工具集（全部限定在教师本班范围内）。
 * 有了这些工具，助手不再受限于系统提示里的聚合快照，
 * 可以按需下钻到「每个学生的每次作业分数、薄弱点、评语」粒度。
 */
function buildTeacherTools(classId: string) {
  const sb = createClient()

  return {
    getScoreMatrix: tool({
      description:
        "获取本班学生 × 最近作业的完整分数矩阵，含每位学生的每次作业得分、平均分、未交记录。回答'哪些学生需要关注/进步最大/成绩波动'等问题时必须先调用此工具。",
      inputSchema: z.object({
        taskLimit: z.number().min(1).max(12).describe("统计最近几次作业，默认 8"),
      }),
      execute: async ({ taskLimit }) => {
        const [{ data: students }, { data: tasks }] = await Promise.all([
          sb.from("app_users").select("id, name, student_no").eq("role", "student").eq("class_id", classId),
          sb
            .from("tasks")
            .select("id, title, subject, created_at")
            .contains("class_ids", [classId])
            .order("created_at", { ascending: false })
            .limit(taskLimit ?? 8),
        ])
        const taskIds = (tasks ?? []).map((t: any) => t.id)
        const { data: subs } = taskIds.length
          ? await sb
              .from("submissions")
              .select("task_id, student_id, status, score")
              .eq("class_id", classId)
              .in("task_id", taskIds)
          : { data: [] as any[] }

        const rows = (students ?? []).map((stu: any) => {
          const cells = (tasks ?? []).map((t: any) => {
            const sub = (subs ?? []).find((s: any) => s.task_id === t.id && s.student_id === stu.id)
            if (!sub) return { task: t.title, status: "未交", score: null }
            if (sub.status !== "graded") return { task: t.title, status: "待批", score: null }
            return { task: t.title, status: "已批", score: sub.score }
          })
          const scores = cells.filter((c) => typeof c.score === "number").map((c) => c.score as number)
          return {
            name: stu.name,
            student_no: stu.student_no,
            scores: cells,
            average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
            missing_count: cells.filter((c) => c.status === "未交").length,
          }
        })
        return { tasks: (tasks ?? []).map((t: any) => ({ title: t.title, subject: t.subject })), students: rows }
      },
    }),

    getStudentDetail: tool({
      description:
        "按姓名查询单个学生的完整学情：历次作业分数、薄弱知识点、最近一次 AI 评语。回答关于具体某个学生的问题时调用。",
      inputSchema: z.object({
        studentName: z.string().describe("学生姓名，如'李思琪'"),
      }),
      execute: async ({ studentName }) => {
        const { data: stu } = await sb
          .from("app_users")
          .select("id, name, student_no")
          .eq("role", "student")
          .eq("class_id", classId)
          .eq("name", studentName)
          .maybeSingle()
        if (!stu) return { error: `本班没有找到学生「${studentName}」` }

        const { data: subs } = await sb
          .from("submissions")
          .select("task_title, status, score, weak_points, ai_comment, submitted_at")
          .eq("student_id", stu.id)
          .order("submitted_at", { ascending: false })
          .limit(10)

        const weakAll = new Map<string, number>()
        for (const s of subs ?? []) {
          for (const w of normalizeWeakPoints(s.weak_points as any)) {
            weakAll.set(w, (weakAll.get(w) ?? 0) + 1)
          }
        }
        return {
          name: stu.name,
          student_no: stu.student_no,
          history: (subs ?? []).map((s: any) => ({
            task: s.task_title,
            status: s.status,
            score: s.score,
            weak_points: normalizeWeakPoints(s.weak_points),
          })),
          recurring_weak_points: Array.from(weakAll.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([k, c]) => `${k}（${c}次）`),
          latest_ai_comment: (subs ?? []).find((s: any) => s.ai_comment)?.ai_comment ?? null,
        }
      },
    }),

    getWeakPointStudents: tool({
      description:
        "查询在某个知识点上出错的学生名单及其出错次数。回答'哪些学生在XX知识点薄弱/需要针对XX补差'时调用。",
      inputSchema: z.object({
        keyword: z.string().describe("知识点关键词，如'三角函数'，支持模糊匹配"),
      }),
      execute: async ({ keyword }) => {
        const { data: subs } = await sb
          .from("submissions")
          .select("student_name, task_title, weak_points, score")
          .eq("class_id", classId)
          .eq("status", "graded")
          .order("submitted_at", { ascending: false })
          .limit(100)

        const hits = new Map<string, { count: number; tasks: Set<string>; scores: number[] }>()
        for (const s of subs ?? []) {
          const matched = normalizeWeakPoints(s.weak_points as any).filter((w) => w.includes(keyword))
          if (matched.length === 0) continue
          const cur = hits.get(s.student_name) ?? { count: 0, tasks: new Set<string>(), scores: [] }
          cur.count += matched.length
          cur.tasks.add(s.task_title)
          if (typeof s.score === "number") cur.scores.push(s.score)
          hits.set(s.student_name, cur)
        }
        return {
          keyword,
          students: Array.from(hits.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, v]) => ({
              name,
              error_count: v.count,
              related_tasks: Array.from(v.tasks),
              avg_score: v.scores.length
                ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)
                : null,
            })),
        }
      },
    }),
  }
}

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

/**
 * 解析教师的班级上下文。
 * 教师的 user.class_id 恒为 null（教师带多个班，不挂在单个班上），
 * 与看板一致：取班级列表第一个班作为当前上下文。
 * 这曾是教研助手"数据不足"的根因——快照与工具都拿不到班级。
 */
async function resolveTeacherClassId(user: { class_id: string | null }): Promise<string | null> {
  if (user.class_id) return user.class_id
  const sb = createClient()
  const { data } = await sb
    .from("classes")
    .select("id")
    .order("display_order")
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

export async function POST(req: Request) {
  const user = await getCurrentTeacher()
  if (!user || user.role !== "teacher") {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }
  const body = await req.json()
  const messages: UIMessage[] = body.messages ?? []
  const taskId: string | null = typeof body.taskId === "string" && body.taskId ? body.taskId : null

  const classId = await resolveTeacherClassId(user)

  const snapshot = taskId
    ? await buildSingleTaskSnapshot(classId, taskId)
    : await buildClassSnapshot(user.id, classId)

  const scopeHint = taskId
    ? "当前对话的分析范围已被锁定为某一次具体作业；当用户提到'本班/学情'时，请明确指代该作业，而不是历史汇总。"
    : "当前对话的分析范围是教师班级最近 8 次作业的聚合数据。"

  const system = `你是希沃 AI 教研助手，专为中学教师服务。你的核心能力：
1. 基于真实班级学情数据回答问题（概览见下方快照；细粒度数据用工具查询）
2. 帮助教师快速定位需要关注的学生与薄弱知识点
3. 提供有针对性的教学建议、出题建议、复习重点
4. 生成班级周报、学情简报

你拥有三个实时数据查询工具，回答涉及具体学生/分数/知识点的问题前必须先调用工具拿到真实数据：
- getScoreMatrix：全班学生 × 近几次作业的分数矩阵（谁需要关注、谁在进步、谁常缺交）
- getStudentDetail：单个学生的历次分数、反复出现的薄弱点、最近评语
- getWeakPointStudents：某知识点上出错的学生名单

回答原则：
- 用简洁、专业的中文回答，避免冗长开场
- 引用真实数据时，使用 markdown 列表或表格
- 给出具体可执行的行动建议，不空谈
- 先查工具再回答；只有工具也查不到时才说"当前数据暂不足以判断"，��要编造

${scopeHint}

${snapshot}

教师姓名：${user.name}
当前时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`

  const result = streamText({
    model: resolveModel(AI_MODELS.chat),
    system,
    messages: await convertToModelMessages(messages),
    tools: classId ? buildTeacherTools(classId) : undefined,
    stopWhen: stepCountIs(6),
  })
  return result.toUIMessageStreamResponse()
}
