# 迁移操作手册（手把手版）

> README.md 是"清单"，本文件是"每一步具体点哪里"。
> 全程约 30 分钟。**推荐走路线 A，完全不需要命令行。**

---

# 第一部分：备份环境变量（迁移前必做）

## 路线 A：在 Vercel 网页上手动抄（推荐，零命令行）

只有 4 个必需变量，手抄完全可行。

1. 浏览器打开 https://vercel.com/dashboard
2. 用**当前**账号登录，找到项目（team：`hd-xupt-5258s-projects`）
3. 点进项目 → 顶部 **Settings** → 左侧 **Environment Variables**
4. 你会看到变量列表，值被隐藏成 `••••••`
5. 找到下面这 4 个，逐个点右侧 **⋯** → **Edit**（或点值旁边的眼睛图标）就能看到明文：

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DASHSCOPE_API_KEY`
   - `BLOB_READ_WRITE_TOKEN`

6. 每个都**完整复制**（注意别漏尾部字符），粘贴到你的密码管理器
   （1Password / Bitwarden / 微信收藏都比没有好，但别发到群里）

**建议顺手也抄上这两个**（OCR 兜底用，可选）：
`TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`

> 抄完用 [env-vars.md](./env-vars.md) 第四节的指纹表核对一下长度，
> 比如 `DASHSCOPE_API_KEY` 应该是 `sk-` 开头、总长 35 位。
> 长度不对就是复制时漏了或多了空格。

## 路线 B：用 Vercel CLI 批量导出（会用命令行再选这条）

**在哪运行？** 你自己电脑的终端 —— Windows 用 PowerShell 或 Git Bash，
Mac 用「终端」App。**不是在 v0 网页里**，v0 网页没有终端。

前置条件：电脑装了 Node.js（`node -v` 能出版本号）。

```bash
# 1. 装 Vercel CLI（只需一次）
npm i -g vercel

# 2. 登录（会弹浏览器）
vercel login

# 3. 找个空文件夹进去
mkdir sewise-backup && cd sewise-backup

# 4. 关联项目（按提示选 hd-xupt-5258s-projects 下的项目）
vercel link

