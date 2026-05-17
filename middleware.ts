import { NextResponse, type NextRequest } from "next/server"
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  deserializeUser,
} from "@/lib/auth"

const PUBLIC_PATHS = ["/login"]

/**
 * 角色独立 Cookie 后的中间件路由策略：
 *
 * - /dashboard/**        → 必须有 teacher cookie；否则跳 /login
 * - /student/**          → 必须有 student cookie；否则跳 /login
 * - /                    → 任一身份都可，按"优先 teacher"决定首页
 * - /login               → 已登录任一身份直接进对应首页（除非显式 ?switch=1）
 *
 * 老的单 cookie `sewise_session_user` 仍然被读到（作为兼容），但建议尽快被新写入覆盖。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const teacher = deserializeUser(request.cookies.get(TEACHER_COOKIE_NAME)?.value)
  const student = deserializeUser(request.cookies.get(STUDENT_COOKIE_NAME)?.value)
  const legacy = deserializeUser(request.cookies.get(LEGACY_COOKIE_NAME)?.value)

  const teacherUser = teacher?.role === "teacher" ? teacher : legacy?.role === "teacher" ? legacy : null
  const studentUser = student?.role === "student" ? student : legacy?.role === "student" ? legacy : null
  const anyUser = teacherUser ?? studentUser

  // Root redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone()
    if (!anyUser) url.pathname = "/login"
    else if (teacherUser) url.pathname = "/dashboard"
    else url.pathname = "/student"
    return NextResponse.redirect(url)
  }

  // /login: 已经登录任一身份则跳走（除非显式 ?switch=1 / ?redirect=...）
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const isSwitchIntent =
      request.nextUrl.searchParams.get("switch") === "1" ||
      request.nextUrl.searchParams.has("redirect")
    if (anyUser && pathname === "/login" && !isSwitchIntent) {
      const url = request.nextUrl.clone()
      url.pathname = teacherUser ? "/dashboard" : "/student"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // /dashboard/** 仅 teacher 通过
  if (pathname.startsWith("/dashboard")) {
    if (!teacherUser) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", pathname)
      url.searchParams.set("role", "teacher")
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // /student/** 仅 student 通过
  if (pathname.startsWith("/student")) {
    if (!studentUser) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", pathname)
      url.searchParams.set("role", "student")
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // 其它受保护路径：任一身份即可
  if (!anyUser) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|manifest.webmanifest|icon-|api/health).*)",
  ],
}
