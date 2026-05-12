// 共享 Mock 数据 —— 希沃 AI 学情系统教师端

export type GradingStatus = "pending" | "grading" | "completed"

export interface HomeworkTask {
  id: string
  name: string
  subject: string
  className: string
  assignedAt: string // ISO
  deadline: string // ISO
  submitted: number
  total: number
  status: GradingStatus
  averageScore?: number
}

export interface ClassOption {
  id: string
  name: string
  studentCount: number
  grade: string
}

export interface StudentSubmission {
  id: string
  name: string
  studentNo: string
  avatar?: string
  submitted: boolean
  score?: number
  submittedAt?: string
  rank?: number
}

export interface ScoreBucket {
  range: string
  count: number
}

export interface KnowledgePoint {
  name: string
  mastery: number // 0-100
  errorRate: number // 0-100
}

export interface AIIssue {
  id: string
  region: { x: number; y: number; width: number; height: number } // 百分比
  type: "error" | "warning" | "note"
  message: string
}

export const classOptions: ClassOption[] = [
  { id: "c1", name: "高二 (3) 班", grade: "高二", studentCount: 48 },
  { id: "c2", name: "高二 (5) 班", grade: "高二", studentCount: 46 },
  { id: "c3", name: "高二 (7) 班", grade: "高二", studentCount: 50 },
]

export const homeworkTasks: HomeworkTask[] = [
  {
    id: "hw-2025-0512",
    name: "5月12日 · 三角函数练习题",
    subject: "数学",
    className: "高二 (3) 班",
    assignedAt: "2025-05-12T08:00:00Z",
    deadline: "2025-05-12T22:00:00Z",
    submitted: 46,
    total: 48,
    status: "completed",
    averageScore: 82.4,
  },
  {
    id: "hw-2025-0511",
    name: "5月11日 · 数列综合应用",
    subject: "数学",
    className: "高二 (3) 班",
    assignedAt: "2025-05-11T08:00:00Z",
    deadline: "2025-05-11T22:00:00Z",
    submitted: 42,
    total: 48,
    status: "grading",
    averageScore: undefined,
  },
  {
    id: "hw-2025-0510",
    name: "5月10日 · 立体几何小测",
    subject: "数学",
    className: "高二 (3) 班",
    assignedAt: "2025-05-10T08:00:00Z",
    deadline: "2025-05-10T22:00:00Z",
    submitted: 38,
    total: 48,
    status: "pending",
  },
  {
    id: "hw-2025-0509",
    name: "5月9日 · 解析几何基础",
    subject: "数学",
    className: "高二 (3) 班",
    assignedAt: "2025-05-09T08:00:00Z",
    deadline: "2025-05-09T22:00:00Z",
    submitted: 48,
    total: 48,
    status: "completed",
    averageScore: 78.6,
  },
  {
    id: "hw-2025-0508",
    name: "5月8日 · 向量与坐标系",
    subject: "数学",
    className: "高二 (3) 班",
    assignedAt: "2025-05-08T08:00:00Z",
    deadline: "2025-05-08T22:00:00Z",
    submitted: 47,
    total: 48,
    status: "completed",
    averageScore: 85.2,
  },
]

export const studentSubmissions: StudentSubmission[] = [
  { id: "s01", name: "李思琪", studentNo: "20230301", submitted: true, score: 96, submittedAt: "20:14", rank: 1 },
  { id: "s02", name: "陈墨白", studentNo: "20230302", submitted: true, score: 94, submittedAt: "19:48", rank: 2 },
  { id: "s03", name: "赵雨桐", studentNo: "20230303", submitted: true, score: 92, submittedAt: "20:02", rank: 3 },
  { id: "s04", name: "孙泽宇", studentNo: "20230304", submitted: true, score: 88, submittedAt: "20:31" },
  { id: "s05", name: "周晓彤", studentNo: "20230305", submitted: true, score: 86, submittedAt: "21:05" },
  { id: "s06", name: "吴俊熙", studentNo: "20230306", submitted: true, score: 84, submittedAt: "19:55" },
  { id: "s07", name: "郑佳颖", studentNo: "20230307", submitted: true, score: 82, submittedAt: "20:18" },
  { id: "s08", name: "黄子轩", studentNo: "20230308", submitted: true, score: 79, submittedAt: "20:44" },
  { id: "s09", name: "刘梓涵", studentNo: "20230309", submitted: true, score: 76, submittedAt: "21:22" },
  { id: "s10", name: "马若曦", studentNo: "20230310", submitted: true, score: 72, submittedAt: "21:36" },
  { id: "s11", name: "杨思源", studentNo: "20230311", submitted: true, score: 68, submittedAt: "21:50" },
  { id: "s12", name: "高雨菲", studentNo: "20230312", submitted: true, score: 62, submittedAt: "21:58" },
  { id: "s13", name: "张三", studentNo: "20230313", submitted: false },
  { id: "s14", name: "王五", studentNo: "20230314", submitted: false },
]

export const scoreDistribution: ScoreBucket[] = [
  { range: "0-59", count: 2 },
  { range: "60-69", count: 4 },
  { range: "70-79", count: 11 },
  { range: "80-89", count: 18 },
  { range: "90-100", count: 11 },
]

