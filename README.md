# 希沃 AI 学情分析系统 — 开发进度与未完成任务

> 这份文档实时同步当前开发进度与未完成的提示词，便于接手者继续完成。

## 演示账号（一键登录，免密码）

| 角色 | 账号 ID | 姓名 | 默认班级 |
|---|---|---|---|
| 教师 | `teacher_a` | 李雯老师 | 高二 (3) 班 |
| 教师 | `teacher_b` | 王建老师 | 高二 (3) 班 |
| 学生 | `student_a` | 黄子轩 | 高二 (3) 班 |
| 学生 | `student_b` | 林思雨 | 高二 (3) 班 |
| 学生 | `student_c` | 陈奕辰 | 高二 (3) 班 |
| 学生 | `student_d` | 苏婉清 | 高二 (3) 班 |

登录入口：`/login`

## 技术栈

- **框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS v4 + shadcn/ui (new-york)
- **数据库**：Supabase（已建 6 张表 + Realtime + Seed 数据）
- **存储**：Vercel Blob（图片 public 访问）
- **认证**：自定义 cookie-based 一键登录（演示用，非 Supabase Auth）

## 已完成功能

### 提示词一：布置新作业全流程闭环（90%）
- [x] 「布置新作业」Dialog（学科/班级多选/截止日期时间/作业要求/备注/预计时长）
- [x] 表单校验、Toast 反馈
- [x] 新作业写入 Supabase，自动生成 Notification 给每个目标学生
- [x] KPI 卡片实时联动
- [x] 表格状态合理化：批改中/待批阅/已完成三态，无空按钮
- [x] 「催交」按钮 → ReminderDialog 选择未交学生 → 批量发送通知
- [x] 「查看进度」跳转 `/dashboard/tasks/[id]` 查看提交详情

### 提示词三：教师端 ↔ 学生端真实联动（90%）
- [x] 登录系统 + 路由保护中间件 + 角色区分（teacher/student）
- [x] Supabase Realtime 实时同步（tasks/submissions/notifications/activities）
- [x] 教师布置作业 → 学生端铃铛 NEW + 待办列表
- [x] 学生作业提交页 `/student/submit/[taskId]`，支持多图上传（Vercel Blob）
- [x] 提交后自动通知教师，教师 `/dashboard/tasks/[id]` 实时看到提交
- [x] AI 批阅工作台 `/dashboard/grading/[submissionId]` 已对接真实提交数据
- [x] 评分发送 → 学生端 NEW Banner + 历史列表显示分数
- [x] 学生结果页 `/student/result/[id]` 展示分数、AI 评语、教师评语

### 阶段五：反馈闭环（学生端学习机视角）
- [x] 学习机外框 + 个性化 AI 评语 + 薄弱知识点 + 推荐练习

---

## 未完成任务（按优先级排序）

### 提示词四：体验增强功能

#### 1. 暗色模式（next-themes）
```
使用 next-themes 实现主题切换：
- ThemeProvider 包裹在 app/layout.tsx
- Header 用户菜单新增「外观」子菜单：浅色 / 深色 / 跟随系统
- 默认跟随系统，持久化到 localStorage

globals.css 完善暗色 token：
- 暗色背景采用 oklch(0.18 0.01 250) 不用纯黑
- 主色 primary 在暗色下亮度 +0.08
- chart 系列色重新校准
- sidebar、card、popover 三层灰阶要有清晰区分

关键组件单独优化：
- AI 批阅工作台的作业图片：暗色下加白底卡片包裹
- Recharts 图表用 useTheme 动态传入 stroke/fill 颜色
- 学生端学习机外框：暗色下用 oklch(0.12 ...) 模拟真实黑边
- 渐变 Banner、AI 评语卡片在暗色下用低饱和度版本
```

#### 2. 班级动态时间线（教师端首页 Feed 流）
当前已有 `components/dashboard/activity-feed.tsx` 占位组件并实时订阅 `activities` 表。需补：
```
- 把 dashboard-content 改为 4:6 分屏：左侧 60% 作业表格，右侧 40% Feed
- Feed 视觉：圆形图标（不同 type 不同颜色）+ 相对时间「3 分钟前」+ hover 显示绝对时间
- 最新一条 slide-in 进入动画 + 高亮 2s 后淡化（framer-motion）
- 顶部「实时」徽标（绿色脉冲圆点）
- 筛选 Tab：全部 / 提交 / 已批阅 / 催交
- 初始化注入 10 条 mock 历史 activity（不存在则插入到 Supabase）
- 关键事件触发写入 activities 表（已在 API 路由中部分实现，需补全）
```

