import type { ViewerBox } from "@/lib/types"

type MarkerType = ViewerBox["type"]

/** 按批注类型取一个具体的十六进制颜色（SVG data URI 不能用 CSS 变量，必须烘焙具体色值）。 */
export function markerHex(type: MarkerType): string {
  switch (type) {
    case "error":
      return "#dc2626" // red-600
    case "missing":
      return "#6b7280" // gray-500
    case "partial":
    case "warning":
      return "#f59e0b" // amber-500
    case "highlight":
      return "#10b981" // emerald-500
    default:
      return "#dc2626"
  }
}

/**
 * 行级波浪下划线——主观题/解答题出错位置的轻量标注，替代沉重的矩形框。
 * 贴在 bbox 底部，横向平铺，密度恒定（不随宽度拉伸变形）。
 */
export function WavyUnderline({ type, active }: { type: MarkerType; active?: boolean }) {
  const color = markerHex(type)
  const strokeWidth = active ? 2.2 : 1.6
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='6' viewBox='0 0 14 6'><path d='M0 4 Q3.5 0.5 7 4 T14 4' fill='none' stroke='${color}' stroke-width='${strokeWidth}' stroke-linecap='round'/></svg>`
  const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 right-0 pointer-events-none transition-all"
      style={{
        bottom: -3,
        height: 6,
        backgroundImage: uri,
        backgroundRepeat: "repeat-x",
        backgroundPosition: "left bottom",
        backgroundSize: "14px 6px",
        opacity: active ? 1 : 0.9,
      }}
    />
  )
}
