-- =============================================================================
-- SeWise 数据库结构（Supabase / PostgreSQL）
--
-- 用途：Supabase 项目丢失、被删除或迁移到新账号时，用本脚本重建全部表结构。
-- 生成方式：2026-08-15 从线上库实时探测列结构 + 交叉核对 lib/types.ts 类型定义。
-- 执行方式：Supabase 控制台 → SQL Editor → 粘贴执行（幂等，可重复跑）。
--
-- 注意 id 类型不统一，这是历史设计，勿"顺手统一"成 uuid：
--   classes.id / app_users.id  = text（人造短 ID，如 "c1" / "t1" / "s01"，演示可读性优先）
--   tasks / submissions / notifications / activities.id = uuid（自动生成）
-- app_users.id 是 text，因此所有引用它的外键列（teacher_id / student_id / user_id
-- / actor_id）也必须是 text。
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. classes 班级
-- ---------------------------------------------------------------------------
create table if not exists public.classes (
  id            text primary key,          -- 如 "c1"
  name          text not null,             -- 如 "初二(3)班"
  grade         text not null,             -- 如 "初二"
  student_count integer not null default 0,
  display_order integer not null default 0 -- 看板/下拉排序，班级上下文取 order 最小者
);

-- ---------------------------------------------------------------------------
-- 2. app_users 用户（教师 + 学生同表，用 role 区分）
-- ---------------------------------------------------------------------------
create table if not exists public.app_users (
  id            text primary key,          -- 教师 "t1"、学生 "s01"
  name          text not null,
  role          text not null check (role in ('teacher','student')),
  subject       text,                      -- 仅教师有意义（"数学"/"英语"），学生为 null
  class_id      text references public.classes(id),
  -- 重要：教师的 class_id 恒为 null（教师带多个班，不挂在单班上）。
  -- 需要教师的班级上下文时，取 classes 表 display_order 最小的班，
  -- 见 app/api/chat/route.ts 的 resolveTeacherClassId()。
  student_no    text,                      -- 学号，教师为 null
  avatar_color  text not null default '#2563eb',
  display_order integer not null default 0,
  password      text not null,             -- 演示项目为明文，生产环境必须换成哈希
  created_at    timestamptz not null default now()
);
create index if not exists app_users_role_class_idx on public.app_users (role, class_id);

-- ---------------------------------------------------------------------------
-- 3. tasks 作业任务
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  subject              text not null,
  class_ids            text[] not null default '{}',   -- 一个任务可布给多个班
  requirements         text not null default '',
  notes                text,
  due_at               timestamptz not null,
  estimated_minutes    integer not null default 30,
  teacher_id           text not null references public.app_users(id),
  teacher_name         text not null,
  status               text not null default 'active'
                         check (status in ('draft','active','closed')),
  target_student_count integer not null default 0,
  created_at           timestamptz not null default now(),
  deleted_at           timestamptz,          -- 软删除：null=活跃，非空=回收站
  answer_key_urls      text[] default '{}',  -- 标准答案图片 URL（批改时作参照注入）
  answer_key_text      text,                 -- 标准答案文本（与图片二选一或并用）
  scoring_notes        text                  -- 关键得分点/评分备注，留空则 AI 自行评估
);
create index if not exists tasks_status_deleted_idx on public.tasks (status, deleted_at);
create index if not exists tasks_teacher_idx on public.tasks (teacher_id);

-- ---------------------------------------------------------------------------
-- 4. submissions 提交与批改结果（核心表）
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references public.tasks(id) on delete cascade,
  student_id       text not null references public.app_users(id),
  student_name     text not null,
  class_id         text not null references public.classes(id),
  image_urls       text[] not null default '{}',  -- Vercel Blob 上的作业图片
  note             text,
  status           text not null default 'submitted'
                     check (status in ('submitted','grading','graded')),
  score            integer,                       -- 未批改时为 null
  total_score      integer not null default 100,
  ai_comment       text,
  teacher_comment  text,
  ai_issues        jsonb,   -- 批改主结果。v2 结构见 lib/types.ts:AIGradingV2
                            -- （summary / correction_details / radar_analysis /
                            --   question_verdicts 红笔留痕数据源）
                            -- 旧数据可能是 v1 数组，前端用 isAIGradingV2() 判别
  weak_points      jsonb default '[]'::jsonb,     -- 字符串或对象数组，用 normalizeWeakPoints() 归一
  ocr_data         jsonb,   -- 腾讯云 OCR 转录缓存，重批改时复用避免重复调用
  practice_data    jsonb,   -- AI 变式题闭环数据，学生点"生成练习"后按需写入
  submitted_at     timestamptz not null default now(),
  graded_at        timestamptz
);
create index if not exists submissions_task_idx on public.submissions (task_id);
create index if not exists submissions_student_idx on public.submissions (student_id);
create index if not exists submissions_status_idx on public.submissions (status);

