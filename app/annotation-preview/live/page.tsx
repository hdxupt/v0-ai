"use client"

import { useState } from "react"
import useSWR from "swr"
import { RedPenOverlay } from "@/components/grading/red-pen-overlay"
import type { AIQuestionVerdict } from "@/lib/types"

interface LiveData {
  score: number
  verdicts: AIQuestionVerdict[]
}

const SAMPLES = [
  { key: "math", label: "数学 83", img: "/samples/math-83-student.jpg", data: "/samples/math-83-verdicts.json" },
  {
    key: "english",
    label: "英语 16",
    img: "/samples/english-16-student.jpg",
    data: "/samples/english-16-verdicts.json",
  },
] as const

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * 金标准坐标验证页（开发用）：
 * 把真实 VLM 批改产出的 verdicts 叠加到样卷原图上，人工核对红笔留痕位置是否精确。
 * 数据来自 /api/dev/test-grade 的落盘结果。
 */
export default function LiveVerdictPreview() {
  const [sampleKey, setSampleKey] = useState<(typeof SAMPLES)[number]["key"]>("math")
  const sample = SAMPLES.find((s) => s.key === sampleKey) ?? SAMPLES[0]
  const { data, error, isLoading } = useSWR<LiveData>(sample.data, fetcher)

  return (
    <main className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="mx-auto max-w-3xl flex flex-col gap-4">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground text-balance">真实批改坐标验证</h1>
            <p className="text-sm text-muted-foreground mt-1">
              以下红笔留痕全部来自 Qwen3-VL 真实批改输出（非手工模拟数据）
              {data?.verdicts ? ` · 总分 ${data.score} · ${data.verdicts.length} 条判定` : ""}
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="选择样卷">
            {SAMPLES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={s.key === sampleKey}
                onClick={() => setSampleKey(s.key)}
                className={
                  s.key === sampleKey
                    ? "px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground"
                    : "px-3 py-1.5 text-sm rounded-md bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}
        {error ? (
          <p className="text-sm text-destructive">数据加载失败，请先跑 /api/dev/test-grade</p>
        ) : null}

        {data?.verdicts ? (
          <div className="relative bg-card rounded-sm ring-1 ring-border shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sample.img || "/placeholder.svg"} alt={`${sample.label} 学生作答页`} className="block w-full h-auto" />
            <RedPenOverlay verdicts={data.verdicts} pageIndex={0} />
          </div>
        ) : null}
      </div>
    </main>
  )
}
