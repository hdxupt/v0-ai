import type React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthProvider } from "@/components/auth/auth-provider"
import { AUTH_COOKIE_NAME, deserializeUser } from "@/lib/auth"
import { InstallPrompt } from "@/components/student/install-prompt"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const user = deserializeUser(cookieStore.get(AUTH_COOKIE_NAME)?.value)
  if (!user) redirect("/login")
  return (
    <AuthProvider initialUser={user}>
      {children}
      <InstallPrompt />
    </AuthProvider>
  )
}
