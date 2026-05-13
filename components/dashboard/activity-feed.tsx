"use client"

import {
  Send,
  CheckCircle2,
  FileText,
  AlertCircle,
  Sparkles,
  Eye,
  Activity as ActivityIcon,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelativeTime } from "@/lib/format"
import type { ActivityEvent } from "@/lib/types"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  submit: Send,
  view: Eye,
  graded: Sparkles,
  reminder_sent: AlertCircle,
  new_task: FileText,
  late_warning: AlertCircle,
}

const TONE: Record<string, string> = {
  submit: "bg-chart-3/10 text-chart-3",
  view: "bg-muted text-muted-foreground",
  graded: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  reminder_sent: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  new_task: "bg-primary/10 text-primary",
  late_warning: "bg-destructive/10 text-destructive",
}

export function ActivityFeed({
  events,
  loading,
}: {
  events: ActivityEvent[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center text-xs text-muted-foreground">
        加载中...
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
        <ActivityIcon className="w-6 h-6 opacity-40" />
        <p className="text-xs">暂无动态</p>
        <p className="text-[10px] text-center">布置作业或学生提交后将出现在这里</p>
      </div>
    )
  }
  return (
    <ScrollArea className="max-h-[460px]">
      <ol className="relative pl-3">
        <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
        {events.map((e) => {
          const Icon = ICONS[e.type] ?? ActivityIcon
          const tone = TONE[e.type] ?? "bg-muted text-muted-foreground"
          return (
            <li key={e.id} className="relative pl-5 pb-4 last:pb-1">
              <span
                className={`absolute -left-[3px] top-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-background ${tone}`}
              >
                <Icon className="w-2.5 h-2.5" />
              </span>
              <p className="text-xs leading-relaxed text-foreground">{e.description}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatRelativeTime(e.created_at)}
              </p>
            </li>
          )
        })}
      </ol>
    </ScrollArea>
  )
}
