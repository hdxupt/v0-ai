import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { getCurrentTeacher } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/client"
import {
  buildClassReportSystemPrompt,
  buildClassReportUserPrompt,
  resolveSubject,
} from "@/lib/ai/prompts"
import { ClassReportSchema } from "@/lib/ai/schemas"
import { AI_MODELS } from "@/lib/ai/config"
import { resolveModel } from "@/lib/ai/gateway"

export const maxDuration = 60

/**
 * POST /api/reports/[taskId]/generate
 *
 * 基于任务下全部已批改 submission，调用 Opus 4.6 生成班级学情诊断报告。
 * - 不写入数据库，结果直接返回（前端缓存即可）
 * - 报告内容包含：整体诊断 + 分数分布 + 班级薄弱知识点 Top3 + 分层教学建议
 */
export async function POST(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const { taskId } = await ctx.params

  const sb = createClient()
  const [{ data: task }, { data: submissions }] = await Promise.all([
    sb.from("tasks").select("*").eq("id", taskId).single(),
    sb
      .from("submissions")
      .select("id, student_name, score, weak_points, ai_issues, status")
      .eq("task_id", taskId)
      .eq("status", "graded"),
  ])

  if (!task) return NextResponse.json({ error: "作业不存在" }, { status: 404 })
  const gradedList = submissions ?? []
  if (gradedList.length === 0) {
    return NextResponse.json(
      { error: "尚无已批改的提交，无法生成学情报告" },
      { status: 400 },
    )
  }

  // 班级名（取第一个 class_id 对应的名字）
  const classId: string | undefined = task.class_ids?.[0]
  let className = "本班"
  if (classId) {
    const { data: cls } = await sb
      .from("classes")
      .select("name")
      .eq("id", classId)
      .maybeSingle()
    if (cls?.name) className = cls.name
  }

  // 整理数据
  const gradedSummary = gradedList.map((s: any) => {
    // weak_points 历史上既存过字符串数组也存过 [{knowledge}] 对象，做个归一化
    const wp: string[] = Array.isArray(s.weak_points)
      ? s.weak_points
          .map((w: any) => (typeof w === "string" ? w : w?.knowledge ?? w?.name ?? ""))
          .filter(Boolean)
          .slice(0, 3)
      : []
    const radar = s.ai_issues?.radar_analysis as Record<string, number> | undefined
    return {
      studentName: s.student_name as string,
      score: Number(s.score) || 0,
      weak_points: wp,
      radar,
    }
  })

  const subject = resolveSubject(task.subject)

  try {
    const { object } = await generateObject({
      model: resolveModel(AI_MODELS.classReport),
      schema: ClassReportSchema,
      system: buildClassReportSystemPrompt(),
      prompt: buildClassReportUserPrompt({
        taskTitle: task.title,
        subject,
        totalScore: 100,
        className,
        graded: gradedSummary,
      }),
      maxRetries: 1,
    })

    return NextResponse.json({
      report: object,
      meta: {
        task_id: taskId,
        task_title: task.title,
        subject,
        graded_count: gradedList.length,
        model: AI_MODELS.classReport,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    console.error("[v0] class report failed:", err)
    return NextResponse.json(
      { error: err?.message ?? "生成失败" },
      { status: 500 },
    )
  }
}
