import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentTeacher } from "@/lib/auth-server"

/** 训练图片在 AutoDL 上的存放目录 */
const REMOTE_IMAGE_DIR = "/root/autodl-tmp/data/images"

/**
 * 导出标注结果。
 *   /api/label/export            → train.jsonl（ms-swift 可直接用，图片路径指向 AutoDL 本地目录）
 *   /api/label/export?mode=urls  → 下载清单（每行「URL 文件名」），配合 wget 在 AutoDL 上拉图
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
    .select("id, crop_url, correct_answer, label, student_answer")
    .not("label", "is", null)
    .order("id", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.length) return NextResponse.json({ error: "还没有已标注的样本" }, { status: 400 })

  if (mode === "urls") {
    const lines = data.map((s) => `${s.crop_url} label-${s.id}.jpg`)
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="images.txt"',
      },
    })
  }

  const lines = data.map((s) => {
    const prompt = `<image>标准答案是：${s.correct_answer}。请识别学生作答内容并判定对错，以JSON格式输出。`
    const reply = JSON.stringify({
      作答内容: s.student_answer ?? "",
      判定: s.label,
    })
    return JSON.stringify({
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: reply },
      ],
      images: [`${REMOTE_IMAGE_DIR}/label-${s.id}.jpg`],
    })
  })

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": 'attachment; filename="train.jsonl"',
    },
  })
}
