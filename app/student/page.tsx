import { redirect } from "next/navigation"
import { StudentShell } from "@/components/student/student-shell"
import { getCurrentUser } from "@/lib/auth-server"
import { listTasksForStudent, listSubmissionsByStudent } from "@/lib/db"

// Always render fresh data — student inbox depends on cookie + live db
export const dynamic = "force-dynamic"

export default async function StudentPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login?redirect=/student")
  if (user.role !== "student") redirect("/dashboard")

  // Prefetch in parallel on the server so the inbox renders immediately
  // on first paint. The client shell still subscribes to Realtime to
  // get incremental updates afterwards.
  const [initialTasks, initialSubmissions] = await Promise.all([
    listTasksForStudent(user.id).catch(() => []),
    listSubmissionsByStudent(user.id).catch(() => []),
  ])

  return (
    <StudentShell
      initialTasks={initialTasks}
      initialSubmissions={initialSubmissions}
    />
  )
}
