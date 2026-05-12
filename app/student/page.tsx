"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, MessageCircleQuestion, Mic } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DeviceStatusBar } from "@/components/student/device-status-bar"
import { NewResultBanner } from "@/components/student/new-result-banner"
import { HistoryList } from "@/components/student/history-list"
import { ScoreHero } from "@/components/student/score-hero"
import { AIPersonalComment } from "@/components/student/ai-personal-comment"
import { WeaknessAnalysis } from "@/components/student/weakness-analysis"
import { PracticeRecommendations } from "@/components/student/practice-recommendations"
import { studentHistory, studentProfile } from "@/lib/mock-data"

export default function StudentPage() {
  const [selectedId, setSelectedId] = useState(studentHistory[0].id)
  const selected = studentHistory.find((h) => h.id === selectedId) ?? studentHistory[0]

  return (
    <div className="min-h-screen bg-muted/40 py-6 px-4 sm:px-6">
      {/* Demo context badge */}
      <div className="max-w-[1280px] mx-auto mb-4 flex items-center justify-between text-xs">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回教师端
        </Link>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--success)]" />
          阶段五 · 反馈闭环：学生学习机视角
        </span>
      </div>

      {/* Device frame */}
      <div className="max-w-[1280px] mx-auto rounded-3xl border-[10px] border-foreground bg-background shadow-2xl overflow-hidden">
        <DeviceStatusBar />

        {/* App top bar */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
              希
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">希沃学伴</div>
              <div className="text-[11px] text-muted-foreground">我的学习空间</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-8">
              <Mic className="w-3.5 h-3.5" />
              呼出 AI 老师
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/12 text-primary text-xs">
                  {studentProfile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <div className="text-xs font-medium leading-tight">{studentProfile.name}</div>
                <div className="text-[10px] text-muted-foreground">{studentProfile.studentNo}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-5">
          <NewResultBanner />

          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            {/* Left: history list */}
            <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]">
              <HistoryList selectedId={selectedId} onSelect={setSelectedId} />
            </div>

            {/* Right: detail */}
            <div className="space-y-5 min-w-0">
              <ScoreHero
                title={selected.title}
                date={selected.date}
                score={selected.score}
                totalScore={selected.totalScore}
                classAverage={selected.classAverage}
                rank={selected.rank}
                classSize={selected.classSize}
              />
              <AIPersonalComment />
              <WeaknessAnalysis />
              <PracticeRecommendations />

              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <MessageCircleQuestion className="w-3.5 h-3.5" />
                还有不懂的题？呼出 AI 老师，逐题为你讲解
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
