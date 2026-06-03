import {
  FileCheck2,
  Users,
  ClipboardList,
  Gauge,
  Clock,
  Coins,
  Radar,
  Layers,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import type { ImpactStats } from "@/lib/impact"

function fmt(n: number) {
  return n.toLocaleString("zh-CN")
}

interface Props {
  stats: ImpactStats
}

export function ImpactBoard({ stats }: Props) {
  const completionPct = Math.round(stats.completionRate * 100)
  const radarPct = Math.round(stats.radarCoverage * 100)

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {/* 头部 */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs font-medium text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            SeWise · 课后作业 AI 闭环助手
          </div>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            让每一次批改，<span className="text-sky-400">都被看见</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-zinc-400 md:text-lg">
            从"批改一摞作业"到"看懂每个学生"——SeWise 用 AI 把教师从重复劳动中解放，
            把学情数据沉淀为可追踪的成长轨迹。
          </p>
        </header>

        {/* 区块一：平台真实数据 */}
        <Section
          label="平台实绩"
          title="真实运行数据"
          hint="数据库实时统计"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon={ClipboardList} value={fmt(stats.totalTasks)} unit="个" label="累计作业任务" />
            <Stat icon={Users} value={fmt(stats.totalStudents)} unit="人" label="覆盖学生" />
            <Stat icon={FileCheck2} value={fmt(stats.gradedSubmissions)} unit="份" label="AI 已批改作业" accent />
            <Stat icon={TrendingUp} value={stats.avgScore.toString()} unit="分" label="平均得分" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <MiniStat value={`${completionPct}%`} label="批改完整率" />
            <MiniStat value={`${radarPct}%`} label="五维分析覆盖" />
            <MiniStat value={fmt(stats.multipageSubmissions)} label="多页拼接批改" />
            <MiniStat value={fmt(stats.practiceGenerated)} label="AI 变式题已生成" />
          </div>
        </Section>

        {/* 区块二：效率价值测算 */}
        <Section
          label="效率价值"
          title="AI 批改 vs 人工精批"
          hint="基于实测口径估算"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {/* 速度对比大卡 */}
            <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Gauge className="h-4 w-4 text-sky-400" />
                单份作业批改耗时
              </div>
              <div className="mt-5 flex items-end gap-6">
                <div>
                  <div className="text-xs text-zinc-500">传统人工</div>
                  <div className="mt-1 text-3xl font-bold text-zinc-400 line-through decoration-zinc-600">
                    {Math.round(stats.manualSecondsPerPaper / 60)} 分钟
                  </div>
                </div>
                <div className="pb-1 text-2xl text-zinc-600">→</div>
                <div>
                  <div className="text-xs text-sky-400">SeWise AI</div>
                  <div className="mt-1 text-4xl font-bold text-sky-400">
                    {stats.aiSecondsPerPaper} 秒
                  </div>
                </div>
                <div className="ml-auto pb-1 text-right">
                  <div className="text-5xl font-bold text-emerald-400">{stats.speedupFactor}×</div>
                  <div className="text-xs text-zinc-500">效率提升</div>
                </div>
              </div>
            </div>

            {/* 成本卡 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Coins className="h-4 w-4 text-amber-400" />
                单份直接成本
              </div>
              <div className="mt-5 text-4xl font-bold text-amber-400">
                ¥{stats.aiCostPerPaper.toFixed(2)}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-zinc-500">
                按 Vision 模型 token 用量估算，含多页图像处理。
              </div>
            </div>
          </div>

          {/* 工时节省 */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Clock className="h-4 w-4 text-emerald-400" />
                本平台已累计节省工时
              </div>
              <div className="mt-3 text-3xl font-bold text-emerald-400">
                {fmt(stats.minutesSavedSoFar)}
                <span className="ml-1 text-lg font-medium text-zinc-400">分钟</span>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                = 已批改 {fmt(stats.gradedSubmissions)} 份 ×（{Math.round(stats.manualSecondsPerPaper / 60)} 分钟 − {stats.aiSecondsPerPaper} 秒）
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                规模化场景：单班单学期可省
              </div>
              <div className="mt-3 text-3xl font-bold text-emerald-400">
                ≈ {fmt(stats.termHoursSavedPerClass)}
                <span className="ml-1 text-lg font-medium text-zinc-400">小时</span>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                按 {stats.sceneClassSize} 人班级 × {stats.sceneTermTasks} 次作业测算
              </div>
            </div>
          </div>
        </Section>

        {/* 区块三：四大能力闭环 */}
        <Section label="产品能力" title="从批改到教学的完整闭环" hint="四大核心创新">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Capability
              icon={CheckCircle2}
              title="评分溯源"
              desc="满分→逐条扣分→最终分，每一分都有据可查，并归因到五维能力。"
            />
            <Capability
              icon={Sparkles}
              title="AI 变式题闭环"
              desc="看懂错误后即时生成同知识点变式题，在线作答、当场判对错。"
            />
            <Capability
              icon={Layers}
              title="一键讲评稿"
              desc="聚合班级典型错例，一键生成可导出 PDF 的备课级讲评稿。"
            />
            <Capability
              icon={Radar}
              title="纵向成长曲线"
              desc="五维能力随作业次数变化，让「学情看板」名副其实。"
            />
          </div>
        </Section>

        {/* 口径说明 */}
        <footer className="mt-12 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-4 text-xs leading-relaxed text-zinc-500">
          <span className="font-medium text-zinc-400">数据口径说明：</span>
          "平台实绩"均为数据库实时统计；"效率价值"中人工精批按一线教师经验取
          {Math.round(stats.manualSecondsPerPaper / 60)} 分钟/份、AI 批改取实测 {stats.aiSecondsPerPaper} 秒/份估算，
          成本按模型 token 用量估算，仅供决赛汇报参考，不构成精确财务测算。
        </footer>
      </div>
    </main>
  )
}

/* ------------------------------- 子组件 ------------------------------- */

function Section({
  label,
  title,
  hint,
  children,
}: {
  label: string
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-400">
          {label}
        </span>
        <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
        <span className="ml-auto text-xs text-zinc-500">{hint}</span>
      </div>
      {children}
    </section>
  )
}

function Stat({
  icon: Icon,
  value,
  unit,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  unit: string
  label: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-sky-500/40 bg-sky-500/10"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <Icon className={`h-5 w-5 ${accent ? "text-sky-400" : "text-zinc-500"}`} />
      <div className="mt-3 flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${accent ? "text-sky-300" : "text-zinc-100"}`}>
          {value}
        </span>
        <span className="text-sm text-zinc-500">{unit}</span>
      </div>
      <div className="mt-1 text-sm text-zinc-400">{label}</div>
    </div>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
      <div className="text-xl font-bold text-zinc-100">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  )
}

function Capability({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
        <Icon className="h-5 w-5 text-sky-400" />
      </div>
      <h3 className="mt-4 font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  )
}
