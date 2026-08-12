"use client"

import { cn } from "@/lib/utils"
import type { ABBox } from "./ab-data"

const TYPE_STYLE: Record<
  ABBox["type"],
  { border: string; bg: string; pill: string; label: string }
> = {
  error: {
    border: "border-destructive",
    bg: "bg-destructive/10",
    pill: "bg-destructive text-background",
    label: "错误",
  },
  partial: {
    border: "border-[color:var(--warning,#f59e0b)]",
    bg: "bg-[color:var(--warning,#f59e0b)]/10",
    pill: "bg-[color:var(--warning,#f59e0b)] text-background",
    label: "半对",
  },
  highlight: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    pill: "bg-emerald-500 text-background",
    label: "亮点",
  },
  missing: {
    border: "border-muted-foreground",
    bg: "bg-muted-foreground/10",
    pill: "bg-muted-foreground text-background",
    label: "漏做",
  },
}

export function ABPanel({
  image,
  boxes,
  score,
  method,
  variant,
}: {
  image: string
  boxes: ABBox[]
  score: number
  method: string
  variant: "old" | "new"
}) {
  const isNew = variant === "new"
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
              isNew
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isNew ? "新链路" : "旧链路"}
          </span>
          <span className="text-sm text-muted-foreground">{method}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">框数 </span>
          <span className="font-semibold text-foreground">{boxes.length}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image || "/placeholder.svg"}
          alt={`${isNew ? "新" : "旧"}链路批改框选效果`}
          className="block w-full"
        />
        {boxes.map((b, i) => {
          const [y, x, h, w] = b.bbox
          const style = TYPE_STYLE[b.type]
          return (
            <div
              key={i}
              className="absolute"
              style={{
                top: `${y}%`,
                left: `${x}%`,
                height: `${h}%`,
                width: `${w}%`,
              }}
            >
              <div
                className={cn(
                  "absolute inset-0 rounded border-2",
                  style.border,
                  style.bg,
                  b.source === "vlm" && "border-dashed",
                )}
              />
              <div
                className={cn(
                  "absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shadow",
                  style.pill,
                )}
              >
                {i + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
