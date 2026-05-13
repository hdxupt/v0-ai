import { FileText, CheckCircle2, Sparkles, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface KpiData {
  expected: number
  submitted: number
  graded: number
  averageScore: number | null
}

export function KpiCards({ data }: { data: KpiData }) {
  const submitRate = data.expected ? Math.round((data.submitted / data.expected) * 100) : 0
  const gradeRate = data.submitted ? Math.round((data.graded / data.submitted) * 100) : 0

  const items = [
    {
      label: "应交总数",
      value: data.expected.toString(),
      unit: "份",
      hint: "本班级近期作业累计",
      icon: FileText,
      accent: "primary" as const,
    },
    {
      label: "实交总数",
      value: data.submitted.toString(),
      unit: "份",
      hint: `提交率 ${submitRate}%`,
      icon: CheckCircle2,
      accent: "success" as const,
    },
    {
      label: "AI 批改完成率",
      value: gradeRate.toString(),
      unit: "%",
      hint: data.submitted ? `已批阅 ${data.graded}/${data.submitted}` : "暂无提交",
      icon: Sparkles,
      accent: "ai" as const,
    },
    {
      label: "班级平均分",
      value: data.averageScore != null ? data.averageScore.toFixed(1) : "--",
      unit: "分",
      hint: data.averageScore != null ? "基于已批阅作业" : "暂无批阅结果",
      icon: TrendingUp,
      accent: "warning" as const,
    },
  ]

  const accentMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
    warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
    ai: "bg-accent text-accent-foreground",
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="p-5 gap-3">
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-md", accentMap[item.accent])}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{item.value}</span>
              {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
            </div>
            <div className="text-xs text-muted-foreground truncate">{item.hint}</div>
          </Card>
        )
      })}
    </div>
  )
}
