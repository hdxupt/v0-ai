"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY, serializeUser } from "@/lib/auth"
import type { AppUser } from "@/lib/types"

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  login: (user: AppUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AppUser | null
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AppUser | null>(initialUser)
  const [loading, setLoading] = useState(false)

  // 注意：故意不监听 storage 事件——演示时常常需要在两个 tab 同时打开
  // 学生端和教师端，监听 storage 会导致 tab A 登录后 tab B 也跟着切换。
  // Cookie 仍然是共享的，所以同一浏览器同一时刻只有一个真实身份，
  // 演示时建议另一端使用无痕窗口或不同浏览器。

  const login = useCallback(
    (u: AppUser) => {
      setUser(u)
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u))
        // Set cookie for SSR — 30 days, not httpOnly so client can clear it
        document.cookie = `${AUTH_COOKIE_NAME}=${serializeUser(u)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
      }
    },
    [],
  )

  const logout = useCallback(() => {
    setUser(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      // Clear cookie with both default path and explicit settings to be safe
      document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
      document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      // Full reload guarantees middleware re-evaluates, RSC cache flushed
      // and any leftover Supabase Realtime channels are torn down.
      window.location.href = "/login"
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
