import dynamic from "next/dynamic"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Download, Share2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ClassAIDiagnostic } from "@/components/reports/class-ai-diagnostic"
import {
  StudentStatusPanel,
  type PanelStudent,
} from "@/components/reports/student-status-panel"
import { TeachingSuggestions } from "@/components/reports/teaching-suggestions"
import { createClient } from "@/lib/supabase/client"
import { isAIGradingV2, normalizeWeakPoints } from "@/lib/types"
import type { Submission, AIGradingV2 } from "@/lib/types"

const ScoreDistributionChart = dynamic(
  () =>
    import("@/components/reports/score-distribution-chart").then((m) => m.ScoreDistributionChart),
  { loading: () => <Skeleton className="h-[300px] w-full" /> },
)
const KnowledgeRadarChart = dynamic(
  () => import("@/components/reports/knowledge-radar-chart").then((m) => m.KnowledgeRadarChart),
  { loading: () => <Skeleton className="h-[300px] w-full" /> },
)

const RADAR_LABEL: Record<keyof AIGradingV2["radar_analysis"], string> = {
  basics: "计算与基础",
  logic: "逻辑思维",
  knowledge: "知识掌握",
  application: "应用能力",
  presentation: "书写规范",
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = createClient()

  const [{ data: task }, { data: submissionsRaw }] = await Promise.all([
    sb.from("tasks").select("*").eq("id", id).maybeSingle(),
    sb.from("submissions").select("*").eq("task_id", id),
  ])

  if (!task) notFound()
  const submissions = (submissionsRaw ?? []) as Submission[]

  // 抓班级名 + 班级学生总数（用于"未提交"列表）
  const classId = task.class_ids?.[0] as string | undefined
  const [{ data: cls }, { data: classStudents }] = await Promise.all([
    classId
      ? sb.from("classes").select("name, grade").eq("id", classId).maybeSingle()
      : Promise.resolve({ data: null }),
    classId
      ? sb
          .from("app_users")
          .select("id, name, student_no")
          .eq("role", "student")
          .eq("class_id", classId)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const className = cls?.name ?? "—"
  const totalStudents = classStudents?.length ?? task.target_student_count ?? submissions.length

  // 提交映射
  const submittedByStudentId = new Map(submissions.map((s) => [s.student_id, s]))

  /* ----------------------------- 计算分数分布 ----------------------------- */
  const graded = submissions.filter((s) => s.status === "graded" && typeof s.score === "number")
  const scores = graded.map((s) => Number(s.score) || 0)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const dist = [
    {
      range: "90-100",
      count: scores.filter((v) => v >= 90).length,
    },
    {
      range: "75-89",
      count: scores.filter((v) => v >= 75 && v < 90).length,
    },
    {
      range: "60-74",
      count: scores.filter((v) => v >= 60 && v < 75).length,
    },
    {
      range: "0-59",
      count: scores.filter((v) => v < 60).length,
    },
  ]

  /* ----------------------------- 五维 radar 均值 ----------------------------- */
  const radarAccum = { basics: 0, logic: 0, knowledge: 0, application: 0, presentation: 0 }
  let radarCount = 0
  for (const s of graded) {
    if (isAIGradingV2(s.ai_issues)) {
      const r = s.ai_issues.radar_analysis
      ;(Object.keys(radarAccum) as Array<keyof typeof radarAccum>).forEach((k) => {
        radarAccum[k] += r[k] ?? 0
      })
      radarCount++
    }
  }
  const radarPoints =
    radarCount > 0
      ? (Object.keys(radarAccum) as Array<keyof typeof radarAccum>).map((k) => {
          const mastery = Math.round(radarAccum[k] / radarCount)
          return { name: RADAR_LABEL[k], mastery, errorRate: 100 - mastery }
        })
      : []

  /* ----------------------------- 班级薄弱词频 ----------------------------- */
  const weakFreq = new Map<string, number>()
  for (const s of graded) {
    for (const w of normalizeWeakPoints(s.weak_points as any)) {
      weakFreq.set(w, (weakFreq.get(w) ?? 0) + 1)
    }
  }
  const topWeak = Array.from(weakFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([name]) => name)[0]

  /* ----------------------------- 学生提交状态 ----------------------------- */
  const panelStudents: PanelStudent[] =
    (classStudents ?? []).map((u: any, idx: number) => {
      const sub = submittedByStudentId.get(u.id)
      return {
        id: u.id,
        name: u.name,
        studentNo: u.student_no ?? `S${idx + 1}`,
        submitted: !!sub,
        score: sub?.score ?? null,
        submittedAt: sub
          ? new Date(sub.submitted_at).toLocaleString("zh-CN", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        submissionId: sub?.id,
      }
    }) ?? []
  // 排名：在已提交里按分数排
  panelStudents
    .filter((s) => s.submitted && typeof s.score === "number")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .forEach((s, i) => {
      s.rank = i + 1
    })

  const notSubmittedNames = panelStudents.filter((s) => !s.submitted).map((s) => s.name)
  const submittedCount = submissions.length
  const rate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0
  const date = new Date(task.created_at ?? Date.now())

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard">
            <ChevronLeft className="w-3.5 h-3.5" />
            返回看板
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-muted-foreground">作业学情报告</span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{task.title}</h1>
            <Badge
              className="bg-[color:var(--success,#22c55e)]/12 text-[color:var(--success,#22c55e)] border-[color:var(--success,#22c55e)]/30"
              variant="outline"
            >
              {graded.length === submittedCount && submittedCount > 0 ? "批改完成" : "进行中"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{task.subject}</span>
            <span>·</span>
            <span>{className}</span>
            <span>·</span>
            <span>
              布置于 {date.getMonth() + 1}月{date.getDate()}日
            </span>
            <span>·</span>
            <span>
              提交率 <span className="text-foreground font-medium">{rate}%</span>
            </span>
            <span>·</span>
            <span>
              平均分 <span className="text-foreground font-medium">{avg}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-card">
            <Share2 className="w-3.5 h-3.5" />
            分享报告
          </Button>
          <Button variant="outline" size="sm" className="bg-card">
            <Download className="w-3.5 h-3.5" />
            导出 PDF
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Sparkles className="w-3.5 h-3.5" />
            一键备课
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        <div className="xl:col-span-7 space-y-6 min-w-0">
          <ClassAIDiagnostic
            taskId={id}
            fallback={{
              submitted: submittedCount,
              total: totalStudents,
              average: avg,
              notSubmittedNames,
              topWeakPoint: topWeak,
            }}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreDistributionChart data={dist} />
            <KnowledgeRadarChart data={radarPoints.length > 0 ? radarPoints : undefined} />
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6 min-w-0">
          <StudentStatusPanel students={panelStudents} />
          <TeachingSuggestions />
        </div>
      </div>
    </div>
  )
}
