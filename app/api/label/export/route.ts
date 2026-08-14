import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentTeacher } from "@/lib/auth-server"

/** 训练图片在 AutoDL 上的存放目录 */
const REMOTE_IMAGE_DIR = "/root/autodl-tmp/data/images"

/** 测试集比例。测试集只放真实人工标注，绝不放合成数据，否则准确率会虚高 */
const TEST_RATIO = 0.15

/** 把一条样本转成 ms-swift 的对话格式 */
function toSample(s: { id: number; correct_answer: string; label: string; student_answer: string | null }) {
  const answer = (s.student_answer ?? "").trim()

  /**
   * 两种指令模式，取决于标注时有没有抄录学生原文：
   *  - 抄了 → 同时训「识别作答内容」+「判定对错」，信号最全
   *  - 没抄 → 只训「判定对错」。绝不能用空字符串占位，
   *    那会教模型学会输出 作答内容:""，线上就再也读不出学生写了什么
   */
  const prompt = answer
    ? `<image>标准答案是：${s.correct_answer}。请识别学生作答内容并判定对错，以JSON格式输出。`
    : `<image>标准答案是：${s.correct_answer}。请判定学生作答是否正确，以JSON格式输出。`

  const reply = answer ? { 作答内容: answer, 判定: s.label } : { 判定: s.label }

  return JSON.stringify({
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: JSON.stringify(reply) },
    ],
    images: [`${REMOTE_IMAGE_DIR}/label-${s.id}.jpg`],
  })
}

/**
 * 导出标注结果。
 *   /api/label/export             → train.jsonl（训练集，ms-swift 可直接用）
 *   /api/label/export?mode=test   → test.jsonl（测试集，约 15%，用于三方对比评估）
 *   /api/label/export?mode=urls   → 下载清单（每行「URL 文件名」），配合 wget 在 AutoDL 上拉图
 *   /api/label/export?mode=stats  → 只看统计，不下载文件
 */
export async function GET(request: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "仅教师可访问" }, { status: 401 })

  const mode = request.nextUrl.searchParams.get("mode")

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

  const { data, error } = await sb
    .from("label_samples")
    .select("id, crop_url, correct_answer, label, student_answer, submission_id")
    .not("label", "is", null)
    // 「无法识别」是标注者判定这张图没用（裁歪/看不清/纯题干），属于无效样本，不能进训练
    .neq("label", "无法识别")
    .order("id", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.length) return NextResponse.json({ error: "还没有可用的已标注样本" }, { status: 400 })

  /**
   * 按 submission_id 切分训练/测试集，而不是按样本随机切。
   * 同一张卷子的多个题块如果同时出现在两边，模型见过同一份笔迹，测试分数会虚高。
   */
  const submissionIds = [...new Set(data.map((s) => s.submission_id))].sort()
  const testCount = Math.max(1, Math.round(submissionIds.length * TEST_RATIO))
  const testIds = new Set(submissionIds.slice(-testCount))

  const trainRows = data.filter((s) => !testIds.has(s.submission_id))
  const testRows = data.filter((s) => testIds.has(s.submission_id))

  if (mode === "stats") {
    const dist = (rows: typeof data) =>
      rows.reduce<Record<string, number>>((acc, r) => ((acc[r.label] = (acc[r.label] || 0) + 1), acc), {})
    return NextResponse.json({
      可用样本: data.length,
      训练集: { 条数: trainRows.length, 标签分布: dist(trainRows) },
      测试集: { 条数: testRows.length, 标签分布: dist(testRows), 卷子数: testCount },
      抄录了学生原文: data.filter((s) => (s.student_answer ?? "").trim()).length,
    })
  }

  if (mode === "urls") {
    // 图片清单要含全部样本（训练集 + 测试集都要下载）
    const lines = data.map((s) => `${s.crop_url} label-${s.id}.jpg`)
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="images.txt"',
      },
    })
  }

  const rows = mode === "test" ? testRows : trainRows
  const filename = mode === "test" ? "test.jsonl" : "train.jsonl"

  return new NextResponse(rows.map(toSample).join("\n") + "\n", {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
