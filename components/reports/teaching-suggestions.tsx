"use client"

import { useState } from "react"
import { Sparkles, BookOpen, Target, MessagesSquare, Loader2, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ClassReport {
  summary: string
  top_weak_points: Array<{
    name: string
    student_count: number
    severity: "high" | "mid" | "low"
    intervention: string
  }>
  tiered_advice: { top_tier: string; mid_tier: string; need_help: string }
  next_action: string
}

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: "高优先级", className: "bg-destructive/12 text-destructive border-destructive/25" },
  mid: {
    label: "中优先级",
    className:
      "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  },
  low: { label: "建议", className: "bg-muted text-muted-foreground border-border" },
}

const WEAK_ICONS = [BookOpen, Target, MessagesSquare]

/**
 * AI 备课方案：点击按钮后基于全班真实批改结果生成。
 * 复用 /api/reports/[taskId]/generate 的班级诊断数据（同一次点击内共享成本），
 * 以「讲什么（薄弱点）→ 怎么讲（干预）→ 分层布置」的备课视角重组展示。
 */
export function TeachingSuggestions({ taskId }: { taskId: string }) {
  const [report, setReport] = useState<ClassReport | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${taskId}/generate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "生成失败")
      setReport(data.report as ClassReport)
      toast.success("备课方案已生成", { description: "基于本次全班批改结果" })
    } catch (e: any) {
      toast.error("备课方案生成失败", { description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-accent text-accent-foreground">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <CardTitle className="text-base">AI 备课方案</CardTitle>
          </div>
          {report ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              已生成
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {report ? (
          <>
            {/* 讲什么：薄弱知识点 → 备课要点 */}
            {report.top_weak_points.slice(0, 3).map((wp, i) => {
              const Icon = WEAK_ICONS[i % WEAK_ICONS.length]
              const badge = SEVERITY_BADGE[wp.severity] ?? SEVERITY_BADGE.low
              return (
                <div
                  key={i}
                  className="p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{wp.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={badge.className + " text-[10px] font-normal shrink-0"}
                    >
                      {badge.label} · {wp.student_count} 人
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                    {wp.intervention}
                  </p>
                </div>
              )
            })}

            {/* 分层布置 */}
            <div className="p-3 rounded-md bg-muted/50 border border-border space-y-1.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                分层作业布置
              </div>
              <p className="text-xs leading-relaxed">
                <span className="font-medium text-primary">拔高：</span>
                {report.tiered_advice.top_tier}
              </p>
              <p className="text-xs leading-relaxed">
                <span className="font-medium text-[color:var(--warning)]">巩固：</span>
                {report.tiered_advice.mid_tier}
              </p>
              <p className="text-xs leading-relaxed">
                <span className="font-medium text-destructive">帮扶：</span>
                {report.tiered_advice.need_help}
              </p>
            </div>

            {/* 下节课动作 */}
            <div className="flex items-start gap-1.5 p-2.5 rounded-md bg-primary/8 border border-primary/20">
              <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-foreground/90">{report.next_action}</p>
            </div>

            <Button
              variant="outline"
              className="w-full mt-1 bg-transparent"
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              重新生成
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed px-1 py-2">
              基于本次全班批改结果，生成「讲什么 → 怎么讲 → 分层布置」的下节课备课方案：
              薄弱知识点讲解要点、各层学生的作业安排、课堂动作建议。
            </p>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? "AI 生成中..." : "生成完整备课方案"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
