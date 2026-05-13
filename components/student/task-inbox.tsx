"use client"

import Link from "next/link"
import { ArrowRight, Clock, CheckCircle2, FileText, Sparkles, AlertCircle, Inbox } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatDueDate, formatRelativeTime, getCountdown } from "@/lib/format"
import type { Task, Submission } from "@/lib/types"

export function TaskInbox({
  tasks,
  submissions,
  selectedId,
  onSelect,
  loading,
}: {
  tasks: Task[]
  submissions: Submission[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  loading: boolean
}) {
  const submittedTaskIds = new Set(submissions.map((s) => s.task_id))
  const pending = tasks.filter((t) => !submittedTaskIds.has(t.id))
  const submittedNotGraded = submissions.filter((s) => s.status !== "graded")
  const graded = submissions.filter((s) => s.status === "graded")

  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="pending" className="w-full">
        <div className="border-b border-border px-3 pt-3 pb-2">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              待完成
              {pending.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="grading" className="flex-1">
              批阅中
              {submittedNotGraded.length > 0 && (
                <Badge variant="outline" className="ml-1 h-4 px-1.5 text-[10px]">
                  {submittedNotGraded.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="done" className="flex-1">
              已批阅
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-0">
          <TabsContent value="pending" className="m-0">
            <ScrollArea className="max-h-[560px]">
              {loading ? (
                <EmptyText text="加载中..." />
              ) : pending.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-6 h-6 text-[color:var(--success)]" />}
                  title="太棒了"
                  description="所有作业都完成了！"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {pending.map((t) => (
                    <PendingTaskCard key={t.id} task={t} />
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="grading" className="m-0">
            <ScrollArea className="max-h-[560px]">
              {submittedNotGraded.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="w-6 h-6 text-muted-foreground" />}
                  title="暂无批阅中作业"
                  description="提交作业后老师会进行批阅"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {submittedNotGraded.map((s) => {
                    const task = tasks.find((t) => t.id === s.task_id)
                    return (
                      <SubmissionCard
                        key={s.id}
                        submission={s}
                        task={task}
                        active={selectedId === s.id}
                        onSelect={() => onSelect(s.id)}
                      />
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="done" className="m-0">
            <ScrollArea className="max-h-[560px]">
              {graded.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="w-6 h-6 text-muted-foreground" />}
                  title="暂无已批阅作业"
                  description="批阅完成的作业会出现在这里"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {graded.map((s) => {
                    const task = tasks.find((t) => t.id === s.task_id)
                    return (
                      <SubmissionCard
                        key={s.id}
                        submission={s}
                        task={task}
                        active={selectedId === s.id}
                        onSelect={() => onSelect(s.id)}
                      />
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

function EmptyText({ text }: { text: string }) {
  return <div className="py-12 text-center text-xs text-muted-foreground">{text}</div>
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="py-12 flex flex-col items-center gap-2 text-center px-4">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function PendingTaskCard({ task }: { task: Task }) {
  const countdown = getCountdown(task.due_at)
  return (
    <li>
      <Link
        href={`/student/submit/${task.id}`}
        className="block px-4 py-3 hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                {task.subject}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-medium",
                  countdown.urgent
                    ? "text-destructive"
                    : countdown.overdue
                      ? "text-muted-foreground"
                      : "text-[color:var(--warning)]",
                )}
              >
                {countdown.urgent && <AlertCircle className="w-2.5 h-2.5" />}
                <Clock className="w-2.5 h-2.5" />
                {countdown.text}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground truncate">{task.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {task.teacher_name} · 截止 {formatDueDate(task.due_at)}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full h-8 bg-primary hover:bg-primary/90 group-hover:translate-x-0 mt-1"
          asChild
        >
          <span>
            <FileText className="w-3 h-3" />
            去完成
            <ArrowRight className="w-3 h-3 ml-auto" />
          </span>
        </Button>
      </Link>
    </li>
  )
}

function SubmissionCard({
  submission,
  task,
  active,
  onSelect,
}: {
  submission: Submission
  task?: Task
  active: boolean
  onSelect: () => void
}) {
  const isGraded = submission.status === "graded"
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full text-left px-4 py-3 transition-colors",
          active ? "bg-primary/[0.06] border-l-2 border-primary" : "hover:bg-muted/40",
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            {task && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                {task.subject}
              </span>
            )}
            {isGraded ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[color:var(--success)]">
                <Sparkles className="w-2.5 h-2.5" />
                已批阅
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                <Clock className="w-2.5 h-2.5" />
                批阅中
              </span>
            )}
          </div>
          {isGraded && submission.score != null && (
            <span className="text-base font-semibold tabular-nums text-foreground">
              {submission.score}
              <span className="text-[10px] text-muted-foreground font-normal">
                /{submission.total_score}
              </span>
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {task?.title ?? "（作业已删除）"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isGraded && submission.graded_at
            ? `批阅于 ${formatRelativeTime(submission.graded_at)}`
            : `提交于 ${formatRelativeTime(submission.submitted_at)}`}
        </p>
      </button>
    </li>
  )
}