export const knowledgePoints: KnowledgePoint[] = [
  { name: "三角函数定义", mastery: 88, errorRate: 12 },
  { name: "图像性质", mastery: 55, errorRate: 45 },
  { name: "和差化积", mastery: 72, errorRate: 28 },
  { name: "诱导公式", mastery: 81, errorRate: 19 },
  { name: "解三角形", mastery: 67, errorRate: 33 },
  { name: "周期与振幅", mastery: 76, errorRate: 24 },
]

export const aiIssues: AIIssue[] = [
  {
    id: "i1",
    region: { x: 14, y: 22, width: 38, height: 8 },
    type: "error",
    message: "公式错误：sin²θ + cos²θ ≠ 2",
  },
  {
    id: "i2",
    region: { x: 18, y: 46, width: 52, height: 10 },
    type: "warning",
    message: "解题过程跳步，建议补充诱导公式推导",
  },
  {
    id: "i3",
    region: { x: 22, y: 70, width: 30, height: 8 },
    type: "error",
    message: "符号错误：周期 T = 2π/|ω|",
  },
]

export function getTaskById(id: string): HomeworkTask | undefined {
  return homeworkTasks.find((t) => t.id === id)
}

// ========== 学生端：反馈闭环数据 ==========

export interface StudentHistoryItem {
  id: string
  date: string // 显示用
  title: string
  subject: string
  score: number
  totalScore: number
  classAverage: number
  rank: number
  classSize: number
  isNew?: boolean
  status: "已批阅" | "已查阅"
}

export interface WeakKnowledge {
  name: string
  myScore: number // 0-100
  classAverage: number
  lostPoints: number
  reason: string
}

export interface PracticeRecommendation {
  id: string
  title: string
  difficulty: "基础" | "进阶" | "拔高"
  knowledgePoint: string
  estimatedMinutes: number
}

export const studentProfile = {
  name: "黄子轩",
  studentNo: "20230308",
  className: "高二 (3) 班",
  device: "希沃学习机 W5 Pro",
}

export const studentHistory: StudentHistoryItem[] = [
  {
    id: "hw-2025-0512",
    date: "5月12日",
    title: "三角函数练习题",
    subject: "数学",
    score: 79,
    totalScore: 100,
    classAverage: 82.4,
    rank: 21,
    classSize: 48,
    isNew: true,
    status: "已批阅",
  },
  {
    id: "hw-2025-0509",
    date: "5月9日",
    title: "解析几何基础",
    subject: "数学",
    score: 82,
    totalScore: 100,
    classAverage: 78.6,
    rank: 18,
    classSize: 48,
    status: "已查阅",
  },
  {
    id: "hw-2025-0508",
    date: "5月8日",
    title: "向量与坐标系",
    subject: "数学",
    score: 91,
    totalScore: 100,
    classAverage: 85.2,
    rank: 9,
    classSize: 48,
    status: "已查阅",
  },
  {
    id: "hw-2025-0506",
    date: "5月6日",
    title: "概率与统计入门",
    subject: "数学",
    score: 75,
    totalScore: 100,
    classAverage: 80.1,
    rank: 28,
    classSize: 48,
    status: "已查阅",
  },
  {
    id: "hw-2025-0505",
    date: "5月5日",
    title: "函数与导数复习",
    subject: "数学",
    score: 88,
    totalScore: 100,
    classAverage: 81.3,
    rank: 12,
    classSize: 48,
    status: "已查阅",
  },
]

export const weakKnowledgePoints: WeakKnowledge[] = [
  {
    name: "三角函数图像性质",
    myScore: 45,
    classAverage: 68,
    lostPoints: 11,
    reason: "周期与振幅判断错误，未能识别相位平移影响",
  },
  {
    name: "诱导公式应用",
    myScore: 62,
    classAverage: 81,
    lostPoints: 7,
    reason: "符号处理不严谨，第二象限角度转换时丢失负号",
  },
  {
    name: "解三角形",
    myScore: 70,
    classAverage: 76,
    lostPoints: 3,
    reason: "正弦定理使用正确，余弦定理变形步骤可优化",
  },
]

export const practiceRecommendations: PracticeRecommendation[] = [
  {
    id: "p1",
    title: "三角函数图像变换专项 (10 题)",
    difficulty: "基础",
    knowledgePoint: "三角函数图像性质",
    estimatedMinutes: 15,
  },
  {
    id: "p2",
    title: "诱导公式符号陷阱辨析 (8 题)",
    difficulty: "进阶",
    knowledgePoint: "诱导公式应用",
    estimatedMinutes: 12,
  },
  {
    id: "p3",
    title: "正余弦定理综合应用 (6 题)",
    difficulty: "拔高",
    knowledgePoint: "解三角形",
    estimatedMinutes: 20,
  },
]

export const personalAIComment = `子轩同学你好，老师确认完成本次批改啦。

本次三角函数练习中，你在【基础公式记忆】和【常规解三角形】题上表现稳定，可见课堂吸收良好。不过 AI 注意到，你在【三角函数图像性质】部分失分较多（11 分），主要问题是周期 T = 2π/|ω| 中对 ω 系数的处理。

建议结合课本 P78 例 5、例 6 重做一遍，并完成下方推荐的"图像变换专项"练习。如果遇到困难，可以在学习机上直接呼出 AI 老师讲解。继续加油！`

