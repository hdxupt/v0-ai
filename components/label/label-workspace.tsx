"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check, X, CircleSlash, HelpCircle, ChevronLeft, ChevronRight, Download } from "lucide-react"

type Sample = {
  id: number
  crop_url: string
  question_text: string | null
  correct_answer: string
  ai_type: string | null
  ai_analysis: string | null
  label: string | null
  student_answer: string | null
}

const LABELS = [
  { value: "对", icon: Check, key: "1", tone: "success" },
  { value: "半对", icon: CircleSlash, key: "2", tone: "warning" },
  { value: "错", icon: X, key: "3", tone: "destructive" },
  { value: "无法识别", icon: HelpCircle, key: "4", tone: "muted" },
] as const

const toneClass: Record<string, string> = {
  success: "bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90",
  warning: "bg-[var(--warning)] text-[var(--warning-foreground)] hover:opacity-90",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  muted: "bg-muted text-muted-foreground hover:bg-muted/80",
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export function LabelWorkspace() {
  const { data, error, isLoading, mutate } = useSWR<{ samples: Sample[]; total: number; done: number }>(
    "/api/label",
    fetcher,
  )
  const [cursor, setCursor] = useState(0)
  const [answer, setAnswer] = useState("")
  const [saving, setSaving] = useState(false)
  const answerRef = useRef<HTMLInputElement>(null)

  const samples = data?.samples ?? []
  const current = samples[cursor]

  // 首次加载定位到第一个未标注项
  const jumpedRef = useRef(false)
  useEffect(() => {
    if (jumpedRef.current || samples.length === 0) return
    jumpedRef.current = true
    const firstTodo = samples.findIndex((s) => !s.label)
    setCursor(firstTodo === -1 ? 0 : firstTodo)
  }, [samples])

  useEffect(() => {
    setAnswer(current?.student_answer ?? "")
  }, [current?.id, current?.student_answer])

  const save = useCallback(
    async (label: string) => {
      if (!current || saving) return
      setSaving(true)
      // 乐观更新：先本地改，再后台写
      const next = samples.map((s) => (s.id === current.id ? { ...s, label, student_answer: answer || null } : s))
      mutate({ samples: next, total: data!.total, done: next.filter((s) => s.label).length }, false)

      try {
        await fetch("/api/label", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id, label, student_answer: answer || null }),
        })
      } finally {
        setSaving(false)
      }
      setCursor((c) => Math.min(c + 1, samples.length - 1))
    },
    [current, saving, samples, answer, mutate, data],
  )

  // 键盘快捷键：1234 打标，←→ 翻页
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Enter" && !e.nativeEvent?.isComposing) answerRef.current?.blur()
        return
      }
      const hit = LABELS.find((l) => l.key === e.key)
      if (hit) {
        e.preventDefault()
        void save(hit.value)
        return
      }
      if (e.key === "ArrowLeft") setCursor((c) => Math.max(0, c - 1))
      if (e.key === "ArrowRight") setCursor((c) => Math.min(samples.length - 1, c + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [save, samples.length])

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of samples) if (s.label) counts[s.label] = (counts[s.label] ?? 0) + 1
    return counts
  }, [samples])

  if (isLoading) return <p className="p-8 text-center text-muted-foreground">加载中…</p>
  if (error || data?.error) return <p className="p-8 text-center text-destructive">加载失败：{String(data?.error ?? error)}</p>
  if (samples.length === 0)
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">还没有待标注样本。</p>
        <p className="mt-2 text-sm text-muted-foreground">请先运行裁图脚本生成预标注数据。</p>
      </div>
    )

  const done = samples.filter((s) => s.label).length
  const pct = Math.round((done / samples.length) * 100)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-24">
      <header className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="font-sans text-xl font-semibold tracking-tight">训练数据标注</h1>
          <span className="font-mono text-sm text-muted-foreground">
            {done} / {samples.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {LABELS.map((l) => (
            <Badge key={l.value} variant="outline" className="font-mono">
              {l.value} {stats[l.value] ?? 0}
            </Badge>
          ))}
          <a
            href="/api/label/export"
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-sans text-xs hover:bg-secondary"
          >
            <Download className="size-3.5" aria-hidden />
            导出 JSONL
          </a>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        {/* 题块小图 */}
        <div className="flex items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/40 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={current.crop_url || "/placeholder.svg"}
            alt={`第 ${cursor + 1} 个待标注题块`}
            className="max-h-64 w-auto max-w-full object-contain"
          />
        </div>

        {/* 标准答案 */}
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">标准答案</span>
          <p className="rounded-md bg-secondary px-3 py-2 font-mono text-sm leading-relaxed text-secondary-foreground">
            {current.correct_answer}
          </p>
        </div>

        {current.question_text ? (
          <p className="text-xs leading-relaxed text-muted-foreground">题干：{current.question_text}</p>
        ) : null}

        {/* 学生作答内容（可选补录） */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-answer" className="font-sans text-xs font-medium text-muted-foreground">
            学生实际写的内容（可留空，填了训练效果更好）
          </label>
          <Input
            id="student-answer"
            ref={answerRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="照抄图里的手写内容"
            className="font-mono text-sm"
          />
        </div>

        {/* AI 预判参考 */}
        {current.ai_type ? (
          <p className="text-xs text-muted-foreground">
            AI 原判定：<span className="font-mono">{current.ai_type}</span>
            {current.ai_analysis ? <span className="ml-1 opacity-80">· {current.ai_analysis.slice(0, 60)}</span> : null}
          </p>
        ) : null}
      </section>

      {/* 四个判定按钮 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LABELS.map((l) => {
          const Icon = l.icon
          const active = current.label === l.value
          return (
            <Button
              key={l.value}
              onClick={() => void save(l.value)}
              disabled={saving}
              className={`h-14 flex-col gap-0.5 ${active ? toneClass[l.tone] : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <span className="flex items-center gap-1.5 font-sans text-sm font-medium">
                <Icon className="size-4" aria-hidden />
                {l.value}
              </span>
              <span className="font-mono text-[10px] opacity-70">按 {l.key}</span>
            </Button>
          )
        })}
      </div>

      {/* 翻页 */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" aria-hidden />
          上一条
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          #{cursor + 1}
          {current.label ? ` · 已标「${current.label}」` : " · 未标注"}
        </span>
        <Button
          variant="outline"
          onClick={() => setCursor((c) => Math.min(samples.length - 1, c + 1))}
          disabled={cursor >= samples.length - 1}
          className="gap-1.5"
        >
          下一条
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </main>
  )
}
