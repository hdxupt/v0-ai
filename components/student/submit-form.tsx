"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { ArrowLeft, Upload, X, Camera, CheckCircle2, Loader2, GripVertical, Clock, BookOpen, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { formatDueDate } from "@/lib/format"
import type { AppUser, Task, Submission } from "@/lib/types"
import { compressImageForUpload, formatBytes, rotateImageFile } from "@/lib/image/compress"

interface SubmitFormProps {
  task: Task
  student: AppUser
  existingSubmission: Submission | null
}

interface UploadingFile {
  id: string
  file: File
  previewUrl: string
  status: "pending" | "compressing" | "uploading" | "done" | "error"
  pathname?: string
  progress: number
  /** 压缩前原始大小，用于 UI 显示"压缩比" */
  originalSize?: number
  /** 旋转中标记，UI 给个 loading 反馈 */
  rotating?: boolean
}

const MAX_FILES = 9
/**
 * 兜底上限：单张原图最大 30MB（极端情况，例如 Pro 单反 RAW 转 JPEG）。
 * 超过这个再走压缩也太慢、且基本不是手机拍照的合理场景。
 */
const HARD_LIMIT = 30 * 1024 * 1024

export function SubmitForm({ task, student, existingSubmission }: SubmitFormProps) {
  const router = useRouter()
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragItemRef = useRef<number | null>(null)

  // 已经提交过则跳转到结果页
  if (existingSubmission) {
    router.replace(`/student/submitted/${existingSubmission.id}`)
    return null
  }

  function addFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    const room = MAX_FILES - files.length
    if (arr.length > room) {
      toast.warning(`最多只能上传 ${MAX_FILES} 张图片`)
    }
    const accepted = arr.slice(0, room).filter((f) => {
      const isImage =
        f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)
      if (!isImage) {
        toast.error(`${f.name} 不是图片文件`)
        return false
      }
      if (f.size > HARD_LIMIT) {
        toast.error(`${f.name} 体积超过 ${formatBytes(HARD_LIMIT)}，请先在系统相册里导出再上传`)
        return false
      }
      return true
    })

    const newItems: UploadingFile[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "pending",
      progress: 0,
      originalSize: f.size,
    }))
    setFiles((prev) => [...prev, ...newItems])
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  /**
   * 用户点击旋转按钮：本地用 canvas 把图顺时针 90° 旋转。
   * 注意：旋转后的文件已经是新 File 实例，必须更新 previewUrl，
   * 同时把 status 复位到 pending（如果之前已上传，则 pathname 失效，需要重新上传）。
   */
  async function rotateFile(id: string) {
    const target = files.find((f) => f.id === id)
    if (!target || target.rotating) return

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, rotating: true } : f)),
    )
    try {
      const rotated = await rotateImageFile(target.file, 90)
      const newPreview = URL.createObjectURL(rotated)
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f
          URL.revokeObjectURL(f.previewUrl)
          return {
            ...f,
            file: rotated,
            previewUrl: newPreview,
            status: "pending",
            progress: 0,
            pathname: undefined,
            rotating: false,
            originalSize: rotated.size,
          }
        }),
      )
    } catch (e) {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, rotating: false } : f)),
      )
      toast.error("图片旋转失败，请重试")
    }
  }

  function onDragStart(idx: number) {
    dragItemRef.current = idx
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    const from = dragItemRef.current
    if (from === null || from === idx) return
    setFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      dragItemRef.current = idx
      return next
    })
  }

  async function uploadOne(item: UploadingFile): Promise<string | null> {
    // 第一步：客户端压缩。把任何尺寸的原图压到 ≤4MB / 长边 ≤2400px，再上传。
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "compressing", progress: 10 } : f)),
    )
    const original = item.file
    const toUpload = await compressImageForUpload(original)
    const compressed = toUpload !== original
    if (compressed) {
      console.log(
        "[v0] compress:",
        original.name,
        formatBytes(original.size),
        "→",
        formatBytes(toUpload.size),
      )
    }

    const form = new FormData()
    form.append("file", toUpload)
    form.append("scope", `submissions/${task.id}/${student.id}`)

    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 40 } : f)),
    )

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error || `upload failed (${res.status})`)
      }
      const data = await res.json()
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "done", progress: 100, pathname: data.pathname } : f,
        ),
      )
      toast.success(
        compressed
          ? `已压缩并上传：${original.name}（${formatBytes(original.size)} → ${formatBytes(toUpload.size)}）`
          : `图片上传成功：${original.name}`,
        { duration: 2000 },
      )
      return data.pathname
    } catch (e: any) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "error", progress: 0 } : f)),
      )
      toast.error(`图片上传失败：${original.name}（${e?.message ?? "未知错误"}）`)
      return null
    }
  }

  async function handleSubmit() {
    if (files.length === 0) {
      toast.error("请至少上传一张作业图片")
      return
    }
    setSubmitting(true)

    // 顺序上传，避免并发过多
    const pathnames: string[] = []
    for (const item of files) {
      if (item.status === "done" && item.pathname) {
        pathnames.push(item.pathname)
        continue
      }
      const p = await uploadOne(item)
      if (p) pathnames.push(p)
    }

    if (pathnames.length === 0) {
      toast.error("图片上传失败，请重试")
      setSubmitting(false)
      return
    }

    // 调用提交 API
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          imagePathnames: pathnames,
          note: note.trim(),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      toast.success("作业已提交至老师", {
        description: "正在前往提交结果页…",
        duration: 2000,
      })
      // Hard reload to flush RSC cache so the student inbox shows the new submission
      // when the user navigates back to /student.
      window.location.href = `/student/submitted/${data.submissionId}`
    } catch (e) {
      toast.error("提交失败，请重试")
      setSubmitting(false)
    }
  }

  const overdue = new Date(task.due_at).getTime() < Date.now()
  const allUploaded = files.length > 0 && files.every((f) => f.status === "done")

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/student" className="inline-flex">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
      </div>

      {/* 作业信息卡片 */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{task.subject}</span>
              <span>·</span>
              <span>{task.teacher_name}</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">{task.title}</h1>
          </div>
          {overdue ? (
            <Badge variant="destructive" className="shrink-0">
              已截止
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
              <Clock className="w-3 h-3 mr-1" />
              {formatDueDate(task.due_at)} 截止
            </Badge>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">作业要求</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.requirements}</p>
        </div>

        {task.notes ? (
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-1">
            <p className="text-xs font-medium text-primary">老师备注</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.notes}</p>
          </div>
        ) : null}
      </div>

      {/* 多图上传 */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">上传作业照片</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              支持拖动排序 · 单张可点旋转纠正方向 · AI 批改时还会自动校正
            </p>
          </div>
          <Badge variant="outline">{files.length} / {MAX_FILES}</Badge>
        </div>

        {/* 上传区 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            addFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer py-8"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium">点击或拖拽添加图片</p>
          <p className="text-xs text-muted-foreground">支持 JPG / PNG / WEBP / HEIC</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* 预览网格 */}
        {files.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {files.map((f, idx) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img src={f.previewUrl} alt={`第 ${idx + 1} 张`} className="w-full h-full object-cover" />

                {/* 顺序徽标 */}
                <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-foreground/80 text-background text-xs font-medium flex items-center justify-center">
                  {idx + 1}
                </div>

                {/* 旋转按钮：每点一次顺时针 90° */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    rotateFile(f.id)
                  }}
                  disabled={f.rotating || f.status === "uploading" || f.status === "compressing"}
                  className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-foreground/80 text-background flex items-center justify-center hover:bg-foreground transition-colors disabled:opacity-50"
                  aria-label="顺时针旋转 90°"
                  title="顺时针旋转 90°"
                >
                  {f.rotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                </button>

                {/* 拖拽手柄 */}
                <div className="absolute top-1.5 right-7 w-6 h-6 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(f.id)
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="删除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* 状态覆盖层 */}
                {f.status === "compressing" || f.status === "uploading" ? (
                  <div className="absolute inset-0 bg-foreground/40 flex flex-col items-center justify-center gap-1 text-background">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px]">
                      {f.status === "compressing" ? "压缩中…" : "上传中…"}
                    </span>
                  </div>
                ) : null}
                {f.status === "done" ? (
                  <div className="absolute bottom-1.5 left-1.5 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 备注 */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold">附加说明（选填）</h2>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：第 3 题不太确定，请老师重点看一下"
          maxLength={300}
          rows={3}
          className="resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right">{note.length} / 300</p>
      </div>

      {/* 提交按钮 */}
      <div className="sticky bottom-4 z-10">
        <div className="rounded-2xl border bg-card/95 backdrop-blur p-3 shadow-lg flex items-center gap-3">
          <div className="flex-1 text-xs text-muted-foreground">
            {files.length === 0
              ? "请至少上传 1 张图片"
              : allUploaded
              ? `已准备 ${files.length} 张图片`
              : `共 ${files.length} 张待上传`}
          </div>
          <Button
            size="lg"
            disabled={files.length === 0 || submitting}
            onClick={handleSubmit}
            className="gap-2 min-w-32"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                提交作业
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
