import {
  Upload,
  HardDrive,
  ScanText,
  Brain,
  Database,
  UserCheck,
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  RotateCcw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Stage = {
  no: string
  title: string
  desc: string
  icon: LucideIcon
}

const upperRow: Stage[] = [
  {
    no: "01",
    title: "学生端上传",
    desc: "多页拖拽排序 · 单张旋转 · 服务端倾斜纠偏",
    icon: Upload,
  },
  {
    no: "02",
    title: "Vercel Blob",
    desc: "作业图片存储 · access 自适应 public/private",
    icon: HardDrive,
  },
  {
    no: "03",
    title: "腾讯云 OCR",
    desc: "通用印刷体 · 输出带行号 + 分页索引文本",
    icon: ScanText,
  },
]

const lowerRow: Stage[] = [
  {
    no: "05",
    title: "Supabase",
    desc: "Auth 鉴权 + Postgres 持久化批改结果",
    icon: Database,
  },
  {
    no: "06",
    title: "教师审核",
    desc: "分数 / 评语 / 框选 100% 可改 · 一键推送",
    icon: UserCheck,
  },
  {
    no: "07",
    title: "班级看板",
    desc: "五维雷达 · 薄弱点 Top3 · 平均分 / 完成率",
    icon: LayoutDashboard,
  },
]

function StageCard({ stage }: { stage: Stage }) {
  const Icon = stage.icon
  return (
    <div className="flex w-56 flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{stage.no}</span>
      </div>
      <h3 className="text-sm font-semibold text-card-foreground leading-tight">{stage.title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{stage.desc}</p>
    </div>
  )
}

function HArrow({ dir = "right" }: { dir?: "right" | "left" }) {
  const Icon = dir === "right" ? ArrowRight : ArrowLeft
  return (
    <div className="flex shrink-0 items-center px-1 text-primary/60" aria-hidden>
      <Icon className="h-6 w-6" />
    </div>
  )
}

export function ArchitectureDiagram() {
  return (
    <div className="w-full max-w-6xl rounded-2xl border border-border bg-gradient-to-b from-secondary/40 to-background p-8 shadow-md">
      {/* Header */}
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Brain className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">SeWise 系统架构</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            课后作业 AI 闭环助手 · 学生端 → Blob → OCR → 双阶段 AI → Supabase → 教师审核 → 班级看板
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-right">
          <p className="text-xs text-muted-foreground">技术底座</p>
          <p className="text-sm font-semibold text-foreground">Next.js 16 · Tailwind v4</p>
        </div>
      </header>

      {/* Upper row: 01 -> 02 -> 03 */}
      <div className="flex items-stretch justify-center">
        <StageCard stage={upperRow[0]} />
        <HArrow />
        <StageCard stage={upperRow[1]} />
        <HArrow />
        <StageCard stage={upperRow[2]} />
        <HArrow />
        {/* 04 双阶段 AI - 核心高亮节点 */}
        <div className="flex w-64 flex-col gap-2 rounded-xl border-2 border-primary bg-accent/60 p-4 shadow-md">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              核心创新
            </span>
            <span className="ml-auto font-mono text-xs text-primary/70">04</span>
          </div>
          <h3 className="text-sm font-semibold text-accent-foreground leading-tight">双阶段 AI 批改</h3>
          <p className="text-xs leading-relaxed text-accent-foreground/80 text-pretty">
            Vercel AI Gateway 调度 · 数据与文字解耦
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="rounded-md bg-card/80 px-2 py-1.5">
              <p className="text-[11px] font-semibold text-foreground">阶段 A · Claude Opus</p>
              <p className="text-[10px] text-muted-foreground">评分 / 像素 bbox 定位 / 五维雷达</p>
            </div>
            <div className="rounded-md bg-card/80 px-2 py-1.5">
              <p className="text-[11px] font-semibold text-foreground">阶段 B · Claude Sonnet</p>
              <p className="text-[10px] text-muted-foreground">独立 4000 token 四段式评语</p>
            </div>
          </div>
        </div>
      </div>

      {/* Down connector (right side: 04 -> 05) */}
      <div className="flex items-center justify-end pr-28">
        <div className="flex flex-col items-center py-1.5 text-primary/60" aria-hidden>
          <ArrowDown className="h-6 w-6" />
        </div>
      </div>

      {/* Lower row: 05 <- 06 <- 07 (reversed flow) */}
      <div className="flex items-stretch justify-center">
        <StageCard stage={lowerRow[0]} />
        <HArrow dir="left" />
        <StageCard stage={lowerRow[1]} />
        <HArrow dir="left" />
        <StageCard stage={lowerRow[2]} />
      </div>

      {/* Closed-loop feedback arrow */}
      <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2">
        <RotateCcw className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-primary">
          闭环回流：审核结果推送学生精准伴学 · 班级数据按希沃魔方规范回流学校
        </p>
      </div>

      {/* Footer: value tags + stack */}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          {["教师减负 25h→4h", "学生精准伴学", "学校数据抓手"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          Recharts · Supabase Postgres · Vercel Blob · 腾讯云 OCR · Claude Opus / Sonnet
        </p>
      </footer>
    </div>
  )
}
