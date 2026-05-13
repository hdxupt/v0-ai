"use client"

import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./user-menu"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-16 px-6 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="搜索作业、学生或知识点..."
          className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Term/Semester */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-xs">
          <span className="text-muted-foreground">学期</span>
          <span className="font-medium text-foreground">2024-2025 春季</span>
        </div>

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
