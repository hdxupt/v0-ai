"use client"

import { useState } from "react"
import { GradingImageViewer } from "./grading-image-viewer"
import { GradingControlPanel } from "./grading-control-panel"
import type { Submission, Task, AppUser, AIIssueAnnotation } from "@/lib/types"

interface Props {
  submission: Submission
  task: Task
  student: AppUser
  teacher: AppUser
}

export function GradingWorkspace({ submission, task, student, teacher }: Props) {
  // Local state — start with whatever is already in DB
  const [issues, setIssues] = useState<AIIssueAnnotation[]>(submission.ai_issues ?? [])
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px]">
      {/* Left: image viewer */}
      <div className="flex-[3] min-w-0">
        <GradingImageViewer
          imageUrls={submission.image_urls}
          issues={issues}
          showAnnotations={showAnnotations}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          taskTitle={task.title}
          submittedAt={submission.submitted_at}
        />
      </div>
      {/* Right: control panel */}
      <div className="flex-[2] min-w-[380px] max-w-[520px]">
        <GradingControlPanel
          submission={submission}
          task={task}
          student={student}
          teacher={teacher}
          issues={issues}
          onIssuesChange={setIssues}
          onAnnotationToggle={setShowAnnotations}
        />
      </div>
    </div>
  )
}
