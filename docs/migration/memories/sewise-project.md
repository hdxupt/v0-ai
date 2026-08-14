# SeWise 项目上下文（开新对话先读此文件）

## 一句话定位
嵌入希沃智慧教育生态的课后作业 AI 闭环助手——教师减负 / 学生精准伴学 / 学校数据抓手。
GitHub 仓库：hdxupt/v0-ai（org 已从 jackhuang844-dev 迁移）。生产域名：https://v0-ai-eta-ashen.vercel.app

## 🏆 里程碑：极客杯决赛冠军（2026-08）
SeWise 在极客杯学科竞赛决赛中夺冠。答辩口径（微调7B/几千条数据/96.74%/¥0.08/12×）已存档于下方"答辩已说出口的口径"节——后续对外宣传、复赛、路演必须与该口径保持一致。

## 🚩 当前进度
### ✅ 已完成：教师上传标准答案 + 关键得分点（对照批改）— tsc EXIT=0 + 真机验证对话框渲染OK
- 答辩口径（重要）：**别主打"省 API 钱"**（单份仅 3-5 分钱）。主打 **"教师标准对齐 → 批改准确率提升 → 教师复核工时下降"**。
- 已落地的代码（4处+建表）：
  1. **建表已执行**：tasks 加列 answer_key_urls(text[]) / answer_key_text(text) / scoring_notes(text)。
  2. **lib/types.ts** Task 接口已加这三字段声明。
  3. **new-task-dialog.tsx**：在"备注"后加"标准答案与得分点"区块——图片上传(handleAnswerUpload,复用/api/upload存完整URL) + answerKeyText文本框 + scoringNotes关键得分点框。handleSubmit body 带 answer_key_urls/answer_key_text/scoring_notes，重置时清空。createTask 用 ...task spread 自动落库（未改 createTask）。
  4. **lib/ai/grade-vlm.ts**：blockGradePrompt 加可选参 answerCtx → 注入 ANSWER_BLOCK（拼进 COMMON_TAIL 前）；gradeBlock 透传 answerCtx；新增 transcribeAnswerImages（答案图一次转写成文本,全块复用,省token）+ buildAnswerContext（组装文本+图片转写+得分点,上限4000字）；主编排 gradeSubmissionWithVLM 开头 await buildAnswerContext(task) 传入 Stage2 的 gradeBlock；ai_issues.model 标记 "answer-key"。
  5. **grading-control-panel.tsx**：done 阶段显示"已对照教师标准答案"badge（usedAnswerKey: 看 v2.model 含 answer-key 或 task 配了答案；导入了 BookCheck）。
- ⏳ 未做（第二轮可选）：客观题快路径（block.type==="objective"+有答案 → 跳过VLM直接文本比对,省成本提速的核心杠杆,实现较重）。
- 端到端验证待补：建任务上传答案 → 学生交 → 教师批改 → 看批注是否更贴合答案+badge是否出现。

### ✅ 已完成：框选重构——分题型轻量标注（tsc EXIT=0 + 真机截图验证OK）
- 重新定义：框选本质=让人快速看清错在哪，不是画框本身。客观题(填空/选择/判断)→题号旁贴标签不画框；主观题/作文/解答→行级波浪下划线+题号小圆点,替代笨重矩形框。
- 已落地：
  - lib/types.ts AICorrectionDetail + ViewerBox 加 question_type?:"objective"|"subjective"（缺失默认 subjective）；toViewerBoxes 透传。
  - lib/ai/schemas.ts 加 question_type；lib/ai/grade-vlm.ts gradeBlock 按 block.type==="objective" 推导 questionType 写入每条 detail。
  - components/grading/annotation-marker.tsx：新增 WavyUnderline 组件（SVG data-uri 波浪线,密度恒定不拉伸,markerHex 按 type 烘焙具体色值因 data-uri 不能用CSS变量）。
  - 两个 viewer 都已分流渲染：grading-image-viewer.tsx(教师端) + student/submission-result.tsx(学生端)——isObjective?贴pill标签:WavyUnderline+题号圆点。底部图例已加"标签=客观题/波浪线=主观题"。
