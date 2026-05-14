"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * 通用深色模式切换按钮。
 * - 教师端和学生端都可以直接放进 header
 * - 使用 next-themes，挂载前不渲染图标避免 hydration mismatch
 */
export function ThemeToggle({
  size = "sm",
  className,
}: {
  size?: "sm" | "default" | "lg" | "icon"
  className?: string
}) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = (theme === "system" ? resolvedTheme : theme) ?? "light"
  const isDark = current === "dark"

  return (
    <Button
      variant="ghost"
      size={size}
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "切换浅色" : "切换深色"}
      title={isDark ? "切换浅色" : "切换深色"}
    >
      {mounted ? (
        isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
      ) : (
        <span className="w-4 h-4" />
      )}
    </Button>
  )
}
