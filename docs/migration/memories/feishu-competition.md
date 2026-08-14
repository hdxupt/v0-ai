# 飞书 AI 先锋未来人才大赛（希沃智教π赛道）

## 赛道：希沃智教π「不漏一题，不落一人」
- 核心要求：多学科(≥2科)支持 / 手写体识别 / 智能判分(含过程分) / 个性化评语 / 知识点薄弱分析
- 交付：可运行多学科批改 Demo + 批改样例展示(图片→结果+评语+薄弱点) + 技术说明文档(OCR方案/知识建模/评语策略)
- 时间：不到 4 天（2026-08-13 起算）

## 指导老师（黄世锋）核心意见
- 原卷留痕批改：在作答区直接标对错/打分，替代纯文档输出（点名要做）
- 双模式：有答案批改 + 无答案批改都要覆盖
- 边界场景差异化：字迹潦草、涂改、作答超区域、题目跨页跨栏
- 潦草字：短期=prompt强限制+多模型投票+深度思考；长期=小模型（老师自己也没说4天训模型）
- 呈现：控制篇幅、前后效果对比、截图/录屏/AI配音小视频

## 测试用例（三个zip，已解压分析过）
- 语文/数学/英语三科，各含 学生页(手写作答) + 教师页(印刷标准答案册,红字)
- 数学83页学生页=极难case：极潦草+演算涂鸦+背面透字+桌面杂物
- **关键发现：教师页就是标准答案 → 潦草识别可降维成"对照答案的匹配判断"而非开放转写**，正好接上已有的"教师上传标准答案"功能

## 已拍板决策（2026-08-13 用户确认）
1. **时间维度删除**：不再按"4天"排优先级，按质量做
2. **双对话并行**：本窗口走现有方案（算法+产品）；另开独立对话教用户亲手训垂直模型
3. **答案上传策略分级**（默认规则）：
   - 客观题：教师必须上传答案 → 模型直接对照答案判分，学生错了做专题解析
   - 数学主观大题：也需上传答案；没有也能批，但需注明"未提供答案，精确度受限"
   - 语文/英语主观题（翻译/作文等）：答案可选，有则适当参考，无则 AI 自建评定标准
4. **UI 大刀阔斧全面重做**（不只演示5页）：多参考 v0 和开源社区模板，目标是"最后的页面好看"
5. **原卷留痕方式**：留痕跟随学生作答位置，✓/✗/半对固定放在作答内容右侧/后面，不遮挡作答内容。评审页 /annotation-preview。**符号已定稿：方案 A 手写红笔**——✓/✗ 保持原样，半对号按用户上传参考图重绘（长尾对勾扬到右上角 + 一撇从左上斜穿勾尾），实现在 components/annotation-marks.tsx 的 HandHalf
6. 算法三件套（置信度分流+双模型投票+答案先验）方向未被否定，继续推进
7. 测试：用三zip建金标准测试集，学生页输入/教师页ground truth，按学科×题型×清晰度分层出准确率

## 实施进度（截至 2026-08-13 晚）
已完成（类型检查通过，留痕引擎已在 /annotation-preview 浏览器验证）：
1. **批改链路升级**（lib/ai/grade-vlm.ts）：每题块 prompt 新增 verdicts 输出——逐小题判定 correct/wrong/partial/unanswered + 作答区 bbox + 置信度 + 错题最短正确答案 + 半对得分文本；置信度 <0.6（lib/types.ts 的 VERDICT_CONFIDENCE_THRESHOLD）自动转 uncertain（"AI 知道自己不知道"，宁交老师不乱判）
2. **数据结构**（lib/types.ts）：AIQuestionVerdict / VerdictStatus / toQuestionVerdicts()；AIGradingV2 新增 question_verdicts、summary.partial_count/uncertain_count
3. **红笔留痕渲染引擎**（components/grading/red-pen-overlay.tsx）：按 verdicts 百分比坐标在原卷右侧渲染 ✓/✗+答案/半对+得分/uncertain 虚线圈，符号用定稿的方案 A（components/annotation-marks.tsx）；verdicts 自带 page_index 支持多页
4. **两端接入**：教师端 grading-image-viewer + 学生端 submission-result 的 ImageGallery（图库容器已改为贴合图片实际尺寸，修复百分比坐标错位）
5. **置信度分流教师闭环**（components/grading/uncertain-review-panel.tsx）：批改面板聚合 uncertain 题，教师一键裁决 对/错/半对（错可填正确答案、半对可填得分），裁决即更新原卷留痕+summary 计数，随"确认并发送"整卷保存（无需新 API，ai_issues 整体回传）

