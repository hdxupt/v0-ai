import type React from "react"

export type MarkStatus = "correct" | "wrong" | "half"

interface MarkProps {
  status: MarkStatus
  /** 错题时展示的正确答案，如 "B" */
  answer?: string
  /** 半对时展示的得分，如 "2/4" */
  score?: string
  /** 尺寸像素，默认 30 */
  size?: number
  className?: string
}

const RED = "#d92d20"

/* ============ 方案 A：手写红笔 ============ */
/* 模拟真人教师红色水笔笔触，带轻微旋转抖动 */

function HandCheck({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <path
        d="M3.5 14.5 C6.5 17 8.8 20.5 10.6 23 C14.2 15.5 21.5 6 31 2.2"
        stroke={RED}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HandCross({ size }: { size: number }) {
  return (
    <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4.5 4 C10 10 17 17.5 24 24.5" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M24.5 4.5 C18 11 10.5 17.5 4 24" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

function HandHalf({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 34 28" fill="none" aria-hidden="true">
      {/* 对勾 */}
      <path
        d="M3.5 15.5 C6.5 18 8.8 21.5 10.6 24 C14.2 16.5 21.5 7 31 3.2"
        stroke={RED}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 斜杠划过勾尾，表示半对 */}
      <path d="M18 22 C21 16.5 24 11 26.5 6" stroke={RED} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function MarkHandwritten({ status, answer, score, size = 30, className }: MarkProps) {
  const rotate = status === "correct" ? -6 : status === "wrong" ? 4 : -3
  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {status === "correct" && <HandCheck size={size} />}
      {status === "wrong" && <HandCross size={size} />}
      {status === "half" && <HandHalf size={size} />}
      {status === "wrong" && answer && (
        <span
          style={{
            color: RED,
            fontSize: size * 0.62,
            fontWeight: 700,
            fontFamily: "'Comic Sans MS', 'Segoe Print', cursive",
            lineHeight: 1,
          }}
        >
          {answer}
        </span>
      )}
      {status === "half" && score && (
        <span
          style={{
            color: RED,
            fontSize: size * 0.5,
            fontWeight: 700,
            fontFamily: "'Comic Sans MS', 'Segoe Print', cursive",
            lineHeight: 1,
          }}
        >
          {score}
        </span>
      )}
    </span>
  )
}

/* ============ 方案 B：红圈印记 ============ */
/* 教师印章风格：圆圈包裹符号，权威感强，远看也清晰 */

function StampBase({
  size,
  children,
  label,
}: {
  size: number
  children: React.ReactNode
  label?: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          border: `2.5px solid ${RED}`,
          backgroundColor: "rgba(217, 45, 32, 0.06)",
          transform: "rotate(-4deg)",
        }}
      >
        {children}
      </span>
      {label && (
        <span style={{ color: RED, fontSize: size * 0.48, fontWeight: 700, lineHeight: 1 }}>{label}</span>
      )}
    </span>
  )
}

export function MarkStamp({ status, answer, score, size = 32 }: MarkProps) {
  if (status === "correct") {
    return (
      <StampBase size={size}>
        <svg width={size * 0.58} height={size * 0.46} viewBox="0 0 34 26" fill="none" aria-hidden="true">
          <path
            d="M3.5 14.5 C6.5 17 8.8 20.5 10.6 23 C14.2 15.5 21.5 6 31 2.2"
            stroke={RED}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </StampBase>
    )
  }
  if (status === "wrong") {
    return (
      <StampBase size={size} label={answer}>
        <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M5 5 L23 23" stroke={RED} strokeWidth="4" strokeLinecap="round" />
          <path d="M23 5 L5 23" stroke={RED} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </StampBase>
    )
  }
  return (
    <StampBase size={size} label={score}>
      <span style={{ color: RED, fontSize: size * 0.42, fontWeight: 800, lineHeight: 1 }}>半</span>
    </StampBase>
  )
}

/* ============ 方案 C：智能标签 ============ */
/* 现代数字批改风：彩色胶囊标签 + 状态色区分，信息密度最高 */

const chipStyles: Record<MarkStatus, { bg: string; fg: string; border: string }> = {
  correct: { bg: "rgba(22, 163, 74, 0.92)", fg: "#ffffff", border: "rgba(22,163,74,1)" },
  wrong: { bg: "rgba(220, 38, 38, 0.92)", fg: "#ffffff", border: "rgba(220,38,38,1)" },
  half: { bg: "rgba(217, 119, 6, 0.92)", fg: "#ffffff", border: "rgba(217,119,6,1)" },
}

export function MarkChip({ status, answer, score, size = 30 }: MarkProps) {
  const s = chipStyles[status]
  const fontSize = size * 0.42
  const text = status === "correct" ? "对" : status === "wrong" ? (answer ? `错 · ${answer}` : "错") : score ? `半对 ${score}` : "半对"
  const icon = status === "correct" ? "✓" : status === "wrong" ? "✕" : "◐"
  return (
    <span
      className="inline-flex items-center rounded-full font-semibold shadow-sm"
      style={{
        backgroundColor: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        fontSize,
        lineHeight: 1,
        padding: `${size * 0.16}px ${size * 0.3}px`,
        gap: size * 0.14,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: fontSize * 1.05 }}>{icon}</span>
      {text}
    </span>
  )
}