-- ---------------------------------------------------------------------------
-- 5. notifications 通知
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null references public.app_users(id) on delete cascade,
  type                  text not null check (type in
                          ('new_homework','reminder','submission_received','graded','system')),
  title                 text not null,
  content               text not null default '',
  related_task_id       uuid references public.tasks(id) on delete set null,
  related_submission_id uuid references public.submissions(id) on delete set null,
  read                  boolean not null default false,
  urgent                boolean not null default false,
  created_at            timestamptz not null default now()
);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read);

-- ---------------------------------------------------------------------------
-- 6. activities 动态流（班级实时动态看板数据源）
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  class_id    text references public.classes(id),
  type        text not null check (type in
                ('submit','view','graded','reminder_sent','new_task','late_warning')),
  actor_id    text references public.app_users(id),
  actor_name  text,
  target_id   text,
  target_name text,
  task_id     uuid references public.tasks(id) on delete cascade,
  description text not null default '',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activities_class_created_idx on public.activities (class_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. label_samples 评分溯源标注集
--    批改时把每道错题从原图裁出来（crop_url + bounding_box），
--    用于「AI 说错在哪，就把那一处圈出来给你看」的溯源展示与准确率标注。
--    应用代码不直接读写此表，由标注脚本 / service role 写入。
-- ---------------------------------------------------------------------------
create table if not exists public.label_samples (
  id               bigserial primary key,
  submission_id    uuid not null references public.submissions(id) on delete cascade,
  detail_index     integer not null,          -- 对应 submissions.ai_issues 里的第几条
  page_index       integer not null default 0,-- 多页作业的页码
  crop_url         text not null,             -- 裁剪图 Blob URL
  source_image_url text not null,             -- 原图 URL
  bounding_box     jsonb not null,            -- 裁剪框 {x,y,w,h}
  question_text    text,
  correct_answer   text not null,
  student_answer   text,
  ai_type          text,                      -- AI 判定的错误类型
  ai_analysis      text,
  label            text,                      -- 人工标注结论（准确率统计用）
  labeled_at       timestamptz,
  quality          text,
  locate_method    text,                      -- 定位方式（OCR 匹配 / 视觉等）
  locate_score     numeric,                   -- 定位置信度
  matched_text     text,
  line_count       integer,
  created_at       timestamptz default now()
);
create index if not exists label_samples_submission_idx
  on public.label_samples (submission_id, detail_index);

-- =============================================================================
-- RLS 说明（与线上实际状态一致，2026-08-15 核对）
--
-- 6 张业务表（classes / app_users / tasks / submissions / notifications /
-- activities）RLS 全部【关闭】：应用用自建 cookie 会话（lib/auth-server.ts），
-- 服务端一律用 SERVICE_ROLE_KEY 访问，权限在 API 路由里校验。
--
-- label_samples 的 RLS 是【开启且零策略】，等价于只有 service role 能访问，
-- 匿名 key 一行都读不到。重建时要保持这个状态：
alter table public.label_samples enable row level security;
--
-- 这是演示/比赛项目的取舍。若要转为生产，必须：
--   1. 迁到 Supabase Auth，让 auth.uid() 可用
--   2. 对业务表逐一 enable row level security 并编写 policy
--   3. 前端停止使用 service role key
-- 在当前架构下贸然给 6 张业务表开 RLS 会导致所有查询返回空，功能全挂。
-- =============================================================================

-- =============================================================================
-- 重建后需要补的数据
--
-- 表结构建好后库是空的，演示数据需要另行导入：
--   1. classes：3 个班
--   2. app_users：1 名教师（t1）+ 13 名学生（s01~s13），注意 password 字段
--   3. tasks / submissions：演示用作业与批改结果
--   4. label_samples：溯源标注集（可留空，不影响演示主流程）
--
-- 注意：旧的图片 URL 指向旧 Blob store，换了 BLOB_READ_WRITE_TOKEN 后
-- 即使导入旧 submissions 数据也看不到作业图，需重新上传。
--
-- 迁移时的推荐做法：不要重建，而是直接复用原 Supabase 项目
-- （在新账号里填入原项目的 URL + key 即可，数据零丢失）。
-- 本脚本是原项目彻底不可用时的最后保险。
-- =============================================================================
