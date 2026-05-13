import { getCurrentUser } from "@/lib/auth"
import { getTask, listSubmissionsByTask, listStudentsByClass } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { TaskProgress } from "@/components/dashboard/task-progress"

export default async function TaskProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== "teacher") redirect("/login")

  const task = await getTask(id)
  if (!task) notFound()

  const submissions = await listSubmissionsByTask(id)
  // 抓取目标班级学生
  const classId = task.class_ids?.[0]
  const students = classId ? await listStudentsByClass(classId) : []

  return <TaskProgress task={task} submissions={submissions} students={students} />
}