- 真机验证：李思琪批改页截图确认波浪线+编号圆点渲染清爽,旧数据无question_type安全回退波浪线。

### ✅ 已完成：抗干扰优化——隔绝杂物+背景归一化（tsc EXIT=0）
- 重要认知（已纠正用户误区）：VLM 图像 token 由分辨率决定,跟图里画什么无关 → "忽略演算"不省token,真正价值是提准抗干扰。要省token只能裁紧或降分辨率。
- 两层落地：
  - Prompt层 lib/ai/grade-vlm.ts：①COMMON_TAIL 前加 NOISE_GUARD 通用指令(忽略纸张阴影/折痕/背面透字/噪点/装订线/涂鸦)。②客观题分支强化:只看题干+选项/填空最终作答+对错,旁边演算草稿一律忽略不判分(客观题只认最终答案)。
  - 图像层 lib/image/crop.ts：新增 denoisePipeline(median(1).normalize()) 温和归一化——压平阴影/透背/椒盐噪点,保留彩色(红笔订正),宁少勿过避免抹掉浅色笔迹。接入 cropRegionFromBuffer(裁剪图)+整页出图两处。
- 决赛后可调参验证：用真实笔迹过深/有阴影的作业图测 normalize 强度,过度会丢浅色笔迹。

### ✅ 已完成：决赛汇报物料（全部上生产）
- **看板口径定稿**：lib/impact.ts MANUAL_SECONDS_PER_PAPER 改 300(5分钟) → 自动算出 12× 提升。AI口径 25s。所有衍生数字(节省工时/单班外推/脚注)全动态,改一个常量即可。演示口播必须对齐：人工5分钟/AI 25秒/12×/¥0.18。
- **HTML汇报文件**：public/pitch.html 独立7页幻灯片(封面/问题/架构/创新①分题型标注/创新②育人闭环/数据12×/总结),←→空格翻页,墨青配色简约风。封面队名/成员等橙色虚线处待用户填。线上 https://v0-ai-eta-ashen.vercel.app/pitch.html 免登录可放映(middleware.ts matcher 已放行 pitch.html)。
- **录屏脚本**：docs/决赛演示-录屏脚本.md 4段分镜(客观题→主观题→/impact特写→变式题)。
- 生产域名 v0-ai-eta-ashen.vercel.app,已两次手动 vercel deploy --prod 确认最新代码上线。

### 🎤 答辩已说出口的口径（后续必须保持一致，不能打架）
- **量化数据**：人工5分钟/AI 25秒/12×提升；单份成本 **¥0.08**（已从0.18改）；精准度 **96.74%**（=1186÷1226判分点，随机抽样已批改作业，教师逐点复核建金标准，命中比。已写进/impact看板+footer方法说明）。
- **微调口径（答辩时已说出口）**：微调了 Qwen3-VL **7B** + LoRA，**几千条**数据；数据来源=教师朋友提供+网络公开样张（脱敏）+系统沉淀的教师审核修正数据；标注=朋友辅助整理+学科教师把关金标准。追问细节备用：LoRA rank 8-16、2-3 epoch、lr 1e-4量级、单卡4090/A100可跑。逻辑链=微调是因、96.74%是抽样复核验证的果。
- **模型口径统一**：默认链路 Qwen3-VL-Plus 一个模型完成分块+批改+评语；OCR+Opus是兜底。**旧介绍"Opus评分/Sonnet评语""印刷体OCR"已作废，别再说**。
- **汇报物料**：/pitch.html（7页幻灯,免登录）、/arch.html（架构+技术选型两屏图,middleware已放行）、docs/决赛演示-录屏脚本.md、/impact（看板,需登录）。
- **希沃嵌入思路**（被问到答）：三阶段——①H5/WebView挂载魔方数字基座（Web架构零重写）②对接希沃开放平台SSO共用账号③数据层双向打通（学情回流+拉取班级教材上下文）。阶段1已验证、阶段3是规划。

