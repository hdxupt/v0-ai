"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, Sparkles, Calendar, Send, Clock, MoreVertical, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { formatDateTime, formatDueDate } from "@/lib/format"
import type { Task, Submission } from "@/lib/types"
import { ReminderDialog } from "./reminder-dialog"
import { TrashDialog } from "./trash-dialog"

export interface TaskRowData {
  task: Task
  submissions: Submission[]
}

interface TaskTableProps {
  rows: TaskRowData[]
  teacherName: string
  teacherId: string
}

type FilterKey = "all" | "pending" | "completed"

/** 学科识别色：与图表色板对应，跨页面保持一致 */
function subjectColor(subject: string): string {
  if (subject.includes("数")) return "var(--chart-1)"
  if (subject.includes("语文")) return "var(--chart-5)"
  if (subject.includes("英")) return "var(--chart-3)"
  if (subject.includes("物理")) return "var(--chart-2)"
  if (subject.includes("化")) return "var(--chart-4)"
  return "var(--muted-foreground)"
}

function statusBadge(row: TaskRowData) {
  const total = row.task.target_student_count || 0
  const submitted = row.submissions.length
  const graded = row.submissions.filter((s) => s.status === "graded").length

  if (submitted === 0) {
    return {
      label: "等待提交",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    }
  }
  if (graded === submitted && graded === total) {
    return {
      label: "已完成",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    }
  }
  if (graded > 0 && graded < submitted) {
    return {
      label: "批阅中",
      className: "bg-primary/12 text-primary border-primary/25",
    }
  }
  return {
    label: "待批阅",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  }
}

export function TaskTable({ rows, teacherName, teacherId }: TaskTableProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>("all")
  const [reminderTask, setReminderTask] = useState<Task | null>(null)
  // 待删除任务：null = 关闭弹窗；非空 = 显示二次确认
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${pendingDelete.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? "删除失败")
      }
      setPendingDelete(null)
      // 刷新当前页 — 父组件是 RSC，re-fetch 拉到最新列表
      router.refresh()
    } catch (err: any) {
      console.error("[v0] delete task failed:", err)
      alert(err?.message ?? "删除失败")
    } finally {
      setDeleting(false)
    }
  }

  const filtered = rows.filter((r) => {
    if (filter === "all") return true
    const total = r.task.target_student_count || 0
    const submitted = r.submissions.length
    const graded = r.submissions.filter((s) => s.status === "graded").length
    if (filter === "pending") return graded < total
    if (filter === "completed") return total > 0 && graded === total
    return true
  })

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div>
          <CardTitle className="text-base">近期作业任务</CardTitle>
          <CardDescription>跟踪每份作业的提交进度，一键催交未交学生</CardDescription>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">全部 <span className="ml-1 text-[10px] opacity-60">{rows.length}</span></TabsTrigger>
                <TabsTrigger value="pending">未完成</TabsTrigger>
                <TabsTrigger value="completed">已完成</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} />
            </Tabs>
            <TrashDialog />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            暂无作业。点击右上角 “布置新作业” 开始
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">作业</TableHead>
                <TableHead>布置时间</TableHead>
                <TableHead>截止时间</TableHead>
                <TableHead className="w-[240px]">提交进度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right pr-6">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const { task, submissions } = row
                const total = task.target_student_count || 0
                const submitted = submissions.length
                const graded = submissions.filter((s) => s.status === "graded").length
                const rate = total ? Math.round((submitted / total) * 100) : 0
                const status = statusBadge(row)
                const overdue = new Date(task.due_at).getTime() < Date.now()
                const completed = total > 0 && graded === total

                return (
                  <TableRow key={task.id} className="group">
                    <TableCell className="pl-6 py-4">
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="font-medium hover:text-primary transition-colors line-clamp-1"
                      >
                        {task.title}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: subjectColor(task.subject) }}
                          aria-hidden="true"
                        />
                        <span>{task.subject}</span>
                        <span>·</span>
                        <span>{task.class_ids.length === 1 ? "1 个班级" : `${task.class_ids.length} 个班级`}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(task.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-1.5 text-sm", overdue ? "text-destructive" : "text-muted-foreground")}>
                        <Clock className="w-3.5 h-3.5" />
                        {formatDueDate(task.due_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={rate} className="h-1.5 flex-1" />
                        <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {submitted}/{total}
                        </span>
                      </div>
                      {graded > 0 ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">已批阅 {graded}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {!completed && submitted < total ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setReminderTask(task)}
                          >
                            <Send className="w-3.5 h-3.5" />
                            催交
                          </Button>
                        ) : null}
                        <Button asChild variant={completed ? "ghost" : "default"} size="sm" className="gap-1">
                          <Link href={`/dashboard/tasks/${task.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                            查看进度
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="更多操作"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(e) => {
                                e.preventDefault()
                                setPendingDelete(task)
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              删除作业
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {reminderTask ? (
        <ReminderDialog
          task={reminderTask}
          teacherId={teacherId}
          teacherName={teacherName}
          submittedStudentIds={
            rows.find((r) => r.task.id === reminderTask.id)?.submissions.map((s) => s.student_id) ?? []
          }
          onClose={() => setReminderTask(null)}
        />
      ) : null}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除作业？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  即将删除 <span className="font-medium text-foreground">「{pendingDelete.title}」</span>。
                  老师和学生两端的列表都会隐藏，相关
                  {(() => {
                    const subs =
                      rows.find((r) => r.task.id === pendingDelete.id)?.submissions.length ?? 0
                    return subs > 0 ? (
                      <>
                        {" "}
                        <span className="font-medium text-foreground">{subs} 份提交记录</span>{" "}
                        会一起隐藏（但底层数据保留）。
                      </>
                    ) : (
                      "提交记录会一起隐藏（但底层数据保留）。"
                    )
                  })()}
                  误删后可以在「回收站」一键恢复。
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // 阻止 Radix 默认关闭，让我们手动控制 loading 期间
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  删除中
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  确认删除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
