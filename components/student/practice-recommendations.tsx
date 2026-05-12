import { Zap, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { practiceRecommendations } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const difficultyStyle = {
  基础: "bg-[color:var(--success)]/12 text-[color:var(--success)] border-[color:var(--success)]/30",
  进阶: "bg-primary/12 text-primary border-primary/25",
  拔高: "bg-[color:var(--warning)]/12 text-[color:var(--warning)] border-[color:var(--warning)]/30",
}

export function PracticeRecommendations() {
  return (
    <Card className="p-5 gap-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/12 text-primary">
          <Zap className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">为你定制的针对性练习</h3>
          <p className="text-[11px] text-muted-foreground">
            AI 基于薄弱点自动匹配 · 完成后将更新你的学情画像
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {practiceRecommendations.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-border p-3.5 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={cn(
                  "text-[10px] px-1.5 h-4 inline-flex items-center rounded border font-medium",
                  difficultyStyle[p.difficulty],
                )}
              >
                {p.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {p.estimatedMinutes} 分钟
              </span>
            </div>
            <h4 className="text-sm font-medium leading-snug mb-1">{p.title}</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              针对：{p.knowledgePoint}
            </p>
            <Button variant="outline" size="sm" className="w-full mt-auto text-xs bg-transparent">
              开始练习
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5">
        <div className="text-[11px]">
          <span className="font-medium">本次推荐共 3 项</span>
          <span className="text-muted-foreground"> · 预计 47 分钟完成</span>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 h-7 text-xs">
          一键开始全部
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  )
}
