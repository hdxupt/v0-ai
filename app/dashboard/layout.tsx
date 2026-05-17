import type React from "react"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AppHeader } from "@/components/app/app-header"
import { AIAssistant } from "@/components/app/ai-assistant"
import { AuthProvider } from "@/components/auth/auth-provider"
import { getCurrentTeacher } from "@/lib/auth-server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const teacher = await getCurrentTeacher()
  if (!teacher) redirect("/login?redirect=/dashboard&role=teacher")
  return (
    <AuthProvider initialUser={teacher} role="teacher">
      <div className="min-h-screen flex bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <AIAssistant />
      </div>
    </AuthProvider>
  )
}
