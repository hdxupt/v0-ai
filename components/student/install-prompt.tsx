"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "sewise_install_dismissed_at"
const DISMISS_DAYS = 7

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      // 30 秒后弹
      const timer = setTimeout(() => setVisible(true), 30_000)
      return () => clearTimeout(timer)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall)
  }, [])

  if (!visible || !deferred) return null

  async function handleInstall() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === "accepted") {
      setVisible(false)
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
      setVisible(false)
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl border bg-popover shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">添加到桌面</p>
        <p className="text-xs text-muted-foreground">一键打开，随时查看作业反馈</p>
      </div>
      <Button size="sm" onClick={handleInstall} className="h-8">
        安装
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismiss}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
