"use client"

import { useState } from "react"
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  CircleSlash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ViewerBox, AIQuestionVerdict } from "@/lib/types"
import { formatDateTime } from "@/lib/format"
import { toFileSrc } from "@/lib/blob-url"
import { WavyUnderline } from "@/components/grading/annotation-marker"
import { RedPenOverlay } from "@/components/grading/red-pen-overlay"

/**
 * 按 bbox type 选样式。
 * 兼容 v1（error / warning）与 v2（error / partial / highlight / missing）。
 */
const TYPE_STYLE = {
  error: {
    border: "border-destructive",
    bg: "bg-destructive/10",
    text: "text-destructive",
    pill: "bg-destructive text-destructive-foreground",
    label: "错误",
    Icon: AlertCircle,
  },
  warning: {
    border: "border-[color:var(--warning,#f59e0b)]",
    bg: "bg-[color:var(--warning,#f59e0b)]/15",
    text: "text-[color:var(--warning,#f59e0b)]",
    pill: "bg-[color:var(--warning,#f59e0b)] text-white",
    label: "注意",
    Icon: AlertTriangle,
  },
  partial: {
    border: "border-[color:var(--warning,#f59e0b)]",
    bg: "bg-[color:var(--warning,#f59e0b)]/15",
    text: "text-[color:var(--warning,#f59e0b)]",
    pill: "bg-[color:var(--warning,#f59e0b)] text-white",
    label: "半对",
    Icon: AlertTriangle,
  },
  highlight: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-500 text-white",
    label: "亮点",
    Icon: Sparkles,
  },
  missing: {
    border: "border-muted-foreground/60",
    bg: "bg-muted/40",
    text: "text-muted-foreground",
    pill: "bg-muted-foreground text-background",
    label: "漏做",
    Icon: CircleSlash,
  },
} as const

interface Props {
  imageUrls: string[]
  boxes: ViewerBox[]
  /** 逐小题判定（红笔留痕）。有值时在原卷上渲染 ✓/✗/半对 */
  verdicts?: AIQuestionVerdict[]
  /** 总分。有值且已批阅时在卷首盖红笔分数章 */
  score?: number | null
  showAnnotations: boolean
  currentIndex: number
  onIndexChange: (idx: number) => void
  taskTitle: string
  submittedAt: string
}

