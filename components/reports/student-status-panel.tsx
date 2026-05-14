"use client"

import Link from "next/link"
import { ChevronRight, AlertCircle, Trophy } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { studentSubmissions as fallback } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function scoreColor(score: number) {
  if (score >= 90) return "text-[color:var(--success,#22c55e)]"
  if (score >= 75) return "text-primary"
  if (score >= 60) return "text-[color:var(--warning,#f59e0b)]"
  return "text-destructive"
}

export interface PanelStudent {
  id: string
  name: string
  studentNo: string
  submitted: boolean
  score: number | null
  submittedAt: string
  rank?: number
  /** submission row id, used for grading deep link */
  submissionId?: string
}

interface Props {
  students?: PanelStudent[]
}

export function StudentStatusPanel({ students }: Props = {}) {
  const list: PanelStudent[] = students && students.length > 0 ? students : (fallback as any)
  const submitted = list.filter((s) => s.submitted)
  const notSubmitted = list.filter((s) => !s.submitted)

  return (
    <Card className="gap-0">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">学生提交状态</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {submitted.length}/{list.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="submitted" className="w-full">
          <div className="px-3 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="submitted" className="flex-1 gap-1.5">
                已提交
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {submitted.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="not-submitted" className="flex-1 gap-1.5">
                未提交
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-destructive/15 text-destructive">
                  {notSubmitted.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="submitted" className="m-0">
            <ScrollArea className="h-[420px]">
              <ul className="px-2 py-2">
                {submitted.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/dashboard/grading/${s.submissionId ?? s.id}`}
                      className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors group"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-muted text-foreground text-xs">
                          {s.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{s.name}</span>
                          {s.rank && s.rank <= 3 ? (
                            <Trophy
                              className={cn(
                                "w-3 h-3",
                                s.rank === 1 && "text-[color:var(--warning,#f59e0b)]",
                                s.rank === 2 && "text-muted-foreground",
                                s.rank === 3 && "text-[color:var(--warning,#f59e0b)]/70",
                              )}
                            />
                          ) : null}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.studentNo} · 提交于 {s.submittedAt}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-base font-semibold tabular-nums", scoreColor(s.score ?? 0))}>
                          {s.score ?? "—"}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="not-submitted" className="m-0">
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/8 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed text-foreground">
                  以下 <span className="font-medium">{notSubmitted.length} 名</span>学生尚未提交作业，建议通过希沃学习机进行提醒。
                </div>
              </div>
              <ul className="space-y-1">
                {notSubmitted.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-destructive/12 text-destructive text-xs">
                        {s.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.studentNo}</div>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                      催交
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
