"use client"

import { Sparkles, ArrowRight, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function NewResultBanner() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div className="relative ai-gradient-bg border border-primary/25 rounded-xl p-4 overflow-hidden">
      <div className="relative flex items-center gap-4">
        <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold">李雯老师刚刚批改完成了你的数学作业</span>
            <span className="text-[10px] px-1.5 h-4 rounded bg-destructive text-destructive-foreground inline-flex items-center font-medium">
              NEW
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            《5月12日 · 三角函数练习题》 · AI 已生成针对你的个性化薄弱点分析与练习推荐
          </p>
        </div>
        <Button className="shrink-0 bg-primary hover:bg-primary/90" size="sm">
          立即查看
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="关闭"
          onClick={() => setOpen(false)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
