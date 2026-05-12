import { ArrowDownRight, ArrowUpRight, FileText, CheckCircle2, Sparkles, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiItem {
  label: string
  value: string
  unit?: string
  delta: number // 相对昨日 %
  hint: string
  icon: typeof FileText
  accent?: "primary" | "success" | "warning" | "ai"
}

const items: KpiItem[] = [
  {
    label: "应交总数",
    value: "48",
    unit: "份",
    delta: 0,
    hint: "高二 (3) 班 · 今日作业",
    icon: FileText,
    accent: "primary",
  },
  {
    label: "实交总数",
    value: "46",
    unit: "份",
    delta: 4.3,
    hint: "提交率 95.8%",
    icon: CheckCircle2,
    accent: "success",
  },
  {
    label: "AI 批改完成率",
    value: "100",
    unit: "%",
    delta: 12,
    hint: "平均耗时 2.4 秒 / 份",
    icon: Sparkles,
    accent: "ai",
  },
  {
    label: "班级平均分",
    value: "82.4",
    unit: "分",
    delta: -1.8,
    hint: "较上次作业略有下降",
    icon: TrendingUp,
    accent: "warning",
  },
]

const accentMap: Record<NonNullable<KpiItem["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  ai: "bg-accent text-accent-foreground",
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        const positive = item.delta > 0
        const neutral = item.delta === 0
        return (
          <Card key={item.label} className="p-5 gap-3">
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div
                className={cn("flex items-center justify-center w-8 h-8 rounded-md", accentMap[item.accent ?? "primary"])}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{item.value}</span>
              {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{item.hint}</span>
              {!neutral && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium tabular-nums",
                    positive ? "text-[color:var(--success)]" : "text-destructive",
                  )}
                >
                  {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(item.delta)}%
                </span>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
