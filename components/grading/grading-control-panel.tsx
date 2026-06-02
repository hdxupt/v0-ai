"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CircleSlash,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  AIIssuesField,
  AIGradingV2,
  AIBboxType,
  AppUser,
  Submission,
  Task,
} from "@/lib/types"
import { isAIGradingV2, normalizeWeakPoints, buildScoreBreakdown } from "@/lib/types"
import { ScoreProvenance } from "@/components/grading/score-provenance"

type Phase = "idle" | "processing" | "done" | "error"

interface Props {
  submission: Submission
  task: Task
  student: AppUser
  teacher: AppUser
  aiField: AIIssuesField
  onAiFieldChange: (f: AIIssuesField) => void
  onAnnotationToggle: (show: boolean) => void
}

const RADAR_LABEL: Record<keyof AIGradingV2["radar_analysis"], string> = {
  basics: "计算与基础",
  logic: "逻辑思维",
  knowledge: "知识掌握",
  application: "应用能力",
  presentation: "书写规范",
}

const TYPE_BADGE: Record<AIBboxType, { label: string; cls: string; Icon: any }> = {
  error: { label: "错误", cls: "bg-destructive text-destructive-foreground", Icon: AlertCircle },
  partial: {
    label: "半对",
    cls: "bg-[color:var(--warning,#f59e0b)] text-white",
    Icon: AlertTriangle,
  },
  highlight: { label: "亮点", cls: "bg-emerald-500 text-white", Icon: Sparkles },
  missing: { label: "漏做", cls: "bg-muted-foreground text-background", Icon: CircleSlash },
}

