import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { getCurrentUser } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  // 文件服务对老师 / 学生都开放（缩略图、原图渲染都要用）
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get("pathname")
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
  }

  try {
    // public store：用 public access 读取（仅历史 pathname 数据会走到这里，
    // 新数据已直接保存完整公开 URL，前端不再经过本代理）
    const result = await get(pathname, {
      access: "public",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })
    if (!result) {
      return new NextResponse("Not found", { status: 404 })
    }
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      })
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] file serve error:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
