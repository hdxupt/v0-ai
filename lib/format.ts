export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diff = (now - date.getTime()) / 1000 // seconds

  if (diff < 30) return "刚刚"
  if (diff < 60) return `${Math.floor(diff)} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function formatDueDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function getCountdown(iso: string): { text: string; urgent: boolean; overdue: boolean } {
  const target = new Date(iso).getTime()
  const now = Date.now()
  const diff = target - now
  if (diff <= 0) return { text: "已截止", urgent: false, overdue: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return { text: `还剩 ${days} 天`, urgent: days <= 1, overdue: false }
  if (hours > 0) return { text: `还剩 ${hours} 小时`, urgent: hours <= 6, overdue: false }
  const mins = Math.floor(diff / (1000 * 60))
  return { text: `还剩 ${mins} 分钟`, urgent: true, overdue: false }
}
