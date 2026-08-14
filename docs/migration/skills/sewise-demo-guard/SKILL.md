---
name: sewise-demo-guard
description: SeWise 演示/汇报前的一键护航体检流程。当用户说"准备演示""演示护航""跑一遍体检""要汇报/答辩""检查环境是否正常""数据库激活了吗""部署是不是最新的"，或在任何正式 demo 前需要确保线上环境可用时使用。这是主动预防流程，区别于 claude skill 的被动救火。
---

# SeWise 演示护航体检

正式演示前按顺序跑完下面 5 步，确保线上环境 100% 可用。完整背景见 `v0_memories/user/sewise-project.md`，救火手册见 `claude` skill。

**关键常量**
- Supabase project id：`ocaakbmzppifwmrcrdrp`
- 生产域名：`https://v0-ai-eta-ashen.vercel.app`
- Vercel scope：`team_LcLu6LwbxwNjBUGt9MaJCglR`
- 关键路由：`/`（首页）、`/login`、`/architecture`（架构图）、`/impact`（数据看板，需登录）、`/pitch.html`（汇报幻灯，免登录）、`/arch.html`（架构图页，免登录）

执行时**逐步汇报每步结果**，全绿才算护航通过。任一步红灯，先修复再继续，不要跳过。

---

## 步骤 1：激活并确认 Supabase（最高优先，最常踩）
免费版闲置 7 天冻结 → 网页会 500 / ENOTFOUND。
1. ToolSearch 加载 `supabase_get_project`，查 `ocaakbmzppifwmrcrdrp` 状态。
2. 若状态不是 `ACTIVE_HEALTHY`：用 `supabase_restore_project` 恢复，然后**每 30-60s 轮询一次 `supabase_get_project`**，直到 `ACTIVE_HEALTHY`（通常 1-2 分钟，中间会经过 RESTORING 状态）。
3. 汇报最终状态。状态没到 `ACTIVE_HEALTHY` 不要进入下一步。

## 步骤 2：探活生产域名
对每个关键路由发请求，确认返回 200（`/` 和 `/architecture` 未登录返回 307 重定向到 /login 属正常）。
```bash
for p in /login /pitch.html /arch.html; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://v0-ai-eta-ashen.vercel.app$p")
  echo "$p -> $code"
done
```
- 全 200 → 通过。
- 出现 500/000/ENOTFOUND → 多半是步骤 1 没真正生效（500=数据库冻结的典型症状），回去复查 Supabase；或代码未部署，走步骤 3。

## 步骤 3：确认线上是最新代码（按需）
GitHub webhook 可能失灵，合并 PR 不一定触发部署。若最近改过代码且不确定是否上线：
```bash
set -a && source /vercel/share/.env.project && set +a
vercel deploy --prod --yes --scope team_LcLu6LwbxwNjBUGt9MaJCglR --archive=tgz
```
部署需要用户授权（涉及生产环境），调用前用 Bash 的 requestPermission 说明清楚。部署完重新跑步骤 2 探活。
> 注意：纯演示、没改代码时可跳过此步，避免不必要的生产变更。

## 步骤 4：浏览器视觉确认
用 agent-browser 真机打开生产域名截图，确认页面真渲染出来了（探活只证明返回 200，不证明界面没白屏）。
```bash
agent-browser set viewport 1440 900
agent-browser open "https://v0-ai-eta-ashen.vercel.app/login"
agent-browser wait --load networkidle
agent-browser screenshot /tmp/agent-browser/guard-login.png
```
- 登录页正常 → 视觉通过。
- 若要演示批改详情/看板，也截一张对应路由，确认标注、雷达图、评语都在。
- 已知坑：agent-browser 在生产域名上登录态可能建立失败（cookie 问题），不影响真人浏览器登录；可改用 localhost 预览验证登录后页面。
- 白屏/报错 → 读 `user_read_only_context/v0_debug_logs.log` 排查，对照 `claude` skill 的触发场景。

## 步骤 5：输出护航报告
给用户一份清单式总结，例如：
```
演示护航体检结果
[OK] Supabase：ACTIVE_HEALTHY
[OK] 探活：/login 200, /pitch.html 200, /arch.html 200
[OK] 部署：已确认最新（或：本次未改代码，跳过）
[OK] 视觉：登录页 / 看板渲染正常
结论：可以演示
```
并复述演示当天的人为动作提醒：
- 当天早上再跑一次本护航流程（数据库随时可能因闲置冻结）。
- 演示走 HTTPS 域名，不要走 IP。
- 任何改动后硬刷新 Ctrl+Shift+R。

---

## 纪律
- 严格按 1→5 顺序，前一步红灯不进下一步。
- 步骤 3 涉及生产部署，必须先取得用户授权。
- 历史报错（时间戳落在 Supabase 恢复窗口内）属正常，不要去改代码"消除"。
- 这是预防流程；真出了具体故障，转 `claude` skill 对症排查。
