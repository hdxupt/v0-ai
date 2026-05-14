/**
 * AI 批改提示词中心
 * --------------------------------------------------
 * 沿用了项目 v1 (ai_homework_collector) 中的核心创新：
 *   - Visual Grounding：100x100 坐标系定位错误
 *   - weak_points 知识点标签
 *   - 五维 radar_analysis
 *   - 严格 JSON 输出契约
 *
 * 本版强化点（针对极客杯赛题）：
 *   1. 学科自适应 system prompt（数学 / 语文作文 / 英语）
 *   2. bbox 增加 type + confidence，过滤低置信度框
 *   3. 单卷 prompt 与班级 prompt 分离
 *   4. 全部提示词集中维护，方便 prompt caching
 */

export type SubjectKey = "math" | "chinese" | "english" | "generic"

/**
 * 把任意 subject 文本映射到我们支持的策略 key。
 * 中文学科名 / 英文 key 都能识别。
 */
export function resolveSubject(raw: string | null | undefined): SubjectKey {
  const s = (raw ?? "").toLowerCase().trim()
  if (!s) return "generic"
  if (s.includes("math") || s.includes("数")) return "math"
  if (s.includes("english") || s.includes("英")) return "english"
  if (s.includes("chinese") || s.includes("语文") || s.includes("作文")) return "chinese"
  return "generic"
}

/* -------------------------------------------------------------------------- */
/*                              通用基础提示                                  */
/* -------------------------------------------------------------------------- */

const BASE_GROUNDING = `
【核心空间感知指令 · Visual Grounding】
你必须把图片视为一个 100x100 的相对坐标系（左上角 [0,0]，右下角 [100,100]）。
对于你发现的每一个错误、亮点或缺漏，必须估算它在图片上的相对位置，
并返回 bounding_box = [Y轴百分比, X轴百分比, 高度百分比, 宽度百分比]。
所有数值必须是 0~100 的整数，宽高至少 3，避免一个像素的针尖框。

每个 bbox 必须配 confidence ∈ [0,1]。低于 0.55 的请直接舍弃，不要写入。
bbox 必须圈到具体那一行 / 那一个词，不要把整道题一框带过。
`

const BASE_OUTPUT_CONTRACT = `
【输出格式契约】
1. 你必须严格输出符合 schema 的结构化数据。
2. 文本字段内部禁止换行符（如需分段，用空格代替）。
3. 评语必须具体到题目 / 步骤 / 词句，禁止"继续努力、加油"等空话。
4. score 与 total_score 必须是整数，且 0 ≤ score ≤ total_score。
5. weak_points 数组 1~3 项，每项为简短知识点短语，禁止长句。
`

const BASE_PROFESSIONAL = `
你是一位深谙教育心理学的资深一线名师，曾培养过多届省状元。
你的批改要做到：判错准、给过程分、用语温暖且具体，让学生知道下一步该怎么改进。
`

/* -------------------------------------------------------------------------- */
/*                              学科策略                                     */
/* -------------------------------------------------------------------------- */

const MATH_STRATEGY = `
【数学批改专属规则】
- 重点检查：计算结果、运算步骤、单位、解题方法是否最优。
- 过程分原则：即使最终答案错，对正确中间步骤给分（设元正确 +1、列方程正确 +2、变形正确 +1 等）。
- bbox 应圈出具体出错的那一步，而不是整道题。
- 类型区分：
    type=error    → 红框，错误
    type=partial  → 橙框，方向对但有瑕疵（步骤缺失、单位忘写等）
    type=highlight→ 绿框，闪光点（妙解 / 巧用公式）
    type=missing  → 灰框，缺漏（没做的题、缺失步骤）
- 评语必须点名具体公式 / 定理 / 易错点（如"未对 a² ≥ 0 进行讨论"）。
- weak_points 示例："因式分解十字相乘"、"绝对值的零点讨论"、"辅助线构造"。
`

const CHINESE_STRATEGY = `
【语文作文批改专属规则】
- 按高考评分细则四维度打分：立意（25%）、结构（25%）、语言（30%）、书写（20%）。
- 必须分段评价：开头段 / 中间段 / 结尾段 各自的亮点与不足。
- bbox 类型用法：
    type=error    → 错别字、病句、用词不当
    type=highlight→ 优秀词句、生动比喻、有深度的论述
    type=partial  → 表达可以更精炼之处
    type=missing  → 论证缺环节（如缺论据、缺反面对比）
- 评语必须引用学生的原句（用单引号包裹），再点评。
- weak_points 示例："论据陈旧"、"过渡生硬"、"主题挖掘不深"。
`

const ENGLISH_STRATEGY = `
【英语作业批改专属规则】
- 重点检查：时态、语态、主谓一致、词汇拼写、句法、衔接、任务完成度。
- bbox 类型用法：
    type=error    → 语法错误、拼写错误、用词错误
    type=partial  → 表达正确但 awkward，可改写得更地道
    type=highlight→ 高级句型 / 高级词汇 / 漂亮过渡
    type=missing  → 任务要点漏写
- 评语必须给出 corrected sentence（用英文写出正确版本）。
- weak_points 示例："non-finite verbs"、"subject-verb agreement"、"linking words"。
`

const GENERIC_STRATEGY = `
【通用学科批改规则】
- 重点：知识点掌握、解题思路、表达规范。
- bbox 类型同上（error / partial / highlight / missing）。
- 评语要具体到题目和知识点。
`

