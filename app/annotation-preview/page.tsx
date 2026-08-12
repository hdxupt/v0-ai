import { MarkHandwritten, MarkStamp, MarkChip, type MarkStatus } from "@/components/annotation-marks"
import type React from "react"

export const metadata = {
  title: "留痕符号评审 · SeWise",
  description: "三套原卷留痕符号方案对比评审",
}

/* 标注点：基于样卷的百分比坐标，跟随每处作答位置 */
interface Anno {
  x: number // 百分比
  y: number
  status: MarkStatus
  answer?: string
  score?: string
}

const annotations: Anno[] = [
  // 选择题 6-10：标在括号作答处右侧
  { x: 13, y: 3.2, status: "correct" },
  { x: 13, y: 16.8, status: "correct" },
  { x: 13.5, y: 30.2, status: "wrong", answer: "B" },
  { x: 13.5, y: 43.8, status: "half", score: "1/2" },
  { x: 14, y: 57.2, status: "wrong", answer: "A" },
  // 填空题：标在手写答案右侧
  { x: 46, y: 77.8, status: "correct" },
  { x: 50, y: 81.6, status: "correct" },
  { x: 43, y: 88.3, status: "correct" },
  { x: 42, y: 95, status: "correct" },
]

function Panel({
  title,
  tag,
  desc,
  renderMark,
}: {
  title: string
  tag: string
  desc: string
  renderMark: (a: Anno) => React.ReactNode
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex flex-col gap-1 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-foreground px-2 py-0.5 text-xs font-bold text-background">{tag}</span>
          <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{desc}</p>
      </header>

      {/* 符号图例 */}
      <div className="flex items-center gap-6 border-b border-border bg-muted/40 px-5 py-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          正确 {renderMark({ x: 0, y: 0, status: "correct" })}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          错误 {renderMark({ x: 0, y: 0, status: "wrong", answer: "B" })}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          半对 {renderMark({ x: 0, y: 0, status: "half", score: "1/2" })}
        </span>
      </div>

      {/* 原卷 + 叠加留痕 */}
      <div className="relative w-full" style={{ aspectRatio: "978 / 1112" }}>
        <img
          src="/samples/english-graded-sample.jpg"
          alt="英语作业样卷（含教师红笔批改参考）"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {annotations.map((a, i) => (
          <span
            key={i}
            className="absolute"
            style={{ left: `${a.x}%`, top: `${a.y}%`, transform: "translate(0, -50%)" }}
          >
            {renderMark(a)}
          </span>
        ))}
      </div>
    </section>
  )
}

export default function AnnotationPreviewPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground text-balance">原卷留痕符号方案评审</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            三套留痕方案叠加在同一张真实英语样卷上（卷面原有红笔为真人教师参考批改）。留痕跟随每处作答位置，
            标在作答内容右侧、不遮挡内容。请对比后选定一套，或指出组合/修改意见。
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel
            tag="方案 A"
            title="手写红笔"
            desc="模拟真人教师红色水笔笔触，带轻微旋转抖动。最接近你发的参考图和市面主流产品，情感温度最高；半对用「勾上加斜杠」表达。"
            renderMark={(a) => <MarkHandwritten status={a.status} answer={a.answer} score={a.score} size={30} />}
          />
          <Panel
            tag="方案 B"
            title="红圈印记"
            desc="教师印章风格：红圈包裹符号，权威感强，缩略图/投屏远看也清晰。错题在圈外补正确答案，半对圈内写「半」字加得分。"
            renderMark={(a) => <MarkStamp status={a.status} answer={a.answer} score={a.score} size={30} />}
          />
          <Panel
            tag="方案 C"
            title="智能标签"
            desc="现代数字批改风：绿/红/琥珀三色胶囊标签，状态一眼可辨，可承载得分等更多信息。数字感最强，但「AI 味」也最重。"
            renderMark={(a) => <MarkChip status={a.status} answer={a.answer} score={a.score} size={26} />}
          />
        </div>

        <footer className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">评审提示</p>
          <ul className="mt-1 list-disc pl-5">
            <li>第 8、10 题演示「错题 + 补正确答案」；第 9 题演示「半对 + 过程分」。</li>
            <li>三套方案共用同一坐标系，正式实现时坐标由 VLM 输出的作答区 bounding box 计算得出。</li>
            <li>可任意组合，例如「方案 A 符号 + 悬停时弹出方案 C 的详细信息卡」。</li>
          </ul>
        </footer>
      </div>
    </main>
  )
}
