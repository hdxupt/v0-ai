import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { gradeSubmissionWithVLM } from "@/lib/ai/grade-vlm"
import { segmentPage } from "@/lib/ai/segment"
import { imageToDataUrl } from "@/lib/image/crop"

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const submissionId = req.nextUrl.searchParams.get("submission")
  if (!submissionId) {
    return NextResponse.json({ error: "missing submission param" }, { status: 400 })
  }

  const supabase = createClient()
  const { data: sub, error } = await supabase.from("submissions").select("*").eq("id", submissionId).single()
  if (error || !sub) {
    return NextResponse.json({ error: "submission not found", detail: error?.message }, { status: 404 })
  }
  const { data: task } = await supabase.from("tasks").select("*").eq("id", sub.task_id).single()

  // ?mode=segment 只看分块结果，快速诊断
  if (req.nextUrl.searchParams.get("mode") === "segment") {
    const urls = (sub.image_urls as string[]) ?? []
    const pages = await Promise.all(
      urls.map(async (u, p) => {
        const dataUrl = await imageToDataUrl(u)
        const blocks = await segmentPage(dataUrl, p)
        return { page: p, blocks }
      }),
    )
    return NextResponse.json({ ok: true, pages })
  }

  const t0 = Date.now()
  try {
    const payload = await gradeSubmissionWithVLM(sub as any, task as any)
    const boxes = (payload.ai_issues?.correction_details ?? []).map((d: any) => ({
      type: d.type,
      src: d.box_source,
      bbox: d.bounding_box,
      page: d.page_index,
      excerpt: (d.process_analysis ?? "").slice(0, 36),
    }))
    return NextResponse.json({
      ok: true,
      subject: task?.subject,
      title: task?.title,
      ms: Date.now() - t0,
      total_score: payload.ai_issues?.summary?.total_score,
      detected_questions: payload.ai_issues?.summary?.detected_questions,
      boxCount: boxes.length,
      boxes,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, ms: Date.now() - t0, error: e?.message }, { status: 500 })
  }
}
