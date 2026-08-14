# 用户记忆索引

## 当前主项目：SeWise（希沃 AI 学情看板）
课后作业 AI 闭环助手。极客杯决赛已夺冠，当前正备战**飞书AI先锋大赛**（不到4天，2026-08-13起）。

详细背景、技术栈、已修复的坑、运维清单，全部见：
- [sewise-project.md](./sewise-project.md) — **开新对话先读这个文件即可全面对齐**
- [feishu-competition.md](./feishu-competition.md) — **当前比赛的赛题/老师意见/策略/测试用例，备战期必读**

## 比赛期协作偏好
- 可尽情质疑用户判断，但别每个决定都要确认
- 重要回复末尾加"最需要我关注的三点内容"
- 同窗口重交互约15-20轮后主动建议换新对话窗口（记忆先更新好）

## 另一个项目：统一记忆库（Unified Memory）
独立、可迁移的私有 AI 记忆库，让 Claude/Cursor 等通过 API/MCP 共享调用、多设备同步。与 SeWise 无关。
- [unified-memory-project.md](./unified-memory-project.md) — 技术栈、接口、已切到 Qwen、全自动记忆模板、坑与待办

## 账号迁移包（2026-08-15 建好，已推 GitHub）
换 v0 账号 / 记忆丢失 / Supabase 出事，都先看仓库里的 `docs/migration/`：
- `README.md` 迁移总清单（仓库分支、项目 ID、5 步恢复流程）
- `env-vars.md` 变量清单 + 指纹校验表（**只有名字和前缀长度，无密钥值**）
- `schema.sql` 7 张表完整 DDL（已在临时 schema 实测执行通过）
- `seed.sql` 3 班 + 14 名师生，建表后执行即可登录
- `memories/`、`skills/` 三份记忆 + 四个 skill 的副本
真正必需的变量只有 4 个：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、
`DASHSCOPE_API_KEY`、`BLOB_READ_WRITE_TOKEN`（腾讯 OCR 仅回退链路用，可选）。
**变量值不在仓库里，必须自己另存**（`vercel env pull` 导出后放密码管理器）。

## 关键提醒（高频）
- Supabase 免费版闲置 7 天会冻结 → 用 `supabase_restore_project` 恢复（1-2 分钟）
- GitHub webhook 可能失灵 → 用 `vercel deploy --prod` CLI 手动部署，不要等自动部署
- 改完代码必须硬刷新（Ctrl+Shift+R）验证，不能只看编译通过
