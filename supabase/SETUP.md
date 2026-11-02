# Supabase 免费版接入

网站仍由 GitHub Pages 提供；Supabase 保存配色并通过 Realtime 推送。无需再租 Node 云服务器。

## 1. 创建项目

选择 Free 组织、靠近主要使用者的区域。GitHub 绑定可留空。保持 Enable Data API 开启，关闭 Automatically expose new tables；可开启 automatic RLS。数据库密码自行保存，不放入网页或 Git。

## 2. 执行数据库初始化

在 Supabase 左侧 SQL Editor 新建查询，将 `supabase/migrations/202611020001_aime_live.sql` 的全部内容粘贴执行。

脚本会创建方案表、私有编辑凭证及成员表、权限策略和三个业务 RPC，并把方案表加入 `supabase_realtime` publication。可重复执行。不能只创建表而跳过函数/权限部分。

执行后可以在数据库的 Publications 设置中确认 `supabase_realtime` 包含 `public.aime_live_sessions`。私有表不要添加到 Realtime，也不要将 `aime_private` 添加到 Data API 的 exposed schemas。

## 3. 开启匿名登录

在 Authentication 的 Sign In / Providers 设置中启用 **Anonymous Sign-Ins** 并保存。这里的匿名会话是后台身份，使用者不需要输入邮箱、密码或注册。

匿名身份属于 `authenticated` 数据库角色，和没有登录的 `anon` API 角色不同。脚本仅允许前者调用业务函数，查看权限仍由具体方案的成员关系决定。

## 4. 填入两个公开配置值

从项目的 Connect 窗口或 Settings / API Keys 中取得 **Project URL** 和 **Publishable Key**。

修改 `dist/sync-config.json`：

```json
{
  "provider": "supabase",
  "url": "https://你的项目标识.supabase.co",
  "publishableKey": "sb_publishable_你的公开Key",
  "apiBase": ""
}
```

可使用旧版 `anon` JWT，但新项目优先使用 Publishable Key。**不要填入 `sb_secret_…`、`service_role`、数据库密码或数据库连接串。** 配置本来就会被浏览器看到；数据权限由 RLS 和 RPC 中的编辑凭证保护。程序会拒绝识别出的服务端 Key。

这两个值完整填写后，本地页面也会连接 Supabase；都留空时，本地仍使用 Node 演示服务，线上则明确提示尚未配置。

## 5. 本地验证和发布

- 运行 `npm run dev`，打开 `http://127.0.0.1:4317/?scene=aime`，点击分享并创建一个新的固定链接。
- 用另一个浏览器打开只读链接，确认没有调色入口。电脑改色后，查看页应自动更新。
- 刷新查看页，确认保存的颜色仍存在。
- 点击「复制为我的方案」，修改副本，确认原方案不变。
- 将代码和公开配置提交到 GitHub，合并到 main，等待 Pages 自动部署。Supabase 不需要 Node 服务器、持久化磁盘或跨域环境变量。
- 在线验证必须使用在线网站创建的新链接。localhost 链接只在本机可用。

本地 Node 演示的记录不会自动导入 Supabase。旧本地固定链接也不会迁移；可以在首页恢复已有的本地配色，或使用完整实验 JSON 导入，然后重新创建固定链接。电脑和手机都应使用同一个前端网站；不同 origin 的浏览器存储互不共享。

## 权限模型

- 表的公开 API 仅授予 authenticated 用户 SELECT；RLS 仅允许读取已加入的方案，因此无法通过列表 API 枚举其他人的方案。
- 打开随机固定链接后，通过 RPC 加入该方案的查看成员。链接相当于查看凭证，转发即允许接收者查看。
- 写入只允许通过 RPC，必须提交创建浏览器保存的独立编辑凭证和匹配的 revision。编辑凭证的 SHA-256 存在私有表，不进入链接、公开表或 Realtime 消息。
- 同时编辑的过期版本会收到 409，并暂停同步；只读用户无凭证会收到 403。
- 浏览器保存匿名会话和编辑凭证；清理存储后不能恢复原编辑权，但可复制为新方案。当前没有账号登录、编辑权恢复或链接撤销。
- 每个匿名身份最多创建 100 个方案。项目管理员删除该匿名用户会连同删除其创建的方案，请不要直接套用删除全部匿名用户的清理 SQL。

Realtime 连接正常时即时推送；每 15 秒补取一次最新版本，覆盖后台标签页、短暂断线或订阅间隙。初次连接失败时会自动尝试恢复。免费项目可能因长时间不活跃而暂停，需要在 Supabase 后台恢复。

## 检查和 SDK 重建

运行 `npm ci`、`npm run check`、`npm test`。数据库权限测试使用 PGlite 中的真实 PostgreSQL/PLpgSQL 执行迁移、RLS 与 RPC，不需要云端密码。

`npm run build:supabase` 从固定版本的官方 SDK 重建 `dist/vendor/supabase.bundle.js`；构建产物已入库，运行网站不从第三方 CDN 动态下载 SDK。`npm run build:preview` 更新离线单文件。离线单文件继续只支持本地调色及 JSON 导出，不连接 Supabase。

## 官方资料

- API Key：https://supabase.com/docs/guides/getting-started/api-keys
- Anonymous Sign-Ins：https://supabase.com/docs/guides/auth/auth-anonymous
- RLS：https://supabase.com/docs/guides/database/postgres/row-level-security
- Realtime：https://supabase.com/docs/guides/realtime/postgres-changes
