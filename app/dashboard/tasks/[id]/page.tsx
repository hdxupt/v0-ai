import { getCurrentTeacher } from "@/lib/auth-server"
import { getTask, listSubmissionsByTask, listStudentsByClass } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { TaskProgress } from "@/components/dashboard/task-progress"

export default async function TaskProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentTeacher()
  if (!user || user.role !== "teacher") redirect("/login")

  const task = await getTask(id)
  if (!task) notFound()

  const submissions = await listSubmissionsByTask(id)
  // 抓取目标班级学生：过滤掉空班级 id，并合并所有班级（支持多班级、容错历史脏数据如 [null,"c1"]）
  const classIds = (task.class_ids ?? []).filter((c): c is string => Boolean(c))
  const studentLists = await Promise.all(classIds.map((cid) => listStudentsByClass(cid)))
  const seen = new Set<string>()
  const students = studentLists.flat().filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })

  return <TaskProgress task={task} submissions={submissions} students={students} />
}
