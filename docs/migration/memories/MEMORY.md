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

## 关键提醒（高频）
- Supabase 免费版闲置 7 天会冻结 → 用 `supabase_restore_project` 恢复（1-2 分钟）
- GitHub webhook 可能失灵 → 用 `vercel deploy --prod` CLI 手动部署，不要等自动部署
- 改完代码必须硬刷新（Ctrl+Shift+R）验证，不能只看编译通过