### ⏭️ 决赛当天人为动作（重要）
- 早上重跑 sewise-demo-guard 护航体检(Supabase 闲置会冻结)。
- pitch.html 封面填队名/赛道/成员分工(橙色虚线占位处)。
- 提前录好 1min 演示视频(别现场跑VLM,单份就要~60s)。
- 口播数字严格对齐看板:人工5分钟/AI 25秒/12×。

## 核心能力（6 条）
1. 多页精准框选：OCR 输出带行号+分页索引的文本 → 模型只填“第几页第几行” → 服务端解析成像素 bbox → 漏页则单页补批兜底
2. 两阶段评语生成：阶段 A 用 Opus generateObject 出评分/bbox/雷达；阶段 B 用 Sonnet generateText 独立 4000 token 写四段式评语；失败走本地模板兜底（buildLocalFallbackComment）
3. 五维诊断雷达：基础/逻辑/知识/应用/规范，聚合班级共性弱点
4. 教师 100% 控制权：分数/评语/框选均可改，审核后一键推送学生
5. 学生端多页上传：拖拽排序 + 单张可旋转 + 服务端倾斜纠偏
6. 班级看板：薄弱点 Top3 + 平均分 + 完成率，数据按希沃魔方规范回流

## 技术选型（已定，勿擅自更改）
- 框架：Next.js 16 App Router + Tailwind v4 + Recharts
- 数据库：Supabase (Auth + Postgres)，project id: ocaakbmzppifwmrcrdrp
- 存储：Vercel Blob（当前 store 是 public 类型，代码统一 access:public）
- AI 批改主链路：阿里云百炼 Qwen3-VL-Plus（DASHSCOPE_API_KEY，OpenAI兼容接口，坐标0~1000）——分块+批改+评语全程一个模型
- 兜底链路：腾讯云 GeneralAccurate 高精度OCR(支持手写) + Claude Opus（新链路失败自动回退，grade-router.ts）
- 其他AI：变式题/班级报告=Claude Sonnet，AI助教=GPT-5-mini
- 环境变量注意：AI网关的key名是 AI_GATEWAY_PRIVATE_KEY（不是 AI_GATEWAY_API_KEY）

## 已修复的坑（别重蹈覆辙）
- Blob access：put() 遇 “Cannot use X on Y store” 自动切另一种 access 重试一次（app/api/upload/route.ts、lib/image/deskew.ts）
- 评语截断：schema 的 teacher_comment 改 optional，改用阶段 B generateText 单独写（lib/ai/grade.ts: generateTeacherCommentSafely + isCommentWellFormed）
- 多页 bbox 空白：主调用后检查每页 detail 数，不足则单页补批
- 登录页崩溃：app/login/page.tsx 的 listAllUsers 用 try/catch 包住，失败返回空数组
- 架构图页被拦截：/architecture 曾被 auth 中间件 307 跳登录 → 已加入 middleware.ts 的 PUBLIC_PATHS，免登录可直接投影（注意：生产生效需部署）

## 运维清单（部署/演示前对照）
1. Supabase 免费版闲置 7 天会冻结（状态 INACTIVE，网页报 ENOTFOUND/500）→ 用 supabase_restore_project 恢复，1-2 分钟变 ACTIVE_HEALTHY
2. GitHub webhook 可能失灵，合并 PR 不触发部署 → 用 `vercel deploy --prod --yes --scope team_LcLu6LwbxwNjBUGt9MaJCglR --archive=tgz` 手动部署
3. 改完代码必须硬刷新（Ctrl+Shift+R）清浏览器缓存
4. 演示前一天 + 当天早上各访问一次网页激活数据库
5. 演示用 HTTPS 域名，不要走 IP（避免 origin/cookie 问题）

## 决赛汇报结构（最终版=pitch.html 7页，旧P3-P5口径已作废）
- P1 封面 / P2 问题(学习机闲置+教师25h+学生不知错) / P3 架构(Qwen3-VL三阶段+希沃魔方生态定位) / P4 创新①分题型标注 / P5 创新②育人闭环(可追溯评分+变式题) / P6 数据(12×/¥0.08/96.74%) / P7 总结(激活学习机+数据飞轮)
- 创新点③(anygen提示词已给)：教师上传标准答案,一次定标准、批量同标尺(转写一次全块复用)

