"use client"

import { ScrollText, ArrowDownRight, Sparkles, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ScoreBreakdown, ScoreDeductionItem, AIBboxType } from "@/lib/types"

/**
 * 评分溯源面板 —— 把"满分 100 → 逐条扣分（关联五维）→ 最终分"显性化。
 *
 * 设计目标：当有人质疑"AI 凭什么打这个分"时，这一块就是答案。
 * - 上半部：扣分账本（每条可 hover 联动图片 bbox）
 * - 下半部：五维归因（每个维度被哪些扣分拉低）
 *
 * 兼容旧数据：若 breakdown.available=false（早期批改没记逐项分值），
 * 自动降级为"只展示五维雷达 + 总分"，不报错、不留空。
 */
export function ScoreProvenance({
  breakdown,
  activeId,
  onHoverChange,
  trigger = "hover",
}: {
  breakdown: ScoreBreakdown
  activeId?: string | null
  onHoverChange?: (id: string | null) => void
  /** 联动触发方式：hover（教师端默认）或 click（学生端，点击才跳转/再点取消） */
  trigger?: "hover" | "click"
}) {
  const deductions = breakdown.items.filter((it) => it.delta < 0)
  const bonuses = breakdown.items.filter((it) => it.delta > 0)
  const showResidual = breakdown.available && Math.abs(breakdown.residual) >= 1

  return (
    <Card className="p-4 gap-3 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
          <ScrollText className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">评分溯源</div>
          <div className="text-[11px] text-muted-foreground">AI 如何得出这个分数 · 每一分都可追源</div>
        </div>
      </div>

      {breakdown.available ? (
        <ScoreLedger
          breakdown={breakdown}
          deductions={deductions}
          bonuses={bonuses}
          showResidual={showResidual}
          activeId={activeId}
          onHoverChange={onHoverChange}
          trigger={trigger}
        />
      ) : (
        <div className="flex items-start gap-2 rounded-md bg-muted/40 border border-border px-3 py-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            本次为早期批改数据，未记录逐项分值。下方仍可查看最终得分与五维能力归因；
            重新批阅即可生成完整的逐项扣分账本。
          </p>
        </div>
      )}

      {/* 五维归因 */}
      <DimensionAttribution breakdown={breakdown} />
    </Card>
  )
}

/* ----------------------------- 扣分账本 ----------------------------- */

function ScoreLedger({
  breakdown,
  deductions,
  bonuses,
  showResidual,
  activeId,
  onHoverChange,
  trigger = "hover",
}: {
  breakdown: ScoreBreakdown
  deductions: ScoreDeductionItem[]
  bonuses: ScoreDeductionItem[]
  showResidual: boolean
  activeId?: string | null
  onHoverChange?: (id: string | null) => void
  trigger?: "hover" | "click"
}) {
  return (
    <div className="space-y-1">
      {/* 满分基准 */}
      <div className="flex items-center justify-between px-2 py-1.5 text-xs">
        <span className="text-muted-foreground">满分基准</span>
        <span className="tabular-nums font-medium">{breakdown.fullScore}</span>
      </div>

      {/* 逐条扣分 */}
      {deductions.map((item) => (
        <LedgerRow
          key={item.id}
          item={item}
          activeId={activeId}
          onHoverChange={onHoverChange}
          trigger={trigger}
        />
      ))}

      {/* 亮点加分 */}
      {bonuses.map((item) => (
        <LedgerRow
          key={item.id}
          item={item}
          activeId={activeId}
          onHoverChange={onHoverChange}
          trigger={trigger}
        />
      ))}

      {/* 综合评定调整（诚实对账） */}
      {showResidual && (
        <div className="flex items-center justify-between px-2 py-1.5 text-xs border-t border-dashed border-border/60 mt-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            综合评定调整
          </span>
          <span
            className={cn(
              "tabular-nums font-medium",
              breakdown.residual < 0 ? "text-destructive" : "text-[color:var(--success)]",
            )}
          >
            {breakdown.residual > 0 ? "+" : ""}
            {breakdown.residual}
          </span>
        </div>
      )}

      {/* 最终得分 */}
      <div className="flex items-center justify-between px-2 py-2 rounded-md bg-primary/10 mt-1">
        <span className="text-xs font-medium text-foreground/80">最终得分</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-primary leading-none">
            {breakdown.finalScore}
          </span>
          <span className="text-xs text-muted-foreground">/ {breakdown.fullScore}</span>
        </div>
      </div>
    </div>
  )
}

