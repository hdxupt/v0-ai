import { getCurrentUser } from "@/lib/auth-server"
import { getSubmission, getTask } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowLeft, Clock, Image as ImageIcon } from "lucide-react"
import { ImageGallery } from "@/components/student/image-gallery"
import { formatDateTime } from "@/lib/format"

export default async function SubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== "student") redirect("/login")

  const submission = await getSubmission(id)
  if (!submission || submission.student_id !== user.id) notFound()

  const task = submission.task_id ? await getTask(submission.task_id) : null

  if (submission.status === "graded") {
    redirect(`/student/result/${submission.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/student">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">已提交至老师</h1>
            <p className="text-sm text-muted-foreground mt-1">老师批阅后将通知你查看反馈</p>
          </div>
        </div>

        <div className="p-5 space-y-4 border-t">
          {task ? (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">作业</p>
                <p className="font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{task.subject} · {task.teacher_name}</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
              <ImageIcon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">提交于 {formatDateTime(submission.submitted_at)}</p>
              <p className="text-sm mt-0.5">共 {submission.image_urls.length} 张图片</p>
            </div>
          </div>

          {submission.note ? (
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">附加说明</p>
              <p className="text-sm whitespace-pre-wrap">{submission.note}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">提交内容</h2>
        <ImageGallery pathnames={submission.image_urls} />
      </div>

      <Link href="/student" className="block">
        <Button className="w-full" size="lg">返回首页</Button>
      </Link>
    </div>
  )
}