6. **批改结果页 UI 重做完成**（浏览器已验证向后兼容）：
   - 卷面主角化：讲台桌面点阵纹理 + 纸张 drop-shadow + ring 描边（grading-image-viewer.tsx）
   - 卷首红笔总分章 ScoreStamp：大分数+「分」+手写双下划线，微倾斜，仅第1页且有 verdicts 时显示
   - 图例双模式：有 verdicts 显示红笔语义（✓对/✗错附答案/半对附得分/待裁决蓝虚线圈）；旧数据回退旧图例
   - 控制面板新增 VerdictStats 逐题判定统计条（色块分段+计数）；文案已换血为 "Qwen3-VL · 原卷留痕 · 置信度分流"

7. **金标准实测完成（三学科真实 VLM 批改跑通）**，验证工具链：
   - dev-only 路由 /api/dev/test-grade?img=/samples/xxx.jpg&subject=math（生产 404，middleware 已放行 /api/dev）
   - 坐标验证页 /annotation-preview/live：真实 verdicts 叠加样卷原图，带数学/英语切换 tab
   - 样卷与实测数据在 public/samples/（math-83 / english-16 / chinese-57 + *-verdicts.json）
   - **实测结论：坐标质量非常好**——数学极潦草卷（83页）✗/半对+得分全部精确落在作答区旁；英语卷 13 判定坐标全部精确（截图确认）
   - 实测发现并已修复三个链路 bug：(a) maxTokens 3200→4500（verdicts 输出致截断）；(b) dedupeVerdicts 重叠判定用 max(IoU, 交集/小框面积)≥0.6 + 丢弃退化框(h或w<0.5%)；(c) prompt 加"栏目标题/页眉不输出 verdict、同题不重复"
   - 遗留观察：英语卷两次跑分 86 vs 99 差异大（第9题两次都判错=真错；波动来自小题级 correct/wrong 翻转），temperature=0 下仍有采样波动 → 后续可考虑客观题双跑投票；语文卷 23 判定含少量栏目噪声判定已由清洗过滤

8. **全平台 UI 大改完成（本窗口，全部浏览器验证）**：
   - 全局中文字体：layout.tsx 加 Noto Sans SC（400/500/700），globals.css font-sans 栈 Geist 在前汉字回退 Noto Sans SC
   - 登录页重设计（login-card.tsx）：点阵纸张背景；主标题"每一份作业/都被认真对待"+红笔手写下划线 SVG（品牌签名）；ProofStat 数字证明条 96.74%/¥0.08/12×（极客杯口径，飞书赛实测后记得更新）；暗色模式已验证
   - 看板 KPI 卡（kpi-cards.tsx）：比率指标底部 3px 完成度进度条；徽章"AI 驱动"→"原卷留痕批改"
   - 任务表格（task-table.tsx）：subjectColor() 学科识别色点（数学chart-1/语文chart-5/英语chart-3，跨页面可复用）
   - **修复评语 Markdown 星号 bug**：学生端教师评语 renderInlineBold()（submission-result.tsx）+ whitespace-pre-line 恢复换行；parse-ai-comment.ts 解析前剥掉 **加粗**/#标题 记号——之前评语是一坨带星号的文字墙，现在是干净编号分段
   - 学生端结构巡检通过（设备框+收件箱+成长趋势），死代码 score-hero.tsx 未动

9. **修复双重标注 bug（用户发现）**：有 verdicts 时旧版标签/波浪线曾与红笔 ✓/✗ 同时叠在卷面。修复：教师端 grading-image-viewer visibleBoxes 加 !hasVerdicts 条件；学生端 ImageGallery annotations 加 verdicts.length === 0 条件。规则=**有红笔留痕则旧标记完全退出卷面，批改细节保留在右侧明细/下方列表**；旧数据（无 verdicts）仍走旧标记，向后兼容。已用真实卷（36edab52，12 verdicts+11 details）浏览器验证

