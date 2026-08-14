---
name: claude
description: SeWise（希沃 AI 学情看板）项目的运维与调试操作手册。当处理 SeWise 项目的部署、Supabase 数据库连接问题、Blob 上传问题、AI 批改/评语问题，或准备决赛汇报时使用。
---

# SeWise 运维与调试手册

完整项目背景见 `v0_memories/user/sewise-project.md`。本 skill 聚焦“遇到具体问题时怎么做”。

## 触发场景 1：网页报 500 / ENOTFOUND / 数据库连不上
免费版 Supabase 闲置 7 天会自动冻结（状态 INACTIVE）。
步骤：
1. 用 ToolSearch 加载 `supabase_get_project`，查 project id `ocaakbmzppifwmrcrdrp` 的状态
2. 若为 INACTIVE，用 `supabase_restore_project` 恢复，等 1-2 分钟变 ACTIVE_HEALTHY
3. 提醒用户硬刷新（Ctrl+Shift+R）。恢复窗口期的历史报错不是 bug，勿改代码

## 触发场景 2：改了代码但生产没生效
GitHub webhook 可能失灵，合并 PR 不会自动部署。
步骤：用 CLI 手动部署：
`vercel deploy --prod --yes --scope team_LcLu6LwbxwNjBUGt9MaJCglR --archive=tgz`
（先 `set -a && source /vercel/share/.env.project && set +a`）

## 触发场景 3：Blob 上传报 “Cannot use X access on Y store”
代码已有自适应兜底（put 失败自动切另一种 access 重试）。
若仍失败，让用户在 Vercel 加环境变量 `BLOB_ACCESS_MODE=private` 或 `public` 后重新部署。

## 触发场景 4：AI 评语说一半就停 / 截断
评语已改为阶段 B 独立 generateText（lib/ai/grade.ts: generateTeacherCommentSafely）。
排查：看 Function Logs 里 `[v0] grade: stage-B` 日志，确认是否走了本地兜底。
勿把评语塞回主 generateObject schema——那正是截断根因。

## 通用纪律
- 改完必须硬刷新验证，不能只看编译通过
- 历史报错（时间戳落在 Supabase 恢复窗口）不要去“改代码消除”，治标不治本
- 只做必要的最小改动，不顺手重构无关代码
