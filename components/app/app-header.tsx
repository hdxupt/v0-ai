"use client"

import { useState } from "react"
import { Bell, Search, CalendarDays, Check, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserMenu } from "./user-menu"

/** 可选学期列表：当前学期在最前 */
const TERMS = ["2026-2027 秋季", "2025-2026 春季", "2025-2026 秋季", "2024-2025 春季"]

export function AppHeader() {
  const [term, setTerm] = useState(TERMS[0])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-16 px-6 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="搜索作业、学生或知识点，如「三角函数」「李思琪」..."
          aria-label="搜索作业、学生或知识点"
          className="pl-9 pr-12 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
        <kbd
          className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center rounded border border-border bg-muted px-1.5 h-5 text-[10px] font-medium text-muted-foreground"
          aria-hidden="true"
        >
          Ctrl K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Term/Semester 切换 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-xs hover:bg-muted/70 transition-colors"
              aria-label="切换学期"
            >
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">学期</span>
              <span className="font-medium text-foreground">{term}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              切换学期
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TERMS.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTerm(t)} className="text-xs">
                <span className="flex-1">{t}</span>
                {t === term && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="通知">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-destructive" />
        </Button>

        {/* User menu - shows real logged-in user with theme switcher */}
        <UserMenu />
      </div>
    </header>
  )
}
