import { getCurrentUser } from "@/lib/auth-server"
import { getSubmission, getTask } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, AlertTriangle, TrendingDown } from "lucide-react"
import { ImageGallery } from "@/components/student/image-gallery"
import { formatDateTime } from "@/lib/format"
import type { AIIssueAnnotation, WeakPoint } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== "student") redirect("/login")

  const submission = await getSubmission(id)
  if (!submission || submission.student_id !== user.id) notFound()
  if (submission.status !== "graded") {
    redirect(`/student/submitted/${submission.id}`)
  }

  const task = submission.task_id ? await getTask(submission.task_id) : null
  const score = submission.score ?? 0
  const total = submission.total_score ?? 100
  const ratio = score / total

  const scoreColor =
    ratio >= 0.9 ? "text-emerald-600 dark:text-emerald-400"
    : ratio >= 0.75 ? "text-primary"
    : ratio >= 0.6 ? "text-amber-600 dark:text-amber-400"
    : "text-destructive"

  const issues = (submission.ai_issues ?? []) as AIIssueAnnotation[]
  const weakPoints = (submission.weak_points ?? []) as WeakPoint[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <Link href="/student">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Button>
      </Link>

      {/* Score hero */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{task?.subject} · {task?.teacher_name}</p>
              <h1 className="text-xl font-semibold truncate mt-0.5">{task?.title}</h1>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              已批阅
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-6xl font-bold tracking-tight tabular-nums ${scoreColor}`}>{score}</span>
            <span className="text-2xl text-muted-foreground">/ {total}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            批阅于 {submission.graded_at ? formatDateTime(submission.graded_at) : ""}
          </p>
        </div>
      </div>

      {/* AI personal comment */}
      {submission.teacher_comment || submission.ai_comment ? (
        <div className="rounded-2xl border bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 space-y-3 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="font-semibold">AI 老师对你说</h2>
          </div>
          <p className="relative text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {submission.teacher_comment || submission.ai_comment}
          </p>
        </div>
      ) : null}

      {/* AI issue list */}
      {issues.length > 0 ? (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI 标注的问题点
            </h2>
            <Badge variant="secondary" className="text-[10px]">{issues.length} 处</Badge>
          </div>
          <ul className="space-y-2">
            {issues.map((issue, idx) => (
              <li key={issue.id} className="flex items-start gap-2 p-2.5 rounded-md border bg-muted/30 text-xs">
                <div
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ${
                    issue.type === "error" ? "bg-destructive" : "bg-amber-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    {issue.type === "error" ? (
                      <AlertCircle className="w-3 h-3 text-destructive" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    )}
                    <span className="font-medium">
                      {issue.type === "error" ? "错误" : "注意"}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{issue.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Weak points */}
      {weakPoints.length > 0 ? (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            你的薄弱知识点
          </h2>
          <div className="space-y-3">
            {weakPoints.map((w, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{w.name}</p>
                  <Badge variant="outline" className="text-[10px]">失 {w.lostPoints} 分</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">你的得分</p>
                    <p className="font-medium tabular-nums">{w.myScore}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">班级平均</p>
                    <p className="font-medium tabular-nums">{w.classAverage}</p>
                  </div>
                </div>
                {w.reason ? (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t">{w.reason}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Submission images */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">你的答卷</h2>
        <ImageGallery pathnames={submission.image_urls} />
      </div>
    </div>
  )
}
