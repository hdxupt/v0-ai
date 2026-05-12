"use client"

import { ChevronRight, BookOpen } from "lucide-react"
import { studentHistory } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface Props {
  selectedId: string
  onSelect: (id: string) => void
}

function scoreColor(score: number) {
  if (score >= 90) return "text-[color:var(--success)]"
  if (score >= 80) return "text-primary"
  if (score >= 70) return "text-foreground"
  return "text-[color:var(--warning)]"
}

export function HistoryList({ selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">我的作业历史</span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          共 {studentHistory.length} 份
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-border">
        {studentHistory.map((item) => {
          const active = item.id === selectedId
          return (
            <li key={item.id}>
              <button
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                  active ? "bg-primary/8" : "hover:bg-muted/50",
                )}
              >
                <div
                  className={cn(
                    "shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg border",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  <span className="text-[10px] leading-none">
                    {item.date.replace(/月.*/, "月")}
                  </span>
                  <span className="text-base font-semibold leading-none mt-1 tabular-nums">
                    {item.date.replace(/.*月/, "").replace("日", "")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{item.title}</span>
                    {item.isNew && (
                      <span className="shrink-0 text-[10px] px-1 h-3.5 rounded bg-destructive text-destructive-foreground inline-flex items-center font-medium">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{item.subject}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                    <span>排名 {item.rank}/{item.classSize}</span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end">
                  <span className={cn("text-lg font-semibold tabular-nums leading-none", scoreColor(item.score))}>
                    {item.score}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">/{item.totalScore}</span>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground/50",
                  )}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
