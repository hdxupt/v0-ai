import type { Metadata } from "next"
import { getImpactStats } from "@/lib/impact"
import { ImpactBoard } from "@/components/impact/impact-board"

export const metadata: Metadata = {
  title: "SeWise 成效看板 | 决赛",
  description: "SeWise 课后作业 AI 闭环助手 —— 量化成效大屏",
}

// 每次访问取最新数据
export const dynamic = "force-dynamic"

export default async function ImpactPage() {
  const stats = await getImpactStats()
  return <ImpactBoard stats={stats} />
}
