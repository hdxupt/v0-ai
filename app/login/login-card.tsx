"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Sparkles, ArrowRight, Users, BookOpen, ShieldCheck } from "lucide-react"
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY, serializeUser } from "@/lib/auth"
import type { AppUser } from "@/lib/types"

export function LoginCard({
  teachers,
  students,
}: {
  teachers: AppUser[]
  students: AppUser[]
}) {
  const router = useRouter()
  const search = useSearchParams()
  const [signingIn, setSigningIn] = useState<string | null>(null)

  function handleLogin(user: AppUser) {
    setSigningIn(user.id)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    document.cookie = `${AUTH_COOKIE_NAME}=${serializeUser(user)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    const redirect = search.get("redirect")
    const target = redirect && redirect !== "/login" ? redirect : user.role === "teacher" ? "/dashboard" : "/student"
    // Use full reload to ensure middleware reads the new cookie and providers re-init
    window.location.href = target
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center">
        {/* Left: brand intro */}
        <div className="space-y-6 lg:pr-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            希沃魔方数字基座
          </div>
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-tight">
              AI 智能学情
              <br />
              <span className="text-primary">伴学分析系统</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
              从作业布置 → 学生提交 → AI 批阅 → 个性化反馈，一站式打通教学闭环。
              支持教师端与学生端真实联动，所有操作通过 Supabase 实时同步。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <FeatureChip icon={<BookOpen className="w-4 h-4" />} label="作业管理" />
            <FeatureChip icon={<Sparkles className="w-4 h-4" />} label="AI 批阅" />
            <FeatureChip icon={<Users className="w-4 h-4" />} label="学情洞察" />
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>建议开两个浏览器窗口体验，左侧登录教师，右侧登录学生</span>
          </div>
        </div>

        {/* Right: login card */}
        <Card className="p-6 lg:p-8 border-border/60 shadow-xl bg-card/95 backdrop-blur">
          <div className="space-y-1 mb-6">
            <h2 className="text-xl font-semibold">选择测试账号一键登录</h2>
            <p className="text-sm text-muted-foreground">
              Demo 模式下免密登录，所有数据通过 Supabase 真实同步
            </p>
          </div>

          <div className="space-y-5">
            <AccountGroup
              title="教师端账号"
              subtitle="布置作业、批阅、查看学情"
              icon={<GraduationCap className="w-4 h-4" />}
              tone="primary"
            >
              {teachers.map((t) => (
                <AccountButton
                  key={t.id}
                  user={t}
                  loading={signingIn === t.id}
                  onClick={() => handleLogin(t)}
                />
              ))}
            </AccountGroup>

            <AccountGroup
              title="学生端账号"
              subtitle="接收作业、提交答卷、查看反馈"
              icon={<BookOpen className="w-4 h-4" />}
              tone="accent"
            >
              {students.map((s) => (
                <AccountButton
                  key={s.id}
                  user={s}
                  loading={signingIn === s.id}
                  onClick={() => handleLogin(s)}
                />
              ))}
            </AccountGroup>
          </div>

          <p className="mt-6 pt-5 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed">
            提示：测试账号为预设演示数据，登录后所做的所有操作（如布置作业、提交、批阅）会在 Supabase 数据库中真实保存，
            可供另一端实时接收。
          </p>
        </Card>
      </div>
    </div>
  )
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/60">
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}

function AccountGroup({
  title,
  subtitle,
  icon,
  tone,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: "primary" | "accent"
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center ${
              tone === "primary" ? "bg-primary/10 text-primary" : "bg-chart-3/10 text-chart-3"
            }`}
          >
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-[11px] text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-normal">
          一键登录
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

function AccountButton({
  user,
  loading,
  onClick,
}: {
  user: AppUser
  loading: boolean
  onClick: () => void
}) {
  const initial = user.name.slice(0, 1)
  const sub = user.role === "teacher" ? "数学组 · 高二(3)班" : `学号 ${user.student_no}`
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="h-auto py-3 px-3 justify-start group hover:border-primary/50 hover:bg-primary/5 transition-all"
    >
      <div className="flex items-center gap-2.5 w-full">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
          style={{ backgroundColor: user.avatar_color }}
        >
          {initial}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Button>
  )
}
