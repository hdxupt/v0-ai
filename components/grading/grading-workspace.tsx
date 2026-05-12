"use client"

import { useState } from "react"
import { GradingImageViewer } from "./grading-image-viewer"
import { GradingControlPanel } from "./grading-control-panel"

interface Props {
  studentName: string
  studentNo: string
}

export function GradingWorkspace({ studentName, studentNo }: Props) {
  const [showAnnotations, setShowAnnotations] = useState(true)

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[640px]">
      {/* Left: image viewer (60%) */}
      <div className="flex-[3] min-w-0">
        <GradingImageViewer showAnnotations={showAnnotations} />
      </div>
      {/* Right: control panel (40%) */}
      <div className="flex-[2] min-w-[380px] max-w-[520px]">
        <GradingControlPanel
          studentName={studentName}
          studentNo={studentNo}
          onAnnotationToggle={setShowAnnotations}
        />
      </div>
    </div>
  )
}
