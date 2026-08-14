import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/client"

/** 账号设置：更新当前登录用户的头像颜色（唯一可自定义的资料字段） */
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const color = typeof body?.avatar_color === "string" ? body.avatar_color.trim() : ""
  // 只接受 #RRGGBB，防注入
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: "颜色格式不正确" }, { status: 400 })
  }

  const sb = createClient()
  const { error } = await sb.from("app_users").update({ avatar_color: color }).eq("id", user.id)
  if (error) {
    console.log("[v0] profile update failed:", error.message)
    return NextResponse.json({ error: "保存失败，请重试" }, { status: 500 })
  }
  return NextResponse.json({ ok: true, avatar_color: color })
}