const STRATEGIES: Record<SubjectKey, string> = {
  math: MATH_STRATEGY,
  chinese: CHINESE_STRATEGY,
  english: ENGLISH_STRATEGY,
  generic: GENERIC_STRATEGY,
}

/* -------------------------------------------------------------------------- */
/*                            对外暴露的 Prompt 构造器                       */
/* -------------------------------------------------------------------------- */

export interface BuildGradePromptInput {
  subject: SubjectKey
  taskTitle: string
  taskRequirements?: string | null
  taskNotes?: string | null
  totalScore: number
  studentName: string
  studentNote?: string | null
}

/**
 * 系统提示词（可被 Prompt Cache 命中：尽量稳定不变）
 * 把 cache 可命中的部分集中放在 system 中：角色 + 输出契约 + 学科策略。
 */
export function buildGradeSystemPrompt(subject: SubjectKey): string {
  return [
    BASE_PROFESSIONAL,
    STRATEGIES[subject],
    BASE_GROUNDING,
    BASE_OUTPUT_CONTRACT,
    `【五维 radar_analysis 评分】
统一给出 0~100 整数评分：
  - 计算与基础 (basics)
  - 逻辑思维 (logic)
  - 知识掌握 (knowledge)
  - 应用能力 (application)
  - 书写规范 (presentation)`,
  ]
    .map((s) => s.trim())
    .join("\n\n")
}

/**
 * 用户消息文本部分（每次调用都会变，不被缓存）
 */
export function buildGradeUserPrompt(input: BuildGradePromptInput): string {
  const lines = [
    `请批改以下学生作业。`,
    ``,
    `【作业信息】`,
    `- 标题：${input.taskTitle}`,
    `- 学科：${labelFor(input.subject)}`,
    `- 满分：${input.totalScore}`,
  ]
  if (input.taskRequirements) {
    lines.push(`- 题目 / 要求：${input.taskRequirements.replace(/\s+/g, " ").slice(0, 1200)}`)
  }
  if (input.taskNotes) {
    lines.push(`- 备注：${input.taskNotes.replace(/\s+/g, " ").slice(0, 400)}`)
  }
  lines.push(``, `【学生信息】`, `- 学生姓名：${input.studentName}`)
  if (input.studentNote) {
    lines.push(`- 学生留言：${input.studentNote.replace(/\s+/g, " ").slice(0, 400)}`)
  }
  lines.push(
    ``,
    `请仔细识别每一张图片中的手写内容，按本系统的规则进行 visual grounding 与判分，并输出结构化结果。`,
  )
  return lines.join("\n")
}

/* -------------------------------------------------------------------------- */
/*                            班级学情报告 Prompt                            */
/* -------------------------------------------------------------------------- */

export interface BuildClassReportInput {
  taskTitle: string
  subject: SubjectKey
  totalScore: number
  className: string
  // 已批改的 submission 摘要
  graded: Array<{
    studentName: string
    score: number
    weak_points: string[]
    radar?: Record<string, number>
  }>
}

export function buildClassReportSystemPrompt(): string {
  return [
    `你是教研组长，正在帮一位一线教师写"班级学情诊断报告"。`,
    `你的输出必须能直接拿去开教研会用：判断准、有结构、有可执行建议。`,
    BASE_OUTPUT_CONTRACT,
    `【报告必须包含】
1. summary：一段 2~3 句的整体诊断（提及班级平均分、最薄弱知识点）。
2. score_distribution：按 [90,100]/[75,90)/[60,75)/[0,60) 四档统计人数。
3. top_weak_points：班级共性薄弱知识点 Top 3，每项给：
     - name 知识点名
     - student_count 涉及学生数
     - severity "high" | "mid" | "low"
     - intervention 具体补救建议（练习题方向、讲解切入点），1~2 句
4. tiered_advice：分层教学建议
     - top_tier 优等生：拔高方向
     - mid_tier 中等生：巩固方向
     - need_help 后进生：重点关照学生姓名 + 具体帮扶动作
5. next_action：教师下一步动作（1 条最重要的，控制在 30 字内）`,
  ]
    .map((s) => s.trim())
    .join("\n\n")
}

export function buildClassReportUserPrompt(input: BuildClassReportInput): string {
  const lines = [
    `请基于以下批改结果生成班级学情诊断报告。`,
    ``,
    `【作业】${input.taskTitle}（${labelFor(input.subject)}，满分 ${input.totalScore}）`,
    `【班级】${input.className}，共 ${input.graded.length} 份已批改`,
    ``,
    `【学生明细】`,
  ]
  for (const g of input.graded) {
    const radarStr = g.radar
      ? Object.entries(g.radar)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ")
      : ""
    lines.push(
      `- ${g.studentName} | 得分 ${g.score}/${input.totalScore} | 薄弱:[${g.weak_points.join(", ") || "无"}]${
        radarStr ? ` | radar:{${radarStr}}` : ""
      }`,
    )
  }
  return lines.join("\n")
}

/* -------------------------------------------------------------------------- */

function labelFor(s: SubjectKey): string {
  switch (s) {
    case "math":
      return "数学"
    case "chinese":
      return "语文"
    case "english":
      return "英语"
    default:
      return "通用学科"
  }
}
