# SeWise 账号迁移包

> 目的：换 v0 账号 / 换设备 / 防记忆丢失时，靠这个目录就能完整恢复上下文。
> 生成时间：2026-08-15

## 目录内容

```
docs/migration/
├── README.md          ← 本文件，迁移总清单
├── env-vars.md        ← 环境变量清单（只有名字，没有值）
├── memories/          ← v0 记忆文件备份（换账号会丢，这里是副本）
│   ├── MEMORY.md
│   ├── sewise-project.md
│   └── feishu-competition.md
└── skills/            ← 自定义 skill 备份（换账号会丢）
    ├── claude/                 运维调试手册
    ├── sewise-demo-guard/      演示前一键体检
    ├── disciplined-coding/     编码纪律
    └── frontend-design/        前端设计规范
```

## 关键身份信息（非密钥，可安全记录）

| 项目 | 值 |
|---|---|
| GitHub 仓库 | `hdxupt/v0-ai` |
| 当前工作分支 | `v0/sewise-1688405d` ⚠️ 不是 main，别拉错 |
| 生产域名 | https://v0-ai-eta-ashen.vercel.app |
| Vercel 项目 ID | `prj_NuT4gFUM0KJHoHka85cIdit4IDbE` |
| Vercel Team | `hd-xupt-5258s-projects` / `team_LcLu6LwbxwNjBUGt9MaJCglR` |
| Supabase 项目 ID | `ocaakbmzppifwmrcrdrp` |
| Blob store host | `jigncgd3pnqrwhjk.public.blob.vercel-storage.com`（public 类型） |
| 包管理器 | **pnpm**（用 npm install 会报 `workspace:*` 错误） |
| 测试账号 | 教师 `t1` / `teacher123`，学生 `s01` / `student123` |

## 迁移前必做（3 件事）

- [ ] **备份环境变量值** → 见 [env-vars.md](./env-vars.md) 第五节（`vercel env pull`）
- [ ] **确认这个 migration 目录已 commit 并 push** 到 GitHub
- [ ] 记下 Supabase 项目 ID，确认你有该 Supabase 账号的登录权限（不然数据拿不回来）

## 新账号恢复步骤

### 1. 代码
新 v0 项目连接 GitHub 仓库 `hdxupt/v0-ai`，**切到 `v0/sewise-1688405d` 分支**（或届时的最新工作分支）。

### 2. 记忆
在新账号第一次对话时说：

> 读 `docs/migration/memories/` 下的三个文件，把内容存成我的 v0 记忆（user 作用域）。
> 再读 `docs/migration/skills/` 下的四个 SKILL.md，重建成对应的 skill。

### 3. 环境变量
按 [env-vars.md](./env-vars.md) 第一节填 4 个必需变量。

### 4. 数据库
- **想保留现有数据**：Supabase URL + anon key 填**原项目**的值，数据完全不动，零迁移成本 ← 推荐
- **新建 Supabase**：需重跑建表 SQL + 重新导入演示数据（工作量大，比赛期别这么干）

### 5. 验证
```bash
vercel deploy --prod
```
然后硬刷新（Ctrl+Shift+R）访问，跑一遍：登录 → 看板 → 批改一份 → 生成报告。
AI 相关任一环失败，先查 `DASHSCOPE_API_KEY` 是否填对。

## 不会迁移、也无法迁移的东西

- **v0 对话历史**：跟账号绑定，无法导出。这也是记忆文件要写详细的原因
- **Vercel 部署域名**：新项目 = 新域名。如果比赛材料里写了演示链接，需要更新
- **旧 Blob 里的历史图片**：换 Blob store 后旧图 URL 失效（数据库里存的是完整 URL）

## 已知待修

- `memories/MEMORY.md` 里引用了 `unified-memory-project.md`（统一记忆库项目），但该文件在当前记忆库中**不存在**，是个断链。如果那个项目还需要，得重新补写
