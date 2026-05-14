/**
 * 把 AI 生成的整段 ai_comment 文本拆解成结构化片段，
 * 便于前端按"开头-问题-行动-鼓励"分块展示。
 *
 * AI 端目前返回的是单一字符串（schema teacher_comment ≤ 1200 字、不允许换行），
 * 但行文遵循固定结构：
 *   开头寒暄 + 承接句 + (第一 / 第二 / 第三 ...) + 建议 ... + 鼓励 ...
 * 这里用宽松正则切分；切不到的部分降级为单段 greeting 显示，绝不丢字。
 */

export interface AiCommentProblem {
  /** 序号 1~6（中文序号或题号） */
  index: number
  /** 一句话标题 */
  title: string
  /** 标题后的展开内容 */
  body: string
  /** "issue" = 待改进，"highlight" = 亮点（默认 issue） */
  kind: "issue" | "highlight"
}

const POSITIVE_WORDS = [
  "做得非常棒",
  "做得棒",
  "做得好",
  "非常好",
  "完全正确",
  "正确",
  "掌握得很好",
  "清晰",
  "优秀",
  "扎实",
  "熟练",
  "值得肯定",
  "处理得很漂亮",
  "推导得很到位",
]
const NEGATIVE_WORDS = [
  "错误",
  "混淆",
  "遗漏",
  "缺少",
  "没有",
  "不够",
  "不严谨",
  "暴露",
  "跳跃",
  "出错",
  "划掉",
  "丢分",
  "未给出",
  "导致",
  "问题",
  "盲点",
  "薄弱",
]

function detectKind(text: string): "issue" | "highlight" {
  // 任一负面词出现 → issue；没有负面词且有正面词 → highlight；否则 issue
  for (const w of NEGATIVE_WORDS) if (text.includes(w)) return "issue"
  for (const w of POSITIVE_WORDS) if (text.includes(w)) return "highlight"
  return "issue"
}

export interface AiCommentStructured {
  /** 寒暄/总体认可 */
  greeting: string
  /** 三类核心问题 */
  problems: AiCommentProblem[]
  /** 行动建议（"建议接下来…"后的内容） */
  action: string
  /** 收尾鼓励（"相信…"/"最后…"/"加油…"） */
  encouragement: string
  /** 解析是否命中结构（false 时降级渲染） */
  parsed: boolean
}

const CN_NUMS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
}

