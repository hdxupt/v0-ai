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
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AIIssueAnnotation, AppUser, Submission, Task, WeakPoint } from "@/lib/types"

type Phase = "idle" | "processing" | "done"

interface Props {
  submission: Submission
  task: Task
  student: AppUser
  teacher: AppUser
  issues: AIIssueAnnotation[]
  onIssuesChange: (issues: AIIssueAnnotation[]) => void
  onAnnotationToggle: (show: boolean) => void
}

// Deterministic mock that "analyzes" a submission and returns plausible AI output
function mockAnalyze(task: Task, submission: Submission) {
  const seed = (submission.id + task.id).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rng = (mod: number, offset = 0) => (seed * 9301 + offset * 49297) % 233280 % mod

  const subject = task.subject
  const issueLibrary: Record<string, Array<{ type: "error" | "warning"; message: string }>> = {
    数学: [
      { type: "error", message: "三角恒等变换：sin²x + cos²x 的应用方向错误" },
      { type: "error", message: "诱导公式符号判定有误，第二象限 sin 应为正" },
      { type: "warning", message: "解题步骤跳跃，建议补充'两边平方'的依据" },
      { type: "warning", message: "字母 x 与运算符 × 区分不清晰，易混淆" },
    ],
    语文: [
      { type: "error", message: "引文出处错误，本句出自《劝学》而非《师说》" },
      { type: "warning", message: "比喻论证使用恰当，但缺少与论点的直接关联" },
      { type: "warning", message: "结尾段落过于仓促，建议升华到家国情怀" },
    ],
    英语: [
      { type: "error", message: "主谓不一致，主语为单数 each student 应用 was" },
      { type: "warning", message: "建议替换为更高阶的连接词 furthermore" },
      { type: "warning", message: "时态混用，请统一使用过去时" },
    ],
    物理: [
      { type: "error", message: "受力分析遗漏摩擦力 f = μN" },
      { type: "warning", message: "矢量符号未标注方向" },
    ],
    化学: [
      { type: "error", message: "化学方程式未配平，左侧氢原子数不匹配" },
      { type: "warning", message: "缺少反应条件 △（加热）的标注" },
    ],
  }
  const lib = issueLibrary[subject] ?? issueLibrary["数学"]
  const issueCount = 2 + (rng(2) || 1)
  const issues: AIIssueAnnotation[] = []
  for (let i = 0; i < issueCount; i++) {
    const def = lib[(rng(lib.length, i + 1)) % lib.length]
    issues.push({
      id: `iss-${submission.id}-${i}`,
      x: 8 + ((rng(60, i * 3 + 5)) % 60),
      y: 12 + ((rng(70, i * 4 + 11)) % 70),
      w: 22 + ((rng(15, i + 1)) % 15),
      h: 6 + ((rng(6, i + 2)) % 6),
      type: def.type,
      message: def.message,
    })
  }

  const errCount = issues.filter((i) => i.type === "error").length
  const warnCount = issues.length - errCount
  const totalScore = submission.total_score ?? 100
  const score = Math.max(60, totalScore - errCount * 8 - warnCount * 3 - (rng(4, 7) % 4))

  const weakPoints: WeakPoint[] = (() => {
    if (subject === "数学")
      return [
        { name: "三角恒等变换", myScore: 65, classAverage: 78, lostPoints: 12, reason: "诱导公式记忆混淆" },
        { name: "符号运算细节", myScore: 70, classAverage: 84, lostPoints: 8, reason: "正负号失误" },
      ]
    if (subject === "语文")
      return [
        { name: "古文引用准确度", myScore: 70, classAverage: 82, lostPoints: 8, reason: "出处记忆混淆" },
        { name: "论证升华", myScore: 72, classAverage: 80, lostPoints: 6, reason: "结尾段落仓促" },
      ]
    return [
      { name: "基础概念", myScore: 72, classAverage: 82, lostPoints: 8, reason: "概念理解不够透彻" },
      { name: "答题规范", myScore: 68, classAverage: 80, lostPoints: 6, reason: "步骤跳跃" },
    ]
  })()

  const aiComment = `本次作业整体${score >= 85 ? "完成出色" : score >= 70 ? "完成认真" : "尚有提升空间"}，${errCount > 0 ? `在${weakPoints[0]?.name ?? "重点知识"}部分存在 ${errCount} 处明确错误` : "基础掌握良好"}。${warnCount > 0 ? `另发现 ${warnCount} 处需要注意的细节。` : ""}建议结合错题集中针对性练习，${weakPoints[0]?.reason ?? "重点关注答题规范性"}。继续保持！`

  return { issues, weakPoints, score, aiComment }
}

