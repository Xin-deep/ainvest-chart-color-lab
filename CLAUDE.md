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
- **手机端只读且只有 Aime：** `aime.html` 和手机打开网站时都只显示 Aime 对话，只能切换主题和色板，编辑链接也按只读处理。手机按「只支持触摸且短边不超过 650px」判断，电脑窄窗口和平板打开网站仍可编辑，`aime.html` 在任何设备上都只读。
- **按需加载：** web 和 Terminal 场景在 `app.js` 里动态导入，不要改回静态导入。新增动态导入时要同步改 `scripts/build-preview.mjs`。
- **预加载列表：** `aime.html` 列出了首屏模块，增删首屏模块要同步更新，`tests/aime-entry.test.mjs` 会检查。
- **色板 id：** `robinhood`、`finary`、`wealthsimple` 是旧 id，载入时会被重置，新色板不能使用。
- **改色写回：** `persist()` 通过 `writeBackDraft` 把草稿写回原色板：我的方案写回 `state.saved`，预置色板写入 `state.presetEdits`，`presets` 本身不变。`state.baseline` 只是 A/B 对照，历史记录里的 id 和名称不要带回当前色板（见 `onOpenPalette`）。
- **色板结构：** 只有分类色能排序和增删，且同时作用于浅色和深色。涨跌色固定 2 个，界面色固定 6 个，位置都有固定含义。
- **Aime 界面色单独一套：** Aime 的默认界面色写在 `styles.css` 的 `.aime-stage`，`scenes/aime.js` 的 `aimeDefaults` 要保持一致（有测试检查），预置色板的专属背景在 `presets.js` 的 `aimeBackgrounds`，按色板 id 查找。控制台在 Aime 场景通过 `shownPalette()` 显示实际值，不要把它写回色板。
- **改完要看实际效果：** 单元测试只覆盖逻辑，布局和拖动要在浏览器里验证。

## 约定

- 分支用 `codex/` 前缀，通过 PR 合并到 `main`。
- 用户可见的改动要更新 `CHANGELOG.md`，并同步 `package.json`、`package-lock.json`、`dist/app.js` 里的版本号。
- 文档用中文。

## 当前状态

- `CHANGELOG.md` 记录版本历史。
- 还没在真实手机和 iPhone Safari 上验证过触摸拖动和页面骨架。
- Aime 图表表头的按钮只是模板展示，点击没有效果。
