"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  Users,
  BookOpenCheck,
  BarChart3,
  Settings,
  LifeBuoy,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mainNav = [
  { label: "学情看板", href: "/dashboard", icon: LayoutDashboard },
  { label: "作业管理", href: "/dashboard?tab=tasks", icon: ClipboardList },
  { label: "AI 批阅工作台", href: "/dashboard/grading/s08", icon: Sparkles },
  { label: "班级管理", href: "#", icon: Users },
  { label: "题库中心", href: "#", icon: BookOpenCheck },
  { label: "数据中心", href: "#", icon: BarChart3 },
]

const bottomNav = [
  { label: "设置", href: "#", icon: Settings },
  { label: "帮助与反馈", href: "#", icon: LifeBuoy },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-sidebar-foreground">希沃智教</span>
          <span className="text-[11px] text-muted-foreground">AI 学情工作台</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="px-2 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">主功能</div>
        <ul className="flex flex-col gap-0.5">
          {mainNav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href.split("?")[0]) && item.href !== "#"
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 px-2 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          其他
        </div>
        <ul className="flex flex-col gap-0.5">
          {bottomNav.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer card */}
      <div className="m-3 p-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-sidebar-foreground">AI 助教</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          今日已为您批改 <span className="text-foreground font-medium">128</span> 份作业
        </p>
      </div>
    </aside>
  )
}
