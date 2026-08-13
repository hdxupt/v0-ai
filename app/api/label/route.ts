import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentTeacher } from "@/lib/auth-server"

const VALID_LABELS = ["对", "错", "半对", "无法识别"] as const

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

/** 拉取待标注 / 已标注样本 */
export async function GET(request: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "仅教师可访问" }, { status: 401 })

  const sb = admin()
  const { data, error } = await sb
    .from("label_samples")
    .select(
      "id, crop_url, question_text, correct_answer, ai_type, ai_analysis, label, student_answer, submission_id, detail_index, quality, locate_method, matched_text, source_image_url",
    )
    // good（文字内容定位，最可信）排前面，review（坐标吸附，位置可能偏）排后面
    .order("quality", { ascending: true })
    .order("id", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const done = data.filter((d) => d.label).length
  const goodTotal = data.filter((d) => d.quality === "good").length
  return NextResponse.json({ samples: data, total: data.length, done, goodTotal })
}

/** 保存单条标注 */
export async function PATCH(request: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "仅教师可访问" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const label = body?.label
  const studentAnswer = typeof body?.student_answer === "string" ? body.student_answer : null

  if (!Number.isFinite(id)) return NextResponse.json({ error: "缺少 id" }, { status: 400 })
  if (label !== null && !VALID_LABELS.includes(label)) {
    return NextResponse.json({ error: `label 必须是 ${VALID_LABELS.join("/")} 之一` }, { status: 400 })
  }

  const sb = admin()
  const { error } = await sb
    .from("label_samples")
    .update({
      label,
      student_answer: studentAnswer,
      labeled_at: label ? new Date().toISOString() : null,
    })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
