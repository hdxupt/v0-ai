"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Sparkles,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import type { Task, Submission, AppUser } from "@/lib/types"
import { formatDueDate, formatRelativeTime } from "@/lib/format"

interface TaskProgressProps {
  task: Task
  submissions: Submission[]
  students: AppUser[]
}

export function TaskProgress({ task, submissions, students }: TaskProgressProps) {
  const [pendingSelected, setPendingSelected] = useState<Set<string>>(new Set())
  const [reminding, setReminding] = useState(false)

  // 批量批阅状态（针对已提交但未批阅）
  const [pickedSubs, setPickedSubs] = useState<Set<string>>(new Set())
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; scores: number[] }>({
    done: 0,
    total: 0,
    scores: [],
  })

  const submittedStudentIds = useMemo(() => new Set(submissions.map((s) => s.student_id)), [submissions])
  const submittedStudents = students.filter((s) => submittedStudentIds.has(s.id))
  const pendingStudents = students.filter((s) => !submittedStudentIds.has(s.id))
  const ungraded = submissions.filter((s) => s.status !== "graded")

  const total = students.length
  const submittedCount = submittedStudents.length
  const gradedCount = submissions.filter((s) => s.status === "graded").length
  const rate = total ? Math.round((submittedCount / total) * 100) : 0

  function togglePending(id: string) {
    setPendingSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function selectAllPending() {
    setPendingSelected(new Set(pendingStudents.map((s) => s.id)))
  }
  function toggleSub(id: string) {
    setPickedSubs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function selectAllUngraded() {
    setPickedSubs(new Set(ungraded.map((s) => s.id)))
  }

  async function sendReminders() {
    if (pendingSelected.size === 0) {
      toast.error("请先选择要催交的学生")
      return
    }
    setReminding(true)
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, studentIds: Array.from(pendingSelected) }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`已向 ${data.count} 名学生发送催交`)
      setPendingSelected(new Set())
    } catch {
      toast.error("发送失败，请重试")
    } finally {
      setReminding(false)
    }
  }

  async function runBatchGrade() {
    if (pickedSubs.size === 0) {
      toast.error("请先选择要批阅的作业")
      return
    }
    const ids = Array.from(pickedSubs)
    setBatchRunning(true)
    setBatchProgress({ done: 0, total: ids.length, scores: [] })
    try {
      // 分批每次 1 个调用单条 API 以获得渐进进度
      const scores: number[] = []
      for (let i = 0; i < ids.length; i++) {
        const res = await fetch("/api/submissions/batch-grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionIds: [ids[i]] }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.results?.[0]?.score != null) scores.push(data.results[0].score)
        }
        setBatchProgress({ done: i + 1, total: ids.length, scores: [...scores] })
      }
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      toast.success(`${scores.length} 份作业批阅完成，平均分 ${avg}`)
      setPickedSubs(new Set())
    } catch {
      toast.error("批量批阅失败")
    } finally {
      setBatchRunning(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            返回学情看板
          </Button>
        </Link>
      </div>

      {/* 头部 */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">
              {task.subject} · {task.teacher_name}
            </p>
            <h1 className="text-xl font-semibold tracking-tight mt-0.5">{task.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              截止 {formatDueDate(task.due_at)}
            </p>
          </div>

          {gradedCount === submittedCount && submittedCount > 0 ? (
            <Link href={`/dashboard/reports/${task.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                查看学情报告
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="应交" value={total} />
          <Stat label="已交" value={submittedCount} tone="primary" />
          <Stat label="已批阅" value={gradedCount} tone="success" />
          <Stat label="提交率" value={`${rate}%`} />
        </div>

        <Progress value={rate} className="h-2" />
      </div>

      {/* 主体两栏 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 已提交 */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4 flex-wrap gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              已提交 <Badge variant="secondary">{submittedStudents.length}</Badge>
            </h2>
            {ungraded.length > 0 ? (
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={selectAllUngraded}>
                全选待批阅 ({ungraded.length})
              </Button>
            ) : null}
          </div>
          <div className="divide-y">
            {submittedStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">暂无提交</div>
            ) : (
              submittedStudents.map((stu) => {
                const sub = submissions.find((s) => s.student_id === stu.id)!
                const isUngraded = sub.status !== "graded"
                const checked = pickedSubs.has(sub.id)
                return (
                  <div
                    key={stu.id}
                    className={`flex items-center gap-3 p-3 transition-colors ${
                      checked ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    {isUngraded ? (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSub(sub.id)}
                        aria-label={`选择 ${stu.name} 的提交`}
                      />
                    ) : (
                      <span className="w-4" />
                    )}
                    <Link
                      href={`/dashboard/grading/${sub.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                        style={{ backgroundColor: stu.avatar_color ?? "#3B82F6" }}
                      >
                        {stu.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{stu.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(sub.submitted_at)} · {sub.image_urls.length} 张
                        </p>
                      </div>
                      {sub.status === "graded" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 tabular-nums">
                          {sub.score} 分
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          待批阅
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 未提交 */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4 gap-2 flex-wrap">
            <h2 className="font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              未提交 <Badge variant="secondary">{pendingStudents.length}</Badge>
            </h2>
            {pendingStudents.length > 0 ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={selectAllPending}>
                  全选
                </Button>
                <Button
                  size="sm"
                  disabled={pendingSelected.size === 0 || reminding}
                  onClick={sendReminders}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  催交 {pendingSelected.size > 0 ? `(${pendingSelected.size})` : ""}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="divide-y">
            {pendingStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                全班已全部提交！
              </div>
            ) : (
              pendingStudents.map((stu) => (
                <label
                  key={stu.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <Checkbox
                    checked={pendingSelected.has(stu.id)}
                    onCheckedChange={() => togglePending(stu.id)}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                    style={{ backgroundColor: stu.avatar_color ?? "#3B82F6" }}
                  >
                    {stu.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{stu.name}</p>
                    <p className="text-xs text-muted-foreground">{stu.student_no ?? "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-xs gap-1">
                    <AlertCircle className="w-3 h-3" />
                    未交
                  </Badge>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 浮动批量批阅操作栏 */}
      {pickedSubs.size > 0 || batchRunning ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(680px,calc(100vw-2rem))]">
          <div className="rounded-2xl border bg-popover text-popover-foreground shadow-2xl p-3 pl-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {batchRunning ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    正在 AI 批阅（{batchProgress.done} / {batchProgress.total}）
                  </p>
                  <Progress value={(batchProgress.done / batchProgress.total) * 100} className="h-1.5" />
                </div>
              ) : (
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  已选择 <span className="text-primary">{pickedSubs.size}</span> 份未批阅作业
                </p>
              )}
            </div>
            {!batchRunning ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setPickedSubs(new Set())}>
                  <X className="w-3.5 h-3.5" />
                  取消
                </Button>
                <Button size="sm" onClick={runBatchGrade} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  批量 AI 批阅
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "primary" | "success" }) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : ""
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
