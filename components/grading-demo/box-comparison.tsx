"use client"

import { cn } from "@/lib/utils"

/** 标注框（0~100 相对坐标） */
interface DemoBox {
  y: number
  x: number
  h: number
  w: number
  /** 渲染样式：lost=丢失占位 / coarse=粗糙大框 / ocr=OCR行框 / vlm=VLM视觉补位 */
  variant: "lost" | "coarse" | "ocr" | "vlm"
  label: string
}

const VARIANT_STYLE: Record<
  DemoBox["variant"],
  { border: string; bg: string; pill: string; dashed: boolean }
> = {
  lost: {
    border: "border-muted-foreground/50",
    bg: "bg-muted/30",
    pill: "bg-muted-foreground text-background",
    dashed: true,
  },
  coarse: {
    border: "border-destructive/70",
    bg: "bg-destructive/5",
    pill: "bg-destructive text-destructive-foreground",
    dashed: false,
  },
  ocr: {
    border: "border-primary",
    bg: "bg-primary/10",
    pill: "bg-primary text-primary-foreground",
    dashed: false,
  },
  vlm: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    pill: "bg-emerald-500 text-white",
    dashed: true,
  },
}

function BoxLayer({ boxes }: { boxes: DemoBox[] }) {
  return (
    <>
      {boxes.map((b, i) => {
        const s = VARIANT_STYLE[b.variant]
        return (
          <div
            key={i}
            className="absolute"
            style={{ top: `${b.y}%`, left: `${b.x}%`, width: `${b.w}%`, height: `${b.h}%` }}
          >
            <div className={cn("absolute inset-0 border-2 rounded", s.border, s.bg, s.dashed && "border-dashed")} />
            <div
              className={cn(
                "absolute -top-2.5 left-0 px-1.5 h-5 rounded-sm text-[10px] font-medium flex items-center shadow-sm whitespace-nowrap",
                s.pill,
              )}
            >
              {b.label}
            </div>
          </div>
        )
      })}
    </>
  )
}

interface PanelProps {
  title: string
  subtitle: string
  tone: "before" | "after"
  boxes: DemoBox[]
  imgSrc: string
}

function Panel({ title, subtitle, tone, boxes, imgSrc }: PanelProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs font-semibold",
            tone === "before" ? "bg-muted text-muted-foreground" : "bg-emerald-500 text-white",
          )}
        >
          {tone === "before" ? "优化前" : "优化后"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
        </div>
      </div>
      <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc || "/placeholder.svg"} alt="手写数学作业批改示意" className="w-full h-auto block" />
        <BoxLayer boxes={boxes} />
      </div>
    </div>
  )
}

const IMG = "/demo/handwritten-math.png"

// 优化前：OCR 在手写算式上失配 —— 一处错误整个框丢失（灰虚线占位），另一处退化成框住整道大题的粗大框
const BEFORE_BOXES: DemoBox[] = [
  { y: 40, x: 8, h: 44, w: 84, variant: "coarse", label: "整道大题（定位过粗）" },
  { y: 58, x: 30, h: 10, w: 38, variant: "lost", label: "此处错误：框丢失" },
]

// 优化后：OCR 命中的印刷体行用实线蓝框；手写错误行由 VLM 视觉补位，虚线绿框紧贴
const AFTER_BOXES: DemoBox[] = [
  { y: 12, x: 8, h: 9, w: 80, variant: "ocr", label: "OCR 行定位（题干）" },
  { y: 58, x: 30, h: 9, w: 36, variant: "vlm", label: "AI 视觉补位（紧贴错误）" },
  { y: 70, x: 12, h: 8, w: 30, variant: "vlm", label: "AI 视觉补位" },
]

export function BoxComparison() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Panel
        title="OCR + LLM 行号定位"
        subtitle="手写算式 OCR 失配 → 错误框丢失，或退化为整道大题的粗框"
        tone="before"
        boxes={BEFORE_BOXES}
        imgSrc={IMG}
      />
      <Panel
        title="OCR 行框 + VLM 视觉补位（本次优化）"
        subtitle="印刷体走 OCR 实线框；OCR 漏识别处由视觉大模型补位，虚线紧贴错误"
        tone="after"
        boxes={AFTER_BOXES}
        imgSrc={IMG}
      />
    </div>
  )
}
