"use client"

import { useState } from "react"
import { GradingImageViewer } from "./grading-image-viewer"
import { GradingControlPanel } from "./grading-control-panel"
import type { Submission, Task, AppUser, ViewerBox, AIIssuesField } from "@/lib/types"
import { toViewerBoxes } from "@/lib/types"

interface Props {
  submission: Submission
  task: Task
  student: AppUser
  teacher: AppUser
}

/**
 * 单卷批改工作台。
 * - 左侧：图片 + AI bbox 叠加
 * - 右侧：AI 控制台 + 评分 + 评语
 *
 * boxes 来自 toViewerBoxes(ai_issues)，自动兼容 v1（数组）与 v2（对象）。
 */
export function GradingWorkspace({ submission, task, student, teacher }: Props) {
  const [aiField, setAiField] = useState<AIIssuesField>(submission.ai_issues ?? [])
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const boxes: ViewerBox[] = toViewerBoxes(aiField)

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px]">
      <div className="flex-[3] min-w-0">
        <GradingImageViewer
          imageUrls={submission.image_urls}
          boxes={boxes}
          showAnnotations={showAnnotations}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          taskTitle={task.title}
          submittedAt={submission.submitted_at}
        />
      </div>
      <div className="flex-[2] min-w-[380px] max-w-[560px]">
        <GradingControlPanel
          submission={submission}
          task={task}
          student={student}
          teacher={teacher}
          aiField={aiField}
          onAiFieldChange={setAiField}
          onAnnotationToggle={setShowAnnotations}
        />
      </div>
    </div>
  )
}
