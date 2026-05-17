"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Sparkles, Send, AlertCircle, FileText } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/auth/auth-provider"
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/db"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { AppNotification } from "@/lib/types"
import { formatRelativeTime } from "@/lib/format"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_homework: FileText,
  reminder: AlertCircle,
  submission_received: Send,
  graded: Sparkles,
  system: Bell,
}

const COLOR_BY_TYPE: Record<string, string> = {
  new_homework: "text-primary bg-primary/10",
  reminder: "text-[color:var(--warning)] bg-[color:var(--warning)]/12",
  submission_received: "text-chart-3 bg-chart-3/10",
  graded: "text-[color:var(--success)] bg-[color:var(--success)]/12",
  system: "text-muted-foreground bg-muted",
}

export function NotificationBell() {
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const unread = items.filter((i) => !i.read).length

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const data = await listNotifications(user.id, 30)
      setItems(data)
    } catch (err) {
      console.error("[v0] notification fetch error:", err)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel(`notify:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification
          setItems((prev) => [n, ...prev].slice(0, 30))
          toast(n.title, {
            description: n.content,
            duration: n.urgent ? 8000 : 4000,
          })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function handleMarkAllRead() {
    if (!user) return
    await markAllNotificationsRead(user.id)
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
  }

  async function handleClick(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id)
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="通知中心">
          <Bell className="w-[18px] h-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">通知中心</span>
            {unread > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
                {unread} 条未读
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="w-3 h-3" />
              全部已读
            </Button>
          )}
        </div>
        <div className="relative">
          {items.length > 4 ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-popover to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-popover to-transparent z-10" />
            </>
          ) : null}
          <ScrollArea className="h-[420px]">
            {items.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                暂无通知
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell
                  const iconClass = COLOR_BY_TYPE[n.type] ?? "text-muted-foreground bg-muted"
                  const href = computeHref(user!.role, n)
                  return (
                    <li key={n.id}>
                      <Link
                        href={href}
                        onClick={() => handleClick(n)}
                        className={`flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/[0.03]" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${iconClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="text-xs font-medium leading-tight flex-1">{n.title}</p>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {n.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function computeHref(role: "teacher" | "student", n: AppNotification) {
  if (role === "student") {
    if (n.type === "graded" && n.related_submission_id) {
      return `/student/result/${n.related_submission_id}`
    }
    if (n.type === "new_homework" && n.related_task_id) {
      return `/student/submit/${n.related_task_id}`
    }
    if (n.type === "reminder" && n.related_task_id) {
      return `/student/submit/${n.related_task_id}`
    }
    return "/student"
  }
  // teacher
  if (n.type === "submission_received" && n.related_submission_id) {
    return `/dashboard/grading/${n.related_submission_id}`
  }
  if (n.related_task_id) {
    return `/dashboard/tasks/${n.related_task_id}`
  }
  return "/dashboard"
}
