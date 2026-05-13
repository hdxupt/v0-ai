import dynamic from "next/dynamic"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Download, Share2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AISummaryCard } from "@/components/reports/ai-summary-card"
import { StudentStatusPanel } from "@/components/reports/student-status-panel"
import { TeachingSuggestions } from "@/components/reports/teaching-suggestions"
import { getTaskById } from "@/lib/mock-data"

// Recharts is heavy (~150kB). Defer it.
const ScoreDistributionChart = dynamic(
  () => import("@/components/reports/score-distribution-chart").then((m) => m.ScoreDistributionChart),
  { loading: () => <Skeleton className="h-[300px] w-full" /> },
)
const KnowledgeRadarChart = dynamic(
  () => import("@/components/reports/knowledge-radar-chart").then((m) => m.KnowledgeRadarChart),
  { loading: () => <Skeleton className="h-[300px] w-full" /> },
)

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const task = getTaskById(id)

  if (!task) {
    notFound()
  }

  const rate = Math.round((task.submitted / task.total) * 100)
  const date = new Date(task.assignedAt)

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            <ChevronLeft className="w-3.5 h-3.5" />
            返回看板
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-muted-foreground">作业学情报告</span>
      </div>

      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{task.name}</h1>
            <Badge className="bg-[color:var(--success)]/12 text-[color:var(--success)] border-[color:var(--success)]/30" variant="outline">
              批改完成
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{task.subject}</span>
            <span>·</span>
            <span>{task.className}</span>
            <span>·</span>
            <span>布置于 {date.getMonth() + 1}月{date.getDate()}日</span>
            <span>·</span>
            <span>
              提交率 <span className="text-foreground font-medium">{rate}%</span>
            </span>
            <span>·</span>
            <span>
              平均分 <span className="text-foreground font-medium">{task.averageScore}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-card">
            <Share2 className="w-3.5 h-3.5" />
            分享报告
          </Button>
          <Button variant="outline" size="sm" className="bg-card">
            <Download className="w-3.5 h-3.5" />
            导出 PDF
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Sparkles className="w-3.5 h-3.5" />
            一键备课
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        {/* Left: ~70% */}
        <div className="xl:col-span-7 space-y-6 min-w-0">
          <AISummaryCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreDistributionChart />
            <KnowledgeRadarChart />
          </div>
        </div>

        {/* Right: ~30% */}
        <div className="xl:col-span-3 space-y-6 min-w-0">
          <StudentStatusPanel />
          <TeachingSuggestions />
        </div>
      </div>
    </div>
  )
}
