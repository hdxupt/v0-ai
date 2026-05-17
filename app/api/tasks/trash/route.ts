import { NextResponse } from "next/server"
import { getCurrentTeacher } from "@/lib/auth-server"
import { listDeletedTasksByTeacher } from "@/lib/db"

/**
 * GET /api/tasks/trash
 * 返回当前老师的回收站（已软删除的任务列表）。
 */
export async function GET() {
  const user = await getCurrentTeacher()
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  try {
    const tasks = await listDeletedTasksByTeacher(user.id)
    return NextResponse.json({ tasks })
  } catch (err: any) {
    console.error("[v0] list trash failed:", err?.message)
    return NextResponse.json({ error: err?.message ?? "查询失败" }, { status: 500 })
  }
}
