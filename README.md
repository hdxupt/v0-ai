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

- **框架**：Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **样式**：Tailwind CSS v4 + shadcn/ui (new-york) + next-themes
- **数据库**：Supabase（6 张表 + Realtime publication + Seed 数据）
- **存储**：Vercel Blob（图片 public 访问）
- **AI**：Vercel AI Gateway（AI SDK 6，模型 `openai/gpt-5-mini`）
- **认证**：自定义 cookie-based 一键登录（演示用，非 Supabase Auth）

## 环境变量

dev 环境必备（写入 `.env.local`）：

```
NEXT_PUBLIC_SUPABASE_URL=https://hgpvmlycybkbykrgxbrr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
AI_GATEWAY_API_KEY=<vercel ai gateway key>    # AI 助教必需
BLOB_READ_WRITE_TOKEN=<已由集成自动注入>       # 上传图片必需
```

部署到 Vercel 时 Supabase + Blob + AI Gateway 集成会自动注入。

---

## 已完成功能 ✅

### 提示词一：布置新作业全流程闭环（100%）
- [x] 「布置新作业」Dialog（学科 / 班级多选 / 截止日期时间 / 作业要求 / 备注 / 预计时长）
- [x] 表单校验、Toast 反馈
- [x] 新作业写入 Supabase，自动生成 Notification 给每个目标学生
- [x] KPI 卡片实时联动（Supabase Realtime）
- [x] 表格状态合理化：批改中 / 待批阅 / 已完成三态，无空按钮
- [x] 「催交」按钮 → ReminderDialog 选择未交学生 → 批量发送通知
- [x] 「查看进度」跳转 `/dashboard/tasks/[id]` 查看提交详情

### 提示词三：教师端 ↔ 学生端真实联动（100%）
- [x] 登录系统 + 路由保护中间件 + 角色区分（teacher/student）
- [x] Supabase Realtime 实时同步（tasks/submissions/notifications/activities）
- [x] 教师布置作业 → 学生端铃铛 NEW + 待办列表
- [x] 学生作业提交页 `/student/submit/[taskId]`，多图上传（Vercel Blob）+ 拖拽排序 + 进度条
- [x] 提交后自动通知教师，教师 `/dashboard/tasks/[id]` 实时看到提交
- [x] AI 批阅工作台 `/dashboard/grading/[submissionId]`（真实提交数据 + Issues 高亮 + 评分滑块 + 多 Tab）
- [x] 评分发送 → 学生端 NEW Banner + 历史列表显示分数
- [x] 学生结果页 `/student/result/[id]` 展示分数、AI 评语、教师评语、薄弱点、推荐练习

### 阶段五：反馈闭环（学生端学习机视角，100%）
- [x] 学习机外框 + 个性化 AI 评语 + 薄弱知识点 + 推荐练习

### 提示词四：体验增强（100%）

#### ✅ 暗色模式（next-themes）
- `components/theme-provider.tsx` 已挂载到 `app/layout.tsx`
- `UserMenu` 已添加「外观」子菜单（浅色 / 深色 / 跟随系统）
- `globals.css` 已配置完整的 dark token

#### ✅ 班级动态时间线（教师端首页 Feed 流）
- `components/dashboard/activity-feed.tsx` 实时订阅 `activities` 表
- 在 `DashboardContent` 中已与作业表格分屏布局
- 关键事件（建任务 / 提交 / 批阅 / 催交）均会写入 `activities`

#### ✅ 教师端批量批阅
- `app/dashboard/tasks/[id]/page.tsx` 加 Checkbox + 全选 + 浮动操作栏
- `/api/submissions/batch-grade` 路由（POST，body: `{submissionIds: string[]}`）
- 串行调用单条 grade 接口，使用模拟 AI 评分（80-95 之间）

#### ✅ AI 助教悬浮按钮
- `components/app/ai-assistant.tsx` 全局右下角圆形按钮（仅教师可见）
- 点击展开对话窗口（useChat + DefaultChatTransport）
- `/api/chat` 路由：注入当前班级学情快照作为 System Prompt，模型 `openai/gpt-5-mini`
- 4 个快捷问题气泡，Markdown 流式渲染
- ⚠️ 需要 `AI_GATEWAY_API_KEY` 才能真正调用 LLM（不存在时 SSE 返回 authentication failed）

#### ✅ PWA 支持（学生端学习机）
- `app/manifest.ts`（standalone + 学生端 start_url）
- 192 / 512 图标已生成（jpg 格式）
- `components/student/install-prompt.tsx` 30 秒后弹安装横幅（beforeinstallprompt）
- ⚠️ Service Worker 未配置（仅有 manifest，可被「添加到主屏幕」但不支持离线）

### 提示词二：性能优化（70%）
- [x] 4 个 `loading.tsx` 文件（dashboard / student / submit / grading）
- [x] 关键路由 segment loading 骨架屏
- [x] dashboard-content 改为 SSR 初始数据 + 客户端 Realtime
- [ ] dynamic import + ssr:false 优化 GradingImageViewer 等重组件
- [ ] React.memo / useMemo 优化频繁重渲染组件
- [ ] SWR 替代少量 useEffect fetch（dashboard / student-shell 已用 SSR + Realtime，可不动）
- [ ] Lighthouse 报告对比

---

