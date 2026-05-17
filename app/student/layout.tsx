import type React from "react"
import { redirect } from "next/navigation"
import { AuthProvider } from "@/components/auth/auth-provider"
import { getCurrentStudent } from "@/lib/auth-server"
import { InstallPrompt } from "@/components/student/install-prompt"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentStudent()
  if (!user) redirect("/login?redirect=/student&role=student")
  return (
    <AuthProvider initialUser={user} role="student">
      {children}
      <InstallPrompt />
    </AuthProvider>
  )
}
