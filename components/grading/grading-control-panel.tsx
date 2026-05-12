"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Smartphone,
  ArrowRight,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { aiIssues } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type Phase = "idle" | "processing" | "done"

interface Props {
  studentName: string
  studentNo: string
  onAnnotationToggle: (show: boolean) => void
}

export function GradingControlPanel({ studentName, studentNo, onAnnotationToggle }: Props) {
  const [phase, setPhase] = useState<Phase>("done") // default to done so users see the full UI
  const [comment, setComment] = useState(
    "本次作业整体完成认真，基础公式掌握牢固。但在三角函数图像性质部分存在概念混淆，建议结合课本 P78 例题重新梳理。另注意计算过程的符号细节，避免诱导公式中正负号失误。继续保持！",
  )
  const [score, setScore] = useState(79)

  const handleStart = () => {
    setPhase("processing")
    onAnnotationToggle(false)
    setTimeout(() => {
      setPhase("done")
      onAnnotationToggle(true)
    }, 2200)
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Student info header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="上一份">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">8 / 46</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="下一份">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-normal",
              phase === "done" &&
                "bg-[color:var(--success)]/12 text-[color:var(--success)] border-[color:var(--success)]/30",
              phase === "processing" && "bg-primary/12 text-primary border-primary/25",
              phase === "idle" && "bg-muted text-muted-foreground border-border",
            )}
          >
            {phase === "done" && "AI 已批阅"}
            {phase === "processing" && "AI 批阅中"}
            {phase === "idle" && "待批阅"}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11">
            <AvatarFallback className="bg-primary/12 text-primary font-medium">
              {studentName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold leading-tight">{studentName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              学号 {studentNo} · 高二 (3) 班
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* AI Control */}
        <Card className="p-4 ai-gradient-bg border-primary/20 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">AI 批阅控制台</div>
              <div className="text-[11px] text-muted-foreground">基于希沃 OCR 与教研知识库</div>
            </div>
          </div>

          {phase === "idle" && (
            <Button onClick={handleStart} className="w-full bg-primary hover:bg-primary/90" size="lg">
              <Sparkles className="w-4 h-4" />
              启动 AI 自动批阅
            </Button>
          )}

          {phase === "processing" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-primary">
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </div>
                AI 正在识别并分析答题内容...
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}

          {phase === "done" && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[color:var(--success)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                批阅完成 · 耗时 2.1s
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setPhase("idle")
                  onAnnotationToggle(false)
                }}
              >
                <RotateCcw className="w-3 h-3" />
                重新批阅
              </Button>
            </div>
          )}
        </Card>

        {/* Issues breakdown */}
        {phase === "done" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 识别问题点
              </span>
              <Badge variant="secondary" className="font-normal h-5 text-[10px]">
                {aiIssues.length} 处
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {aiIssues.map((issue, idx) => (
                <li
                  key={issue.id}
                  className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-card text-xs"
                >
                  <div
                    className={cn(
                      "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white",
                      issue.type === "error" && "bg-destructive",
                      issue.type === "warning" && "bg-[color:var(--warning)]",
                      issue.type === "note" && "bg-primary",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      {issue.type === "error" ? (
                        <AlertCircle className="w-3 h-3 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-[color:var(--warning)]" />
                      )}
                      <span className="font-medium">
                        {issue.type === "error" ? "公式 / 计算错误" : "解题过程问题"}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{issue.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Score */}
        {phase === "done" && (
          <Card className="p-4 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 自动评分
              </span>
              <Badge variant="outline" className="text-[10px] font-normal">
                可编辑
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="text-5xl font-semibold tracking-tight tabular-nums bg-transparent w-24 outline-none focus:text-primary border-b-2 border-transparent focus:border-primary"
              />
              <span className="text-base text-muted-foreground">/ 100</span>
              <div className="ml-auto flex flex-col items-end text-[11px]">
                <span className="text-muted-foreground">班级平均</span>
                <span className="font-medium tabular-nums">82.4</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-[color:var(--chart-2)] transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
          </Card>
        )}

        {/* Comment */}
        {phase === "done" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI 个性化评语
              </span>
              <Badge variant="outline" className="text-[10px] font-normal gap-1 bg-accent text-accent-foreground border-accent">
                <Sparkles className="w-2.5 h-2.5" />
                AI 生成
              </Badge>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="resize-none text-sm leading-relaxed"
              placeholder="请审阅并修改 AI 生成的评语..."
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              提示：此评语将随作业结果一同发送至学生学习机。
            </p>

            <Link
              href="/student"
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <span className="flex items-center gap-2 text-xs">
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground">预览学生端接收效果</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-border bg-card flex items-center gap-2">
        <Button variant="outline" className="flex-1 bg-transparent">
          保存草稿
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary/90">
          <Send className="w-3.5 h-3.5" />
          确认并发送至学生端
        </Button>
      </div>
    </div>
  )
}
