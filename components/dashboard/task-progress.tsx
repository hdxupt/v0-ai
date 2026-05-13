"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Sparkles,
  ChevronRight,
  Image as ImageIcon,
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reminding, setReminding] = useState(false)

  const submittedStudentIds = useMemo(() => new Set(submissions.map((s) => s.student_id)), [submissions])
  const submittedStudents = students.filter((s) => submittedStudentIds.has(s.id))
  const pendingStudents = students.filter((s) => !submittedStudentIds.has(s.id))

  const total = students.length
  const submittedCount = submittedStudents.length
  const gradedCount = submissions.filter((s) => s.status === "graded").length
  const rate = total ? Math.round((submittedCount / total) * 100) : 0

  function togglePending(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function selectAllPending() {
    setSelected(new Set(pendingStudents.map((s) => s.id)))
  }

  async function sendReminders() {
    if (selected.size === 0) {
      toast.error("请先选择要催交的学生")
      return
    }
    setReminding(true)
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, studentIds: Array.from(selected) }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`已向 ${data.count} 名学生发送催交`)
      setSelected(new Set())
    } catch {
      toast.error("发送失败，请重试")
    } finally {
      setReminding(false)
    }
  }

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-muted-foreground">{task.subject} · {task.teacher_name}</p>
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
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">应交</p>
            <p className="text-2xl font-bold tabular-nums">{total}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">已交</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{submittedCount}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">已批阅</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{gradedCount}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">提交率</p>
            <p className="text-2xl font-bold tabular-nums">{rate}%</p>
          </div>
        </div>

        <Progress value={rate} className="h-2" />
      </div>

      {/* 主体两栏 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 已提交 */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              已提交 <Badge variant="secondary">{submittedStudents.length}</Badge>
            </h2>
          </div>
          <div className="divide-y">
            {submittedStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">暂无提交</div>
            ) : (
              submittedStudents.map((stu) => {
                const sub = submissions.find((s) => s.student_id === stu.id)!
                return (
                  <Link
                    key={stu.id}
                    href={`/dashboard/grading/${sub.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                      style={{ backgroundColor: stu.avatar_color ?? "#3B82F6" }}
                    >
                      {stu.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{stu.name}</p>
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
                  disabled={selected.size === 0 || reminding}
                  onClick={sendReminders}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  催交 {selected.size > 0 ? `(${selected.size})` : ""}
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
                    checked={selected.has(stu.id)}
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
    </div>
  )
}
