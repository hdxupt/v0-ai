/**
 * 统一用东八区（Asia/Shanghai）展示日期，避免 SSR(UTC) 与浏览器(+08:00) 的 hydration mismatch。
 * 所有显式的日期/时间格式化都走 Intl.DateTimeFormat 并指定 timeZone。
 */
const SH = "Asia/Shanghai"

const monthDayHourMinute = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SH,
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const monthDay = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SH,
  month: "numeric",
  day: "numeric",
})

function partsOf(date: Date) {
  const parts = monthDayHourMinute.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value
  return map // { month, day, hour, minute }
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diff = (now - date.getTime()) / 1000 // seconds

  if (diff < 30) return "刚刚"
  if (diff < 60) return `${Math.floor(diff)} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return monthDay.format(date)
}

export function formatDateTime(iso: string): string {
  const p = partsOf(new Date(iso))
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`
}

export function formatDueDate(iso: string): string {
  const p = partsOf(new Date(iso))
  return `${p.month}月${p.day}日 ${p.hour}:${p.minute}`
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
