import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { GradingWorkspace } from "@/components/grading/grading-workspace"
import { getCurrentUser } from "@/lib/auth-server"
import { getSubmission, getTask, getUser } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function GradingPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const { submissionId } = await params
  const teacher = await getCurrentUser()
  if (!teacher || teacher.role !== "teacher") redirect("/login")

  const submission = await getSubmission(submissionId)
  if (!submission) notFound()

  const [task, student] = await Promise.all([
    getTask(submission.task_id),
    getUser(submission.student_id),
  ])
  if (!task || !student) notFound()

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-6 h-12 border-b border-border bg-card text-sm">
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href={`/dashboard/tasks/${task.id}`}>
            <ChevronLeft className="w-3.5 h-3.5" />
            返回作业进度
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-muted-foreground">AI 批阅工作台 · {task.title}</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="font-medium">{student.name}</span>
      </div>

      <GradingWorkspace
        submission={submission}
        task={task}
        student={student}
        teacher={teacher}
      />
    </div>
  )
}
