"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { scoreDistribution as fallbackData } from "@/lib/mock-data"

const config: ChartConfig = {
  count: {
    label: "人数",
    color: "var(--chart-1)",
  },
}

export interface DistRow {
  range: string
  count: number
}

interface Props {
  data?: DistRow[]
}

export function ScoreDistributionChart({ data }: Props = {}) {
  const rows = data && data.length > 0 ? data : fallbackData
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">分数段分布</CardTitle>
        <CardDescription>本次作业全班成绩区间统计 (满分 100)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[260px] w-full">
          <BarChart data={rows} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              allowDecimals={false}
            />
            <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={48}>
              <LabelList
                dataKey="count"
                position="top"
                offset={6}
                className="fill-foreground"
                style={{ fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
