import "server-only"
import { cookies } from "next/headers"
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  deserializeUser,
} from "./auth"
import type { AppUser } from "./types"

/**
 * 服务端读取登录用户。
 *
 * 角色独立 Cookie 后，同一浏览器可能同时存在 teacher 和 student 两个会话。
 * 调用方按需选择：
 *   - getCurrentTeacher() / getCurrentStudent()：明确读哪一种身份
 *   - getCurrentUser(prefer)：让调用方提示偏好；找不到对应角色时回落到另一个
 *
 * 历史兼容：旧版本写入的 `sewise_session_user` cookie 也会被识别，按其内部 role 字段归类。
 */

async function readCookie(name: string): Promise<AppUser | null> {
  const store = await cookies()
  return deserializeUser(store.get(name)?.value)
}

export async function getCurrentTeacher(): Promise<AppUser | null> {
  const t = await readCookie(TEACHER_COOKIE_NAME)
  if (t && t.role === "teacher") return t
  // 兼容旧 cookie
  const legacy = await readCookie(LEGACY_COOKIE_NAME)
  if (legacy && legacy.role === "teacher") return legacy
  return null
}

export async function getCurrentStudent(): Promise<AppUser | null> {
  const s = await readCookie(STUDENT_COOKIE_NAME)
  if (s && s.role === "student") return s
  const legacy = await readCookie(LEGACY_COOKIE_NAME)
  if (legacy && legacy.role === "student") return legacy
  return null
}

/**
 * 偏好语义：preferRole 决定优先返回哪种身份；找不到才回落另一种。
 * - `prefer = "teacher"` —— 在老师页面用，例如 /dashboard
 * - `prefer = "student"` —— 在学生页面用，例如 /student
 * - 不传 —— 任意一个都行（例如全局 layout）
 */
export async function getCurrentUser(
  prefer?: "teacher" | "student",
): Promise<AppUser | null> {
  if (prefer === "teacher") return (await getCurrentTeacher()) ?? (await getCurrentStudent())
  if (prefer === "student") return (await getCurrentStudent()) ?? (await getCurrentTeacher())
  // 默认顺序：teacher cookie 优先（与历史行为一致）
  return (await getCurrentTeacher()) ?? (await getCurrentStudent())
}
