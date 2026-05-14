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
  /** 序号 1~4 */
  index: number
  /** 一句话标题（从"第N，xxx。"中抽出 xxx） */
  title: string
  /** 标题后的展开内容 */
  body: string
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
    const end =
      actionMark > firstMark
        ? actionMark
        : encMark > firstMark
          ? encMark
          : t.length
    const region = t.slice(firstMark, end)
    // 两种切分模式：
    //   cn:  第一，xxx。…  第二，yyy。…
    //   num: 第1题 xxx。…  第2题 yyy。…
    const re =
      problemPattern === "cn"
        ? /第([一二三四五六])[，,、：:]\s*([^。！]+[。！])\s*([\s\S]*?)(?=第[一二三四五六][，,、：:]|$)/g
        : /第([1-9１-９])题[，,、：:]?\s*([^。！；;]+[。！；;])\s*([\s\S]*?)(?=第[1-9１-９]题[，,、：:]?|$)/g
    let m: RegExpExecArray | null
    let order = 1
    while ((m = re.exec(region)) !== null) {
      const idxRaw = m[1]
      const idx =
        CN_NUMS[idxRaw] ??
        Number(idxRaw.replace(/[１-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))) ??
        order
      const title = m[2].replace(/[。！；;]\s*$/, "").trim()
      const body = m[3].trim()
      if (title) {
        problems.push({ index: idx, title, body })
        order += 1
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
