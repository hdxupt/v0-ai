import type { Metadata } from "next"
import { ArchitectureDiagram } from "@/components/architecture/architecture-diagram"

export const metadata: Metadata = {
  title: "SeWise 系统架构 | 决赛 P3",
  description: "SeWise 课后作业 AI 闭环助手 —— 端到端系统架构图",
}

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <ArchitectureDiagram />
    </main>
  )
}
