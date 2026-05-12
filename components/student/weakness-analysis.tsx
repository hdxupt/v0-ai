import { AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { weakKnowledgePoints } from "@/lib/mock-data"

export function WeaknessAnalysis() {
  return (
    <Card className="p-5 gap-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[color:var(--warning)]/12 text-[color:var(--warning)]">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">你的薄弱知识点</h3>
          <p className="text-[11px] text-muted-foreground">
            AI 根据本次答题与历史数据综合定位 · 共发现 {weakKnowledgePoints.length} 项
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {weakKnowledgePoints.map((point, idx) => {
          const myPct = point.myScore
          const avgPct = point.classAverage
          return (
            <li key={point.name} className="border border-border rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[color:var(--warning)]/15 text-[color:var(--warning)] text-[10px] font-semibold">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium">{point.name}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  本次失分 <span className="text-[color:var(--warning)] font-medium tabular-nums">{point.lostPoints} 分</span>
                </span>
              </div>

              <div className="space-y-1.5 mb-2">
                <div className="flex items-center gap-3">
                  <span className="w-14 text-[11px] text-muted-foreground shrink-0">我的掌握</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--warning)] transition-all"
                      style={{ width: `${myPct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-medium tabular-nums">{myPct}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-14 text-[11px] text-muted-foreground shrink-0">班级平均</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-muted-foreground/40 transition-all" style={{ width: `${avgPct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{avgPct}%</span>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5">
                <span className="font-medium text-foreground">AI 诊断：</span>
                {point.reason}
              </p>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
