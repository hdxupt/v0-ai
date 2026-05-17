import { NextResponse, type NextRequest } from "next/server"
import { getCurrentTeacher } from "@/lib/auth-server"
import { restoreTask } from "@/lib/db"

/**
 * POST /api/tasks/:id/restore
 * 从回收站恢复一份任务。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentTeacher()
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  const { id } = await params
  try {
    const task = await restoreTask(id, user.id)
    return NextResponse.json({ task })
  } catch (err: any) {
    console.error("[v0] restoreTask failed:", err?.message)
    return NextResponse.json(
      { error: err?.message ?? "恢复失败" },
      { status: 400 },
    )
  }
}
