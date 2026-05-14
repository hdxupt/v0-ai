"use client"

import { useMemo, useState } from "react"
import { Sparkles, MessageCircleHeart, AlertTriangle, ArrowRight, Heart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { parseAiComment, type AiCommentProblem } from "@/lib/parse-ai-comment"

/**
 * 学情分析结构化展示
 * ----
 * 不改变后端 schema，前端实时解析 ai_comment 字符串。
 * 切分失败时退化为单段展示，绝不丢失原文。
 */
export function AiCommentStructured({ comment }: { comment: string }) {
  const data = useMemo(() => parseAiComment(comment), [comment])

  // 不能解析时退化展示
  if (!data.parsed) {
    return (
      <Card className="p-5 bg-accent/30 border-accent">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">AI 学情分析</h3>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {data.greeting || comment}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-5 bg-accent/30 border-accent space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">AI 学情分析</h3>
          <Badge variant="outline" className="text-[10px] font-normal h-5">
            Claude · 4 段式诊断
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {data.problems.length} 个核心问题 · {data.action ? "含行动方案" : "暂无行动方案"}
        </span>
      </div>

      {/* 1. Greeting block */}
      {data.greeting && (
        <SectionBlock
          tone="brand"
          icon={<MessageCircleHeart className="w-3.5 h-3.5" />}
          label="老师怎么看你"
        >
          <p className="text-sm leading-relaxed text-foreground/90">{data.greeting}</p>
        </SectionBlock>
      )}

      {/* 2. Problems block */}
      {data.problems.length > 0 && (
        <SectionBlock
          tone="warn"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label={`需要重点突破的 ${data.problems.length} 个问题`}
        >
          <ProblemList problems={data.problems} />
        </SectionBlock>
      )}

      {/* 3. Action block */}
      {data.action && (
        <SectionBlock
          tone="success"
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          label="接下来这样做"
        >
          <p className="text-sm leading-relaxed text-foreground/90">{data.action}</p>
        </SectionBlock>
      )}

      {/* 4. Encouragement block */}
      {data.encouragement && (
        <SectionBlock tone="ink" icon={<Heart className="w-3.5 h-3.5" />} label="老师想对你说">
          <p className="text-sm leading-relaxed text-foreground/90 italic">{data.encouragement}</p>
        </SectionBlock>
      )}
    </Card>
  )
}

/* ---------------- 子组件 ---------------- */

type Tone = "brand" | "warn" | "success" | "ink"

function SectionBlock({
  tone,
  icon,
  label,
  children,
}: {
  tone: Tone
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  const toneCls: Record<Tone, string> = {
    brand: "border-primary/25 bg-primary/[0.05]",
    warn: "border-[color:var(--warning)]/35 bg-[color:var(--warning)]/[0.06]",
    success: "border-[color:var(--success)]/30 bg-[color:var(--success)]/[0.05]",
    ink: "border-border bg-muted/40",
  }
  const headerCls: Record<Tone, string> = {
    brand: "text-primary",
    warn: "text-[color:var(--warning)]",
    success: "text-[color:var(--success)]",
    ink: "text-muted-foreground",
  }
  return (
    <div className={cn("rounded-lg border p-3.5", toneCls[tone])}>
      <div className={cn("flex items-center gap-1.5 text-[11px] font-medium mb-2", headerCls[tone])}>
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ProblemList({ problems }: { problems: AiCommentProblem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="space-y-2">
      {problems.map((p) => {
        const isOpen = openIdx === p.index
        return (
          <button
            key={p.index}
            type="button"
            onClick={() => setOpenIdx(isOpen ? null : p.index)}
            className={cn(
              "w-full text-left rounded-md border bg-background/60 hover:bg-background transition-colors",
              "px-3 py-2.5",
              isOpen ? "border-[color:var(--warning)]/45" : "border-border",
            )}
            aria-expanded={isOpen}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "shrink-0 w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center tabular-nums",
                  "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
                )}
              >
                {p.index}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium leading-snug text-foreground/90">{p.title}</p>
                {isOpen && p.body && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                )}
              </div>
              <ArrowRight
                className={cn(
                  "w-3.5 h-3.5 shrink-0 mt-1 text-muted-foreground transition-transform",
                  isOpen ? "rotate-90" : "",
                )}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
