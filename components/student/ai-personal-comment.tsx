import { Sparkles, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { personalAIComment, studentProfile } from "@/lib/mock-data"

export function AIPersonalComment() {
  return (
    <Card className="p-5 gap-3 ai-gradient-bg border-primary/20 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">AI 老师对你说</h3>
          <p className="text-[11px] text-muted-foreground">
            李雯老师审阅 · 针对 {studentProfile.name} 个性化生成
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 h-5 rounded-full bg-[color:var(--success)]/12 text-[color:var(--success)] font-medium">
          <CheckCircle2 className="w-3 h-3" />
          老师已确认
        </span>
      </div>

      <div className="relative">
        <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-transparent rounded-full" />
        <p className="pl-4 text-sm leading-relaxed text-foreground whitespace-pre-line">
          {personalAIComment}
        </p>
      </div>
    </Card>
  )
}
