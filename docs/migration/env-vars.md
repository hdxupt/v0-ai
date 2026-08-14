# 环境变量清单（迁移必读）

> ⚠️ **本文件只记录变量名和取值来源，绝不记录变量值。**
> 密钥值永远不要提交进 Git 仓库。备份方式见文末。

## 一、真正必需的变量（只有 4 个！）

经全代码扫描（`grep process.env`）确认，缺了这些应用**跑不起来**：

| 变量名 | 用途 | 缺了会怎样 | 取值来源 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 连接 | 所有页面 500，登录不了 | Supabase 控制台 → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 连接 | 同上 | 同上页面 → Project API keys → `anon` `public` |
| `DASHSCOPE_API_KEY` | **所有 AI 功能** | 批改/评语/报告/教研助手/变式练习全挂 | 阿里云百炼控制台 → API-KEY 管理 |
| `BLOB_READ_WRITE_TOKEN` | 作业图片上传 | 学生交不了作业 | Vercel → Storage → 该 Blob store → `.env.local` 标签页 |

> 注：`BLOB_READ_WRITE_TOKEN` 在代码里搜不到 `process.env`，因为 `@vercel/blob` SDK 自动读取。**别因为搜不到就以为不需要。**

## 二、可选变量（降级可用）

| 变量名 | 用途 | 缺了会怎样 |
|---|---|---|
| `TENCENT_SECRET_ID` | OCR 兜底链路 | 主链路（Qwen3-VL）正常时无影响；主链路失败时无法回退 |
| `TENCENT_SECRET_KEY` | 同上 | 同上 |
| `GRADING_PIPELINE` | 设为 `legacy` 可强制走旧链路 | 不设即用新链路（正常） |

## 三、已作废 / 不用管的变量

| 变量名 | 状态 |
|---|---|
| `ANTHROPIC_API_KEY` | ❌ 组织已被禁用，调用必失败。留着无害，别依赖 |
| `AI_GATEWAY_PRIVATE_KEY` / `AI_GATEWAY_API_KEY` | ⚠️ 免费额度已限流。文本生成已全部改走 DashScope，不再依赖 |
| `POSTGRES_*`（7 个） | Supabase 集成自动注入，**应用代码从未引用**。迁移时不用手动填 |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` / `SUPABASE_JWT_SECRET` 等 | 应用代码未引用（只用 anon key）。仅调试脚本偶尔用到 |

## 四、如何安全备份变量值

**推荐做法：用 Vercel CLI 拉到本地（值不经过任何第三方）**

```bash
# 在本地项目目录执行
vercel link                                  # 关联到当前项目
vercel env pull .env.backup.local            # 拉取所有变量到本地文件
```

`.env.backup.local` 会被 `.gitignore` 的 `.env*.local` 规则自动忽略，不会误提交。
拉完后把这个文件**复制到密码管理器**（1Password / Bitwarden / KeePass）或本地加密盘，然后可以删掉。

**验证没有误提交：**
```bash
git status --short | grep -i env      # 应该没有任何输出
```

## 五、新账号恢复步骤

1. 在新 v0 项目里连接 GitHub 仓库 `hdxupt/v0-ai`，切到工作分支
2. 打开项目设置 → **Vars**，把第一节的 4 个必需变量逐个填入
3. 如果要保留原有数据：Supabase 填**原项目**的 URL + anon key（数据完全不动）
4. 如果新建了 Blob store：`BLOB_READ_WRITE_TOKEN` 用新的，但**历史图片 URL 会失效**（旧图存在旧 store）
5. 部署验证：`vercel deploy --prod`，然后硬刷新访问，测一次批改确认 AI 通了
