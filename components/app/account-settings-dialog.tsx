"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AppUser } from "@/lib/types"

/** 头像可选色板：与图表色系一致，保证跨端观感统一 */
const AVATAR_COLORS = [
  "#2563eb", // 蓝
  "#0d9488", // 青
  "#d97706", // 琥珀
  "#dc2626", // 红
  "#7c3aed", // 紫
  "#db2777", // 玫红
  "#16a34a", // 绿
  "#475569", // 石板灰
]

export function AccountSettingsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AppUser
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [color, setColor] = useState(user.avatar_color)
  const [saving, setSaving] = useState(false)

  const dirty = color !== user.avatar_color

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_color: color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "保存失败")
      toast.success("账号设置已保存")
      onOpenChange(false)
      router.refresh()
    } catch (e: any) {
      toast.error("保存失败", { description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = user.role === "teacher" ? "教师" : "学生"
  const identityRows: Array<{ label: string; value: string }> = [
    { label: "姓名", value: user.name },
    { label: "身份", value: user.role === "teacher" ? `${user.subject ?? "学科"}教师` : "学生" },
    ...(user.student_no ? [{ label: "学号", value: user.student_no }] : []),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>账号设置</DialogTitle>
          <DialogDescription>个人信息由学校统一管理，头像颜色可自定义</DialogDescription>
        </DialogHeader>

        {/* 个人信息卡 */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="text-white text-xl" style={{ backgroundColor: color }}>
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">{user.name}</span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {roleLabel}端
              </Badge>
            </div>
            {identityRows.slice(1).map((row) => (
              <p key={row.label} className="text-xs text-muted-foreground">
                {row.label}：{row.value}
              </p>
            ))}
          </div>
        </div>

        {/* 头像颜色 */}
        <div className="space-y-2.5">
          <span className="text-xs font-medium text-muted-foreground">头像颜色</span>
          <div className="flex flex-wrap gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`选择颜色 ${c}`}
                aria-pressed={color === c}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-transform",
                  color === c ? "ring-2 ring-offset-2 ring-ring scale-110" : "hover:scale-105",
                )}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            保存修改
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