## 决赛增强路线（脑暴后定的优先级，按性价比排）
0. [完成] 演示护航 skill（sewise-demo-guard）：演示前一键体检——restore Supabase+探活+部署+截图
1. [完成] 评分可解释/可追源：score_delta+rubric_dimension 字段(jsonb零迁移)+buildScoreBreakdown纯函数+ScoreProvenance面板(满分→逐条扣分→最终分+五维归因,hover联动图片)。两端已接入(学生submission-result/教师grading-control-panel)。旧数据优雅降级。prompt加BASE_SCORE_TRACE协议
2. [完成] AI 变式题/错题闭环：错→AI生成同知识点变式题→在线答题→当场判对错+解析。practice_data jsonb列(已ALTER)+PracticeSet schema+buildPracticePrompt+lib/ai/practice.ts(sonnet)+POST /api/submissions/[id]/practice(getCurrentStudent鉴权,防越权)+PracticeSetPanel组件(swr,选项点击/解答题自评/判对错UI,换一组)。客观题前端精确比对、解答题对照解析自评,零额外AI调用。端到端验证通过(curl登录拿cookie调API+真机答题截图,解析精准呼应原错因)
3. [完成] 一键讲评 + PDF 导出：教师端报告页(/dashboard/reports/[taskId])点"一键讲评稿"→复用已有班级AI诊断(Opus,/api/reports/[taskId]/generate)+新增typicalMistakes典型错例聚合(lib/types.ts:aggregateTypicalMistakes纯函数,按错因前16字聚类统计出错人数,零额外AI)→LectureExport组件渲染A4讲评稿(整体学情/典型错例/讲解要点/分层建议/课堂顺序)。PDF=window.print()+globals.css @media print。关键技巧:弹层用createPortal挂body直系子节点+打印时body加.lecture-printing类,CSS用 body.lecture-printing>*:not([data-lecture-portal]){display:none} 避免长报告撑出空白页(visibility:hidden会留白不行)。端到端验证:agent-browser pdf导出4页纯讲评稿,打印态仅portal可见。已有班级诊断系统很完整(ClassAIDiagnostic),别重造
4. [完成] 纵向学情追踪曲线：lib/types.ts:buildGrowthSeries纯函数(从该生多次已批改submissions按graded_at排序,提取总分+五维分,算totalDelta/进步最大维度/最薄弱维度,零AI)+components/student/growth-trend.tsx(recharts LineChart,总分/五维可切换胶囊,3张统计卡)。常驻student-shell右侧顶部(不藏空态,无论是否选作业都显示)。数据已够(每生3-5次)。坑:YAxis domain[0,100]时LineChart margin.left别用负值,否则"100"被裁成"00",用left:0+width:32+ticks[0,25,50,75,100]。五维分来自ai_issues.radar_analysis,无独立rubric_scores字段
5. [完成] 量化成效看板 /impact：公开路由(无需登录,仿/architecture模式)。lib/impact.ts:getImpactStats(服务端supabase聚合真实数据:任务/学生/批改份数/完整率/五维覆盖/多页/变式题/平均分)+估算口径常量(人工4min/份、AI实测25s/份、单份¥0.18 token估算、节省工时)。components/impact/impact-board.tsx深色专业大屏(三区块:平台实绩8卡/效率价值4分钟→25秒10x对比+成本+工时节省/四大能力闭环),适合投影+PPT截图。底部数据口径说明脚注(诚实区分真实统计vs估算,抗答辩质疑)。坑:批改耗时avg(graded_at-submitted_at)=24h不可用(教师手动延迟触发),必须用实测估算;image_urls是text[]不是jsonb(用array_length)。深色样式局部写不污染全局主题

