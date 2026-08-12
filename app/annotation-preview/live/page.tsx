"use client"

import useSWR from "swr"
import { RedPenOverlay } from "@/components/grading/red-pen-overlay"
import type { AIQuestionVerdict } from "@/lib/types"

interface LiveData {
  score: number
  verdicts: AIQuestionVerdict[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * 金标准坐标验证页（开发用）：
 * 把真实 VLM 批改产出的 verdicts 叠加到样卷原图上，人工核对红笔留痕位置是否精确。
 * 数据来自 /api/dev/test-grade 的落盘结果。
 */
export default function LiveVerdictPreview() {
  const { data, error, isLoading } = useSWR<LiveData>("/samples/math-83-verdicts.json", fetcher)

  return (
    <main className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="mx-auto max-w-3xl flex flex-col gap-4">
        <header>
          <h1 className="text-xl font-semibold text-foreground text-balance">
            真实批改坐标验证 · 数学样卷 83
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            以下红笔留痕全部来自 Qwen3-VL 真实批改输出（非手工模拟数据）
            {data ? ` · 总分 ${data.score} · ${data.verdicts.length} 条判定` : ""}
          </p>
        </header>

        {isLoading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}
        {error ? <p className="text-sm text-destructive">数据加载失败，请先跑 /api/dev/test-grade</p> : null}

        {data ? (
          <div className="relative bg-card rounded-sm ring-1 ring-border shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/samples/math-83-student.jpg" alt="数学样卷 83 学生作答页" className="block w-full h-auto" />
            <RedPenOverlay verdicts={data.verdicts} pageIndex={0} />
          </div>
        ) : null}
      </div>
    </main>
  )
}
