# Palette Lab

Ainvest 图表配色实验台：把候选色板放进接近真实产品的页面里对比和检验。使用说明见 [README](README.md)。

## 运行和检查

```sh
npm run dev            # http://127.0.0.1:4317
npm ci                 # 跑测试前执行一次
npm run check
npm test
npm run build:preview  # 改完 dist/ 必须执行，并提交 preview.html
```

## 技术栈

原生 ES modules、HTML 和 CSS，没有框架和构建步骤。图表用打包好的 Vis Lab（D3），同步用 Supabase，备用本地 Node 服务。合并到 `main` 后由 GitHub Actions 把 `dist/` 发布到 Pages。

## 目录

- `dist/`：既是源码也是发布目录。`app.js` 是界面与状态，`scenes/` 是各场景，`lib/` 是工具，`data/presets.js` 是预置色板。
- `preview.html`：由 `dist/` 生成的离线单文件，不随 Pages 发布，CI 也不检查它是否最新。
- `scripts/`：本地服务和构建脚本。`supabase/`：数据库迁移和接入步骤。`tests/`：`node --test`。

## 容易踩的坑

- **本地测试会写线上：** `dist/sync-config.json` 已配置线上 Supabase，本地创建固定链接也会写入线上。测试分享功能时，在临时副本里把 `url` 和 `publishableKey` 留空，改走本地 Node 服务；不要提交清空后的配置。
- **Pages 上线即公开：** 合并到 `main` 会直接发布，已保存方案也会随固定链接同步给查看者。
- **手机端只读且只有 Aime：** 手机打开固定链接或网站、以及不带固定链接的 `aime.html`，都只显示 Aime 对话，只能切换主题和色板，编辑链接也按只读处理。手机按「只支持触摸且短边不超过 650px」判断，电脑窄窗口和平板打开网站仍可编辑。
- **电脑查看页：** 电脑或平板打开 `aime.html?live=…` 时走 `viewerToolbar()`，可以切换场景、色板和主题，但不能编辑。场景选择只存在查看者本地；固定链接同步各场景的布局（`liveSnapshot`），新增需要同步的状态要同时改 `snapshotLayouts` 和 `sync-server.mjs` 的 `normalizeSnapshot`。
- **图表打包：** `dist/vendor/vis-lab.bundle.js` 里打包了 `scripts/vis-engine-entry.js` 及其引用的 `dist/data/aime-reference.js`、`dist/data/financial-shared.js`、`dist/data/scene-charts.js`、`dist/lib/palettes.js`。改这些文件后要运行 `npm run build:vis` 再 `build:preview`。测试直接读源文件，漏打包时测试照样通过，页面却还是旧数据。
- **更新 Vis Lab：** `source/` 保持上游原样，适配写在 `scripts/build-vis.mjs`，补丁没命中时构建会报错。全球热力图的底图和国旗沿用上游的 jsDelivr 固定版本，是唯一需要联网的图表。
- **web / Terminal 的组件图：** 位置和数据在 `dist/data/scene-charts.js`，卡片框和按钮仍在场景 SVG 里。图表按页面原始像素排版、整体用 CSS 缩放；`vis-engine-entry.js` 会把这些插槽里的指针和 `getBoundingClientRect` 换回未缩放坐标，悬停才对得上，改插槽结构时别丢了 `scene-chart-slot` 类名。
- **按需加载：** web 和 Terminal 场景在 `app.js` 里动态导入，不要改回静态导入。新增动态导入时要同步改 `scripts/build-preview.mjs`。
- **预加载列表：** `aime.html` 列出了首屏模块，增删首屏模块要同步更新，`tests/aime-entry.test.mjs` 会检查。
- **色板 id：** `robinhood`、`finary`、`wealthsimple` 是旧 id，载入时会被重置，新色板不能使用。
- **改色写回：** `persist()` 通过 `writeBackDraft` 把草稿写回原色板：我的方案写回 `state.saved`，预置色板写入 `state.presetEdits`，`presets` 本身不变。`state.baseline` 只用于「恢复原始」和改动标记，历史记录里的 id 和名称不要带回当前色板（见 `onOpenPalette`）。
- **色板锁定：** `state.lockedPalettes` 随固定链接同步，查看页只显示锁的标记。新增修改色板的入口要检查 `isPaletteLocked()`。
- **色板隐藏：** `state.hiddenPalettes` 只存本机。`liveSnapshot()` 经 `shareableSnapshot` 去掉隐藏色板的数据，只把隐藏的预置色板 id 发给查看页过滤；新增发布内容时要确认不会带出隐藏色板。
- **云端备份：** `persist()` 经 `queueBackup` 把 `storedState()` 加编辑凭证写入私有表 `aime_private.backups`（Node 服务写在记录的 `backup` 字段）。打开 `?edit=` 时若云端版本和本机记录不同就合并恢复（`mergeBackupPalettes`，同 id 以云端为准）。按用户决定只凭 id 就能读备份，所以知道 id 就有编辑权，这是已接受的取舍。线上已于 2026-11-06 执行 `supabase/migrations/202611050001_aime_backup.sql`；新环境没执行时状态为 `off`，分享不受影响。备份只在编辑页打开后写入，旧链接要在原浏览器打开一次 `?edit=` 才有第一份。
- **色板结构：** 只有分类色和折线色能排序和增删，且同时作用于浅色和深色。涨跌色固定 2 个，界面色固定 6 个，位置都有固定含义。中性色单独存在 `neutral`，控制台显示在涨跌色中间；不要放进 `semantic`，线上数据库的校验要求它正好 2 个。折线色只用于同时有柱和线的折柱图，纯折线图仍用分类色（`seriesPaletteSlots`）。
- **Aime 界面色单独一套：** Aime 的默认界面色写在 `styles.css` 的 `.aime-stage`，`scenes/aime.js` 的 `aimeDefaults` 要保持一致（有测试检查），所有预置色板的界面色都和原始一样，没有专属背景。控制台在 Aime 场景通过 `shownPalette()` 显示实际值，不要把它写回色板。
- **改完要看实际效果：** 单元测试只覆盖逻辑，布局和拖动要在浏览器里验证。

## 约定

- 分支用 `codex/` 前缀，通过 PR 合并到 `main`。
- 用户可见的改动要更新 `CHANGELOG.md`，并同步 `package.json`、`package-lock.json`、`dist/app.js` 里的版本号。
- 文档用中文。

## 当前状态

- `CHANGELOG.md` 记录版本历史。
- 还没在真实手机和 iPhone Safari 上验证过触摸拖动和页面骨架。
- Aime 图表表头的按钮只是模板展示，点击没有效果。
