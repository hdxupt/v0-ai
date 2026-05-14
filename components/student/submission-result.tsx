"use client"

import { useState } from "react"
import { Sparkles, Clock, CheckCircle2, Target, Trophy, MessageCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"
import { toViewerBoxes, normalizeWeakPoints, type Submission, type Task, type ViewerBox } from "@/lib/types"
import { toFileSrc } from "@/lib/blob-url"
import { AiCommentStructured } from "@/components/student/ai-comment-structured"
import { AnnotationDetailList } from "@/components/student/annotation-detail-list"

export function SubmissionResult({ submission, task }: { submission: Submission; task: Task }) {
  const isGraded = submission.status === "graded"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-normal">
              {task.subject}
            </Badge>
            <h2 className="text-lg font-semibold tracking-tight">{task.title}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {task.teacher_name} 布置 · 提交于 {formatRelativeTime(submission.submitted_at)}
          </p>
        </div>
        {isGraded ? (
          <Badge className="bg-[color:var(--success)]/12 text-[color:var(--success)] border border-[color:var(--success)]/30 hover:bg-[color:var(--success)]/12">
            <Sparkles className="w-3 h-3" />
            已批阅
          </Badge>
        ) : (
          <Badge className="bg-primary/12 text-primary border border-primary/25 hover:bg-primary/12">
            <Clock className="w-3 h-3" />
            等待批阅中
          </Badge>
        )}
      </div>

      {isGraded ? (
        <GradedView submission={submission} task={task} />
      ) : (
        <PendingView submission={submission} />
      )}
    </div>
  )
}

function PendingView({ submission }: { submission: Submission }) {
  return (
    <>
      <Card className="p-6 bg-primary/[0.03] border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm mb-1">作业已提交，等待老师批阅</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              你的答卷已成功送达老师端，老师批阅完成后会通过 AI 学伴第一时间通知你。
              批阅完成后这里将展示详细的得分、AI 评语、知识点分析和个性化推荐练习。
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">已提交答卷</h3>
          <span className="text-xs text-muted-foreground">共 {submission.image_urls.length} 张图片</span>
        </div>
        <ImageGallery pathnames={submission.image_urls} />
        {submission.note && (
          <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">提交备注</p>
            <p className="text-xs leading-relaxed">{submission.note}</p>
          </div>
        )}
      </Card>
    </>
  )
}

