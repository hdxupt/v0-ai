"use client"

import { useState } from "react"
import useSWRMutation from "swr/mutation"
import { Sparkles, CheckCircle2, XCircle, Lightbulb, Loader2, RefreshCw, BookOpen } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RUBRIC_DIMENSION_LABEL, type PracticeSet, type PracticeQuestion, type RubricDimension } from "@/lib/types"

/* ---------- 选项前缀解析：把 "B. xxx" 归一成字母 "B" 做比对 ---------- */
function optionLetter(opt: string, index: number): string {
  const m = opt.trim().match(/^([A-D])[.、:：)]/i)
  return m ? m[1].toUpperCase() : String.fromCharCode(65 + index)
}

function normalizeAnswer(s: string): string {
  return s.trim().replace(/^([A-D])[.、:：)].*$/i, "$1").toUpperCase()
}

interface GenerateResponse {
  practice: PracticeSet
}

async function generatePractice(url: string): Promise<GenerateResponse> {
  const res = await fetch(url, { method: "POST" })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `生成失败 (${res.status})`)
  }
  return res.json()
}

export function PracticeSetPanel({
  submissionId,
  initialPractice,
}: {
  submissionId: string
  initialPractice?: PracticeSet | null
}) {
  const [practice, setPractice] = useState<PracticeSet | null>(initialPractice ?? null)

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/submissions/${submissionId}/practice`,
    generatePractice,
    {
      onSuccess: (data) => setPractice(data.practice),
    },
  )

  return (
    <Card className="p-4 gap-3 border-accent/30 bg-gradient-to-br from-accent/[0.05] to-transparent">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/15 text-accent-foreground">
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">举一反三 · AI 变式练习</div>
          <div className="text-[11px] text-muted-foreground">
            针对你这次的错题，生成同知识点变式题，当场练、当场测
          </div>
        </div>
        {practice ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => trigger()}
            disabled={isMutating}
          >
            {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            换一组
          </Button>
        ) : null}
      </div>

      {!practice ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-xs text-muted-foreground max-w-sm text-pretty">
            点击下方按钮，AI 会基于你刚才做错的题目，即时出几道"换个情境、考同一个知识点"的练习题，帮你把这次的错真正弄懂。
          </p>
          <Button onClick={() => trigger()} disabled={isMutating} className="gap-1.5">
            {isMutating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 正在出题…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成针对性练习
              </>
            )}
          </Button>
          {error ? <p className="text-xs text-destructive">{(error as Error).message}</p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="w-3 h-3 text-accent-foreground" />
            <span>本组针对：{practice.basis}</span>
          </div>
          {practice.questions.map((q, i) => (
            <PracticeQuestionCard key={q.id} q={q} ordinal={i + 1} />
          ))}
          {error ? <p className="text-xs text-destructive">{(error as Error).message}</p> : null}
        </div>
      )}
    </Card>
  )
}

/* ---------------------------- 单题卡片 ---------------------------- */

function PracticeQuestionCard({ q, ordinal }: { q: PracticeQuestion; ordinal: number }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const correctLetter = normalizeAnswer(q.answer)
  const isChoice = q.type === "choice" && (q.options?.length ?? 0) > 0
  const isCorrect = isChoice && selected === correctLetter

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2.5">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded bg-muted text-[11px] font-medium text-muted-foreground">
          {ordinal}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-pretty">{q.stem}</p>
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {q.type === "choice" ? "选择题" : "解答题"}
            </Badge>
            {q.dimension ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {RUBRIC_DIMENSION_LABEL[q.dimension as RubricDimension] ?? q.knowledge}
              </Badge>
            ) : null}
            <span className="text-[10px] text-muted-foreground">· {q.knowledge}</span>
          </div>
        </div>
      </div>

      {/* 选择题：可点选项 */}
      {isChoice ? (
        <div className="flex flex-col gap-1.5 pl-7">
          {q.options!.map((opt, idx) => {
            const letter = optionLetter(opt, idx)
            const chosen = selected === letter
            const showCorrect = revealed && letter === correctLetter
            const showWrong = revealed && chosen && letter !== correctLetter
            return (
              <button
                key={idx}
                type="button"
                disabled={revealed}
                onClick={() => setSelected(letter)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                  !revealed && chosen && "border-primary bg-primary/5",
                  !revealed && !chosen && "hover:bg-muted/60",
                  showCorrect && "border-emerald-500 bg-emerald-50 text-emerald-900",
                  showWrong && "border-destructive bg-destructive/5 text-destructive",
                  revealed && !showCorrect && !showWrong && "opacity-60",
                )}
              >
                <span className="flex-1">{opt}</span>
                {showCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
                {showWrong ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* 解答题：先思考，再对照参考答案自评 */}
      {!isChoice && revealed ? (
        <div className="pl-7 rounded-md bg-muted/50 p-2.5 text-xs">
          <div className="font-medium text-muted-foreground mb-0.5">参考答案</div>
          <p className="leading-relaxed text-pretty">{q.answer}</p>
        </div>
      ) : null}

      {/* 操作区 */}
      <div className="pl-7 flex items-center gap-2">
        {!revealed ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={isChoice && selected === null}
            onClick={() => setRevealed(true)}
          >
            {isChoice ? "提交答案" : "查看参考答案与解析"}
          </Button>
        ) : (
          <>
            {isChoice ? (
              <Badge
                className={cn(
                  "text-[11px] gap-1",
                  isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive",
                )}
              >
                {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {isCorrect ? "答对了" : "再看看解析"}
              </Badge>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setRevealed(false)
                setSelected(null)
              }}
            >
              再做一次
            </Button>
          </>
        )}
      </div>

      {/* 解析 */}
      {revealed ? (
        <div className="pl-7 flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 p-2.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed text-pretty">{q.explanation}</div>
        </div>
      ) : null}
    </div>
  )
}
