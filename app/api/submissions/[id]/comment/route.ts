import { NextResponse } from "next/server"
import { getCurrentTeacher } from "@/lib/auth-server"
import { getSubmission, getTask } from "@/lib/db"
import { callQwenVL } from "@/lib/ai/qwen"
import { isAIGradingV2 } from "@/lib/types"

/** 评语生成为纯文本任务，60s 足够 */
export const maxDuration = 60

/**
 * POST /api/submissions/[id]/comment
 *
 * 独立的 AI 评语生成/改写端点（不重新批改，基于已有批改结果）：
 *   1. { }                                    → 从批改结果重新生成一份评语
 *   2. { instruction, current }               → 按教师的修改建议改写当前评语
 *
 * 走 Qwen（DASHSCOPE_API_KEY），与主批改链路同源，不依赖已失效的 Anthropic。
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const instruction: string = typeof body.instruction === "string" ? body.instruction.trim() : ""
  const current: string = typeof body.current === "string" ? body.current.trim() : ""

  const submission = await getSubmission(id)
  if (!submission) return NextResponse.json({ error: "提交不存在" }, { status: 404 })
  if (submission.status !== "graded" && !isAIGradingV2(submission.ai_issues)) {
    return NextResponse.json({ error: "请先完成 AI 批改再生成评语" }, { status: 400 })
  }
  const task = await getTask(submission.task_id)

  /* ------------------------ 组装批改上下文 ------------------------ */
  const field = submission.ai_issues
  let gradingContext = `得分：${submission.score ?? "未知"}/100`
  if (isAIGradingV2(field)) {
    const s = field.summary
    gradingContext += `\n判定统计：对 ${s.correct_count} 题、错 ${s.wrong_count} 题、半对 ${s.partial_count} 题`
    if (s.weak_points?.length) {
      gradingContext += `\n薄弱知识点：${s.weak_points.join("、")}`
    }
    const details = (field.correction_details ?? [])
      .filter((d) => d.type !== "highlight")
      .slice(0, 8)
      .map((d, i) => `${i + 1}. [${d.rubric_dimension ?? "综合"}] ${d.question_text}：${d.process_analysis}`)
      .join("\n")
    if (details) gradingContext += `\n主要问题：\n${details}`
    const highlights = (field.correction_details ?? [])
      .filter((d) => d.type === "highlight")
      .slice(0, 3)
      .map((d) => d.process_analysis)
      .join("；")
    if (highlights) gradingContext += `\n亮点：${highlights}`
  }

  const name = submission.student_name || "该"
  const subject = task?.subject || "本学科"

  const basePrompt = `你是一位经验丰富的${subject}老师，请为学生写一段作业评语。

学生：${name}
${gradingContext}

评语要求：
- 单一字符串，不含换行、不含 Markdown 记号（禁止 ** 和 #）
- 严格四段式：(1)以「${name}同学，」开头一句具体的肯定；(2)以「但目前存在 N 个核心问题需要重点突破：」起头，用「第一，…。」「第二，…。」列2~3条核心问题；(3)以「建议接下来这样做：」起头给1~3条可执行建议；(4)以一句鼓励收尾
- 内容必须基于上面的真实批改数据，不得编造
- 总长度 150~250 字`

  const revisePrompt = `你是一位经验丰富的${subject}老师。下面是一段学生作业评语，请按老师的修改建议调整它。

学生：${name}
${gradingContext}

当前评语：
${current}

老师的修改建议：
${instruction}

要求：
- 保持评语基于真实批改数据，按修改建议调整语气/侧重/长度/内容
- 单一字符串，不含换行、不含 Markdown 记号（禁止 ** 和 #）
- 只输出调整后的评语本身，不要任何解释`

  try {
    const raw = await callQwenVL(
      [{ role: "user", content: instruction && current ? revisePrompt : basePrompt }],
      { temperature: 0.4, maxTokens: 800 },
    )
    // 防御性清洗：剥掉可能的引号包裹与 Markdown 记号
    const comment = raw
      .trim()
      .replace(/^["「『]|["」』]$/g, "")
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/\n+/g, " ")
      .trim()
    if (!comment) throw new Error("生成结果为空")
    return NextResponse.json({ comment })
  } catch (err: any) {
    console.error("[v0] comment generation failed:", err)
    return NextResponse.json({ error: err?.message ?? "评语生成失败" }, { status: 500 })
  }
}
