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

/** 新链路：Qwen3-VL 分块+裁剪+视觉定位 */
export const NEW_RESULT = {
  score: 87,
  method: "VLM 分块 + 裁剪定位",
  boxes: [
    { type: "error", bbox: [24, 49, 6, 23], excerpt: "(1)中由S△OAB误用为½|AB|·|OM|", source: "vlm" },
    { type: "error", bbox: [32, 49, 5, 19], excerpt: "错误假设B为下顶点(0,−b)", source: "vlm" },
    { type: "partial", bbox: [37, 49, 5, 19], excerpt: "结果正确但推导跳步严重", source: "vlm" },
    { type: "missing", bbox: [48, 49, 3, 19], excerpt: "未说明 a=2,c=1 的隐含条件", source: "vlm" },
    { type: "error", bbox: [53, 49, 5, 23], excerpt: "代入椭圆方程时展开有误", source: "vlm" },
    { type: "highlight", bbox: [69, 49, 6, 23], excerpt: "坐标法设M,H,F计算向量，思路清晰", source: "vlm" },
  ] as ABBox[],
}
