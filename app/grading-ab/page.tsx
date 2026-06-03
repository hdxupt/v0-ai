import { ABPanel } from "@/components/grading-ab/ab-panel"
import { AB_IMAGE, AB_TITLE, OLD_RESULT, NEW_RESULT } from "@/components/grading-ab/ab-data"

export const metadata = {
  title: "框选定位 · 新旧对比 | SeWise",
  description: "OCR+LLM 行框定位 vs Qwen3-VL 分块视觉定位的真实作业对比",
}

export default function GradingABPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">SeWise · 技术对比</p>
        <h1 className="mt-1 text-balance text-3xl font-bold tracking-tight text-foreground">
          错误框选定位：新旧链路对比
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
          同一份《{AB_TITLE}》真实作业，分别用旧链路（OCR 识别文字行 + LLM 批改，框坐标绑定 OCR 行框）
          与新链路（Qwen3-VL 先把整页分块分类，再对数学大题裁剪后做视觉定位）批改。
          数学公式与手写步骤场景下，OCR 常分不出行导致框丢失或框偏，视觉定位则直接贴住出错步骤。
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ABPanel
          image={AB_IMAGE}
          boxes={OLD_RESULT.boxes}
          score={OLD_RESULT.score}
          method={OLD_RESULT.method}
          variant="old"
        />
        <ABPanel
          image={AB_IMAGE}
          boxes={NEW_RESULT.boxes}
          score={NEW_RESULT.score}
          method={NEW_RESULT.method}
          variant="new"
        />
      </section>

      <section className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">关键差异</h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">定位原理：</span>
            旧链路依赖 OCR 把手写公式切成文字行，分不出行就丢框；新链路用 VLM 直接"看图"定位错误区域。
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">题型分流：</span>
            新链路先分块分类，客观题走 LLM、数学大题走"裁剪后 VLM 定位"，按需投入算力。
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">裁剪增益：</span>
            数学大题先裁出小图再定位，VLM 在局部小图上的坐标精度远高于整页。
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">虚线标识：</span>
            新链路中虚线框表示 VLM 视觉补位定位，与 OCR 行框来源可区分、可追溯。
          </li>
        </ul>
      </section>
    </main>
  )
}
