# SeWise 账号迁移包

> 目的：换 v0 账号 / 换设备 / 防记忆丢失时，靠这个目录就能完整恢复上下文。
> 生成时间：2026-08-15

## 👉 第一次操作请直接看 [HOWTO.md](./HOWTO.md)

那份是手把手的（点哪个按钮、命令在哪运行、每步怎么验证）。
本文件是速查清单，适合已经熟悉流程后回来对照。

## 目录内容

```
docs/migration/
├── README.md          ← 本文件，迁移总清单（速查）
├── HOWTO.md           ← 【手把手操作手册】不知道从哪下手就看这个
├── env-vars.md        ← 环境变量清单（只有名字，没有值）
├── schema.sql         ← 数据库建表脚本（Supabase 彻底丢失时的最后保险）
├── seed.sql           ← 班级 + 师生名单（建表后恢复，让系统可登录）
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

**方案 A：复用原 Supabase（强烈推荐）**
新账号的环境变量里填**原项目**的 Supabase URL + anon key，数据完全不动，零迁移成本。
Supabase 项目本身不属于 v0 账号，换 v0 账号不影响它。

**方案 B：原 Supabase 彻底不可用时才走这条**
1. 新建 Supabase 项目
2. SQL Editor 执行 [schema.sql](./schema.sql) → 建好 7 张表
3. SQL Editor 执行 [seed.sql](./seed.sql) → 恢复 3 个班 + 14 名师生，此时已可登录
4. 作业与批改数据（tasks / submissions）无法恢复 —— 需重新布置作业、重新上传批改。
   注意旧图片 URL 指向旧 Blob store，即使导入旧数据也看不到图

> 库被闲置冻结 ≠ 数据丢失。免费版闲置 7 天冻结，用 `supabase_restore_project`
> 恢复即可（1~2 分钟），不要因为访问不了就重建。

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