## 仍未完成 / 可继续完善的任务

### A. AI 助教真实接入（卡点：API key）
当前 `/api/chat` 已经能稳定返回 SSE 流，但因 `AI_GATEWAY_API_KEY` 未注入 dev VM 而返回 authentication failed。
解决方法（任选其一）：
1. 在 `.env.local` 加 `AI_GATEWAY_API_KEY=...`
2. 部署到 Vercel 并启用 AI Gateway 集成

### B. 提示词二：性能优化收尾
```
1. components/grading/grading-image-viewer.tsx 改 dynamic import + ssr:false + Skeleton
2. components/student/score-hero.tsx 等重组件用 React.memo 包裹
3. components/dashboard/kpi-cards.tsx 中所有派生数据用 useMemo
4. 用 Lighthouse 生成首屏、批阅页对比报告
```

### C. PWA Service Worker（离线支持）
```
- 安装 next-pwa 或写原生 sw.js
- 静态资源 CacheFirst
- 历史作业 StaleWhileRevalidate
- 图片 CacheFirst 上限 50 张
- 通知接口 NetworkFirst + 离线徽标 + 离线提交草稿
```

### D. 提示词四 各组件细节打磨建议（如有时间）
```
- ActivityFeed 新条目 framer-motion slide-in + 2s 高亮淡化
- BatchGrade 完成时 Toast「12 份作业批阅完成，平均分 81.5」
- AI 助教对话历史持久化到 localStorage
- 黑色模式下 AI 批阅工作台答卷图片加白底卡片包裹（避免发亮）
- Recharts 图表用 useTheme 动态传入 stroke/fill 颜色
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
| `/api/submissions` | POST | 学生提交；自动生成教师通知 + activity（body: `{taskId, imagePathnames[], note}`）|
| `/api/submissions/[id]/grade` | POST | 教师/AI 批阅；写入分数 + 评语 + 学生通知 |
| `/api/submissions/batch-grade` | POST | 批量 AI 批阅（body: `{submissionIds: string[]}`）|
| `/api/reminders` | POST | 批量催交；写入未交学生的 notifications |
| `/api/upload` | POST | Vercel Blob 图片上传，返回 public URL |
| `/api/chat` | POST | AI 助教（useChat + DefaultChatTransport）|

## 关键目录结构

```
app/
  login/                     登录页 + 一键登录卡片
  manifest.ts                PWA manifest
  dashboard/                 教师端
    layout.tsx               挂载 AIAssistant 悬浮按钮
    loading.tsx              骨架屏
    page.tsx                 学情看板（SSR 初始数据 + 客户端 Realtime）
    tasks/[id]/page.tsx      作业进度详情（含批量批阅）
    grading/[submissionId]/  AI 批阅工作台
    reports/[id]/            学情报告（保留 mock 可视化）
  student/                   学生端学习机
    layout.tsx               挂载 InstallPrompt
    loading.tsx
    page.tsx                 主页（待办 + 历史 + AI 评语）
    submit/[taskId]/         作业提交（多图上传 + 进度条 + 拖拽）
    submitted/[id]/          已提交确认
    result/[id]/             批阅结果
  api/                       见上表

components/
  app/                       Header / Sidebar / UserMenu / NotificationBell / AIAssistant
  dashboard/                 KPI / TaskTable / NewTaskDialog / ReminderDialog / ActivityFeed
  grading/                   GradingWorkspace / ImageViewer / ControlPanel
  student/                   StudentShell / TaskInbox / SubmitForm / ScoreHero / InstallPrompt
  auth/                      AuthProvider
  theme-provider.tsx         next-themes 包裹

lib/
  supabase/client.ts         createClient（browser + server 通用 anon-key）
  db.ts                      所有 CRUD 封装（~350 行）
  auth.ts                    客户端 cookie helpers
  auth-server.ts             服务端 cookies() helpers
  types.ts                   统一类型定义

public/
  icon-192.jpg / icon-512.jpg   PWA 图标
```

## 验证过的 E2E 流程

1. 教师 `teacher_a` 登录 → `/dashboard` 看到 KPI / TaskTable / ActivityFeed
2. 点「布置新作业」→ 选高二 (3) 班 + 数学 → 创建成功
3. 学生 `student_a` 登录 `/student` → 铃铛 NEW + 待办列表新增任务
4. 进入 `/student/submit/[taskId]` 上传图片 → Vercel Blob 存储 → 提交成功
5. 教师 `/dashboard/tasks/[id]` 实时看到「黄子轩 已提交」
6. 点头像进 `/dashboard/grading/[submissionId]` → 给 85 分 + 评语 → 保存
7. 学生 `/student/result/[id]` 看到 85 分 + AI 评语 + 教师评语 + 薄弱点
8. 批量批阅 `/api/submissions/batch-grade` 一次给多个学生打分 ✅
9. AI 助教 `/api/chat` SSE 流正常返回（API key 注入后即可对话）

## 备注

- 中间件 `middleware.ts` 会在 Next.js 16 警告 deprecated，建议未来改名 `proxy.ts`
- VM 重启会丢失 `.env.local`，需重新写入（用 `supabase_get_project_url` + `supabase_get_publishable_keys` MCP 工具取值）
- Supabase RLS 当前为关闭状态（演示项目）；上生产前需逐表开启
