"use client"

import { Bell, Search, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-md hover:bg-muted transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">王</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col leading-tight items-start">
                <span className="text-xs font-medium">王老师</span>
                <span className="text-[10px] text-muted-foreground">数学组 · 高二 (3) 班</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>个人中心</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>账号设置</DropdownMenuItem>
            <DropdownMenuItem>教学偏好</DropdownMenuItem>
            <DropdownMenuItem>消息通知</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
