import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { softDeleteTask } from "@/lib/db"

/**
 * DELETE /api/tasks/:id
 * 软删除一份作业任务。只有任务所属老师可操作。
 * 删除后：老师/学生列表均自动隐藏；submissions 数据保留；可通过 /restore 恢复。
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  const { id } = await params
  try {
    const task = await softDeleteTask(id, user.id)
    return NextResponse.json({ task })
  } catch (err: any) {
    console.error("[v0] softDeleteTask failed:", err?.message)
    return NextResponse.json(
      { error: err?.message ?? "删除失败" },
      { status: 400 },
    )
  }
}