#### 3. 教师端批量批阅
在 `app/dashboard/tasks/[id]/page.tsx` 进度详情页：
```
- 提交列表每行左侧 Checkbox + 表头全选
- 顶部浮动操作栏（选中 >= 1 时从顶部滑下来）
  - 「已选择 X 名学生」「批量 AI 批阅」「批量发送催交」「取消选择」
- 批量 AI 批阅交互：
  - 确认 Dialog 列出选中学生
  - 顶部进度条：「正在批阅 12 名学生作业（3/12）…」
  - 每完成 1 名，对应行从「待批阅」→「已批阅」+ 数字滚动动画
  - 全部完成 toast：「12 份作业批阅完成，平均分 81.5」
  - 可取消剩余任务

后端：新增 /api/submissions/batch-grade 路由，串行调用单条 grade 接口
```

#### 4. AI 助教悬浮按钮
```
- 全局右下角悬浮 48×48 圆形按钮（仅教师角色可见）
  - 渐变背景 primary → accent，脉冲呼吸动画，Sparkles 图标
- 点击展开 380×560 对话窗口
  - 顶部：「希沃 AI 教研助手」+ 在线状态点
  - 中间：对话区，Markdown 渲染 + 打字机效果
  - 底部：Textarea + Enter 发送 / Shift+Enter 换行
  - 快捷问题气泡：
    • 本周哪些学生需要重点关注
    • 三角函数章节哪些知识点丢分最多
    • 给我生成一份本周班级学情周报
    • 哪些学生作业完成率连续下降

对接 AI SDK（Vercel AI Gateway，默认零配置）：
- useChat hook + /api/chat 路由
- 模型 openai/gpt-5-mini
- System Prompt 注入当前班级学情快照（完成率、薄弱学生列表等，约 2K tokens）
- 历史会话存 localStorage
```

#### 5. PWA 支持（学生端学习机）
```
- app/manifest.ts:
  • name: 希沃学习助手
  • short_name: 希沃学习
  • theme_color: 与教师端蓝同
  • display: standalone
  • icons: 192/512（用 GenerateImage 生成）
  • start_url: /student

- Service Worker（next-pwa 或原生）：
  • 静态资源 CacheFirst
  • 历史作业 StaleWhileRevalidate
  • 图片 CacheFirst 上限 50 张
  • 通知接口 NetworkFirst

- 离线徽标 + 离线提交草稿
- 30 秒后弹安装到桌面横幅（beforeinstallprompt）
```

### 提示词二：性能优化（在所有功能完成后做）
```
1. 所有 <Link> 加 prefetch；每个路由 segment 加 loading.tsx
2. Recharts / GradingImageViewer 改为 dynamic import + ssr:false + Skeleton
3. 学生列表/作业行加 React.memo；KPI 用 useMemo
4. SWR 替代 useEffect fetch；dedupingInterval: 5000
5. 字体 next/font display:'swap'
6. View Transitions API 或 fade-in 200ms
7. 用 Lighthouse 出对比报告
```

---

## 数据库 Schema

```
classes(id, name, grade, student_count, display_order)
app_users(id, name, role, class_id, student_no, avatar_color)
tasks(id, title, subject, class_ids[], requirements, notes, due_at, ...)
submissions(id, task_id, student_id, image_urls[], status, score,
            ai_comment, teacher_comment, ai_issues, weak_points, ...)
notifications(id, user_id, type, title, content, related_task_id, read, urgent)
activities(id, class_id, type, actor_id, actor_name, description, ...)
```

所有表均启用了 Supabase Realtime publication。

## 核心 API 路由

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/tasks` | POST | 教师创建作业；自动生成 notifications + activity |
| `/api/submissions` | POST | 学生提交；自动生成教师通知 + activity |
| `/api/submissions/[id]/grade` | POST | 教师/AI 批阅；写入分数 + 评语 + 学生通知 |
| `/api/reminders` | POST | 批量催交；写入未交学生的 notifications |
| `/api/upload` | POST | Vercel Blob 图片上传，返回 public URL |
| `/api/login` | POST | 写入 cookie（演示用） |
| `/api/logout` | POST | 清除 cookie |

## 关键目录结构

```
app/
  login/                     登录页 + 一键登录卡片
  dashboard/                 教师端
    page.tsx                 学情看板
    tasks/[id]/page.tsx      作业进度详情
    grading/[submissionId]/  AI 批阅工作台
    reports/[id]/            学情报告（保留 mock 可视化）
  student/                   学生端学习机
    page.tsx                 主页（待办 + 历史 + AI 评语）
    submit/[taskId]/         作业提交（多图上传）
    submitted/[id]/          已提交确认
    result/[id]/             批阅结果
  api/                       API 路由（见上表）

components/
  app/                       Header / Sidebar / UserMenu / NotificationBell
  dashboard/                 KPI / TaskTable / NewTaskDialog / ReminderDialog
  grading/                   GradingWorkspace / ImageViewer / ControlPanel
  student/                   StudentShell / TaskInbox / SubmitForm / ScoreHero
  auth/                      AuthProvider

lib/
  supabase/client.ts         浏览器 + 服务器通用 anon-key 客户端
  db.ts                      所有 CRUD 封装（~350 行）
  auth.ts                    客户端 cookie helpers
  auth-server.ts             服务端 cookies() helpers
  types.ts                   统一类型定义
```
