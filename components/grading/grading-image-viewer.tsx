"use client"

import Image from "next/image"
import { useState } from "react"
import { ZoomIn, ZoomOut, RotateCw, Maximize2, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { aiIssues } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const issueStyle = {
  error: {
    border: "border-destructive",
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: AlertCircle,
    label: "错误",
  },
  warning: {
    border: "border-[color:var(--warning)]",
    bg: "bg-[color:var(--warning)]/10",
    text: "text-[color:var(--warning)]",
    icon: AlertTriangle,
    label: "注意",
  },
  note: {
    border: "border-primary",
    bg: "bg-primary/10",
    text: "text-primary",
    icon: Info,
    label: "提示",
  },
}

interface Props {
  showAnnotations: boolean
}

export function GradingImageViewer({ showAnnotations }: Props) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 h-12 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background font-normal">
            作业原图
          </Badge>
          <span className="text-xs text-muted-foreground">5月12日 · 三角函数练习题</span>
        </div>
        <div className="flex items-center gap-1">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="全屏">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image canvas */}
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        <div
          className="relative shadow-lg transition-transform duration-200 origin-top"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            width: "min(560px, 100%)",
          }}
        >
          {/* Paper */}
          <div className="relative aspect-[3/4] w-full bg-card rounded-sm overflow-hidden">
            <Image
              src="/images/homework-sample.jpg"
              alt="学生作业原图"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 560px"
            />

            {/* AI Annotations */}
            {showAnnotations &&
              aiIssues.map((issue, idx) => {
                const style = issueStyle[issue.type]
                const Icon = style.icon
                return (
                  <div
                    key={issue.id}
                    className="absolute group"
                    style={{
                      left: `${issue.region.x}%`,
                      top: `${issue.region.y}%`,
                      width: `${issue.region.width}%`,
                      height: `${issue.region.height}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 border-2 rounded animate-in fade-in zoom-in duration-300",
                        style.border,
                        style.bg,
                      )}
                    />
                    {/* Number marker */}
                    <div
                      className={cn(
                        "absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow-md",
                        issue.type === "error" && "bg-destructive",
                        issue.type === "warning" && "bg-[color:var(--warning)]",
                        issue.type === "note" && "bg-primary",
                      )}
                    >
                      {idx + 1}
                    </div>
                    {/* Tooltip bubble */}
                    <div
                      className={cn(
                        "absolute left-full ml-2 top-1/2 -translate-y-1/2 z-10 min-w-[160px] max-w-[220px] p-2 rounded-md shadow-md border bg-card",
                        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                        style.border,
                      )}
                    >
                      <div className={cn("flex items-center gap-1.5 text-[11px] font-medium mb-0.5", style.text)}>
                        <Icon className="w-3 h-3" />
                        {style.label}
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{issue.message}</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        <span>悬停在标记上查看 AI 批改细节</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" /> 错误
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[color:var(--warning)]" /> 注意
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" /> 提示
          </span>
        </div>
      </div>
    </div>
  )
}
