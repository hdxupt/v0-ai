// 真实作业 A/B 对比素材（数据来自同一份数学作业的两条批改链路实跑结果）
// 旧链路：OCR+LLM（行框求并集）；新链路：Qwen3-VL 分块+裁剪+视觉定位
// 硬编码为静态数据，保证演示稳定（不依赖 DB / 鉴权 / 实时批改超时）

export type ABBox = {
  type: "error" | "partial" | "highlight" | "missing"
  bbox: [number, number, number, number] // [y, x, h, w] 百分比
  excerpt: string
  source?: "ocr" | "vlm"
}

export const AB_IMAGE = "/images/ab-math-sample.jpg"

export const AB_TITLE = "椭圆综合题（两栏解答）"

/** 旧链路：OCR+LLM，坐标绑定 OCR 行框 */
export const OLD_RESULT = {
  score: 82,
  method: "OCR 行框求并集",
  boxes: [
    { type: "highlight", bbox: [33, 0, 9, 76], excerpt: "△POC为等腰直角三角形，∴P(a/√2,a/√2)" },
    { type: "error", bbox: [44, 2, 6, 48], excerpt: "3c²=2a²，∴e=√2/3=1/3 —— 化简错" },
    { type: "highlight", bbox: [66, 2, 8, 89], excerpt: "AB中点为圆心(1,-1)，∴x1+x2=6k(k+1)/(3k²+1)" },
    { type: "partial", bbox: [76, 2, 14, 37], excerpt: "b²=10/3，∴a²=10，椭圆方程为x²/10+y²/(10/3)" },
    { type: "error", bbox: [79, 54, 13, 39], excerpt: "BF·HF=(...)·(1, k-...) 向量运算" },
    { type: "partial", bbox: [89, 57, 6, 9], excerpt: "k=± —— 答案断尾，未写完整" },
  ] as ABBox[],
}

/** 新链路：Qwen3-VL 分块+裁剪+视觉定位（左右两栏全覆盖，13 框） */
export const NEW_RESULT = {
  score: 77,
  method: "VLM 分块 + 裁剪定位",
  boxes: [
    // 左栏（第1题）：7 框
    { type: "missing", bbox: [26, 1, 3, 10], excerpt: "(1)未验证△POC几何条件", source: "vlm" },
    { type: "error", bbox: [37, 3, 3, 22], excerpt: "|OC|应为a（C为右顶点）", source: "vlm" },
    { type: "error", bbox: [40, 3, 3, 22], excerpt: "符号混乱：α误写为a", source: "vlm" },
    { type: "highlight", bbox: [54, 3, 3, 35], excerpt: "联立消元、系数推导正确", source: "vlm" },
    { type: "partial", bbox: [60, 3, 3, 35], excerpt: "判别式对，但未代入b²=10/3", source: "vlm" },
    { type: "error", bbox: [66, 3, 3, 35], excerpt: "x₁+x₂解得k²=1 计算有误", source: "vlm" },
    { type: "error", bbox: [72, 3, 3, 35], excerpt: "弦长公式套用错误", source: "vlm" },
    // 右栏（第2题）：6 框
    { type: "missing", bbox: [41, 55, 3, 17], excerpt: "未回代验证 S△OAB=√3", source: "vlm" },
    { type: "error", bbox: [44, 55, 3, 17], excerpt: "①式 |AB|=√(α²+b²) 写错", source: "vlm" },
    { type: "highlight", bbox: [50, 55, 3, 28], excerpt: "正确求出直线过定点(2,0)", source: "vlm" },
    { type: "error", bbox: [57, 55, 3, 28], excerpt: "韦达定理 x₁+x₂ 代入错误", source: "vlm" },
    { type: "error", bbox: [68, 55, 2, 17], excerpt: "MH垂线关系判断错误", source: "vlm" },
    { type: "partial", bbox: [77, 55, 5, 28], excerpt: "向量BF计算方向基本对", source: "vlm" },
  ] as ABBox[],
}