export function GradingControlPanel({
  submission,
  task,
  student,
  aiField,
  onAiFieldChange,
  onAnnotationToggle,
}: Props) {
  const router = useRouter()
  const initiallyGraded = submission.status === "graded"
  const v2 = isAIGradingV2(aiField) ? (aiField as AIGradingV2) : null

  const [phase, setPhase] = useState<Phase>(initiallyGraded || v2 ? "done" : "idle")
  const [score, setScore] = useState<number>(submission.score ?? 0)
  const [aiComment] = useState(submission.ai_comment ?? "")
  const [teacherComment, setTeacherComment] = useState(
    submission.teacher_comment ?? submission.ai_comment ?? "",
  )
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const submittedAtLabel = useMemo(
    () =>
      new Date(submission.submitted_at).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [submission.submitted_at],
  )

  const weakPointStrings = v2
    ? v2.summary.weak_points
    : normalizeWeakPoints(submission.weak_points as any)

  const scoreBreakdown = useMemo(() => buildScoreBreakdown(aiField), [aiField])

  async function handleStartAI() {
    setPhase("processing")
    setErrorMsg(null)
    onAnnotationToggle(false)
    try {
      const res = await fetch(`/api/submissions/${submission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "AI 批阅失败")

      const updated = data.submission as Submission
      onAiFieldChange(updated.ai_issues as AIIssuesField)
      setScore(updated.score ?? 0)
      setTeacherComment(updated.ai_comment ?? "")
      setPhase("done")
      onAnnotationToggle(true)
      toast.success("AI 批阅完成", {
        description: `共识别 ${
          isAIGradingV2(updated.ai_issues) ? updated.ai_issues.correction_details.length : 0
        } 处批注`,
      })
    } catch (e: any) {
      console.error("[v0] AI grade error:", e)
      setPhase("error")
      setErrorMsg(e?.message ?? "AI 批阅失败")
      toast.error("AI 批阅失败", { description: e?.message })
    }
  }

  function handleReset() {
    setPhase("idle")
    onAiFieldChange([])
    setScore(0)
    setTeacherComment("")
    setErrorMsg(null)
    onAnnotationToggle(false)
  }

  async function handleSubmit() {
    if (phase !== "done") {
      toast.error("请先运行 AI 批阅")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/submissions/${submission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          ai_comment: aiComment,
          teacher_comment: teacherComment,
          ai_issues: aiField,
          weak_points: weakPointStrings,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(err.error || "保存失败")
      }
      toast.success("已发送至学生端", {
        description: `${student.name} 将在通知中心收到批阅结果`,
      })
      router.refresh()
      setTimeout(() => router.push(`/dashboard/tasks/${task.id}`), 600)
    } catch (e: any) {
      toast.error(e.message ?? "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            提交于 {submittedAtLabel} · 共 {submission.image_urls.length} 张
          </span>
          <Badge
            variant="outline"
            className={cn(
              "font-normal",
              phase === "done" &&
                "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
              phase === "processing" && "bg-primary/12 text-primary border-primary/25",
              phase === "error" && "bg-destructive/10 text-destructive border-destructive/30",
              phase === "idle" && "bg-muted text-muted-foreground border-border",
            )}
          >
            {phase === "done" && (initiallyGraded ? "已批阅" : "AI 已批阅")}
            {phase === "processing" && "AI 批阅中"}
            {phase === "error" && "批阅失败"}
            {phase === "idle" && "待批阅"}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11">
            <AvatarFallback
              className="text-white font-medium"
              style={{ backgroundColor: student.avatar_color }}
            >
              {student.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold leading-tight">{student.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {student.student_no ? `学号 ${student.student_no}` : "学生"}
              <span className="mx-1.5">·</span>
              {task.subject}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* AI 控制台 */}
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">AI 批阅控制台</div>
              <div className="text-[11px] text-muted-foreground">
                Claude Opus 4.7 · Visual Grounding · 学科自适应
              </div>
            </div>
          </div>

          {phase === "idle" && (
            <Button onClick={handleStartAI} className="w-full bg-primary hover:bg-primary/90" size="lg">
              <Sparkles className="w-4 h-4" />
              启动 AI 自动批阅
            </Button>
          )}

          {phase === "processing" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI 正在识别手写内容并定位错误...（约 20-40 秒）
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-2">
              <p className="text-xs text-destructive leading-relaxed">{errorMsg}</p>
              <Button onClick={handleStartAI} variant="outline" size="sm" className="w-full">
                <RotateCcw className="w-3 h-3" />
                重试
              </Button>
            </div>
          )}

          {phase === "done" && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {initiallyGraded ? "已有批阅结果" : "批阅完成"}
                {v2 ? (
                  <span className="text-muted-foreground ml-1">
                    · {v2.correction_details.length} 处批注
                  </span>
                ) : null}
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
                <RotateCcw className="w-3 h-3" />
                重新批阅
              </Button>
            </div>
          )}
        </Card>

        {/* 五维雷达 */}
        {phase === "done" && v2 ? (
          <Card className="p-4 gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                五维能力分析
              </span>
            </div>
            <div className="space-y-1.5">
              {(Object.keys(RADAR_LABEL) as Array<keyof AIGradingV2["radar_analysis"]>).map((k) => {
                const v = v2.radar_analysis[k] ?? 0
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-muted-foreground shrink-0">{RADAR_LABEL[k]}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-[color:var(--chart-2)]"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums font-medium">{v}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : null}

        {/* 评分溯源：满分→逐条扣分→最终分 */}
        {phase === "done" && scoreBreakdown ? (
          <ScoreProvenance breakdown={scoreBreakdown} />
        ) : null}

        {/* 薄弱知识点 */}
        {phase === "done" && weakPointStrings.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              核心薄弱知识点
            </span>
            <div className="flex flex-wrap gap-1.5">
              {weakPointStrings.map((wp, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="font-normal bg-destructive/5 text-destructive border-destructive/30"
                >
                  {wp}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {/* 批注列表（v2） */}
        {phase === "done" && v2 && v2.correction_details.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 批注明细
              </span>
              <Badge variant="secondary" className="font-normal h-5 text-[10px]">
                {v2.correction_details.length} 处
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {v2.correction_details.map((d, idx) => {
                const meta = TYPE_BADGE[d.type] ?? TYPE_BADGE.error
                const Icon = meta.Icon
                return (
                  <li
                    key={d.id ?? idx}
                    className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-card text-xs"
                  >
                    <div
                      className={cn(
                        "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                        meta.cls,
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        <span className="font-medium">{meta.label}</span>
                        {d.question_text ? (
                          <span className="text-muted-foreground/70 truncate">
                            · {d.question_text}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{d.process_analysis}</p>
                      {d.correct_answer ? (
                        <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                          正确做法：{d.correct_answer}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {/* 评分 */}
        {phase === "done" ? (
          <Card className="p-4 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 自动评分
              </span>
              <Badge variant="outline" className="text-[10px] font-normal">
                可编辑
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="text-5xl font-semibold tracking-tight tabular-nums bg-transparent w-24 outline-none focus:text-primary border-b-2 border-transparent focus:border-primary"
              />
              <span className="text-base text-muted-foreground">/ 100</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-[color:var(--chart-2)] transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
          </Card>
        ) : null}

        {/* 评语 */}
        {phase === "done" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 个性化评语
              </span>
              <Badge variant="outline" className="text-[10px] font-normal gap-1 bg-accent/30 border-accent">
                <Sparkles className="w-2.5 h-2.5" />
                AI 生成
              </Badge>
            </div>
            <Textarea
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              rows={6}
              className="resize-none text-sm leading-relaxed"
              placeholder="请审阅并修改 AI 生成的评语..."
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              提示：此评语将随作业结果一同发送至{student.name}的学生端。
            </p>
          </div>
        ) : null}
      </div>

      <div className="px-5 py-3 border-t border-border bg-card flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          disabled={saving}
          onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
        >
          返回列表
        </Button>
        <Button
          className="flex-1 bg-primary hover:bg-primary/90"
          disabled={saving || phase !== "done"}
          onClick={handleSubmit}
        >
          <Send className="w-3.5 h-3.5" />
          {saving ? "保存中..." : initiallyGraded ? "更新结果" : "确认并发送"}
        </Button>
      </div>
    </div>
  )
}
