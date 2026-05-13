import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getTask, createSubmission } from "@/lib/db"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { taskId, imagePathnames, note } = await request.json()
    if (!taskId || !Array.isArray(imagePathnames) || imagePathnames.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    if (!user.class_id) {
      return NextResponse.json({ error: "Student missing class" }, { status: 400 })
    }

    const task = await getTask(taskId)
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    if (!task.teacher_id) return NextResponse.json({ error: "Task missing teacher" }, { status: 400 })

    const submission = await createSubmission({
      task_id: taskId,
      student_id: user.id,
      student_name: user.name,
      class_id: user.class_id,
      image_urls: imagePathnames,
      note: note ?? null,
      teacher_id: task.teacher_id,
      task_title: task.title,
    })

    return NextResponse.json({ submissionId: submission.id })
  } catch (error) {
    console.error("[v0] submission error:", error)
    return NextResponse.json({ error: "Submit failed" }, { status: 500 })
  }
}
