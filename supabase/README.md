# Supabase 数据库部署

项目已包含 PostgreSQL 迁移文件 `migrations/202608060001_users_and_words.sql`。

部署方式任选其一：

1. 在 Supabase Dashboard 的 **SQL Editor** 中粘贴并执行迁移文件。
2. 已关联 Supabase CLI 时，在项目根目录运行 `npx supabase db push`。

迁移会创建：

- `profiles`：与 `auth.users` 一对一关联的用户资料表。
- `words`：用户自定义单词表，包含单词、音标、释义和等级。
- 新用户资料自动创建触发器。
- 按 `auth.uid()` 隔离数据的 Row Level Security 策略。

前端注册使用 Supabase Email/Password Auth。若项目开启邮箱验证，注册后用户需要先点击确认邮件中的链接。
