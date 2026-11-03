# Palette Lab · Ainvest 配色实验台

- **线上地址：** https://xin-deep.github.io/ainvest-chart-color-lab/
- **手机预览：** https://xin-deep.github.io/ainvest-chart-color-lab/aime.html

把候选色板放进接近真实产品的页面里，对比基线和修改结果，并检查色差、色觉缺陷和对比度。变更记录见 [CHANGELOG](CHANGELOG.md)。

## 功能

- **五个场景：** Aime 对话、财报分析、自由看板、web 市场、Terminal 工作区，均支持浅色和深色。
- **调色：** 分类色、涨跌色、界面色独立编辑，支持 OKLCH、HSB、HEX、RGB、HSL，以及 A/B 对比、撤销和 JSON 导入导出。
- **分类色顺序：** 可拖动排序、添加和删除，同时作用于浅色和深色；涨跌色和界面色位置固定。
- **预置色板：** Ainvest 原始、Claude、TradingView、Simply Wall St、Robinhood，在 [presets.js](dist/data/presets.js) 维护。
- **色值检验：** OKLCH 分布、ΔE、色觉缺陷模拟和 WCAG 对比度。
- **Aime 图表表头：** 单张图表显示复制、下载、全屏；可切换的图表显示页码和更多，可在模块设置里调整。这些控件目前只是模板展示，点击没有效果。
- **手机分享：** 固定只读链接实时同步，也可以生成不再更新的静态快照。

图表使用固定演示数据，不是实时行情。方案默认保存在各自的浏览器中。

改色都在原色板上进行：我的方案直接改并自动保存；预置色板的修改单独保留在原标签上（显示「已修改」），再次点击当前标签或点「恢复原始」回到原始色值。需要另留一份时用「另存为」。

折柱组合图的柱子用「分类色」，折线用「折线色」；纯折线图仍用分类色。全球热力图的底图和国旗从 jsDelivr 加载，是唯一需要联网的图表。

## 手机分享

在 Aime 场景点「分享手机预览」→「获取固定链接」，把 `aime.html?live=…` 发给查看者。手机预览页（`aime.html`）和手机打开网站时都只显示 Aime 对话，并且只读；其他场景和编辑只在电脑或平板的网站上提供。

- **同步内容：** 配色、模块和色板列表（预置色板和已保存方案）会自动同步。**拿到链接的人都能看到已保存方案及其名称。**
- **再次分享：** 同一浏览器复用原链接，并把内容更新为当前配色。
- **查看者：** 只读，可以自行切换主题和色板，这些选择不会写回方案。顶部绿点表示已连接，红点表示断连。
- **编辑权限：** 凭证只保存在创建链接的浏览器中，清理存储后无法恢复，只读链接也不能复制出副本，需要编辑的方案请提前导出 JSON。目前没有账号和撤销链接功能。

## 本地运行

需要 Node.js 18+，运行本身不需要安装依赖。

```sh
npm run dev      # http://127.0.0.1:4317
npm ci           # 跑测试或重建依赖前执行一次
npm run check
npm test
```

**注意：** `dist/sync-config.json` 已配置线上 Supabase，本地创建的固定链接也会写入线上。调试时把其中的 `url` 和 `publishableKey` 都留空（不要提交），就会改用本地 Node 同步服务，数据存到 `.data/live-sessions/`。

## 开发

`dist/` 既是源码也是发布目录，没有构建步骤。合并到 `main` 后由 GitHub Actions 发布到 Pages。

| 路径 | 内容 |
|---|---|
| `dist/app.js` | 工具界面与状态 |
| `dist/scenes/` | 各场景页面 |
| `dist/lib/` | 颜色转换、色板导入、同步客户端 |
| `dist/data/` | 预置色板与场景参考数据 |
| `scripts/` | 本地服务与构建脚本 |
| `supabase/` | 数据库迁移和[接入步骤](supabase/SETUP.md) |
| `tests/` | 单元测试，用 `npm test` 运行 |

web 和 Terminal 场景带大量参考数据，在 `app.js` 里按需加载，不要改回静态导入。`aime.html` 列出了首屏模块用于预加载，新增或删除首屏模块时要同步更新，测试会检查。

**改完 `dist/` 要重建离线版并一起提交：** 执行 `npm run build:preview` 更新 `preview.html`。它不随 Pages 发布，CI 也不检查它是否最新。

重建第三方依赖时才需要下面的命令，上游版本记录在 `dist/vendor/vis-lab/UPSTREAM.json`：

```sh
npm run build:vis       # Vis Lab 图表引擎
npm run build:supabase  # Supabase SDK
```

## 色板数据格式

`schemaVersion: 1` 的色板包含 `name`、`source`、`availableThemes`、`themes.light`、`themes.dark`。每个主题包含 `categorical`、`semantic`、`surface`，颜色项使用 `id`、`name`、`hex`。

- `semantic` 顺序：上涨、下跌。
- `surface` 顺序：页面背景、卡片背景、主要文字、次要文字、分隔线、网格线。

Aime 对话有自己的界面色：未修改的界面色显示为对话页的默认值，Claude 和 Robinhood 还有专属背景（见 `presets.js` 的 `aimeBackgrounds`）。在 Aime 场景，控制台显示这些实际值，导出的 JSON 仍是 `surface` 里的原值。

## 自托管 Node 同步服务（可选）

优先使用 Supabase。如需自托管，用 `node scripts/serve.mjs` 启动，并把 `dist/sync-config.json` 的 `provider` 改为 `node`、`apiBase` 设为服务的 HTTPS 地址。

环境变量：`HOST`、`PORT`、`SYNC_DATA_DIR`（持久化目录的绝对路径）、`ALLOWED_ORIGINS`（允许的前端 origin，逗号分隔）。它只支持单进程，代理不要缓冲 `/api/sessions/:id/events`。
