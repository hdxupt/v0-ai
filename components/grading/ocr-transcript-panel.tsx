"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { FileText, Sparkles } from "lucide-react"

/**
 * OCR 转录面板：把 submissions.ocr_data 渲染成"带行号的可读纯文本"，
 * 学生/老师都能用。每条 AI 批注命中的 OCR 行（通过 line_indexes）会被高亮，
 * hover 行号还能反向定位到上方图片上的对应 bbox。
 */

interface OcrLine {
  index: number
  text: string
  bbox: [number, number, number, number]
  confidence: number
}
interface OcrPage {
  lines: OcrLine[]
  image_url?: string
  width?: number
  height?: number
}
interface OcrDataLike {
  pages?: OcrPage[]
}

/** AI 批注精简形态，足够本组件做高亮联动 */
export interface TranscriptAnnotation {
  id: string
  /** 命中的 OCR 行号（全局） */
  line_indexes?: number[]
  /** error / partial / highlight / missing */
  type: "error" | "partial" | "highlight" | "missing"
  /** 序号，渲染成右上角圆点 */
  ordinal: number
}

export function OcrTranscriptPanel({
  ocrData,
  annotations,
  activeBoxId,
  onHoverLine,
  emptyHint = "本次提交未提供 OCR 转录",
}: {
  ocrData: unknown
  annotations?: TranscriptAnnotation[]
  activeBoxId?: string | null
  /** 用户 hover 某行时回调，参数是关联到该行的第一个批注 id（无则 null） */
  onHoverLine?: (annotationId: string | null) => void
  emptyHint?: string
}) {
  const data = ocrData as OcrDataLike | null

  // 构造 lineIndex → annotation 的反向索引，用于决定高亮颜色和悬停联动
  const lineAnnoMap = useMemo(() => {
    const map = new Map<number, TranscriptAnnotation[]>()
    for (const a of annotations ?? []) {
      for (const li of a.line_indexes ?? []) {
        const arr = map.get(li) ?? []
        arr.push(a)
        map.set(li, arr)
      }
    }
    return map
  }, [annotations])

  if (!data?.pages || data.pages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    )
  }

  const totalLines = data.pages.reduce((s, p) => s + p.lines.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" />
          <span>由腾讯云 OCR 自动转录，共 {totalLines} 行</span>
        </div>
      </div>

      <div className="space-y-5">
        {data.pages.map((page, pageIdx) => (
          <div key={pageIdx} className="space-y-1">
            {data.pages!.length > 1 && (
              <p className="text-[11px] font-medium text-muted-foreground mb-2">
                第 {pageIdx + 1} 页 · {page.lines.length} 行
              </p>
            )}
            <ol className="space-y-1 text-sm leading-relaxed font-sans">
              {page.lines.map((line) => {
                const hits = lineAnnoMap.get(line.index) ?? []
                const hasHit = hits.length > 0
                const isActive =
                  activeBoxId !== undefined &&
                  activeBoxId !== null &&
                  hits.some((a) => a.id === activeBoxId)

                // 颜色取首个批注的 type（实际场景一行通常只有一个批注）
                const firstType = hits[0]?.type
                const tone =
                  firstType === "error" || firstType === "missing"
                    ? "destructive"
                    : firstType === "highlight"
                      ? "emerald"
                      : firstType === "partial"
                        ? "warning"
                        : null

                return (
                  <li
                    key={line.index}
                    onMouseEnter={() => {
                      if (hasHit) onHoverLine?.(hits[0]!.id)
                    }}
                    onMouseLeave={() => {
                      if (hasHit) onHoverLine?.(null)
                    }}
                    className={cn(
                      "group flex gap-2 items-start px-2 py-1 rounded transition-colors",
                      hasHit ? "cursor-pointer" : "",
                      tone === "destructive" &&
                        (isActive
                          ? "bg-destructive/20 ring-1 ring-destructive/40"
                          : "bg-destructive/8 hover:bg-destructive/14"),
                      tone === "emerald" &&
                        (isActive
                          ? "bg-emerald-500/20 ring-1 ring-emerald-500/40"
                          : "bg-emerald-500/8 hover:bg-emerald-500/14"),
                      tone === "warning" &&
                        (isActive
                          ? "bg-[color:var(--warning)]/20 ring-1 ring-[color:var(--warning)]/40"
                          : "bg-[color:var(--warning)]/8 hover:bg-[color:var(--warning)]/14"),
                      !tone && "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 w-9 text-right tabular-nums text-[10px] font-medium tracking-tight pt-0.5",
                        hasHit ? "text-foreground/70" : "text-muted-foreground/50",
                      )}
                    >
                      L{line.index}
                    </span>
                    <span className="flex-1 break-words">{line.text}</span>
                    {hits.length > 0 && (
                      <span className="shrink-0 flex gap-1">
                        {hits.map((a) => (
                          <span
                            key={a.id}
                            className={cn(
                              "inline-flex w-4 h-4 rounded-full text-[9px] font-semibold text-white items-center justify-center",
                              (a.type === "error" || a.type === "missing") && "bg-destructive",
                              a.type === "highlight" && "bg-emerald-500",
                              a.type === "partial" && "bg-[color:var(--warning)]",
                            )}
                          >
                            {a.ordinal}
                          </span>
                        ))}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