10. **文本生成全链路切 DashScope Qwen + 修复三处断链（2026-08-14/15 本窗口，全部实测验证）**：
   - **AI Gateway 免费额度已限流**（openai/gpt-5-mini 报 rate limit），ANTHROPIC key 组织被禁用 → 文本生成（评语/报告三件套/教研助手/变式练习）全部切 `dashscope/qwen-plus`，走 `@ai-sdk/openai-compatible` 直连百炼 compatible-mode（lib/ai/gateway.ts 的 getDashScopeClient + resolveModel 识别 dashscope/ 前缀）
   - **版本坑：必须装 `@ai-sdk/openai-compatible@2.0.67`**（用 provider 3.x，匹配项目 ai@6）；3.0.x 用 provider 4.0 类型不兼容。且**本项目是 pnpm，npm install 会报 workspace:* 错误**
   - **教研助手不调工具的根因**：教师 `user.class_id` 恒为 null（教师带多班），导致 chat 路由 tools 传 undefined、快照拿不到班级 → 已加 resolveTeacherClassId()（取 classes 表第一个班，与看板一致）
   - **DashScope JSON 模式三连坑**：(a) prompt 必须显式含"JSON"字样否则 400（已在 BASE_OUTPUT_CONTRACT 加，勿删）；(b) json_object 模式看不到 schema，字段名全靠 prompt 写死（报告 score_distribution 四档、练习题逐字段清单都已写进 prompt）；(c) `generateObject` 绕过 zod 的 z.preprocess → 兜底模式=catch 里取 `e.cause.value` 手动 schema.safeParse()（报告端点 + practice.ts 均已加；grade.ts 早有同款）
   - 练习超时放宽：PRACTICE_TIMEOUT_MS 110s、路由 maxDuration 120（qwen-plus 出 3 题实测 40~60s）
   - 报告"三件套"其实共用一个端点 `/api/reports/[taskId]/generate`（kind 参数被忽略），修一处全活
   - 顶栏升级 + 账号设置对话框已接线（user-menu.tsx → account-settings-dialog.tsx，头像颜色落库 /api/auth/profile）
   - 实测全通过：评语改写 ✓ / 教研助手真实调工具 ✓ / 诊断报告 schema 匹配 ✓ / 学生端变式练习出题渲染 ✓

待办（TodoManager 同步）：
- 可选：客观题双模型/双跑投票（英语卷 86→99 波动问题）
- 可选：ProofStat 三个数字待飞书赛实测口径更新

调试信息（省时间）：
- 演示账号：教师 t1/t2 密码 teacher123，学生密码 student123（login-card.tsx）
- 查数据直接用 Supabase REST：node --env-file-if-exists=/vercel/share/.env.project + fetch SUPABASE_URL/rest/v1/...（本地没装 pg 包）
- 批改工作台路由 /dashboard/grading/[submissionId]
- 沙箱截图中文显示方块是缺 CJK 字体，非应用 bug

## 垂直批改模型训练（独立对话线，截至 2026-08-13 深夜）
任务定位：**对照答案判对错**（输入=作答区截图+标准答案文本，输出=JSON{作答内容,判定 对/错/半对/无法识别}）。目标是打败基座模型出对比表，**答辩口径绝不说"超过商用API"**，说"相当水平+口径可控+可私有化+随教师修正进化"。

