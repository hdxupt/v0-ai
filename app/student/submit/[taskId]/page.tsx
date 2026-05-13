import { getCurrentUser } from "@/lib/auth-server"
import { getTask, getSubmissionByStudentTask } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { SubmitForm } from "@/components/student/submit-form"

export default async function SubmitPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== "student") redirect("/login")

  const task = await getTask(taskId)
  if (!task) notFound()

  const existing = await getSubmissionByStudentTask(taskId, user.id)

  return <SubmitForm task={task} student={user} existingSubmission={existing} />
}
