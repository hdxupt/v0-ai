"use client"

import { useState } from "react"
import { Check, X, SquareSplitHorizontal, PenLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { AIQuestionVerdict, VerdictStatus } from "@/lib/types"

interface Props {
  /** 全部逐小题判定 */
  verdicts: AIQuestionVerdict[]
  /** 教师裁决回调：返回更新后的完整 verdicts 数组 */
  onVerdictsChange: (next: AIQuestionVerdict[]) => void
}

/**
 * 待人工裁决面板（置信度分流的教师端闭环）。
 *
 * AI 对字迹无法辨认/低置信度的小题标记为 uncertain，
 * 聚合在此面板中，教师一键改判为 对/错/半对。
 * 改判结果写回 question_verdicts（teacher_override 标记），
 * 随「确认并发送」整卷保存，原卷留痕同步更新。
 */
export function UncertainReviewPanel({ verdicts, onVerdictsChange }: Props) {
  const uncertain = verdicts.filter((v) => v.verdict === "uncertain")
  if (uncertain.length === 0) return null

  function resolve(id: number, status: VerdictStatus, extra?: Partial<AIQuestionVerdict>) {
    onVerdictsChange(
      verdicts.map((v) =>
        v.id === id
          ? {
              ...v,
              ...extra,
              verdict: status,
              confidence: 1, // 教师裁决即最终结论
            }
          : v,
      ),
    )
  }

  return (
    <Card className="p-4 gap-3 border-dashed border-primary/50 bg-primary/[0.03]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15 text-primary">
            <PenLine className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-sm font-medium">待您裁决</div>
            <div className="text-[11px] text-muted-foreground">
              AI 无法确认字迹，宁可交给您也不乱判
            </div>
          </div>
        </div>
        <Badge variant="outline" className="font-normal bg-primary/10 text-primary border-primary/30">
          {uncertain.length} 题
        </Badge>
      </div>

      <ul className="space-y-2">
        {uncertain.map((v) => (
          <UncertainItem key={v.id} verdict={v} onResolve={resolve} />
        ))}
      </ul>
    </Card>
  )
}

function UncertainItem({
  verdict: v,
  onResolve,
}: {
  verdict: AIQuestionVerdict
  onResolve: (id: number, status: VerdictStatus, extra?: Partial<AIQuestionVerdict>) => void
}) {
  const [mode, setMode] = useState<"idle" | "wrong" | "partial">("idle")
  const [text, setText] = useState("")

  const confPct = Math.round((v.confidence ?? 0) * 100)

  return (
    <li className="p-2.5 rounded-md border border-border bg-card space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">
          {v.label ? `第 ${v.label} 题` : "未知题号"}
          <span className="ml-1.5 text-muted-foreground font-normal">
            第 {v.page_index + 1} 页
          </span>
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          AI 置信度 {confPct}%
        </span>
      </div>

      {mode === "idle" ? (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 bg-transparent"
            onClick={() => onResolve(v.id, "correct", { correct_answer: undefined, score_text: undefined })}
          >
            <Check className="w-3 h-3" />
            对
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10 bg-transparent"
            onClick={() => setMode("wrong")}
          >
            <X className="w-3 h-3" />
            错
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs gap-1 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 bg-transparent"
            onClick={() => setMode("partial")}
          >
            <SquareSplitHorizontal className="w-3 h-3" />
            半对
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "wrong" ? "正确答案（可留空）" : "得分，如 2/4"}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !(e.nativeEvent as any).isComposing && (e as any).keyCode !== 229) {
                onResolve(
                  v.id,
                  mode,
                  mode === "wrong"
                    ? { correct_answer: text.trim() || undefined, score_text: undefined }
                    : { score_text: text.trim() || undefined, correct_answer: undefined },
                )
              }
              if (e.key === "Escape") setMode("idle")
            }}
          />
          <Button
            size="sm"
            className={cn(
              "h-7 text-xs shrink-0",
              mode === "wrong" ? "bg-destructive hover:bg-destructive/90" : "bg-amber-600 hover:bg-amber-600/90",
            )}
            onClick={() =>
              onResolve(
                v.id,
                mode,
                mode === "wrong"
                  ? { correct_answer: text.trim() || undefined, score_text: undefined }
                  : { score_text: text.trim() || undefined, correct_answer: undefined },
              )
            }
          >
            确认{mode === "wrong" ? "错" : "半对"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => setMode("idle")}>
            取消
          </Button>
        </div>
      )}
    </li>
  )
}
