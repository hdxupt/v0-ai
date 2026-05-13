"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { listStudentsByClass, sendReminders } from "@/lib/db"
import type { Task, AppUser } from "@/lib/types"

export function ReminderDialog({
  task,
  submittedStudentIds,
  teacherName,
  teacherId,
  trigger,
}: {
  task: Task
  submittedStudentIds: string[]
  teacherName: string
  teacherId: string
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pendingStudents, setPendingStudents] = useState<AppUser[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const allByClass: AppUser[][] = await Promise.all(
        task.class_ids.map((cid) => listStudentsByClass(cid)),
      )
      const all = allByClass.flat()
      const pending = all.filter((u) => !submittedStudentIds.includes(u.id))
      setPendingStudents(pending)
      setSelected(pending.map((u) => u.id))
      setMessage(`请尽快提交《${task.title}》作业，老师在等你哦~`)
    })()
  }, [open, task, submittedStudentIds])

  function toggleAll() {
    if (selected.length === pendingStudents.length) setSelected([])
    else setSelected(pendingStudents.map((u) => u.id))
  }

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSend() {
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      await sendReminders({
        task_id: task.id,
        task_title: task.title,
        teacher_name: teacherName,
        teacher_id: teacherId,
        student_ids: selected,
        message,
      })
      toast.success(`已向 ${selected.length} 名学生发送催交通知`)
      setOpen(false)
    } catch (err) {
      console.error("[v0] send reminders error:", err)
      toast.error("发送失败，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            催交未提交学生
          </DialogTitle>
          <DialogDescription>
            《{task.title}》· {pendingStudents.length} 名学生待提交
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">选择学生</Label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selected.length === pendingStudents.length ? "取消全选" : "全选"}
              </button>
            </div>
            <ScrollArea className="h-[180px] rounded-md border border-border p-2">
              {pendingStudents.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-8">
                  全部学生都已提交，无需催交
                </p>
              ) : (
                <div className="space-y-1">
                  {pendingStudents.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.includes(s.id)}
                        onCheckedChange={() => toggleOne(s.id)}
                      />
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]"
                        style={{ backgroundColor: s.avatar_color }}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-xs">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {s.student_no}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rem-msg" className="text-xs">
              催交内容
            </Label>
            <Textarea
              id="rem-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={120}
              placeholder="温馨提醒一下..."
            />
            <p className="text-[10px] text-muted-foreground">
              将以紧急通知形式推送到学生学习机，并伴随 Toast 弹窗
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSend} disabled={selected.length === 0 || submitting}>
            {submitting ? "发送中..." : `发送催交 (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
