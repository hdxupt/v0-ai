"use client"

import { useState } from "react"
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AIIssueAnnotation } from "@/lib/types"
import { formatDateTime } from "@/lib/format"

const issueStyle = {
  error: {
    border: "border-destructive",
    bg: "bg-destructive/10",
    text: "text-destructive",
    pill: "bg-destructive",
  },
  warning: {
    border: "border-[color:var(--warning)]",
    bg: "bg-[color:var(--warning)]/10",
    text: "text-[color:var(--warning)]",
    pill: "bg-[color:var(--warning)]",
  },
} as const

interface Props {
  imageUrls: string[]
  issues: AIIssueAnnotation[]
  showAnnotations: boolean
  currentIndex: number
  onIndexChange: (idx: number) => void
  taskTitle: string
  submittedAt: string
}

export function GradingImageViewer({
  imageUrls,
  issues,
  showAnnotations,
  currentIndex,
  onIndexChange,
  taskTitle,
  submittedAt,
}: Props) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  const url = imageUrls[currentIndex]
  const total = imageUrls.length
  // Show annotations only on the first image (mock pretends AI analyzed page 1)
  const visibleIssues = currentIndex === 0 && showAnnotations ? issues : []

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r border-border">
      <div className="flex items-center justify-between gap-2 px-4 h-12 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background font-normal">
            作业原图
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {formatDateTime(submittedAt)} · {taskTitle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {total > 1 ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                aria-label="上一张"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground w-12 text-center">
                {currentIndex + 1} / {total}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onIndexChange(Math.min(total - 1, currentIndex + 1))}
                disabled={currentIndex === total - 1}
                aria-label="下一张"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
            </>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            aria-label="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground w-12 text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            aria-label="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="旋转"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="全屏" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <Maximize2 className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        <div
          className="relative shadow-lg transition-transform duration-200 origin-top"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            width: "min(640px, 100%)",
          }}
        >
          <div className="relative w-full bg-card rounded-sm overflow-hidden">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url || "/placeholder.svg"}
                alt={`作业原图 第 ${currentIndex + 1} 页`}
                className="w-full h-auto block"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="aspect-[3/4] w-full flex items-center justify-center text-muted-foreground text-sm">
                暂无图片
              </div>
            )}

            {visibleIssues.map((issue, idx) => {
              const style = issueStyle[issue.type]
              const Icon = issue.type === "error" ? AlertCircle : AlertTriangle
              return (
                <div
                  key={issue.id}
                  className="absolute group"
                  style={{
                    left: `${issue.x}%`,
                    top: `${issue.y}%`,
                    width: `${issue.w}%`,
                    height: `${issue.h}%`,
                  }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 border-2 rounded animate-in fade-in zoom-in duration-300",
                      style.border,
                      style.bg,
                    )}
                  />
                  <div
                    className={cn(
                      "absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow-md",
                      style.pill,
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div
                    className={cn(
                      "absolute left-full ml-2 top-1/2 -translate-y-1/2 z-10 min-w-[160px] max-w-[240px] p-2 rounded-md shadow-md border bg-card",
                      "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                      style.border,
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5 text-[11px] font-medium mb-0.5", style.text)}>
                      <Icon className="w-3 h-3" />
                      {issue.type === "error" ? "错误" : "注意"}
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{issue.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        <span>悬停在标记上查看 AI 批改细节{currentIndex !== 0 && total > 1 ? "（标记仅显示在第 1 页）" : ""}</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" /> 错误
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[color:var(--warning)]" /> 注意
          </span>
        </div>
      </div>
    </div>
  )
}
