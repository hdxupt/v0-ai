"use client"

import { useState } from "react"
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Users,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ClassReport {
  summary: string
  score_distribution: { excellent: number; good: number; pass: number; fail: number }
  top_weak_points: Array<{
    name: string
    student_count: number
    severity: "high" | "mid" | "low"
    intervention: string
  }>
  tiered_advice: { top_tier: string; mid_tier: string; need_help: string }
  next_action: string
}

interface Props {
  taskId: string
  /** 服务端预计算的快速指标，用于在 AI 报告未生成时展示 */
  fallback: {
    submitted: number
    total: number
    average: number
    notSubmittedNames: string[]
    topWeakPoint?: string
  }
}

const SEVERITY: Record<ClassReport["top_weak_points"][number]["severity"], string> = {
  high: "bg-destructive/12 text-destructive border-destructive/25",
  mid: "bg-[color:var(--warning,#f59e0b)]/15 text-[color:var(--warning,#f59e0b)] border-[color:var(--warning,#f59e0b)]/30",
  low: "bg-muted text-muted-foreground border-border",
}

export function ClassAIDiagnostic({ taskId, fallback }: Props) {
  const [report, setReport] = useState<ClassReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${taskId}/generate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "生成失败")
      setReport(data.report as ClassReport)
      setGeneratedAt(new Date().toLocaleString("zh-CN"))
      toast.success("班级学情诊断已生成")
    } catch (e: any) {
      toast.error("生成失败", { description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  const rate = fallback.total > 0 ? Math.round((fallback.submitted / fallback.total) * 100) : 0

  return (
    <Card className="relative overflow-hidden border-primary/20 ai-gradient-bg gap-4 p-6">
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/50 blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="w-[18px] h-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[color:var(--success,#22c55e)] ai-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">AI 班级学情诊断</h2>
              <Badge variant="outline" className="text-[10px] bg-background/60 font-normal">
                Claude Opus 4.6
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {generatedAt ? `生成于 ${generatedAt}` : "基于全班批改结果实时生成"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={report ? "outline" : "default"}
          onClick={handleGenerate}
          disabled={loading}
          className={report ? "bg-background/60" : ""}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "生成中..." : report ? "重新生成" : "生成 AI 诊断"}
        </Button>
      </div>

      {/* 快速指标（始终展示） */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          icon={TrendingUp}
          label="提交率"
          value={`${rate}%`}
          tone="primary"
          sub={`${fallback.submitted}/${fallback.total}`}
        />
        <Stat
          icon={Users}
          label="未提交"
          value={`${fallback.notSubmittedNames.length} 人`}
          tone="warning"
          sub={fallback.notSubmittedNames.slice(0, 3).join("、") || "无"}
        />
        <Stat
          icon={AlertTriangle}
          label="平均分"
          value={`${fallback.average}`}
          tone="destructive"
          sub={fallback.topWeakPoint ? `薄弱：${fallback.topWeakPoint}` : ""}
        />
      </div>

      {/* AI 诊断报告 */}
      {loading && !report ? (
        <div className="relative space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-20 w-full mt-3" />
        </div>
      ) : report ? (
        <div className="relative space-y-4 pt-2">
          <p className="text-sm leading-relaxed text-foreground/90 text-pretty">{report.summary}</p>

          {report.top_weak_points.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                班级薄弱知识点 Top {report.top_weak_points.length}
              </div>
              <ul className="space-y-2">
                {report.top_weak_points.map((wp, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-md border border-border/60 bg-background/60 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{wp.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${SEVERITY[wp.severity]}`}
                        >
                          {wp.severity === "high" ? "高严重" : wp.severity === "mid" ? "中等" : "轻度"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {wp.student_count} 人
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                      {wp.intervention}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              分层教学建议
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <TierCard tone="primary" title="优等生 拔高" body={report.tiered_advice.top_tier} />
              <TierCard tone="warning" title="中等生 巩固" body={report.tiered_advice.mid_tier} />
              <TierCard tone="destructive" title="后进生 帮扶" body={report.tiered_advice.need_help} />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
            <ChevronRight className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">下一步：</span>
            <span className="text-sm text-foreground/90">{report.next_action}</span>
          </div>
        </div>
      ) : (
        <p className="relative text-sm leading-relaxed text-muted-foreground">
          点击右上角"生成 AI 诊断"，让 AI 基于本次全班批改结果，为你生成一份包含薄弱知识点、分层教学建议、下一步动作的完整学情诊断报告。
        </p>
      )}
    </Card>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  sub?: string
  tone: "primary" | "warning" | "destructive"
}) {
  const toneClass = {
    primary: "text-primary",
    warning: "text-[color:var(--warning,#f59e0b)]",
    destructive: "text-destructive",
  }[tone]
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-background/70 backdrop-blur-sm border border-border/50">
      <Icon className={`w-4 h-4 ${toneClass}`} />
      <div className="flex flex-col leading-tight min-w-0 flex-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-sm font-medium truncate">{value}</span>
        {sub ? <span className="text-[10px] text-muted-foreground truncate">{sub}</span> : null}
      </div>
    </div>
  )
}

function TierCard({
  tone,
  title,
  body,
}: {
  tone: "primary" | "warning" | "destructive"
  title: string
  body: string
}) {
  const border = {
    primary: "border-primary/30 bg-primary/5",
    warning: "border-[color:var(--warning,#f59e0b)]/30 bg-[color:var(--warning,#f59e0b)]/5",
    destructive: "border-destructive/30 bg-destructive/5",
  }[tone]
  return (
    <div className={`p-3 rounded-md border ${border}`}>
      <div className="text-xs font-medium mb-1">{title}</div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}