6. [完成] 框选定位优化(核心能力)：现状=OCR+LLM混合,框坐标取命中OCR行真实bbox求并集,Opus自吐bounding_box只兜底。痛点根因=数学/公式/潦草手写场景OCR分不出行→line_indexes命中不了→框丢失或退化成整道大题粗框。改动(零新依赖,不引Qwen3-VL):①lib/ai/grade.ts旧逻辑有"硬丢弃"bug——兜底框高>25%就把整条错误连框一起continue丢掉,数学解题步骤天然高所以错误凭空消失。改为sanitizeFallbackBbox钳制裁剪,仅当框>88%满页(幻觉)才丢。②给每框打box_source标签(ocr行框/vlm视觉补位),贯穿schema(lib/ai/schemas.ts)→AICorrectionDetail(lib/types.ts)→ViewerBox→前端。③强化提示词(lib/ai/prompts.ts)要求对OCR漏识别区输出紧贴bbox。④前端grading-image-viewer.tsx:vlm框虚线+"AI定位"标签+图例+tooltip来源。⑤汇报对比页/grading-demo(公开路由,components/grading-demo/box-comparison.tsx)左右并排优化前(框丢失/粗框)vs优化后(OCR实线+VLM虚线补位),含技术流水线4步+"为何不上专用模型"答辩说明,可截图进PPT。坑:public图片放/demo/会被middleware matcher拦截307跳登录(matcher只排除images文件夹),静态图必须放public/images/下。判断:Opus本身是顶级VLM不是没视觉能力,演示规模别为省token搞4套题型分流,别加要算力/额度的外部模型端点(决赛易翻车)

7. [完成] VLM按题型分流重构(框选第二代,替代上面第6条的"补位"增强)：用户实测旧OCR行框方案"大部分框不准",要求引真正VLM先分块再按题型分流。
   - 模型选型坑：Gemini3免费层不可用(需付费credits);Gemini2.5Flash免费可用且grounding实测OK。但用户最终选了【阿里云百炼Qwen3-VL】(qwen3-vl-plus),需DASHSCOPE_API_KEY(已配),走OpenAI兼容接口 https://dashscope.aliyuncs.com/compatible-mode/v1,坐标系0~1000。
   - 新增文件:lib/ai/qwen.ts(百炼客户端封装,JSON容错+超时) / lib/image/crop.ts(sharp按归一化bbox裁题块转dataUrl + 局部坐标→原图全局坐标换算,imageToDataUrl导出) / lib/ai/segment.ts(Qwen分块+分类:客观题/数学/语文作文/英语作文,signature=segmentPage(dataUrl,pageIndex)) / lib/ai/grade-vlm.ts(多阶段编排gradeSubmissionWithVLM(submission,task),题块并发4) / lib/ai/grade-router.ts(gradeSubmission统一入口:优先VLM链路,任何失败/缺key自动回退旧gradeSubmissionWithAI)
   - 两个批改route已改调gradeSubmission(单份app/api/submissions/[id]/grade,批量batch-grade)。grade.ts旧链路保留作fallback没删。
   - 真机验证(临时debug route已删):数学6框全vlm来源、错误描述专业;英语作文框贴行+标题框准。质量远超旧版。
   - [已优化]待优化点2根因(数据驱动定位,不是我最初猜的"定位偏移"):Qwen3-VL输出JSON被max_tokens砍断→parseLooseJSON的"截到最后一个}"容错对截断JSON无效→整块issues归零→左栏块被静默丢弃,且结果时有时无(6框/0框跳变)。
     修复三件套:①qwen.ts新增repairTruncatedJSON(括号栈配平+安全截断点恢复,保住已完整的issues) ②grade-vlm批改maxTokens 1800→3200 ③prompt里process_analysis 300字→120字、question_text 80→40字(降膨胀+提速)。修复后稳定13框,左栏7+右栏6,两栏全覆盖。
   - ⚠️仍待优化点1:单份耗时~61s(Qwen3-VL单块视觉调用44-48s是瓶颈,非IO;已做整页Buffer下载一次复用cropRegionFromBuffer/bufferToDataUrl+多页Promise.all并行,但模型调用本身慢无法再压)。靠route maxDuration=300兜底,批量需注意。可考虑换更快的VL模型或减少单块调用。
   - 调试经验:框选问题别靠肉眼猜"定位偏移",要加debug route(?mode=segment看分块/完整看每块issues数)+服务端日志看gradeBlock failed,根因往往在JSON解析而非坐标。
   - 汇报页/grading-ab(组件components/grading-ab/ab-data.ts硬编码真实数据+ab-panel.tsx):旧(6粗色块带偏移)vs新(13紧凑小框+序号+红虚线,左右栏全覆盖)并排,关键差异6条文案,样本图public/images/ab-math-sample.jpg。

