"use client"

import { createContext, useContext, useState, useCallback } from "react"
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  AUTH_STORAGE_KEY,
  cookieNameForRole,
  serializeUser,
  type Role,
} from "@/lib/auth"
import type { AppUser } from "@/lib/types"

interface AuthContextValue {
  user: AppUser | null
  /** 上下文角色：当前页面（dashboard / student）的角色锁定，影响 logout 清哪一个 cookie */
  role: Role
  loading: boolean
  /** 写入指定角色的 cookie + localStorage */
  login: (user: AppUser) => void
  /** 仅清除当前角色的 cookie；另一端的会话保留 */
  logout: () => void
  /** 切换账号：清空当前角色 cookie 后跳到 /login?switch=1&role=... */
  switchAccount: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}
function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export function AuthProvider({
  initialUser,
  role,
  children,
}: {
  initialUser: AppUser | null
  /**
   * 当前页面所属的角色作用域：
   * - dashboard layout 传 "teacher"
   * - student layout 传 "student"
   * - 旧调用未传时，保守按 initialUser.role 推导，再退化为 "teacher"
   */
  role?: Role
  children: React.ReactNode
}) {
  const resolvedRole: Role = role ?? initialUser?.role ?? "teacher"
  const [user, setUser] = useState<AppUser | null>(initialUser)
  const [loading] = useState(false)

  const login = useCallback(
    (u: AppUser) => {
      setUser(u)
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u))
        // 写到该用户真实 role 对应的 cookie，而不是当前页面 role
        writeCookie(cookieNameForRole(u.role), serializeUser(u))
      }
    },
    [],
  )

  const logout = useCallback(() => {
    setUser(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      // 仅清当前 scope 的 cookie，另一端会话保留
      clearCookie(cookieNameForRole(resolvedRole))
      // 兼容老单 cookie，一并清掉
      clearCookie("sewise_session_user")
      window.location.href = "/login"
    }
  }, [resolvedRole])

  const switchAccount = useCallback(() => {
    if (typeof window !== "undefined") {
      clearCookie(cookieNameForRole(resolvedRole))
      window.location.href = `/login?switch=1&role=${resolvedRole}`
    }
  }, [resolvedRole])

  return (
    <AuthContext.Provider value={{ user, role: resolvedRole, loading, login, logout, switchAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}

// 让别处 import 的常量可继续从这里取（保持兼容）
export { TEACHER_COOKIE_NAME, STUDENT_COOKIE_NAME }
