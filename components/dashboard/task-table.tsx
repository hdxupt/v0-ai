"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Sparkles, Calendar, Send, Clock } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { formatDateTime, formatDueDate } from "@/lib/format"
import type { Task, Submission } from "@/lib/types"
import { ReminderDialog } from "./reminder-dialog"

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
  const [filter, setFilter] = useState<FilterKey>("all")
  const [reminderTask, setReminderTask] = useState<Task | null>(null)

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
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList>
              <TabsTrigger value="all">全部 <span className="ml-1 text-[10px] opacity-60">{rows.length}</span></TabsTrigger>
              <TabsTrigger value="pending">未完成</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>
            <TabsContent value={filter} />
          </Tabs>
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
    </Card>
  )
}