export function GradingImageViewer({
  imageUrls,
  boxes,
  verdicts = [],
  score = null,
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
  // verdicts 自带 page_index，天然支持多页
  const hasVerdicts = verdicts.length > 0
  // 有红笔留痕时旧版标签/波浪线完全退出卷面，避免双重标注；
  // 旧数据（无 verdicts）仍用旧版标记，保持向后兼容。
  // 旧标记仅显示在第一页（模型对第一张图返回 100x100 坐标）。
  const visibleBoxes = !hasVerdicts && currentIndex === 0 && showAnnotations ? boxes : []

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

      {/* 讲台桌面：细点阵纹理，卷子摊在上面 */}
      <div
        className="flex-1 overflow-auto p-6 flex items-start justify-center"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklch, var(--foreground) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div
          className="relative transition-transform duration-200 origin-top"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            width: "min(640px, 100%)",
            filter: "drop-shadow(0 10px 24px color-mix(in oklch, var(--foreground) 18%, transparent))",
          }}
        >
          <div className="relative w-full bg-card rounded-sm overflow-hidden ring-1 ring-border">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={toFileSrc(url)}
                alt={`作业原图 第 ${currentIndex + 1} 页`}
                className="w-full h-auto block"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="aspect-[3/4] w-full flex items-center justify-center text-muted-foreground text-sm">
                暂无图片
              </div>
            )}

            {/* 卷首红笔总分：只盖在第 1 页，随批注开关显隐 */}
            {showAnnotations && currentIndex === 0 && typeof score === "number" && hasVerdicts ? (
              <ScoreStamp score={score} />
            ) : null}

            {hasVerdicts && showAnnotations ? (
              <RedPenOverlay verdicts={verdicts} pageIndex={currentIndex} />
            ) : null}

            {visibleBoxes.map((box, idx) => {
              const style = TYPE_STYLE[box.type] ?? TYPE_STYLE.error
              const Icon = style.Icon

              // ---- 智能 tooltip 定位：根据 box 在图片容器中的位置自动选侧 ----
              const cx = box.x + box.w / 2 // box 横向中心 (%)
              const cy = box.y + box.h / 2 // box 纵向中心 (%)
              // 横向：中心点超过 55% → 弹左侧，否则弹右侧
              const horiz: "left" | "right" = cx > 55 ? "left" : "right"
              // 纵向：靠顶部强制向下展开；靠底部强制向上展开；中段垂直居中
              const vert: "top" | "middle" | "bottom" =
                cy < 18 ? "top" : cy > 82 ? "bottom" : "middle"

              const tooltipPos = cn(
                horiz === "right" ? "left-full ml-2" : "right-full mr-2",
                vert === "top" && "top-0",
                vert === "bottom" && "bottom-0",
                vert === "middle" && "top-1/2 -translate-y-1/2",
              )

              // 客观题（填空/选择/判断）：题号旁贴标签，不画框；主观题：行级波浪下划线
              const isObjective = box.question_type === "objective"

              return (
                <div
                  key={box.id}
                  className="absolute group"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                  }}
                >
                  {isObjective ? (
                    /* 客观题：仅在出错位置贴一个标签（题号 + 类型），一眼定位、不遮挡作答 */
                    <div
                      className={cn(
                        "absolute -top-2.5 left-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-semibold shadow-md whitespace-nowrap animate-in fade-in zoom-in duration-300",
                        style.pill,
                      )}
                    >
                      <span>{box.index ?? idx + 1}</span>
                      <Icon className="w-2.5 h-2.5" />
                      <span>{style.label}</span>
                    </div>
                  ) : (
                    /* 主观题/解答：行级波浪下划线 + 题号小圆点，柔和锚定出错那一行 */
                    <>
                      <WavyUnderline type={box.type} />
                      <div
                        className={cn(
                          "absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shadow-md animate-in fade-in zoom-in duration-300",
                          style.pill,
                        )}
                      >
                        {box.index ?? idx + 1}
                      </div>
                    </>
                  )}
                  <div
                    className={cn(
                      "absolute z-20 w-[min(280px,42vw)] min-w-[180px] p-2 rounded-md shadow-lg border bg-card",
                      "opacity-0 group-hover:opacity-100 group-hover:z-30 transition-opacity pointer-events-none",
                      style.border,
                      tooltipPos,
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5 text-[11px] font-medium mb-1", style.text)}>
                      <Icon className="w-3 h-3" />
                      {style.label}
                      {box.box_source ? (
                        <span className="ml-auto text-[10px] font-normal text-muted-foreground/70">
                          {box.box_source === "vlm" ? "AI视觉定位" : "OCR行定位"}
                        </span>
                      ) : null}
                      {typeof box.confidence === "number" ? (
                        <span
                          className={cn(
                            "text-muted-foreground/70 font-normal",
                            box.box_source ? "" : "ml-auto",
                          )}
                        >
                          conf {Math.round(box.confidence * 100)}%
                        </span>
                      ) : null}
                    </div>
                    {box.question_text ? (
                      <p className="text-[11px] text-muted-foreground italic mb-1 line-clamp-2">
                        {box.question_text}
                      </p>
                    ) : null}
                    <p className="text-xs text-foreground leading-relaxed">{box.message}</p>
                    {box.correct_answer ? (
                      <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                        正确做法：{box.correct_answer}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        {hasVerdicts ? (
          <>
            <span>红笔留痕跟随作答位置 · 批改细节见右侧明细</span>
            <div className="flex items-center gap-3 flex-wrap font-medium" style={{ color: "#d13438" }}>
              <span>✓ 对</span>
              <span>✗ 错（附正确答案）</span>
              <span>半对（附得分）</span>
              <span className="inline-flex items-center gap-1 text-sky-600">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-sky-500" />
                待老师裁决
              </span>
            </div>
          </>
        ) : (
          <>
            <span>
              悬停在标记上查看 AI 批改细节
              {currentIndex !== 0 && total > 1 ? "（标记仅显示在第 1 页）" : ""}
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <Legend dot="bg-destructive" label="错误" />
              <Legend dot="bg-[color:var(--warning,#f59e0b)]" label="半对/注意" />
              <Legend dot="bg-emerald-500" label="亮点" />
              <Legend dot="bg-muted-foreground" label="漏做" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 卷首红笔总分章：仿真人老师在卷首写的大分数 + 双下划线，微微倾斜。
 */
function ScoreStamp({ score }: { score: number }) {
  return (
    <div
      className="absolute top-[1.5%] right-[4%] z-10 select-none pointer-events-none animate-in fade-in zoom-in-95 duration-500"
      style={{ transform: "rotate(-6deg)", color: "#d13438" }}
      aria-label={`总分 ${score} 分`}
    >
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: "cursive" }}>
          {score}
        </span>
        <span className="text-lg font-semibold" style={{ fontFamily: "cursive" }}>
          分
        </span>
      </div>
      {/* 双下划线，手写微弯 */}
      <svg width="86" height="12" viewBox="0 0 86 12" fill="none" className="mt-0.5" aria-hidden="true">
        <path d="M2 4 C24 1.5 58 1.5 84 3.5" stroke="#d13438" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M6 9.5 C28 7 56 7 80 8.8" stroke="#d13438" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("w-2 h-2 rounded-full", dot)} />
      {label}
    </span>
  )
}