export function GradingControlPanel({
  submission,
  task,
  student,
  teacher,
  issues,
  onIssuesChange,
  onAnnotationToggle,
}: Props) {
  const router = useRouter()
  const initiallyGraded = submission.status === "graded"
  const [phase, setPhase] = useState<Phase>(initiallyGraded ? "done" : "idle")
  const [comment, setComment] = useState(submission.teacher_comment ?? submission.ai_comment ?? "")
  const [aiComment, setAiComment] = useState(submission.ai_comment ?? "")
  const [score, setScore] = useState<number>(submission.score ?? 0)
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>(submission.weak_points ?? [])
  const [saving, setSaving] = useState(false)

  const submittedAtLabel = useMemo(
    () => new Date(submission.submitted_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [submission.submitted_at],
  )

  function handleStartAI() {
    setPhase("processing")
    onAnnotationToggle(false)
    setTimeout(() => {
      const result = mockAnalyze(task, submission)
      onIssuesChange(result.issues)
      setWeakPoints(result.weakPoints)
      setScore(result.score)
      setAiComment(result.aiComment)
      setComment(result.aiComment)
      setPhase("done")
      onAnnotationToggle(true)
    }, 1600)
  }

  function handleReset() {
    setPhase("idle")
    onIssuesChange([])
    setWeakPoints([])
    setScore(0)
    setAiComment("")
    setComment("")
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
          teacher_comment: comment,
          ai_issues: issues,
          weak_points: weakPoints,
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
      // Back to task progress so the teacher can pick the next one
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
              phase === "done" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
              phase === "processing" && "bg-primary/12 text-primary border-primary/25",
              phase === "idle" && "bg-muted text-muted-foreground border-border",
            )}
          >
            {phase === "done" && (initiallyGraded ? "已批阅" : "AI 已批阅")}
            {phase === "processing" && "AI 批阅中"}
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">AI 批阅控制台</div>
              <div className="text-[11px] text-muted-foreground">基于希沃 OCR 与教研知识库</div>
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
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </div>
                AI 正在识别并分析答题内容...
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}

          {phase === "done" && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {initiallyGraded ? "已有批阅结果" : "批阅完成"}
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
                <RotateCcw className="w-3 h-3" />
                重新批阅
              </Button>
            </div>
          )}
        </Card>

        {phase === "done" && issues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 识别问题点
              </span>
              <Badge variant="secondary" className="font-normal h-5 text-[10px]">
                {issues.length} 处
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {issues.map((issue, idx) => (
                <li
                  key={issue.id}
                  className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-card text-xs"
                >
                  <div
                    className={cn(
                      "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white",
                      issue.type === "error" && "bg-destructive",
                      issue.type === "warning" && "bg-[color:var(--warning)]",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      {issue.type === "error" ? (
                        <AlertCircle className="w-3 h-3 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-[color:var(--warning)]" />
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
        )}

        {phase === "done" && (
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
              <span className="text-base text-muted-foreground">/ {submission.total_score ?? 100}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-[color:var(--chart-2)] transition-all"
                style={{ width: `${(score / (submission.total_score ?? 100)) * 100}%` }}
              />
            </div>
          </Card>
        )}

        {phase === "done" && (
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
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="resize-none text-sm leading-relaxed"
              placeholder="请审阅并修改 AI 生成的评语..."
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              提示：此评语将随作业结果一同发送至{student.name}的学生端。
            </p>
          </div>
        )}
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
