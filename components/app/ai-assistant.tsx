"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Sparkles, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/auth/auth-provider"

const QUICK_PROMPTS = [
  "本周哪些学生需要重点关注？",
  "三角函数章节哪些知识点丢分最多？",
  "给我生成一份本周班级学情周报",
  "哪些学生作业完成率连续下降？",
]

function getMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export function AIAssistant() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  if (!user || user.role !== "teacher") return null

  const isStreaming = status === "streaming" || status === "submitted"

  function submit(text: string) {
    const t = text.trim()
    if (!t || isStreaming) return
    sendMessage({ text: t })
    setInput("")
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI 教研助手"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 80%, var(--primary)))",
        }}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5 ai-pulse" />}
        {!open ? (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/30 animate-ping pointer-events-none" />
        ) : null}
      </button>

      {/* 对话窗口 */}
      {open ? (
        <div className="fixed bottom-24 right-6 z-50 w-[min(380px,calc(100vw-2rem))] h-[560px] rounded-2xl border bg-popover shadow-2xl flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="border-b px-4 py-3 flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground"
              style={{
                background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 80%, var(--primary)))",
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">希沃 AI 教研助手</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                在线 · 基于班级学情
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 对话区 */}
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    你好，{user.name}！我是基于你班级真实学情数据训练的 AI 助手，可以回答以下问题：
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        onClick={() => submit(q)}
                        className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m) => {
                const text = getMessageText(m)
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-2 text-sm">
                        {text}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={m.id} className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-primary-foreground"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 80%, var(--primary)))",
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                      {text || (isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "")}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* 输入区 */}
          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问问 AI…  Enter 发送 / Shift+Enter 换行"
              rows={1}
              className="resize-none text-sm min-h-9 max-h-32"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit(input)
                }
              }}
              disabled={isStreaming}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => submit(input)}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
