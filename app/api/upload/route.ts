import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
/**
 * 服务端最大单文件 10MB：浏览器端 `lib/image/compress.ts` 已经会把图片压到 ≤4MB，
 * 这里 10MB 是双保险，防止极端浏览器（如旧版 Safari）压缩失败把原图直传上来。
 */
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
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
      return NextResponse.json({ error: "文件过大（限 8MB）" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const safeTask = (taskId ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "_")
    const pathname = `submissions/${safeTask}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    // Blob store 为 public 类型：直接公开存储，URL 含不可枚举的随机路径。
    // 返回完整公开 URL，前端与服务端（OCR/批改）都可直接访问，无需鉴权代理。
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
      addRandomSuffix: false,
    })

    // 返回完整公开 URL（同时保留 pathname 以兼容旧逻辑）
    return NextResponse.json({ url: blob.url, pathname: blob.pathname, size: file.size })
  } catch (error: any) {
    console.error("[v0] upload error:", error)
    return NextResponse.json(
      { error: error?.message ?? "上传失败，请重试" },
      { status: 500 },
    )
  }
}
