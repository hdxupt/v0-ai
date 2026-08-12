import "server-only"
import type { Submission, Task } from "@/lib/types"
import type { OcrData } from "@/lib/ocr/tencent"
import { gradeSubmissionWithAI, type AIGradePayload } from "./grade"
import { gradeSubmissionWithVLM } from "./grade-vlm"

/**
 * 批改统一入口（链路选择 + 自动回退）
 *
 * 设计目标：在"框选不准"这一核心痛点上引入新链路，但绝不让新链路的不稳定
 * 拖垮批改可用性。因此：
 *   1. 默认走【VLM 分块 + 按题型分流】新链路（grade-vlm.ts），框选最准；
 *   2. 任何失败（缺 DASHSCOPE_API_KEY、Qwen 超时、分块异常等）自动回退到
 *      旧【OCR + LLM】链路（grade.ts），保证批改永远能出结果；
 *   3. 可用环境变量 GRADING_PIPELINE=legacy 强制只走旧链路（演示兜底开关）。
 */
export async function gradeSubmission(
  submission: Submission,
  task: Task,
  options?: { cachedOcrData?: OcrData | null },
): Promise<AIGradePayload> {
  const forceLegacy = process.env.GRADING_PIPELINE === "legacy"
  const hasQwenKey = !!process.env.DASHSCOPE_API_KEY

  if (!forceLegacy && hasQwenKey) {
    try {
      console.log("[v0] grade-router: trying VLM pipeline")
      const payload = await gradeSubmissionWithVLM(submission, task)
      // 分块链路返回 0 个框时，可能是分块/批改整体失误，回退更稳妥
      if (payload.ai_issues.correction_details.length > 0) {
        return payload
      }
      console.warn("[v0] grade-router: VLM pipeline produced 0 boxes, falling back to legacy")
    } catch (e: any) {
      console.error("[v0] grade-router: VLM pipeline failed, falling back to legacy:", e?.message)
    }
  }

  console.log("[v0] grade-router: using legacy OCR+LLM pipeline")
  return gradeSubmissionWithAI(submission, task, options)
}
