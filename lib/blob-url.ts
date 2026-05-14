/**
 * 把 blob pathname 转换为客户端可访问的 URL。
 *
 * - 私有 Blob store 的 blob.url 不能直接给浏览器使用
 * - 因此学生上传成功后我们只保存 pathname，渲染时再代理一层
 * - /api/file 会做登录校验然后从 Blob 读取流
 *
 * 也兼容历史数据：
 *   1. 已经是完整 URL（旧版 public store 时期保存过）→ 直接返回
 *   2. 任何 vercel-storage 公共 URL 也直接返回
 */
export function toFileSrc(pathnameOrUrl: string | null | undefined): string {
  if (!pathnameOrUrl) return "/placeholder.svg"
  // 已经是 http(s) URL，原样返回
  if (/^https?:\/\//i.test(pathnameOrUrl)) return pathnameOrUrl
  return `/api/file?pathname=${encodeURIComponent(pathnameOrUrl)}`
}
