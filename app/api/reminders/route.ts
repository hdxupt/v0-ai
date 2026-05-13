import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { getTask, sendReminders } from "@/lib/db"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { taskId, studentIds, message } = await request.json()
    if (!taskId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const task = await getTask(taskId)
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const count = await sendReminders({
      task_id: taskId,
      task_title: task.title,
      teacher_name: user.name,
      teacher_id: user.id,
      student_ids: studentIds,
      message: message?.trim() || undefined,
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("[v0] reminder error:", error)
    return NextResponse.json({ error: "Send failed" }, { status: 500 })
  }
}