export function parseAiComment(raw: string | null | undefined): AiCommentStructured {
  const empty: AiCommentStructured = {
    greeting: "",
    problems: [],
    action: "",
    encouragement: "",
    parsed: false,
  }
  if (!raw) return empty

  // 把所有空白塌缩成单空格，方便后续切片
  const t = raw.replace(/\s+/g, " ").trim()
  if (!t) return empty

  // ---------- 1. 定位三大锚点 ----------
  // 找"第一"出现的第一个位置作为问题起点（优先用一/二/三，缺失时降级到题号"第1题"）
  let firstMark = t.search(/第一[，,、：:]/)
  let problemPattern: "cn" | "num" = "cn"
  if (firstMark < 0) {
    const numIdx = t.search(/第[1１]题[，,、：:]/)
    if (numIdx >= 0) {
      firstMark = numIdx
      problemPattern = "num"
    }
  }
  // 行动建议的起点：常见短语
  const actionMark = t.search(
    /(?:建议(?:接下来|你)?这样做|建议接下来|建议[：:]\s*每天|建议(?:制作|你)?(?:制作|准备)|可以这样改进|后续(?:可以|建议))/,
  )
  // 鼓励收尾的起点
  const encMark = t.search(/(?:相信(?:下次|你)|最后想对你说|你的思路框架已经|加油[!！。，,]|这两个基础彻底)/)

  // ---------- 2. greeting ----------
  let greetingEnd = firstMark > 0 ? firstMark : t.length
  if (firstMark < 0 && actionMark > 0) greetingEnd = actionMark
  if (firstMark < 0 && actionMark < 0 && encMark > 0) greetingEnd = encMark

  let greeting = t.slice(0, greetingEnd).trim()
  // 砍掉末尾的承接句，如"但目前存在三个核心问题需要重点突破："
  greeting = greeting
    .replace(
      /[。！]?\s*但?目前?(?:还)?存在[^。]*核心问题[^。]*[:：，,]?\s*$/,
      "",
    )
    .replace(/[。！]?\s*但?(?:还有|存在)[^。]{0,30}问题[^。]{0,10}[:：，,]?\s*$/, "")
    .replace(/[，,、：:]\s*$/, "")
    .trim()
  if (!greeting.endsWith("。") && !greeting.endsWith("！") && greeting.length > 0) {
    greeting += "。"
  }

  // ---------- 3. problems ----------
  const problems: AiCommentProblem[] = []
  if (firstMark >= 0) {
    // num 模式下，问题描述里常包含嵌入式"建议..."短句，不能用 actionMark 切，
    // 必须等到 encMark 才结束；最后用"剥离尾段 action"的方式处理。
    let end: number
    if (problemPattern === "num") {
      end = encMark > firstMark ? encMark : t.length
    } else {
      end =
        actionMark > firstMark
          ? actionMark
          : encMark > firstMark
            ? encMark
            : t.length
    }
    const region = t.slice(firstMark, end)
    if (problemPattern === "cn") {
      // 第一，xxx。…  第二，yyy。…
      const re = /第([一二三四五六])[，,、：:]\s*([^。！]+[。！])\s*([\s\S]*?)(?=第[一二三四五六][，,、：:]|$)/g
      let m: RegExpExecArray | null
      let order = 1
      while ((m = re.exec(region)) !== null) {
        const idxRaw = m[1]
        const idx = CN_NUMS[idxRaw] ?? order
        const title = m[2].replace(/[。！]\s*$/, "").trim()
        const body = m[3].trim()
        if (title) {
          problems.push({ index: idx, title, body, kind: detectKind(body || title) })
          order += 1
        }
      }
    } else {
      // num: 用"第N题"作为分段锚点，找所有出现位置后再切片
      const anchors: Array<{ idx: number; pos: number }> = []
      const aRe = /第([1-9１-９])题/g
      let am: RegExpExecArray | null
      while ((am = aRe.exec(region)) !== null) {
        const raw = am[1]
        const idx = CN_NUMS[raw] ?? Number(raw.replace(/[１-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
        anchors.push({ idx, pos: am.index })
      }
      for (let i = 0; i < anchors.length; i++) {
        const segStart = anchors[i].pos
        const segEnd = i + 1 < anchors.length ? anchors[i + 1].pos : region.length
        const seg = region.slice(segStart, segEnd).trim()
        // 标题：截到首个 。：:！；; 之前，作为概括句
        const titleMatch = seg.match(/^第[1-9１-９]题[^。：:！；;]*[。：:！；;]?/)
        let title = titleMatch ? titleMatch[0].replace(/[。：:！；;]\s*$/, "").trim() : `第${anchors[i].idx}题`
        const body = titleMatch ? seg.slice(titleMatch[0].length).trim() : seg
        // 题号已在 idx 里展示，标题去掉冗余前缀
        title = title.replace(/^第[1-9１-９]题\s*/, "")
        if (!title) title = `第${anchors[i].idx}题分析`
        problems.push({ index: anchors[i].idx, title, body, kind: detectKind(`${title}。${body}`) })
      }
    }
  }

  // ---------- 4. action ----------
  let action = ""
  if (actionMark >= 0) {
    const end = encMark > actionMark ? encMark : t.length
    action = t.slice(actionMark, end).trim()
    // 去掉"建议接下来这样做："这种前缀，让内容更纯净
    action = action
      .replace(/^(?:建议(?:接下来|你)?这样做[:：]?\s*)/, "")
      .replace(/^(?:建议[：:]\s*)/, "")
      .trim()
  }

  // ---------- 5. encouragement ----------
  let encouragement = ""
  if (encMark >= 0) {
    encouragement = t.slice(encMark).trim()
  }

  const parsed = problems.length > 0 || (action.length > 0 && greeting.length > 0)

  // 完全无法解析时退化为单 greeting
  if (!parsed) {
    return { greeting: t, problems: [], action: "", encouragement: "", parsed: false }
  }

  return { greeting, problems, action, encouragement, parsed: true }
}
