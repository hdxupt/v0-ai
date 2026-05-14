"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { knowledgePoints as fallback } from "@/lib/mock-data"

const config: ChartConfig = {
  mastery: {
    label: "掌握度",
    color: "var(--chart-1)",
  },
}

export interface RadarPoint {
  name: string
  mastery: number
  errorRate: number
}

interface Props {
  /** 五维 radar（来自 AI batchgrading 后聚合）或者按知识点维度的列表 */
  data?: RadarPoint[]
}

export function KnowledgeRadarChart({ data }: Props = {}) {
  const points = data && data.length >= 3 ? data : fallback
  const sorted = [...points].sort((a, b) => b.errorRate - a.errorRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">能力雷达</CardTitle>
        <CardDescription>五维能力均值 · 由学生端 AI 结果汇总</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <ChartContainer config={config} className="h-[260px] w-full">
            <RadarChart data={points} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Radar
                dataKey="mastery"
                fill="var(--color-mastery)"
                fillOpacity={0.25}
                stroke="var(--color-mastery)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-mastery)" }}
              />
            </RadarChart>
          </ChartContainer>

          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              待加强维度 TOP 4
            </div>
            {sorted.slice(0, 4).map((kp) => (
              <div key={kp.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate">{kp.name}</span>
                  <span className="tabular-nums text-muted-foreground">{kp.errorRate}%</span>
                </div>
                <Progress value={kp.errorRate} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
