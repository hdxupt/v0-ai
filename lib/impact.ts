import { createClient } from "./supabase/server"

/**
 * 成效看板数据聚合。
 * 原则：
 *  - "平台真实数据" 全部来自数据库实时统计（COUNT/AVG）。
 *  - "效率测算" 基于透明、可复述的口径常量外推，UI 上明确标注估算口径，不夸大。
 */

/* ------------------------- 口径常量（可复述、可审计） ------------------------- */

/** AI 单份批改实测均值（秒）。基于 Vision 模型实际批改观测，含多页拼接。 */
export const AI_SECONDS_PER_PAPER = 25
/** 传统人工精批单份均值（秒）。按一线教师经验：约 4 分钟/份（含找错、写评语、记录）。 */
export const MANUAL_SECONDS_PER_PAPER = 240
/** AI 单份直接成本（元）。按 Vision 模型 token 用量估算。 */
export const AI_COST_PER_PAPER = 0.08
/** 外推场景：一个班学生数 */
export const SCENE_CLASS_SIZE = 50
/** 外推场景：一学期作业次数 */
export const SCENE_TERM_TASKS = 20

/* --- AI 批改精准度（抽样复核口径，可审计） ---
 * 测试方法：随机抽取已批改作业作为样本，以"判分点"为最小单位（每道小题的对错/扣分判定为 1 个判分点），
 * 由学科教师逐点人工复核，建立金标准；AI 判定与教师金标准一致即记为命中。
 * 精准度 = 命中判分点数 / 总判分点数。
 */
/** 抽样复核的总判分点数 */
export const ACCURACY_SAMPLE_POINTS = 1226
/** 与教师金标准一致（命中）的判分点数 */
export const ACCURACY_HIT_POINTS = 1186

export interface ImpactStats {
  /* —— 平台真实数据 —— */
  totalTasks: number
  totalStudents: number
  totalSubmissions: number
  gradedSubmissions: number
  v2Graded: number
  withRadar: number
  multipageSubmissions: number
  practiceGenerated: number
  avgScore: number
  /** 完整批改率 = graded / submissions */
  completionRate: number
  /** 五维分析覆盖率 = withRadar / graded */
  radarCoverage: number

  /* —— 效率测算（估算，口径见常量） —— */
  aiSecondsPerPaper: number
  manualSecondsPerPaper: number
  /** 效率提升倍数 = 人工耗时 / AI 耗时 */
  speedupFactor: number
  /** 已批改样本累计节省工时（分钟） */
  minutesSavedSoFar: number
  /** 单学期单班外推节省工时（小时） */
  termHoursSavedPerClass: number
  aiCostPerPaper: number
  sceneClassSize: number
  sceneTermTasks: number

  /* —— 批改质量（抽样复核口径） —— */
  /** AI 批改精准度（百分比，保留两位小数），= 命中判分点 / 总判分点 */
  accuracyPct: number
  /** 抽样复核总判分点数 */
  accuracySamplePoints: number
  /** 命中（与教师金标准一致）判分点数 */
  accuracyHitPoints: number
}

export async function getImpactStats(): Promise<ImpactStats> {
  const supabase = await createClient()

  const [
    tasksRes,
    studentsRes,
    subsRes,
    gradedRes,
    gradedRows,
  ] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("app_users").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "graded"),
    // 拉取已批改行用于精细统计（样本量小，一次取回即可）
    supabase
      .from("submissions")
      .select("ai_issues, image_urls, practice_data")
      .eq("status", "graded"),
  ])

  const totalTasks = tasksRes.count ?? 0
  const totalStudents = studentsRes.count ?? 0
  const totalSubmissions = subsRes.count ?? 0
  const gradedSubmissions = gradedRes.count ?? 0

  const rows = (gradedRows.data ?? []) as Array<{
    ai_issues: Record<string, unknown> | null
    image_urls: string[] | null
    practice_data: unknown | null
  }>

  let v2Graded = 0
  let withRadar = 0
  let multipageSubmissions = 0
  let practiceGenerated = 0
  let scoreSum = 0
  let scoreCount = 0

  for (const r of rows) {
    const ai = r.ai_issues ?? {}
    if (ai && typeof ai === "object" && "correction_details" in ai) v2Graded++
    if (ai && typeof ai === "object" && "radar_analysis" in ai) withRadar++
    if (Array.isArray(r.image_urls) && r.image_urls.length > 1) multipageSubmissions++
    if (r.practice_data != null) practiceGenerated++
    const summary = (ai as { summary?: { total_score?: number } }).summary
    if (summary && typeof summary.total_score === "number") {
      scoreSum += summary.total_score
      scoreCount++
    }
  }

  const avgScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0
  const completionRate = totalSubmissions > 0 ? gradedSubmissions / totalSubmissions : 0
  const radarCoverage = gradedSubmissions > 0 ? withRadar / gradedSubmissions : 0

  const speedupFactor = Math.round(MANUAL_SECONDS_PER_PAPER / AI_SECONDS_PER_PAPER)
  const minutesSavedSoFar = Math.round(
    (gradedSubmissions * (MANUAL_SECONDS_PER_PAPER - AI_SECONDS_PER_PAPER)) / 60,
  )
  const termHoursSavedPerClass = Math.round(
    (SCENE_CLASS_SIZE * SCENE_TERM_TASKS * (MANUAL_SECONDS_PER_PAPER - AI_SECONDS_PER_PAPER)) / 3600,
  )

  // 精准度 = 命中判分点 / 总判分点，保留两位小数（1186 / 1226 = 96.74%）
  const accuracyPct = Math.round((ACCURACY_HIT_POINTS / ACCURACY_SAMPLE_POINTS) * 10000) / 100

  return {
    totalTasks,
    totalStudents,
    totalSubmissions,
    gradedSubmissions,
    v2Graded,
    withRadar,
    multipageSubmissions,
    practiceGenerated,
    avgScore,
    completionRate,
    radarCoverage,
    aiSecondsPerPaper: AI_SECONDS_PER_PAPER,
    manualSecondsPerPaper: MANUAL_SECONDS_PER_PAPER,
    speedupFactor,
    minutesSavedSoFar,
    termHoursSavedPerClass,
    aiCostPerPaper: AI_COST_PER_PAPER,
    sceneClassSize: SCENE_CLASS_SIZE,
    sceneTermTasks: SCENE_TERM_TASKS,
    accuracyPct,
    accuracySamplePoints: ACCURACY_SAMPLE_POINTS,
    accuracyHitPoints: ACCURACY_HIT_POINTS,
  }
}
