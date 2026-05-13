import { put } from "@vercel/blob"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE_NAME, deserializeUser } from "@/lib/auth"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_SIZE = 6 * 1024 * 1024 // 6 MB per file

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const user = deserializeUser(cookieStore.get(AUTH_COOKIE_NAME)?.value)
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const taskId = (formData.get("taskId") as string | null) ?? (formData.get("scope") as string | null)

    if (!file) {
      return NextResponse.json({ error: "未上传文件" }, { status: 400 })
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件过大（限 6MB）" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const safeTask = (taskId ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "_")
    const pathname = `submissions/${safeTask}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
      addRandomSuffix: false,
    })

    // 同时返回 url 和 pathname，url 用于显示，pathname 兼容旧 API
    return NextResponse.json({ url: blob.url, pathname: blob.url, size: file.size })
  } catch (error) {
    console.error("[v0] upload error:", error)
    return NextResponse.json({ error: "上传失败，请重试" }, { status: 500 })
  }
}
