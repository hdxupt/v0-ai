import { Sparkles, BookOpen, Target, MessagesSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Suggestion {
  icon: typeof BookOpen
  priority: "high" | "medium" | "low"
  title: string
  desc: string
}

const suggestions: Suggestion[] = [
  {
    icon: BookOpen,
    priority: "high",
    title: "重讲三角函数图像性质",
    desc: "失分率 45%，建议下节课用 15 分钟专项讲解。",
  },
  {
    icon: Target,
    priority: "medium",
    title: "针对 5 名学生进行个性化辅导",
    desc: "推送配套微课与变式训练到其学习机。",
  },
  {
    icon: MessagesSquare,
    priority: "low",
    title: "课堂提问与即时反馈",
    desc: "建议次日课堂提问错题相关概念，巩固掌握。",
  },
]

const priorityBadge: Record<Suggestion["priority"], { label: string; className: string }> = {
  high: { label: "高优先级", className: "bg-destructive/12 text-destructive border-destructive/25" },
  medium: { label: "中优先级", className: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30" },
  low: { label: "建议", className: "bg-muted text-muted-foreground border-border" },
}

export function TeachingSuggestions() {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-accent text-accent-foreground">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-base">AI 教学建议</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {suggestions.map((s, i) => {
          const Icon = s.icon
          const badge = priorityBadge[s.priority]
          return (
            <div
              key={i}
              className="p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{s.title}</span>
                </div>
                <Badge variant="outline" className={badge.className + " text-[10px] font-normal shrink-0"}>
                  {badge.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">{s.desc}</p>
            </div>
          )
        })}
        <Button variant="outline" className="w-full mt-1 bg-transparent">
          <Sparkles className="w-3.5 h-3.5" />
          生成完整备课方案
        </Button>
      </CardContent>
    </Card>
  )
}
