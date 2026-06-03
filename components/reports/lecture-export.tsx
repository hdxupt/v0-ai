"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Printer, X, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { TypicalMistake } from "@/lib/types"

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

export interface LectureMeta {
  taskTitle: string
  subject: string
  className: string
  teacherName: string
  date: string
  submitted: number
  total: number
  average: number
}

interface Props {
  taskId: string
  meta: LectureMeta
  typicalMistakes: TypicalMistake[]
}

/**
 * 一键讲评稿：基于已有的班级 AI 诊断 + 服务端聚合的典型错例，
 * 排版成可打印的 A4 讲评稿，通过 window.print() 导出 PDF（零后端依赖）。
 */
export function LectureExport({ taskId, meta, typicalMistakes }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ClassReport | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function handlePrint() {
    // 打印时给 body 加标记类，CSS 据此只显示讲评稿弹层，避免空白页
    document.body.classList.add("lecture-printing")
    const cleanup = () => {
      document.body.classList.remove("lecture-printing")
      window.removeEventListener("afterprint", cleanup)
    }
    window.addEventListener("afterprint", cleanup)
    window.print()
  }

  async function handleOpen() {
    setOpen(true)
    if (report) return // 已生成，直接复用
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${taskId}/generate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "生成失败")
      setReport(data.report as ClassReport)
    } catch (e: any) {
      toast.error("讲评稿生成失败", { description: e?.message })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleOpen}>
        <FileText className="w-3.5 h-3.5" />
        一键讲评稿
      </Button>

      {open && mounted
        ? createPortal(
            <div
              data-lecture-portal
              className="fixed inset-0 z-50 flex flex-col bg-foreground/40 backdrop-blur-sm"
            >
              {/* 顶部工具栏（打印时隐藏） */}
              <div className="print:hidden flex items-center justify-between gap-3 px-6 py-3 bg-card border-b border-border shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  讲评稿预览
                  <span className="text-xs text-muted-foreground font-normal">
                    · 点击「打印 / 导出 PDF」后在弹窗中选择「另存为 PDF」
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handlePrint}
                    disabled={loading || !report}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    打印 / 导出 PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 滚动区 */}
              <div className="flex-1 overflow-auto py-8 px-4">
                {loading || !report ? (
                  <div className="mx-auto flex h-64 max-w-[210mm] items-center justify-center rounded-md bg-card">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-sm">AI 正在生成讲评稿…</span>
                    </div>
                  </div>
                ) : (
                  <LectureSheet report={report} meta={meta} typicalMistakes={typicalMistakes} />
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

/* ------------------------------- A4 讲评稿正文 ------------------------------- */

function LectureSheet({
  report,
  meta,
  typicalMistakes,
}: {
  report: ClassReport
  meta: LectureMeta
  typicalMistakes: TypicalMistake[]
}) {
  return (
    <article className="lecture-print-root mx-auto w-[210mm] max-w-full bg-white px-[14mm] py-[12mm] text-[#1a1a1a] shadow-lg">
      {/* 抬头 */}
      <header className="border-b-2 border-[#0d7d7d] pb-4 mb-5">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] font-bold tracking-tight">{meta.taskTitle} · 讲评稿</h1>
          <span className="text-[11px] text-[#666] shrink-0">SeWise AI 学情看板生成</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#555]">
          <span>学科：{meta.subject}</span>
          <span>班级：{meta.className}</span>
          <span>教师：{meta.teacherName}</span>
          <span>日期：{meta.date}</span>
          <span>
            提交：{meta.submitted}/{meta.total}
          </span>
          <span>平均分：{meta.average}</span>
        </div>
      </header>

      {/* 一、整体学情 */}
      <Section index="一" title="整体学情">
        <p className="text-[13px] leading-[1.8] text-[#333]">{report.summary}</p>
      </Section>

      {/* 二、典型错例（服务端聚合，零额外AI） */}
      {typicalMistakes.length > 0 ? (
        <Section index="二" title="典型错例（按出错人数排序）">
          <ol className="space-y-2.5">
            {typicalMistakes.map((m, i) => (
              <li key={i} className="rounded border border-[#e0e0e0] p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[#1a1a1a]">
                    {i + 1}. {m.knowledge}
                  </span>
                  <span className="shrink-0 text-[11px] text-[#0d7d7d] font-medium">
                    {m.studentCount} 人出错
                    {m.dimensionLabel ? ` · ${m.dimensionLabel}` : ""}
                  </span>
                </div>
                {m.sampleReason ? (
                  <p className="mt-1 text-[12px] leading-[1.7] text-[#555]">
                    错因：{m.sampleReason}
                  </p>
                ) : null}
                {m.sampleCorrect ? (
                  <p className="mt-0.5 text-[12px] leading-[1.7] text-[#0d7d7d]">
                    正解：{m.sampleCorrect}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* 三、讲解要点（班级薄弱点） */}
      {report.top_weak_points.length > 0 ? (
        <Section index="三" title="讲解要点 · 班级薄弱知识点">
          <ol className="space-y-2">
            {report.top_weak_points.map((wp, i) => (
              <li key={i} className="text-[13px] leading-[1.7]">
                <span className="font-semibold">
                  {i + 1}. {wp.name}
                </span>
                <span className="ml-2 text-[11px] text-[#888]">
                  {wp.student_count} 人 ·{" "}
                  {wp.severity === "high" ? "重点讲" : wp.severity === "mid" ? "适度讲" : "简要带过"}
                </span>
                <p className="mt-0.5 text-[12px] text-[#555]">{wp.intervention}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* 四、分层教学建议 */}
      <Section index="四" title="分层教学建议">
        <div className="space-y-1.5 text-[12px] leading-[1.7]">
          <p>
            <span className="font-semibold text-[#0d7d7d]">优等生（拔高）：</span>
            {report.tiered_advice.top_tier}
          </p>
          <p>
            <span className="font-semibold text-[#c2820a]">中等生（巩固）：</span>
            {report.tiered_advice.mid_tier}
          </p>
          <p>
            <span className="font-semibold text-[#c0392b]">后进生（帮扶）：</span>
            {report.tiered_advice.need_help}
          </p>
        </div>
      </Section>

      {/* 五、本节课建议 */}
      <Section index="五" title="本节课建议顺序">
        <p className="text-[13px] leading-[1.8] text-[#333]">{report.next_action}</p>
      </Section>

      <footer className="mt-6 border-t border-[#e0e0e0] pt-3 text-[10px] text-[#999] text-center">
        本讲评稿由 SeWise AI 基于全班批改结果自动生成，供教师备课参考。
      </footer>
    </article>
  )
}

function Section({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-[#0d7d7d]">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0d7d7d] text-[11px] text-white">
          {index}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