function LedgerRow({
  item,
  activeId,
  onHoverChange,
  trigger = "hover",
}: {
  item: ScoreDeductionItem
  activeId?: string | null
  onHoverChange?: (id: string | null) => void
  trigger?: "hover" | "click"
}) {
  const isActive = activeId === item.id
  const tone = toneOf(item.type)
  const interactive = !!onHoverChange
  const isClick = trigger === "click"

  // click 模式：点击选中并联动跳转，再点同一条取消；hover 模式保持原行为
  const clickHandlers = isClick
    ? {
        onClick: () => onHoverChange?.(isActive ? null : item.id),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onHoverChange?.(isActive ? null : item.id)
          }
        },
        role: "button" as const,
      }
    : {
        onMouseEnter: () => onHoverChange?.(item.id),
        onMouseLeave: () => onHoverChange?.(null),
        onFocus: () => onHoverChange?.(item.id),
        onBlur: () => onHoverChange?.(null),
      }

  return (
    <div
      {...(interactive ? clickHandlers : {})}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
        interactive && "cursor-pointer",
        isActive ? "bg-muted ring-1 ring-border" : interactive ? "hover:bg-muted/50" : "",
      )}
    >
      {/* 序号 */}
      <span
        className={cn(
          "shrink-0 w-4 h-4 rounded-full text-[9px] font-semibold text-white flex items-center justify-center tabular-nums",
          tone.dot,
        )}
      >
        {item.ordinal}
      </span>

      {/* 维度标签 */}
      {item.dimension ? (
        <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal shrink-0">
          {dimensionLabel(item.dimension)}
        </Badge>
      ) : null}

      {/* 原因 */}
      <span className="flex-1 min-w-0 truncate text-[11px] text-foreground/80">{item.reason}</span>

      {/* 分值 */}
      <span
        className={cn(
          "shrink-0 tabular-nums text-xs font-semibold inline-flex items-center gap-0.5",
          item.delta < 0 ? "text-destructive" : "text-[color:var(--success)]",
        )}
      >
        {item.delta < 0 ? (
          <ArrowDownRight className="w-3 h-3" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        {item.delta > 0 ? "+" : ""}
        {item.delta}
      </span>
    </div>
  )
}

/* ----------------------------- 五维归因 ----------------------------- */

function DimensionAttribution({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          五维能力归因
        </span>
        <span className="text-[10px] text-muted-foreground">扣分如何拉低各维度</span>
      </div>
      {breakdown.dimensions.map((dim) => (
        <div key={dim.dimension} className="flex items-center gap-2 text-xs">
          <span className="w-16 text-muted-foreground shrink-0">{dim.label}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-[color:var(--chart-2)]"
              style={{ width: `${dim.score}%` }}
            />
          </div>
          <span className="w-7 text-right tabular-nums font-medium">{dim.score}</span>
          {dim.deducted > 0 ? (
            <span className="w-14 text-right tabular-nums text-[10px] text-destructive shrink-0">
              −{dim.deducted}分·{dim.itemCount}处
            </span>
          ) : (
            <span className="w-14 text-right text-[10px] text-muted-foreground/50 shrink-0">—</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ----------------------------- helpers ----------------------------- */

function dimensionLabel(dim: NonNullable<ScoreDeductionItem["dimension"]>): string {
  const map: Record<string, string> = {
    basics: "计算基础",
    logic: "逻辑思维",
    knowledge: "知识掌握",
    application: "应用能力",
    presentation: "书写规范",
  }
  return map[dim] ?? dim
}

function toneOf(type: AIBboxType) {
  switch (type) {
    case "error":
      return { dot: "bg-destructive" }
    case "missing":
      return { dot: "bg-muted-foreground" }
    case "highlight":
      return { dot: "bg-emerald-500" }
    case "partial":
    default:
      return { dot: "bg-[color:var(--warning)]" }
  }
}
