import { RedPenOverlay } from "@/components/grading/red-pen-overlay"
import { MarkHandwritten } from "@/components/annotation-marks"
import type { AIQuestionVerdict } from "@/lib/types"

export const metadata = {
  title: "红笔留痕引擎 · SeWise",
  description: "原卷红笔留痕渲染引擎实渲染验证（方案 A 已定稿）",
}

/**
 * 演示数据：与生产链路完全同构的 AIQuestionVerdict。
 * 正式流程中，这份数据由 VLM 批改编排（grade-vlm.ts）逐题块产出，
 * answer_box 是学生作答内容的全局百分比坐标 [y, x, h, w]。
 */
const demoVerdicts: AIQuestionVerdict[] = [
  // 选择题 6-10：作答区 = 题号前括号
  { id: 1, label: "6", verdict: "correct", answer_box: [1.2, 4, 4, 8], page_index: 0, confidence: 0.97 },
  { id: 2, label: "7", verdict: "correct", answer_box: [15, 4, 4, 8], page_index: 0, confidence: 0.96 },
  {
    id: 3,
    label: "8",
    verdict: "wrong",
    answer_box: [28.5, 4, 4, 8.5],
    page_index: 0,
    correct_answer: "B",
    confidence: 0.93,
  },
  {
    id: 4,
    label: "9",
    verdict: "partial",
    answer_box: [42, 4, 4, 8.5],
    page_index: 0,
    score_text: "1/2",
    confidence: 0.88,
  },
  {
    id: 5,
    label: "10",
    verdict: "wrong",
    answer_box: [55.5, 4, 4, 9],
    page_index: 0,
    correct_answer: "A",
    confidence: 0.91,
  },
  // 填空题：作答区 = 手写答案
  { id: 6, label: "(1)", verdict: "correct", answer_box: [76, 36, 3.5, 9], page_index: 0, confidence: 0.9 },
  { id: 7, label: "(2)", verdict: "correct", answer_box: [80, 40, 3.5, 9], page_index: 0, confidence: 0.87 },
  { id: 8, label: "(3)", verdict: "correct", answer_box: [86.5, 33, 3.5, 9], page_index: 0, confidence: 0.92 },
  // 演示置信度分流：字迹难辨 → 转教师人工批改
  {
    id: 9,
    label: "(4)",
    verdict: "uncertain",
    answer_box: [93.3, 31, 3.5, 10],
    page_index: 0,
    confidence: 0.42,
  },
]

export default function AnnotationPreviewPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground text-balance">红笔留痕引擎 · 实渲染验证</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            符号方案已定稿（方案 A 手写红笔）。本页用生产同款渲染引擎 RedPenOverlay +
            与批改链路同构的 verdicts 数据驱动，验证符号跟随作答位置的效果。
            卷面原有红笔为真人教师参考批改。
          </p>
        </header>

        {/* 状态图例 */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-card px-5 py-3.5">
          <Legend label="正确">
            <MarkHandwritten status="correct" size={24} />
          </Legend>
          <Legend label="错误 + 正确答案">
            <MarkHandwritten status="wrong" answer="B" size={24} />
          </Legend>
          <Legend label="半对 + 得分">
            <MarkHandwritten status="half" score="1/2" size={24} />
          </Legend>
          <Legend label="字迹难辨 · 转教师人工批改（蓝色虚线，AI 诚实说「我看不清」）">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-extrabold"
              style={{ border: "2px dashed #2563eb", color: "#2563eb", backgroundColor: "rgba(37,99,235,0.06)" }}
            >
              ?
            </span>
          </Legend>
        </div>

        {/* 原卷 + 引擎渲染留痕 */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative w-full" style={{ aspectRatio: "978 / 1112" }}>
            <img
              src="/samples/english-graded-sample.jpg"
              alt="英语作业样卷（含教师红笔批改参考）"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <RedPenOverlay verdicts={demoVerdicts} pageIndex={0} />
          </div>
        </section>

        <footer className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">引擎说明</p>
          <ul className="mt-1 list-disc pl-5">
            <li>符号锚定在作答区右缘外侧、垂直居中，不遮挡作答内容；右侧空间不足时自动内收。</li>
            <li>第 (4) 空演示置信度分流：VLM 判定置信度低于 0.6 时不猜答案，标记为「待老师批」转人工。</li>
            <li>正式数据由批改编排（grade-vlm.ts）逐题块产出，verdicts 自带页码，多页作业逐页渲染。</li>
          </ul>
        </footer>
      </div>
    </main>
  )
}

function Legend({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      {children}
      {label}
    </span>
  )
}
