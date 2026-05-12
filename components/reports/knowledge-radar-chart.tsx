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
import { knowledgePoints } from "@/lib/mock-data"

const config: ChartConfig = {
  mastery: {
    label: "掌握度",
    color: "var(--chart-1)",
  },
}

export function KnowledgeRadarChart() {
  // 找出失分率最高的知识点
  const sorted = [...knowledgePoints].sort((a, b) => b.errorRate - a.errorRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">知识点掌握情况</CardTitle>
        <CardDescription>基于错题分布的 AI 知识图谱洞察</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <ChartContainer config={config} className="h-[260px] w-full">
            <RadarChart data={knowledgePoints} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
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
              失分率 TOP 4
            </div>
            {sorted.slice(0, 4).map((kp) => (
              <div key={kp.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate">{kp.name}</span>
                  <span className="tabular-nums text-muted-foreground">{kp.errorRate}%</span>
                </div>
                <Progress
                  value={kp.errorRate}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
