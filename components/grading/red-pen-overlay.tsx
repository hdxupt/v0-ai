"use client"

import { MarkHandwritten } from "@/components/annotation-marks"
import type { AIQuestionVerdict } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * 原卷红笔留痕渲染引擎
 * --------------------------------------------------
 * 把逐小题判定（AIQuestionVerdict）以"真人老师红笔改卷"的形式叠加在作业原图上：
 * - correct    → 手写 ✓，挂在作答内容右侧
 * - wrong      → 手写 ✗ + 简短正确答案
 * - partial    → 半对号（用户定稿形状）+ 得分
 * - unanswered → 红笔"漏"字圈
 * - uncertain  → 蓝色"?"徽标 = AI 把握不足，转教师人工批改
 *
 * 定位规则：符号锚定在 answer_box 的右边缘、垂直居中，
 * 不遮挡作答内容（留痕跟随学生作答，用户拍板的方案）。
 * 若 answer_box 右侧空间不足（x+w > 92），符号内收到框内右上角。
 */

interface Props {
  verdicts: AIQuestionVerdict[]
  /** 当前页码（0-based），只渲染本页判定 */
  pageIndex: number
  /** 悬停高亮回调（可选，联动右侧面板） */
  activeId?: number | null
  onHover?: (id: number | null) => void
}

/** 根据符号在页面中的比例位置换算大小：作答区越高，符号越大，介于 22~34px */
function markSize(hPct: number): number {
  return Math.round(Math.max(22, Math.min(34, hPct * 3.2 + 20)))
}

export function RedPenOverlay({ verdicts, pageIndex, activeId, onHover }: Props) {
  const pageVerdicts = verdicts.filter((v) => v.page_index === pageIndex)
  if (pageVerdicts.length === 0) return null

  return (
    <>
      {pageVerdicts.map((v) => {
        const [y, x, h, w] = v.answer_box
        // 符号挂点：作答区右缘外侧；右侧放不下则内收
        const overflow = x + w > 92
        const anchorLeft = overflow ? Math.max(0, x + w - 6) : Math.min(97, x + w + 0.6)
        const anchorTop = y + h / 2
        const size = markSize(h)
        const active = activeId === v.id

        return (
          <div
            key={v.id}
            className={cn(
              "absolute z-10 pointer-events-auto transition-transform duration-150",
              active && "scale-125 drop-shadow-md",
            )}
            style={{
              left: `${anchorLeft}%`,
              top: `${anchorTop}%`,
              transform: "translateY(-50%)",
            }}
            onMouseEnter={() => onHover?.(v.id)}
            onMouseLeave={() => onHover?.(null)}
            role="img"
            aria-label={verdictAriaLabel(v)}
          >
            {v.verdict === "correct" && <MarkHandwritten status="correct" size={size} />}
            {v.verdict === "wrong" && (
              <MarkHandwritten status="wrong" answer={v.correct_answer} size={size} />
            )}
            {v.verdict === "partial" && (
              <MarkHandwritten status="half" score={v.score_text} size={size} />
            )}
            {v.verdict === "unanswered" && <UnansweredMark size={size} />}
            {v.verdict === "uncertain" && <UncertainMark size={size} />}
          </div>
        )
      })}
    </>
  )
}

function verdictAriaLabel(v: AIQuestionVerdict): string {
  const q = v.label ? `第${v.label}题` : "本题"
  switch (v.verdict) {
    case "correct":
      return `${q}正确`
    case "wrong":
      return `${q}错误${v.correct_answer ? `，正确答案 ${v.correct_answer}` : ""}`
    case "partial":
      return `${q}部分正确${v.score_text ? `，得分 ${v.score_text}` : ""}`
    case "unanswered":
      return `${q}未作答`
    case "uncertain":
      return `${q}字迹难以辨认，待教师人工批改`
  }
}

const RED = "#d92d20"

/** 漏做：红笔圈"漏"字 */
function UnansweredMark({ size }: { size: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: size * 0.9,
        height: size * 0.9,
        border: `2px solid ${RED}`,
        color: RED,
        fontSize: size * 0.42,
        fontWeight: 800,
        transform: "rotate(-5deg)",
        backgroundColor: "rgba(217,45,32,0.05)",
      }}
    >
      漏
    </span>
  )
}

/**
 * 转人工：蓝色"?"徽标。
 * 刻意不用红色——这不是学生的错误，而是 AI 诚实说"我看不清，请老师来"。
 */
function UncertainMark({ size }: { size: number }) {
  return (
    <span className="group/uncertain relative inline-flex">
      <span
        className="inline-flex items-center justify-center rounded-full shadow-sm"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          border: "2px dashed #2563eb",
          color: "#2563eb",
          fontSize: size * 0.46,
          fontWeight: 800,
          backgroundColor: "rgba(37,99,235,0.06)",
        }}
      >
        ?
      </span>
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 whitespace-nowrap rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover/uncertain:opacity-100 transition-opacity pointer-events-none">
        字迹难辨 · 待老师批
      </span>
    </span>
  )
}
