import type { AppUser } from "./types"

/**
 * 角色独立 Cookie：老师与学生各占一个 cookie，
 * 同一浏览器可同时登录两种身份用于演示联动。
 *
 * - `sewise_session_teacher`：老师身份会话
 * - `sewise_session_student`：学生身份会话
 *
 * 兼容历史：`sewise_session_user` 是旧版单 cookie，仍读但不再写入。
 */
export const TEACHER_COOKIE_NAME = "sewise_session_teacher"
export const STUDENT_COOKIE_NAME = "sewise_session_student"
export const LEGACY_COOKIE_NAME = "sewise_session_user"

/** 老的导出名保留作为别名，现有少量服务端引用还在用它 → 解读时按"两个都试"。 */
export const AUTH_COOKIE_NAME = TEACHER_COOKIE_NAME

export const AUTH_STORAGE_KEY = "sewise_current_user"

export type Role = "teacher" | "student"

export function cookieNameForRole(role: Role): string {
  return role === "teacher" ? TEACHER_COOKIE_NAME : STUDENT_COOKIE_NAME
}

/**
 * Demo-mode auth: we don't use Supabase Auth because the user wants
 * one-click password-less login with predefined accounts.
 * Sessions live in role-scoped cookies (server read) + localStorage (client read).
 *
 * This file is import-safe in both client and server components.
 * For server-only `getCurrentUser()` / `getCurrentTeacher()` / `getCurrentStudent()`,
 * import from `lib/auth-server`.
 */

export function serializeUser(user: AppUser): string {
  return encodeURIComponent(JSON.stringify(user))
}

export function deserializeUser(raw: string | undefined | null): AppUser | null {
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as AppUser
  } catch {
    return null
  }
}

