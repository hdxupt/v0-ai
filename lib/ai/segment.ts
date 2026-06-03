import "server-only"
import { callQwenJSON, qwenBoxToPercent, type QwenMessage } from "./qwen"
import type { RegionPct } from "@/lib/image/crop"

/**
 * 题目分块（Segmentation）
 *
 * 第一阶段：用 Qwen3-VL 把整页作业切成若干「题块」，并给每块分类。
 * 这是整个新链路的入口——后续按题型分流批改全靠它的输出。
 *
 * 分类口径（与批改分流一一对应）：
 * - objective：填空/选择/判断等客观题（定位需求低，LLM 直接批）
 * - math：数学大题/理科解题步骤（需精确定位错误步骤 → 裁剪后 VLM 定位）
 * - chinese_essay：语文作文/大段中文写作（长文本，OCR+LLM 省成本）
 * - english_essay：英语作文（需定位到错误词 → VLM 定位）
 * - other：无法归类（按客观题兜底处理）
 */

export type BlockType =
  | "objective"
  | "math"
  | "chinese_essay"
  | "english_essay"
  | "other"

export interface QuestionBlock {
  /** 题块序号（从 1 开始，分块阶段赋予） */
  index: number
  /** 题型分类 */
  type: BlockType
  /** 该题块在原图中的区域（百分比 [y,x,h,w]，0~100） */
  region: RegionPct
  /** 题号文本（如 "1"、"二、3"），可空 */
  label?: string
  /** 页码（0-based），多页时由调用方填入 */
  page_index: number
}

const SEGMENT_PROMPT = `你是作业批改系统的"题目分块"模块。请把这张作业图片切分成若干道独立的题目区域，并为每道题分类。

把整张图看成 1000×1000 的网格（左上角是原点，x 向右，y 向下）。

对每一道题，输出一个对象：
- "bbox_2d": [x1, y1, x2, y2]  —— 该题在 1000 网格里的左上角和右下角坐标，要紧贴这道题的完整区域（包含题干和学生作答）。
- "type": 从以下五选一：
   · "objective"      填空题/选择题/判断题等客观小题
   · "math"           数学大题、理科计算或证明、有解题步骤的题
   · "chinese_essay"  语文作文或大段中文写作
   · "english_essay"  英语作文或大段英文写作
   · "other"          其它无法归类
- "label": 题号（如 "1"、"三、2"），看不清就给空字符串。

要求：
1. 多道连续的同类客观小题（如填空 1~5），如果排版紧凑可以合并成一个 block，type=objective。
2. 数学大题必须每道单独成块，不要和别的题合并（后续要单独精确定位）。
3. 只框真实存在的题目，不要编造；框要尽量准、不要互相大面积重叠。
4. 严格只返回 JSON 数组，不要任何解释文字。格式：
[{"bbox_2d":[x1,y1,x2,y2],"type":"math","label":"1"}, ...]`

interface RawBlock {
  bbox_2d?: number[]
  type?: string
  label?: string
}

function normalizeType(t: string | undefined): BlockType {
  switch (t) {
    case "objective":
    case "math":
    case "chinese_essay":
    case "english_essay":
      return t
    default:
      return "other"
  }
}

/**
 * 对单页图片做分块。
 * @param imageDataUrl 整页图片的 data URL
 * @param pageIndex 页码 0-based
 * @returns 题块数组；失败抛错由调用方回退
 */
export async function segmentPage(
  imageDataUrl: string,
  pageIndex: number,
): Promise<QuestionBlock[]> {
  const messages: QwenMessage[] = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageDataUrl } },
        { type: "text", text: SEGMENT_PROMPT },
      ],
    },
  ]

  const raw = await callQwenJSON<RawBlock[] | { blocks?: RawBlock[] }>(messages, {
    temperature: 0,
    maxTokens: 1500,
  })

  const arr: RawBlock[] = Array.isArray(raw) ? raw : (raw?.blocks ?? [])
  const blocks: QuestionBlock[] = []
  let idx = 1
  for (const b of arr) {
    const region = qwenBoxToPercent(b.bbox_2d ?? [])
    if (!region) continue
    blocks.push({
      index: idx++,
      type: normalizeType(b.type),
      region,
      label: b.label?.trim() || undefined,
      page_index: pageIndex,
    })
  }
  return blocks
}
