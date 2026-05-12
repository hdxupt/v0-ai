import Image from "next/image"
import { TrendingDown, Trophy, Target, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { aiIssues } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface Props {
  title: string
  date: string
  score: number
  totalScore: number
  classAverage: number
  rank: number
  classSize: number
}

export function ScoreHero({ title, date, score, totalScore, classAverage, rank, classSize }: Props) {
  const diff = score - classAverage
  const passLevel = score >= classAverage

  return (
    <Card className="overflow-hidden gap-0 p-0">
      <div className="p-5 flex flex-col md:flex-row gap-5">
        {/* Left: graded paper thumbnail */}
        <div className="relative w-full md:w-56 shrink-0">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted">
            <Image
              src="/images/homework-sample.jpg"
              alt="我的作业"
              fill
              className="object-cover"
              sizes="240px"
            />
            {/* Annotation overlay (read-only, smaller) */}
            {aiIssues.map((issue, idx) => (
              <div
                key={issue.id}
                className={cn(
                  "absolute border-2 rounded-sm",
                  issue.type === "error" && "border-destructive bg-destructive/15",
                  issue.type === "warning" && "border-[color:var(--warning)] bg-[color:var(--warning)]/15",
                  issue.type === "note" && "border-primary bg-primary/15",
                )}
                style={{
                  left: `${issue.region.x}%`,
                  top: `${issue.region.y}%`,
                  width: `${issue.region.width}%`,
                  height: `${issue.region.height}%`,
                }}
              >
                <span
                  className={cn(
                    "absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full text-[9px] font-semibold text-white flex items-center justify-center shadow",
                    issue.type === "error" && "bg-destructive",
                    issue.type === "warning" && "bg-[color:var(--warning)]",
                    issue.type === "note" && "bg-primary",
                  )}
                >
                  {idx + 1}
                </span>
              </div>
            ))}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent px-3 py-2">
              <span className="text-[11px] text-background font-medium">已批改 · 共 {aiIssues.length} 处批注</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2 text-xs bg-transparent">
            <Eye className="w-3.5 h-3.5" />
            查看完整答卷
          </Button>
        </div>

        {/* Right: score & stats */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-xs text-muted-foreground mb-1">{date} · {title}</div>
          <div className="flex items-end gap-3 mb-1">
            <div className="flex items-baseline">
              <span className="text-6xl font-semibold tracking-tight tabular-nums text-primary leading-none">
                {score}
              </span>
              <span className="text-xl text-muted-foreground ml-1">/ {totalScore}</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1",
                passLevel
                  ? "bg-[color:var(--success)]/12 text-[color:var(--success)]"
                  : "bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
              )}
            >
              <TrendingDown className={cn("w-3 h-3", passLevel && "rotate-180")} />
              {passLevel ? "+" : ""}
              {diff.toFixed(1)} 较班均
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            本次作业你的表现处于班级 <span className="font-medium text-foreground">中等偏上</span> 水平
          </p>

          <div className="grid grid-cols-3 gap-3 mt-auto">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Trophy className="w-3 h-3" />
                班级排名
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tabular-nums">{rank}</span>
                <span className="text-[11px] text-muted-foreground">/ {classSize}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Target className="w-3 h-3" />
                班级均分
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tabular-nums">{classAverage}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                AI 标注
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tabular-nums">{aiIssues.length}</span>
                <span className="text-[11px] text-muted-foreground">处</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