function GradedView({ submission, task }: { submission: Submission; task: Task }) {
  const scorePercent = submission.total_score > 0 ? (submission.score! / submission.total_score) * 100 : 0
  const passLevel = scorePercent >= 60
  const excellent = scorePercent >= 85
  const viewerBoxes = toViewerBoxes(submission.ai_issues)
  const weakPoints = normalizeWeakPoints(submission.weak_points)
  /** 与图片 bbox 共享的高亮状态：null 表示无悬停 */
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null)

  return (
    <>
      {/* Score Hero */}
      <Card className="p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">本次得分</p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-6xl font-semibold tracking-tight tabular-nums leading-none",
                  excellent
                    ? "text-[color:var(--success)]"
                    : passLevel
                      ? "text-primary"
                      : "text-[color:var(--warning)]",
                )}
              >
                {submission.score}
              </span>
              <span className="text-xl text-muted-foreground">/ {submission.total_score}</span>
              <Badge
                className={cn(
                  "ml-2 hover:bg-current/12",
                  excellent
                    ? "bg-[color:var(--success)]/12 text-[color:var(--success)] border-[color:var(--success)]/30"
                    : passLevel
                      ? "bg-primary/12 text-primary border-primary/25"
                      : "bg-[color:var(--warning)]/12 text-[color:var(--warning)] border-[color:var(--warning)]/30",
                )}
                variant="outline"
              >
                {excellent ? "优秀" : passLevel ? "合格" : "待提升"}
              </Badge>
            </div>
            <Progress value={scorePercent} className="h-1.5 mt-4 max-w-md" />
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                得分率 {scorePercent.toFixed(0)}%
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                AI 标注 {viewerBoxes.length} 处
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                批阅于 {submission.graded_at ? formatRelativeTime(submission.graded_at) : ""}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Teacher comment */}
      {submission.teacher_comment && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">{task.teacher_name}评语</h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{submission.teacher_comment}</p>
        </Card>
      )}

      {/* AI comment - 结构化分块 */}
      {submission.ai_comment && <AiCommentStructured comment={submission.ai_comment} />}

      {/* Weak points */}
      {weakPoints.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-[color:var(--warning)]" />
            <h3 className="text-sm font-medium">薄弱知识点</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {weakPoints.map((wp, idx) => (
              <Badge key={idx} variant="outline" className="text-[11px]">
                {wp}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Answer images + linked annotation list */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[color:var(--success)]" />
            <h3 className="text-sm font-medium">我的答卷 + AI 批注</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            共 {submission.image_urls.length} 张 · {viewerBoxes.length} 处批注
          </span>
        </div>
        <ImageGallery
          pathnames={submission.image_urls}
          annotations={viewerBoxes}
          activeBoxId={activeBoxId}
          onHoverBox={setActiveBoxId}
        />
        {viewerBoxes.length > 0 && (
          <>
            <div className="border-t border-border" />
            <AnnotationDetailList
              boxes={viewerBoxes}
              activeId={activeBoxId}
              onHoverChange={setActiveBoxId}
            />
          </>
        )}
      </Card>
    </>
  )
}

function ImageGallery({
  pathnames,
  annotations,
  activeBoxId,
  onHoverBox,
}: {
  pathnames: string[]
  annotations?: ViewerBox[]
  activeBoxId?: string | null
  onHoverBox?: (id: string | null) => void
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  if (pathnames.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">无图片</p>
    )
  }
  const src = pathnames[activeIdx]

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={toFileSrc(src)} alt="答卷图片" className="w-full h-full object-contain" />
        {/* Render AI issue boxes only on first image for simplicity */}
        {activeIdx === 0 &&
          annotations?.map((box, idx) => {
            const isActive = activeBoxId === box.id
            const baseColor =
              box.type === "error" || box.type === "missing"
                ? "border-destructive bg-destructive/15"
                : box.type === "highlight"
                  ? "border-emerald-500 bg-emerald-500/15"
                  : "border-[color:var(--warning)] bg-[color:var(--warning)]/15"
            const activeColor =
              box.type === "error" || box.type === "missing"
                ? "border-destructive bg-destructive/30 shadow-lg shadow-destructive/40"
                : box.type === "highlight"
                  ? "border-emerald-500 bg-emerald-500/30 shadow-lg shadow-emerald-500/40"
                  : "border-[color:var(--warning)] bg-[color:var(--warning)]/30 shadow-lg shadow-[color:var(--warning)]/40"
            const dot =
              box.type === "error" || box.type === "missing"
                ? "bg-destructive"
                : box.type === "highlight"
                  ? "bg-emerald-500"
                  : "bg-[color:var(--warning)]"
            return (
              <div
                key={box.id}
                onMouseEnter={() => onHoverBox?.(box.id)}
                onMouseLeave={() => onHoverBox?.(null)}
                className={cn(
                  "absolute rounded-sm cursor-pointer transition-all duration-200",
                  isActive ? `border-[3px] ${activeColor} scale-[1.02] z-10` : `border-2 ${baseColor}`,
                )}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                }}
              >
                <span
                  className={cn(
                    "absolute -top-1.5 -left-1.5 rounded-full text-[9px] font-semibold text-white flex items-center justify-center shadow transition-all",
                    dot,
                    isActive ? "w-5 h-5 text-[10px] ring-2 ring-background" : "w-4 h-4",
                  )}
                >
                  {idx + 1}
                </span>
              </div>
            )
          })}
      </div>
      {pathnames.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {pathnames.map((p, idx) => (
            <button
              key={p}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors",
                activeIdx === idx ? "border-primary" : "border-transparent",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p || "/placeholder.svg"}
                alt={`第 ${idx + 1} 张`}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