# 5. 导出全部变量
vercel env pull .env.backup.local
```

导出的 `.env.backup.local` 就是纯文本变量清单。
**复制进密码管理器后，把这个文件删掉**（放在电脑上就是明文密钥）。

> 如果第 4 步选项太多认不出，用项目 ID 核对：`prj_NuT4gFUM0KJHoHka85cIdit4IDbE`

---

# 第二部分：正式迁移到新账号

## 步骤 0：确认前提（1 分钟）

- [ ] 4 个变量的值已经在你手上（第一部分做完了）
- [ ] 你能登录**原 Supabase 账号**（数据在那里，跟 v0 账号无关）
- [ ] 新 v0 账号能访问 GitHub 仓库 `hdxupt/v0-ai`
      → 如果新账号是不同 GitHub 身份，先去仓库 Settings → Collaborators 把新身份加进去

## 步骤 1：新账号连接代码仓库（5 分钟）

1. 用新账号登录 https://v0.app
2. 新建一个 Chat（随便发一句话，比如"你好"，先把项目创建出来）
3. 点右上角**设置图标** → **Git**
4. 连接 GitHub → 授权 → 选仓库 `hdxupt/v0-ai`
5. **⚠️ 分支选 `v0/sewise-1688405d`，不要选 main**
   （main 是旧的，工作代码全在这个分支上。如果之后有更新的分支，选最新那个）
6. 等它拉取完，你应该能在文件树里看到 `app/`、`components/`、`lib/`、`docs/migration/`

## 步骤 2：填环境变量（5 分钟）

1. 右上角**设置图标** → **Vars**
2. 逐个添加（Key 填变量名，Value 粘贴你抄的值）：

   | Key | Value 从哪来 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | 你抄的（**填原项目的**，数据才在） |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你抄的（同上） |
   | `DASHSCOPE_API_KEY` | 你抄的 |
   | `BLOB_READ_WRITE_TOKEN` | 见下方说明 |

3. **关于 `BLOB_READ_WRITE_TOKEN` 的选择：**

   - **想让历史作业图片还能看见** → 填**原来的** token
     （图片 URL 存在数据库里，指向原 Blob store）
   - **不在乎历史图片** → 在新账号连一个新 Blob 存储，用新 token
     旧图会全部裂开，但新上传的正常

4. **可选**：`TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`（OCR 兜底，不填也能跑）

> `POSTGRES_*` 那一堆、`SUPABASE_SERVICE_ROLE_KEY`、`ANTHROPIC_API_KEY`、
> `AI_GATEWAY_*` **都不用填**，应用代码根本没用到（详见 env-vars.md 第三节）。

## 步骤 3：恢复 AI 记忆和 skill（2 分钟）

在新账号的对话框里，**原话发这段**：

```
读 docs/migration/memories/ 下的三个 md 文件，把内容存成我的 v0 记忆（user 作用域）。
再读 docs/migration/skills/ 下的四个 SKILL.md，重建成对应的 skill。
最后读 docs/migration/README.md 和 feishu-competition.md 跟我对齐项目现状。
```

这样新账号的 AI 就恢复了全部项目上下文（技术栈、踩过的坑、比赛策略、运维手册）。

## 步骤 4：验证（10 分钟）

**先在 v0 预览里测**，全过了再部署：

1. 打开预览 → 用 `t1` / `teacher123` 登录教师端
2. 看板能加载出班级和学生 → **说明 Supabase 通了**
3. 随便点一份作业 → 生成诊断报告 → 能出内容 → **说明 DASHSCOPE_API_KEY 通了**
4. 退出，用 `s01` / `student123` 登录学生端
5. 交一份作业（上传张图）→ 能上传成功 → **说明 BLOB_READ_WRITE_TOKEN 通了**
6. 点"生成针对性练习"→ 等 40~60 秒 → 能出题 → **AI 链路完全正常**

哪一步挂了，对应查哪个变量，别乱改代码。

## 步骤 5：部署上线

点 v0 右上角 **Publish** 按钮即可（不需要命令行）。
部署完是**新域名**，如果比赛材料、PPT、二维码里写了旧链接，记得全部更新。

---

# 常见问题

**Q：迁移后数据会丢吗？**
不会 —— 只要 Supabase 的 URL + anon key 填的是原项目。
数据存在 Supabase，Supabase 项目不属于 v0 账号，换 v0 账号它不受影响。

**Q：原来的域名还能用吗？**
旧账号的项目不删就还能访问。新账号是新域名，两个可以并存一段时间。

**Q：v0 里的历史对话能带过去吗？**
不能，无法导出。这就是为什么步骤 3 的记忆恢复很重要 —— 记忆文件替代了对话历史。

**Q：登录进去一片空白 / 报 500？**
99% 是 Supabase 两个变量填错（多了空格、少了尾字符）。
用 env-vars.md 第四节的指纹表核对长度：anon key 应该是 208 位。

**Q：AI 功能全挂，报 rate limit 或 401？**
查 `DASHSCOPE_API_KEY`。注意**不是** `ANTHROPIC_API_KEY` 也**不是** AI Gateway ——
那两条路都已废弃（一个组织被禁用、一个免费额度限流），项目现在只走阿里云百炼。

**Q：Supabase 打不开 / 显示 paused？**
免费版闲置 7 天会冻结，**不是数据丢了**。在 Supabase 控制台点 Restore，
或让 AI 用 `supabase_restore_project` 恢复，1~2 分钟就好。**千万别急着重建库。**

**Q：非要重建数据库怎么办？**
Supabase SQL Editor 里先跑 [schema.sql](./schema.sql)，再跑 [seed.sql](./seed.sql)。
建好 7 张表 + 14 名师生就能登录了，但历史作业和批改结果找不回来。

---

# 比赛期特别提醒

**距飞书 AI 先锋大赛不到 4 天的情况下，强烈不建议换账号。**

迁移必然带来：新域名、重填变量、重建记忆、重新验证。任何一环出问题都可能耽误提交。
这份迁移包的作用是**保险**（万一账号出事能恢复），不是催你现在就搬。

真要搬，等比赛结束后再搬。
