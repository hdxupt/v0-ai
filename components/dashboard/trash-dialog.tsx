"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Trash2, Undo2, Loader2, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatRelativeTime, formatDateTime } from "@/lib/format"
import type { Task } from "@/lib/types"

interface TrashResponse {
  tasks: Task[]
}

const fetcher = async (url: string): Promise<TrashResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("加载失败")
  return res.json()
}

/**
 * 老师端"回收站"入口 + 列表 + 一键恢复。
 * 列表懒加载：只有打开 Dialog 时才会 fetch /api/tasks/trash。
 */
export function TrashDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<TrashResponse>(
    open ? "/api/tasks/trash" : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  async function handleRestore(taskId: string) {
    setRestoringId(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/restore`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? "恢复失败")
      }
      // 同时刷新回收站列表 + 主任务列表
      await mutate()
      router.refresh()
    } catch (err: any) {
      console.error("[v0] restore failed:", err)
      alert(err?.message ?? "恢复失败")
    } finally {
      setRestoringId(null)
    }
  }

  const tasks = data?.tasks ?? []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Trash2 className="w-3.5 h-3.5" />
          回收站
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            回收站
          </DialogTitle>
          <DialogDescription>
            已删除的作业任务在此保留。点击"恢复"即可还原至主列表，关联的提交记录与批改数据保持完整。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[480px] overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              加载中...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Inbox className="w-8 h-8 opacity-50" />
              回收站为空
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => {
                const deletedAt = (task as any).deleted_at as string | null
                const isRestoring = restoringId === task.id
                return (
                  <li
                    key={task.id}
                    className={cn(
                      "py-3 flex items-center gap-3",
                      isRestoring && "opacity-50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-1">{task.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{task.subject}</span>
                        <span>·</span>
                        <span>布置于 {formatDateTime(task.created_at)}</span>
                        {deletedAt ? (
                          <>
                            <span>·</span>
                            <span className="text-destructive/80">
                              {formatRelativeTime(deletedAt)}删除
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 shrink-0"
                      disabled={isRestoring}
                      onClick={() => handleRestore(task.id)}
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          恢复中
                        </>
                      ) : (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          恢复
                        </>
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
