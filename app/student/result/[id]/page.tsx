import { getCurrentUser } from "@/lib/auth-server"
import { getSubmission, getTask } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, AlertTriangle, TrendingDown, Lightbulb } from "lucide-react"
import { ImageGallery } from "@/components/student/image-gallery"
import { formatDateTime } from "@/lib/format"
import { isAIGradingV2, toViewerBoxes, normalizeWeakPoints } from "@/lib/types"
import { KnowledgeRadarChart } from "@/components/reports/knowledge-radar-chart"

export const dynamic = "force-dynamic"

const TYPE_LABEL: Record<string, string> = {
  error: "错误",
  partial: "部分正确",
  highlight: "亮点",
  missing: "漏答",
  warning: "提醒",
}

const TYPE_STYLE: Record<string, { dot: string; icon: typeof AlertCircle }> = {
  error: { dot: "bg-destructive", icon: AlertCircle },
  partial: { dot: "bg-amber-500", icon: AlertTriangle },
  highlight: { dot: "bg-emerald-500", icon: Sparkles },
  missing: { dot: "bg-zinc-500", icon: AlertCircle },
  warning: { dot: "bg-amber-500", icon: AlertTriangle },
}

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

  const aiIssues = submission.ai_issues
  const v2 = isAIGradingV2(aiIssues) ? aiIssues : null
  const boxes = toViewerBoxes(aiIssues)
  const weakPoints = normalizeWeakPoints(submission.weak_points)

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
          {v2 ? (
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
              <span>识别题目 {v2.summary.total_detected_questions}</span>
              <span className="text-emerald-600 dark:text-emerald-400">正确 {v2.summary.correct_count}</span>
              <span className="text-destructive">错误 {v2.summary.wrong_count}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* AI teacher comment */}
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

      {/* Radar chart (v2 only) */}
      {v2 ? (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            五维能力分析
          </h2>
          <KnowledgeRadarChart
            data={[
              { dimension: "计算基础", score: v2.radar_analysis.basics, fullMark: 100 },
              { dimension: "逻辑思维", score: v2.radar_analysis.logic, fullMark: 100 },
              { dimension: "知识掌握", score: v2.radar_analysis.knowledge, fullMark: 100 },
              { dimension: "应用能力", score: v2.radar_analysis.application, fullMark: 100 },
              { dimension: "书写规范", score: v2.radar_analysis.presentation, fullMark: 100 },
            ]}
          />
        </div>
      ) : null}

      {/* AI issue list */}
      {boxes.length > 0 ? (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI 标注的逐题分析
            </h2>
            <Badge variant="secondary" className="text-[10px]">{boxes.length} 处</Badge>
          </div>
          <ul className="space-y-2">
            {boxes.map((box, idx) => {
              const style = TYPE_STYLE[box.type] ?? TYPE_STYLE.error
              const Icon = style.icon
              return (
                <li key={box.id} className="flex items-start gap-2 p-2.5 rounded-md border bg-muted/30 text-xs">
                  <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ${style.dot}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Icon className="w-3 h-3" />
                      <span className="font-medium">{TYPE_LABEL[box.type] ?? "标注"}</span>
                      {box.question_text ? (
                        <span className="ml-1 text-muted-foreground truncate">· {box.question_text}</span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{box.message}</p>
                    {box.correct_answer ? (
                      <p className="mt-1 text-[11px] text-foreground/80">
                        <Lightbulb className="inline w-3 h-3 mr-0.5" />
                        参考答案：{box.correct_answer}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
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
          <div className="flex flex-wrap gap-1.5">
            {weakPoints.map((w, i) => (
              <Badge key={i} variant="outline" className="text-[11px]">{w}</Badge>
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
