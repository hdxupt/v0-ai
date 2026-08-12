"use client"

import { useEffect, useState, useCallback } from "react"
import { Mic, ArrowLeft, RefreshCcw } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DeviceStatusBar } from "@/components/student/device-status-bar"
import { NotificationBell } from "@/components/app/notification-bell"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { TaskInbox } from "@/components/student/task-inbox"
import { SubmissionResult } from "@/components/student/submission-result"
import { GrowthTrend } from "@/components/student/growth-trend"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { listTasksForStudent, listSubmissionsByStudent } from "@/lib/db"
import type { Task, Submission } from "@/lib/types"

interface StudentShellProps {
  initialTasks?: Task[]
  initialSubmissions?: Submission[]
}

export function StudentShell({
  initialTasks = [],
  initialSubmissions = [],
}: StudentShellProps) {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(() => {
    const latestGraded = initialSubmissions.find((x) => x.status === "graded")
    return latestGraded?.id ?? null
  })
  // First paint already has SSR data — start with loading=false to avoid
  // the brief "加载中..." flash that we used to show.
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [t, s] = await Promise.all([
        listTasksForStudent(user.id),
        listSubmissionsByStudent(user.id),
      ])
      setTasks(t)
      setSubmissions(s)
      // Auto-select latest graded submission if not selected
      setSelectedSubmissionId((prev) => {
        if (prev) return prev
        const latestGraded = s.find((x) => x.status === "graded")
        return latestGraded?.id ?? null
      })
    } catch (err) {
      console.error("[v0] student load error:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Realtime subscription for new tasks (class scope) + submissions (mine)
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel(`student-feed:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `student_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  if (!user) return null

  const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionId) ?? null
  const selectedTask =
    selectedSubmission != null ? tasks.find((t) => t.id === selectedSubmission.task_id) ?? null : null

  return (
    <div className="min-h-screen bg-muted/40 py-6 px-4 sm:px-6">
      {/* Demo context badge */}
      <div className="max-w-[1280px] mx-auto mb-4 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          切换账号
        </button>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--success)]" />
          学生端 · 实时同步
        </span>
      </div>

      {/* Device frame */}
      <div className="max-w-[1280px] mx-auto rounded-3xl border-[10px] border-foreground bg-background shadow-2xl overflow-hidden">
        <DeviceStatusBar />

        {/* App top bar */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
              希
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">希沃学伴</div>
              <div className="text-[11px] text-muted-foreground">我的学习空间</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={load}>
              <RefreshCcw className="w-3 h-3" />
              刷新
            </Button>
            <NotificationBell />
            <ThemeToggle size="sm" className="h-8 w-8 p-0" />
            <Button variant="ghost" size="sm" className="text-xs h-8">
              <Mic className="w-3.5 h-3.5" />
              呼出 AI 老师
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  className="text-white text-xs"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <div className="text-xs font-medium leading-tight">{user.name}</div>
                <div className="text-[10px] text-muted-foreground">学号 {user.student_no}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <TaskInbox
                tasks={tasks}
                submissions={submissions}
                selectedId={selectedSubmissionId}
                onSelect={setSelectedSubmissionId}
                loading={loading}
              />
            </div>
            <div className="min-w-0 space-y-5">
              <GrowthTrend submissions={submissions} />
              {selectedSubmission && selectedTask ? (
                <SubmissionResult submission={selectedSubmission} task={selectedTask} />
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
        <Mic className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold mb-1">选择左侧的作业查看详情</h3>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
        待完成作业可点击「去完成」上传答卷，已批阅作业可查看 AI 分析报告
      </p>
    </div>
  )
}
