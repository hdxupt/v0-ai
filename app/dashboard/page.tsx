import { ChevronDown, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { TaskTable } from "@/components/dashboard/task-table"
import { classOptions } from "@/lib/mock-data"

export default function DashboardPage() {
  const currentClass = classOptions[0]

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">AI 智能学情看板</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px] font-medium">
              <Sparkles className="w-3 h-3" />
              AI 驱动
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            实时追踪班级作业流转，AI 自动批改并生成宏观学情洞察
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5 bg-card">
                <span className="text-muted-foreground text-xs">当前班级:</span>
                <span className="font-medium">{currentClass.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>切换班级</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={currentClass.id}>
                {classOptions.map((c) => (
                  <DropdownMenuRadioItem key={c.id} value={c.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.studentCount} 人</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>管理班级...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button className="bg-primary hover:bg-primary/90 gap-1.5">
            <Plus className="w-4 h-4" />
            布置新作业
          </Button>
        </div>
      </div>

      {/* KPI */}
      <KpiCards />

      {/* Task table */}
      <TaskTable />
    </div>
  )
}
