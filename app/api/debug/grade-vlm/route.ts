import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { gradeSubmissionWithVLM } from "@/lib/ai/grade-vlm"

export const maxDuration = 300

// 临时调试路由：验证 VLM 分块链路，验证完删除。
// GET /api/debug/grade-vlm?submission=<id>
export async function GET(req: Request) {
  const url = new URL(req.url)
  const submissionId = url.searchParams.get("submission")
  if (!submissionId) {
    return NextResponse.json({ error: "missing submission param" }, { status: 400 })
  }

  const supabase = createClient()
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .single()

  if (error || !sub) {
    return NextResponse.json({ error: "submission not found", detail: error?.message }, { status: 404 })
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", sub.task_id)
    .single()

  const t0 = Date.now()
  try {
    const payload = await gradeSubmissionWithVLM(sub as any, task as any)
    const boxes = (payload.ai_issues?.correction_details ?? []).map((d: any) => ({
      type: d.type,
      box_source: d.box_source,
      bbox: d.bounding_box,
      page: d.page_index,
      excerpt: (d.process_analysis ?? "").slice(0, 40),
    }))
    return NextResponse.json({
      ok: true,
      subject: task?.subject,
      title: task?.title,
      ms: Date.now() - t0,
      total_score: payload.ai_issues?.summary?.total_score,
      detected_questions: payload.ai_issues?.summary?.detected_questions,
      boxCount: boxes.length,
      vlmBoxes: boxes.filter((b) => b.box_source === "vlm").length,
      boxes,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
