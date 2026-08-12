import type { Metadata } from "next"
import { BoxComparison } from "@/components/grading-demo/box-comparison"

export const metadata: Metadata = {
  title: "框选定位优化 · SeWise",
  description: "OCR 行框 + VLM 视觉补位的混合定位方案对比",
}

const PRINCIPLE = [
  {
    step: "1",
    title: "OCR 行级转录 + 自动纠偏",
    desc: "腾讯云高精度 OCR 转录每一行文字，输出行级真实坐标；倾斜超 2° 自动旋转回正再识别。印刷体题干、规整文字定位最可靠。",
  },
  {
    step: "2",
    title: "大模型引用行号批改",
    desc: "Claude Opus 阅读带行号的转录文本进行批改，错误框坐标取所引用 OCR 行真实 bbox 的并集——框紧贴文字，不靠模型凭空估算。",
  },
  {
    step: "3",
    title: "VLM 视觉补位（本次优化核心）",
    desc: "数学公式、潦草手写、涂改、图块等 OCR 失配区域，由具备视觉定位（Grounding）能力的大模型直接输出紧贴错误的 bounding box，并标注来源为 vlm。",
  },
  {
    step: "4",
    title: "坐标裁剪而非硬丢弃",
    desc: "补位框只做边界裁剪与满页幻觉过滤，不再因「框偏高」就把整条错误连同框一起丢弃——数学解题步骤这类天然较高的错误不再凭空消失。",
  },
]

export default function GradingDemoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium text-primary mb-2">核心能力优化 · 作业批改区域框选</p>
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            OCR 行框 + VLM 视觉补位的混合定位
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-3xl text-pretty">
            框选与批改是两个独立任务：先精准框出错误区域，再做内容批改。印刷体走 OCR 行框（文字定位最准），
            OCR 漏识别的手写与公式由视觉大模型补位定位——专治数学、手写场景下「框不准、框丢失」的痛点。
          </p>
        </header>

        <section className="mb-10">
          <BoxComparison />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">技术处理流水线</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLE.map((p) => (
              <div key={p.step} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {p.step}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="text-base font-semibold mb-2">为什么不全程换用专用定位模型？</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            批改主力 Claude Opus 本身就是顶级多模态模型，已具备视觉定位能力。在现有链路内做「OCR 主力 + VLM 补位」的混合定位，
            零新增外部依赖、零新增故障点，即可覆盖绝大多数题型；而引入专用定位模型（如 Qwen3-VL）需额外算力或云端额度，
            收益主要体现在超大规模、极端潦草场景——按需演进即可，不必一步到位。
          </p>
        </section>

        <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
          说明：上图为方案示意，用于展示两种定位策略在手写数学场景下的差异。实际系统中框坐标会标注来源（OCR 行定位 / AI 视觉定位），
          教师端以实线 / 虚线区分渲染。
        </footer>
      </div>
    </main>
  )
}
