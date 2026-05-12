import { Sparkles, AlertTriangle, TrendingUp, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Highlight {
  icon: typeof TrendingUp
  label: string
  value: string
  tone: "primary" | "warning" | "destructive"
}

const highlights: Highlight[] = [
  { icon: TrendingUp, label: "整体完成度", value: "良好", tone: "primary" },
  { icon: Users, label: "未提交学生", value: "2 人", tone: "warning" },
  { icon: AlertTriangle, label: "主要失分点", value: "三角函数图像", tone: "destructive" },
]

const toneClass: Record<Highlight["tone"], string> = {
  primary: "text-primary",
  warning: "text-[color:var(--warning)]",
  destructive: "text-destructive",
}

export function AISummaryCard() {
  return (
    <Card className="relative overflow-hidden border-primary/20 ai-gradient-bg gap-4 p-6">
      {/* Decorative AI orb */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/50 blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="w-[18px] h-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[color:var(--success)] ai-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">AI 智能学情总结</h2>
              <Badge variant="outline" className="text-[10px] bg-background/60 font-normal">
                由希沃 AI 引擎生成
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">基于本次作业批改结果实时生成 · 2 秒前</p>
          </div>
        </div>
      </div>

      <p className="relative text-sm leading-relaxed text-foreground/90 text-pretty">
        本次作业整体完成度<span className="font-medium text-foreground">良好</span>， 全班 48 人中
        <span className="font-medium text-foreground"> 46 人</span>已按时提交，未提交学生
        <span className="font-medium text-destructive">张三、王五</span>， 班级平均分
        <span className="font-medium text-foreground">82.4 分</span>， 较上次作业下降 1.8%。
        <span className="font-medium text-foreground">三角函数图像性质</span>失分率达
        <span className="font-medium text-destructive"> 45%</span>， 是本次作业的主要薄弱知识点。建议结合错题进行专项讲解， 并对未掌握学生进行个性化辅导。
      </p>

      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {highlights.map((h) => {
          const Icon = h.icon
          return (
            <div
              key={h.label}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-background/70 backdrop-blur-sm border border-border/50"
            >
              <Icon className={`w-4 h-4 ${toneClass[h.tone]}`} />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-muted-foreground">{h.label}</span>
                <span className="text-sm font-medium">{h.value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
