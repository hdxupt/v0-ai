import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { GradingWorkspace } from "@/components/grading/grading-workspace"
import { studentSubmissions } from "@/lib/mock-data"

export default async function GradingPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const student = studentSubmissions.find((s) => s.id === studentId) ?? studentSubmissions[7]

  if (!student) {
    notFound()
  }

  return (
    <div className="flex flex-col">
      {/* Compact breadcrumb */}
      <div className="flex items-center gap-2 px-6 h-12 border-b border-border bg-card text-sm">
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard/reports/hw-2025-0512">
            <ChevronLeft className="w-3.5 h-3.5" />
            返回学情报告
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-muted-foreground">AI 批阅工作台</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="font-medium">{student.name}</span>
      </div>

      <GradingWorkspace studentName={student.name} studentNo={student.studentNo} />
    </div>
  )
}