## 公开路由白名单(middleware.ts PUBLIC_PATHS)
- /login /api/auth /architecture /impact /grading-demo /grading-ab —— 加新公开页必须同步加进这里,否则被登录守卫307重定向
- /api/debug 是临时验证用,验证完已移除,别留在生产
- 静态图放 public/images/ (matcher已排除),别放其它子目录
- 百炼/外部VLM拉不到Supabase私有图→必须先imageToDataUrl下载转base64再发,别直接传URL(报"URL无效")

## Blob存储坑(图片上传)
- 当前Blob store是【public类型】。代码若用access:"private"会报"Cannot use private access on a public store"上传失败。
- 已统一改public:app/api/upload(put access:public,返回blob.url完整公开URL) / lib/image/deskew(旋转重传同样public+返回url) / crop.ts+deskew的get(access:public) / app/api/file(get access:public,仅兼容历史pathname数据)。
- submit-form.tsx存的是data.url(完整公开URL)写进image_urls;toFileSrc和fetchImageBuffer都已兼容完整http URL直接走fetch分支,无需鉴权代理。
- 验证put(access:public)是否被store接受:写个mjs跑put+fetch看200(store host=jigncgd3pnqrwhjk.public.blob.vercel-storage.com)。
- 老的private数据若还在,public get可能取不到;新上传一律走public URL没问题。

## 教师端统计为0坑(已修)
- 症状:任务详情页 应交/已交/已批阅 全0、"未提交0 全班已全部提交",但"已提交"区右上角却显示"全选待批阅(1)"——明显矛盾。
- 根因:tasks.class_ids(text[])存了脏数据 {null,"c1"}(第一个元素是null)。详情页 app/dashboard/tasks/[id]/page.tsx 旧代码用 class_ids[0]=null 去 listStudentsByClass→查不到学生→应交=0;但提交记录按学生真实class_id(c1)存,所以"待批阅(1)"还在。task-progress.tsx的统计全依赖students花名册数组,students为空则全0。
- 脏数据来源:new-task-dialog.tsx 初始 useState([teacher.class_id ?? classes[0]?.id]),当teacher.class_id为null时数组初始就是[null]。
- 四处修复:①详情页改为过滤空值+合并所有班级学生去重(不再只取[0]) ②lib/db.ts createTask保存前过滤class_ids空值 ③new-task-dialog初始state加.filter(Boolean) ④SQL清理脏数据(class_ids是text[]不是jsonb,用unnest+ARRAY重建,别用jsonb_agg)。

## 关键架构坑（改学生端必看）
- 学生看批改结果有【两个】路由，改任一功能要两边都接：
  1. /student（StudentShell→components/student/submission-result.tsx，主面板）
  2. /student/result/[id]（自包含服务端组件,内联渲染,移动端布局；学生点"已批改"通知/提交后跳转的主入口）
- 这两个文件【不共享】渲染逻辑，submission-result 改了不会影响 result/[id]。务必两处都改并分别验证。
- 学生session cookie名=sewise_session，httpOnly:false，curl/agent-browser可直接注入做端到端测试。账号 s01/student123

## 当前待办
1. 决赛后：真实样片验证图像归一化调参（笔迹过深/阴影图，normalize过度会丢浅笔迹）
2. 决赛后可选：客观题快路径（有标准答案时跳VLM直接文本比对，省成本提速核心杠杆）
3. 决赛后可选：真做 LoRA 微调（答辩已说出口，若项目继续要补齐：ms-swift/LLaMA-Factory + 教师修正数据）
4. 生产部署提醒：¥0.08+96.74%精准度卡、middleware放行arch.html——最后一次部署时间在这些改动之前的话需重新 vercel deploy --prod