环境（已就绪）：
- AutoDL 西北B区 964机，RTX 4090 24G，¥1.98/时，镜像 PyTorch 2.x + Python 3.12 + Ubuntu 22.04
- ms-swift 4.4.2 已装（验证用 `pip show ms-swift`，`swift --version` 不支持会报 KeyError）+ qwen-vl-utils + modelscope
- 底座 **Qwen3-VL-8B-Instruct 已下载完** → /root/autodl-tmp/qwen3-vl-8b
- 坑1：下载 ModelScope 时必须关学术加速（`unset http_proxy && unset https_proxy`），开着只有 600kB/s，关掉快十倍
- 坑2：用户曾把 ```shellscript 标记复制进终端报 command not found，给命令只给纯命令行
- 操作方式：JupyterLab 网页终端，所有文件放 /root/autodl-tmp/（数据盘），不用时关机省钱

**✅ 最小闭环已跑通（2026-08-14 00:17）**：8 条真实标注数据，Train 4/4，loss 1.712→1.173，LoRA 21.8M 可训练(0.2483%)，显存峰值 19.12GiB/24G，checkpoint 落在 /root/autodl-tmp/output/v2-20260814-001655/checkpoint-4

可用命令（4.4.2 实测版）：
```
swift sft --model /root/autodl-tmp/qwen3-vl-8b --model_type qwen3_vl --dataset /root/autodl-tmp/data/train.jsonl --lora_rank 8 --lora_alpha 32 --learning_rate 1e-4 --num_train_epochs 2 --per_device_train_batch_size 1 --gradient_accumulation_steps 4 --gradient_checkpointing true --max_length 2048 --output_dir /root/autodl-tmp/output --save_steps 50
```
新增踩坑：
- 坑3：**必须加 `--model_type qwen3_vl`**，否则报 Failed to automatically match model_type（qwen3_vl/emb/reranker 三选一）
- 坑4：**不能写 `--train_type lora`**，4.4.2 不认此参数会报 remaining_argv；给 lora_rank 即走 LoRA
- 坑5：Mac 文本编辑器存 train.jsonl 会变成 train.jsonl.txt，要 mv 改名
- 坑6：swift infer 交互多轮后可能抛 TypeError: TextEncodeInput（CLI 分词 bug，无害，不影响训练）
- 坑7：decord WARNING 是视频库缺失，忽略
- 数据格式已验证：`{"messages":[{"role":"user","content":"<image>标准答案是：X。请识别学生作答内容并判定对错，以JSON格式输出。"},{"role":"assistant","content":"{\"作答内容\":\"..\",\"判定\":\"对\"}"}],"images":["/root/autodl-tmp/data/images/img01.jpg"]}`；后缀必须与真实文件一致（模型本身不关心图片格式，Pillow 什么都能读）
- 切分粒度已确认：**一空一图**（7 个填空切 7 张），和线上按题块判定的使用粒度一致
- 主观数学题输出改为 得分/满分/评语 且输入需带评分标准，但**第一版模型不混主观题**，答辩说"下一阶段"

**✅ 训练数据标注流水线已建成（2026-08-14，本窗口）**
判定口径已定稿：**对/错/半对/无法识别**；边界（只写一个义项、漏部分内容）**算半对**。

- **重要纠正**：数据库里**没有**"教师逐题修正"数据。`teacher_comment` 只是整卷自由文本，`question_verdicts` 虽有 22 条但 0 条带教师裁决标记、且缺 correct_answer 文本无法构成完整样本。**唯一可用的真实数据源是 `ai_issues.correction_details`**（AI 自己的判定，当预标注用）。
- **本窗口 VM 的代码不含 verdicts 功能**（红笔留痕那条线在另一个对话窗口/分支，此 VM 文件较旧）。不影响标注线，因为它只依赖 correction_details。
- 线上实际数据：21 份 graded 提交 → 254 条 correction_details → **205 条含标准答案**（49 条缺 correct_answer 已按决定丢弃）

### ⚠️ 裁图方案已推翻重做（v1 作废，用 v2）
**v1 直接用 `bounding_box` 裁图 → 205 张全部错位**（实测："in the future" 那条裁出 `or me to lea`，左右切断且位置都不对）。
根因：**190/205 的坐标是 VLM 目测估的**（`box_source` 分布：vlm 127 / 无标记 63 / **ocr 仅 15**）。项目有两条批改链路——`lib/ai/grade.ts` 用 OCR 行号定位（可靠），`lib/ai/grade-vlm.ts` 让模型自己猜坐标（`line_indexes:[1]` 是占位符、`ocr_data:null`）。**加 padding 治不了，必须换定位方式。**

**v2 方案（已实测有效）：不信 bbox，改用文字内容定位**
1. 重跑腾讯 OCR 拿**行级真实坐标**（`lib/ocr/tencent.ts` 已有能力，线上 0 份提交存了 ocr_data 所以必须重跑，约 3-5 分钟/全量）
2. 用 `question_text`（里面就是学生原句）去 OCR 行文本里**滑动窗口模糊匹配**（LCS 相似度），命中哪几行就裁哪几行的**完整行并集** → 天生不会切在半个词上，且完全不受错误坐标影响
3. `refineLines()` 收窄：以最像 query 的行为锚，只保留**同栏 + 纵向邻近**的连续行（数学卷双栏排版，不加这步会裁出 475x1590 的跨栏巨图）
4. 三级兜底：`text`（文字匹配，最可信）→ `line`（bbox 命中的行）→ `snap`（bbox 吸附到重叠行）
5. 自动分级 + 丢弃脏样本：
   - **丢弃**：跨栏巨图（h>45% 或 w>92%且h>25%）、**纯印刷题干**（内容<15字且以"(1)"类小问序号开头 → 数学卷 question_text 是转述，会匹配到印刷的「(1)求椭圆方程.」，裁出来一个字作答都没有）、内容<4字
   - **good**：text 定位 + 相似度≥0.75 + 内容≥15字 + ≤5行
   - **review**：其余（多为数学手写演算区，位置可能偏，界面排后面并提示"看原卷核对"）

**v2 实测结果：205 → 入库 165 条（good 70 / review 95），丢弃 40 条**；定位方式 text 102 / snap 53 / line 10。英语作文那条已验证裁出完整 4 行手写、人眼可读。

新增资产：
- 表 `label_samples`（Supabase，已启 RLS）：crop_url / correct_answer / question_text / ai_type / ai_analysis / **label** / **student_answer** / labeled_at / **quality** / locate_method / locate_score / matched_text / line_count，唯一键 (submission_id, detail_index)
- `scripts/build-label-samples-v2.mjs`：**当前唯一应使用的裁图脚本**。`--probe --samples=N` 只裁样例到 /tmp/agent-browser/crops 供肉眼检查（不写库），无参数则全量入库。幂等可重跑
- `scripts/build-label-samples.mjs`（v1，已作废，勿用）
- `/label` 页面（仅教师，components/label/label-workspace.tsx）：题块图 + 预填标准答案 + 可选补录学生作答；**键盘 1=对 2=半对 3=错 4=无法识别**，自动跳下一条，乐观更新，进度条+分布统计，自动定位到第一个未标注项
- `/api/label`（GET 拉取 / PATCH 保存单条）、`/api/label/export`（导出 train.jsonl，图片路径写死 /root/autodl-tmp/data/images/label-<id>.jpg）、`/api/label/export?mode=urls`（下载清单「URL 文件名」，**在 AutoDL 上 wget 直接从 Blob 拉图，不经用户 Mac 中转**）
- 导出格式与最小闭环那 8 条手写样本完全一致，可直接进同一条 swift sft 管道（已实测导出内容正确）

**数据质量已知偏差（务必注意）**：
1. correction_details 只记录扣分点和亮点，**不记录"平平做对"的题块** → type 分布 error 161/highlight 57/partial 28/missing 8，直接训会让模型**倾向判错**。"对"类样本必须靠手写字体合成精确配比补上
2. **切分粒度实际是"整行/整段"而非"一空一图"**（v2 按 OCR 完整行裁）。英语作文这样反而更好（错误处有上下文），但和线上"按题块判定"的粒度不完全一致，答辩不要说"一空一图"
3. AI 原判定的 highlight/missing 与"对/错/半对/无法识别"不是一对一，标注时以人眼为准，界面里 AI 判定只作参考展示
4. `question_type` 126/205 是空的（旧数据没这字段），**不能用它筛题型**，只能靠几何+匹配质量分级

踩坑记录（本轮新增）：
- 坑8：新版 pg 会让连接串里的 `sslmode=require` 覆盖 `ssl:{rejectUnauthorized:false}`，报 self-signed certificate → 把连接串改成 `sslmode=no-verify`
- 坑9：ESM 脚本（.mjs）不认 NODE_PATH → 别装临时包，直接用项目已有的 `@supabase/supabase-js` 写库（service role 自动绕过 RLS）
- 坑10：旧提交的 `image_urls` 存的是 blob **pathname 而非完整 URL**（21 条旧 / 7 条新），fetch 会报 Failed to parse URL → 用 `list()` 取一条推断域名 origin 再拼接
- 坑11：`submissions` 表**没有 created_at 字段**，select 里带上会直接报错
- 坑12：**AI 生成的 bounding_box 不可信**（VLM 目测估坐标）。任何需要精确裁图/定位的功能都不能直接用它，必须用 OCR 行坐标 + 文字内容匹配
- 坑13：`ai_issues.correction_details[].question_text` 对英语是**学生原句**（可直接文字匹配），对数学是**转述**（"题1(1)等腰直角三角形求椭圆方程"），匹配会命中印刷题干而非手写解答 → 必须过滤纯题干样本
- 坑14：改表结构用 Supabase MCP（`supabase_execute_sql`）最省事；项目里**没装 pg 也没有 psql**，别浪费时间装

**下一步（Day 2 剩余）**：
1. ~~最小闭环~~ 已完成
2. ~~导出教师修正数据~~ 已完成（结论：不存在教师修正数据，改用 AI 预标注）
3. ~~裁图~~ 已完成（v1 全错位 → v2 重做，165 条可用）
4. **用户人工过 /label 的 165 条**（good 70 条排前面质量最好，review 95 条排后面）。建议至少标完前 70 条 good
4. 写手写字体合成脚本（用户在收集免费商用手写字体），Mac 上跑出 1000-3000 条
5. 晚上合并转 JSONL（测试集只用真实数据 10-15%）→ 启动正式训练过夜（整夜不关机）
6. 用户睡前作业：写完判定口径（对/错/半对/无法识别 的边界规则，如"4分之3"vs"3/4"、漏单位）

Day 3：评估出"基座 vs 微调 vs API"对比表 + 单独统计格式合法率/口径一致率（必赢维度），下午留重训余量。

## 用户协作偏好（本比赛期间）
- 可以尽情质疑其判断，但别每个决定都要确认
- 重要回复末尾加"最需要我关注的三点内容"
- 记忆常更新；同窗口重交互约15-20轮后主动建议换新对话窗口
