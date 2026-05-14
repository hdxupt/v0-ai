"use client"

import { useState } from "react"
import { AlertCircle, Sparkles, CircleAlert, MinusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ViewerBox } from "@/lib/types"

/**
 * AI 批注详解列表
 * 与图片上的 bbox 编号一一对应。鼠标 hover 任一卡片，
 * 通过 onHover 回调向外通知，由父组件控制图片端高亮。
 */
export function AnnotationDetailList({
  boxes,
  activeId,
  onHoverChange,
}: {
  boxes: ViewerBox[]
  activeId: string | null
  onHoverChange: (id: string | null) => void
}) {
  if (boxes.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-foreground/80">AI 批注详解 · 与图片编号一一对应</h4>
        <span className="text-[10px] text-muted-foreground">悬停查看高亮位置</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {boxes.map((box, idx) => (
          <AnnotationCard
            key={box.id}
            box={box}
            seq={idx + 1}
            isActive={activeId === box.id}
            onEnter={() => onHoverChange(box.id)}
            onLeave={() => onHoverChange(null)}
          />
        ))}
      </div>
    </div>
  )
}

function AnnotationCard({
  box,
  seq,
  isActive,
  onEnter,
  onLeave,
}: {
  box: ViewerBox
  seq: number
  isActive: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const tone = toneOf(box.type)

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      tabIndex={0}
      className={cn(
        "group relative rounded-lg border bg-card transition-all cursor-default",
        "px-3 py-2.5",
        tone.border,
        isActive ? `${tone.activeBg} shadow-md scale-[1.01] ring-1 ${tone.ring}` : "hover:bg-muted/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Number badge */}
        <span
          className={cn(
            "shrink-0 w-5 h-5 rounded-full text-[10px] font-semibold text-white flex items-center justify-center tabular-nums",
            tone.dot,
            isActive ? "ring-2 ring-offset-1 ring-offset-card" : "",
            isActive ? tone.ring : "",
          )}
        >
          {seq}
        </span>

        <div className="flex-1 min-w-0">
          {/* Type + confidence */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", tone.text)}>
              {tone.icon}
              {tone.label}
            </span>
            {typeof box.confidence === "number" && (
              <Badge variant="outline" className="text-[9px] font-normal h-4 px-1">
                置信度 {Math.round(box.confidence * 100)}%
              </Badge>
            )}
          </div>

          {/* Question text (if any) */}
          {box.question_text && (
            <p className="text-[11px] text-muted-foreground mb-1 line-clamp-1">
              <span className="text-foreground/60">题目：</span>
              {box.question_text}
            </p>
          )}

          {/* Process analysis */}
          <p
            className={cn(
              "text-[12px] leading-relaxed text-foreground/90",
              !expanded && "line-clamp-3",
            )}
          >
            {box.message}
          </p>
          {box.message.length > 80 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              {expanded ? "收起" : "展开全文"}
            </button>
          )}

          {/* Correct answer */}
          {box.correct_answer && (
            <div className="mt-2 rounded-md bg-[color:var(--success)]/[0.08] border border-[color:var(--success)]/25 px-2 py-1.5">
              <p className="text-[10px] font-medium text-[color:var(--success)] mb-0.5">参考正解</p>
              <p className="text-[11px] leading-snug text-foreground/85 font-mono">
                {box.correct_answer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- 类型样式 ---------------- */

function toneOf(type: ViewerBox["type"]) {
  switch (type) {
    case "error":
      return {
        label: "错误",
        icon: <AlertCircle className="w-3 h-3" />,
        border: "border-destructive/30",
        activeBg: "bg-destructive/[0.06]",
        ring: "ring-destructive/40",
        dot: "bg-destructive",
        text: "text-destructive",
      }
    case "missing":
      return {
        label: "漏做",
        icon: <MinusCircle className="w-3 h-3" />,
        border: "border-muted-foreground/30",
        activeBg: "bg-muted/40",
        ring: "ring-muted-foreground/40",
        dot: "bg-muted-foreground",
        text: "text-muted-foreground",
      }
    case "highlight":
      return {
        label: "亮点",
        icon: <Sparkles className="w-3 h-3" />,
        border: "border-emerald-500/30",
        activeBg: "bg-emerald-500/[0.07]",
        ring: "ring-emerald-500/45",
        dot: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
      }
    case "partial":
    case "warning":
    default:
      return {
        label: "半对/注意",
        icon: <CircleAlert className="w-3 h-3" />,
        border: "border-[color:var(--warning)]/35",
        activeBg: "bg-[color:var(--warning)]/[0.08]",
        ring: "ring-[color:var(--warning)]/45",
        dot: "bg-[color:var(--warning)]",
        text: "text-[color:var(--warning)]",
      }
  }
}
