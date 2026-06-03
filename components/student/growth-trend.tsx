"use client"

import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, Sparkles, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { buildGrowthSeries, type Submission, type RubricDimension } from "@/lib/types"

interface Props {
  submissions: Array<Pick<Submission, "status" | "graded_at" | "submitted_at" | "ai_issues">>
}

type SeriesKey = "totalScore" | RubricDimension

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "totalScore", label: "总分", color: "var(--chart-1)" },
  { key: "basics", label: "计算与基础", color: "var(--chart-2)" },
  { key: "logic", label: "逻辑思维", color: "var(--chart-3)" },
  { key: "knowledge", label: "知识掌握", color: "var(--chart-4)" },
  { key: "application", label: "应用能力", color: "var(--chart-5)" },
  { key: "presentation", label: "书写规范", color: "var(--muted-foreground)" },
]

const chartConfig: ChartConfig = Object.fromEntries(
  SERIES.map((s) => [s.key, { label: s.label, color: s.color }]),
) satisfies ChartConfig

export function GrowthTrend({ submissions }: Props) {
  const growth = useMemo(() => buildGrowthSeries(submissions), [submissions])
  // 默认只显示总分曲线，保持清晰；可点选叠加五维
  const [active, setActive] = useState<Set<SeriesKey>>(new Set(["totalScore"]))

  function toggle(key: SeriesKey) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        // 至少保留一条曲线
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // 数据不足两次：给出占位提示，不画图
  if (growth.points.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            我的成长轨迹
          </CardTitle>
          <CardDescription>
            {growth.points.length === 0
              ? "完成并被批改第一次作业后，这里会记录你的能力变化。"
              : "再完成一次作业，就能看到你的成长曲线啦。"}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const delta = growth.totalDelta
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaColor =
    delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          我的成长轨迹
        </CardTitle>
        <CardDescription>近 {growth.points.length} 次作业的能力变化趋势</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 进步摘要 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">最新总分</p>
            <p className="text-xl font-semibold tabular-nums">{growth.latestScore}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">较首次</p>
            <p className={cn("text-xl font-semibold tabular-nums flex items-center gap-1", deltaColor)}>
              <DeltaIcon className="w-4 h-4" />
              {delta > 0 ? "+" : ""}
              {delta}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {delta >= 0 ? (
                <Sparkles className="w-3 h-3 text-emerald-600" />
              ) : (
                <Target className="w-3 h-3 text-amber-600" />
              )}
              {growth.mostImprovedDimension && growth.mostImprovedDimension.delta > 0
                ? "进步最大"
                : "重点关注"}
            </p>
            <p className="text-sm font-medium truncate">
              {growth.mostImprovedDimension && growth.mostImprovedDimension.delta > 0
                ? `${growth.mostImprovedDimension.label} +${growth.mostImprovedDimension.delta}`
                : growth.weakestDimension
                  ? `${growth.weakestDimension.label} ${growth.weakestDimension.score}分`
                  : "—"}
            </p>
          </div>
        </div>

        {/* 曲线切换 */}
        <div className="flex flex-wrap gap-1.5">
          {SERIES.map((s) => {
            const on = active.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-transparent text-background"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
                style={on ? { backgroundColor: s.color } : undefined}
                aria-pressed={on}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: on ? "var(--background)" : s.color }}
                />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* 趋势图 */}
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart data={growth.points} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            {SERIES.filter((s) => active.has(s.key)).map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.key === "totalScore" ? 3 : 2}
                dot={{ r: s.key === "totalScore" ? 4 : 3, fill: s.color }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
