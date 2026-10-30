import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { encodeMobilePreview, decodeMobilePreview } from '../dist/lib/mobile-preview.js';
import { presets } from '../dist/data/presets.js';
import { validatePalette } from '../dist/lib/palettes.js';
import { normalizeGlobalChartStyle } from '../dist/lib/chart-style.js';
const context = { console, URL, setTimeout, clearTimeout };
runInNewContext(await readFile(new URL('../dist/vendor/vis-lab.bundle.js', import.meta.url), 'utf8'), context);
globalThis.PaletteVisEngine = context.PaletteVisEngine;
const { defaultAimeBoard, validateAimeBoard } = await import('../dist/scenes/aime.js');

test('phone link restores independent A/B colors, Unicode names, hidden modules and chart appearance', () => {
  const baseline = structuredClone(presets[0]), draft = structuredClone(baseline);
  draft.name = '手机方案 · 测试 📱';
  draft.themes.dark.categorical[0].hex = '#ABCDEF';
  const board = defaultAimeBoard(); board.modules[1].hidden = true; board.modules[0].lineWidth = 2;
  const encoded = encodeMobilePreview({ baseline, draft, aimeBoard: board, theme: 'dark', mode: 'baseline', globalChartStyle: { lineWidth: 3, texture: 'dots' } });
  const restored = decodeMobilePreview(new URL('https://example.com/lab/aime.html#aime=' + encoded).hash);
  assert.equal(validatePalette(restored.draft).name, draft.name);
  assert.equal(validatePalette(restored.draft).themes.dark.categorical[0].hex, '#ABCDEF');
  assert.equal(validatePalette(restored.baseline).themes.dark.categorical[0].hex, baseline.themes.dark.categorical[0].hex);
  assert.deepEqual(validateAimeBoard(restored.aimeBoard).modules, validateAimeBoard(board).modules);
  assert.deepEqual(normalizeGlobalChartStyle(restored.globalChartStyle), { lineWidth: 3, texture: 'dots' });
  assert.equal(restored.theme, 'dark'); assert.equal(restored.mode, 'baseline');
});

test('unrelated hashes are ignored and malformed, incompatible or oversized shares are rejected', () => {
  assert.equal(decodeMobilePreview('#other'), null);
  for (const hash of ['#aime=', '#aime=!!!', '#aime=e30', '#aime=' + 'A'.repeat(100001)]) assert.throws(() => decodeMobilePreview(hash));
  assert.throws(() => encodeMobilePreview({ name: 'x'.repeat(100001) }));
  const incomplete = encodeMobilePreview({ version: 2, baseline: {}, draft: {}, aimeBoard: { modules: [] } });
  assert.throws(() => decodeMobilePreview('#aime=' + incomplete));
});
