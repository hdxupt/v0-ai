"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
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

  // Sync between tabs: respond to storage events
  useEffect(() => {
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY) return
      if (!e.newValue) {
        setUser(null)
      } else {
        try {
          setUser(JSON.parse(e.newValue))
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

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
