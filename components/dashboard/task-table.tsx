"use client"

import Link from "next/link"
import { Eye, Sparkles, MoreHorizontal, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { homeworkTasks, type GradingStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const statusMap: Record<GradingStatus, { label: string; className: string }> = {
  pending: {
    label: "待批改",
    className: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  },
  grading: {
    label: "批改中",
    className: "bg-primary/12 text-primary border-primary/25",
  },
  completed: {
    label: "已完成",
    className: "bg-[color:var(--success)]/12 text-[color:var(--success)] border-[color:var(--success)]/30",
  },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function TaskTable() {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div>
          <CardTitle className="text-base">近期作业任务</CardTitle>
          <CardDescription>查看作业提交进度并触发 AI 批改</CardDescription>
        </div>
        <CardAction>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="pending">待批改</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">作业名称</TableHead>
              <TableHead>布置时间</TableHead>
              <TableHead className="w-[240px]">提交进度</TableHead>
              <TableHead>批改状态</TableHead>
              <TableHead className="text-right pr-6">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {homeworkTasks.map((task) => {
              const status = statusMap[task.status]
              const rate = Math.round((task.submitted / task.total) * 100)
              return (
                <TableRow key={task.id} className="group">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={`/dashboard/reports/${task.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {task.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.subject}</span>
                        <span>·</span>
                        <span>{task.className}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(task.assignedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={rate} className="h-1.5 flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {task.submitted}/{task.total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("font-normal", status.className)}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      {task.status === "completed" ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/reports/${task.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                            查看详情
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
                          <Sparkles className="w-3.5 h-3.5" />
                          启动 AI 批改
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="更多">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
