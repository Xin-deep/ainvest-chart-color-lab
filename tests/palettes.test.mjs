import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColor, hsvToHex, hexToHsv } from '../dist/lib/colors.js';
import { parseImport, validatePalette, createPalette, restorePalette, restoreSavedPalettes, restorePresetEdits, restoreLockedPalettes, orderSavedPalettes, countColorChanges, writeBackDraft, moveSeriesColor, removeSeriesColor, addSeriesColor, indexAfterMove } from '../dist/lib/palettes.js';
import { rampColor } from '../dist/lib/oklch.js';
import { presets, dropRetiredBackgrounds } from '../dist/data/presets.js';

test('normalize supported color formats without silently clipping invalid colors', () => {
  assert.equal(normalizeColor('#abc'), '#AABBCC');
  assert.equal(normalizeColor('265ffc'), '#265FFC');
  assert.equal(normalizeColor('rgb(38, 95, 252)'), '#265FFC');
  assert.equal(normalizeColor('hsl(0, 100%, 50%)'), '#FF0000');
  assert.throws(() => normalizeColor('rgb(256, 0, 0)'));
  assert.throws(() => normalizeColor('hsl(0, 101%, 50%)'));
});
test('HSB editing preserves colors in a round trip', () => {
  for (const hex of ['#265FFC', '#FFFFFF', '#000000', '#F564B9', '#009B67']) assert.equal(hsvToHex(...hexToHsv(hex)), hex);
});
test('pasted CSS and color arrays preserve order and names', () => {
  const css = parseImport(':root { --chart-blue: #265FFC; --chart-pink: rgb(245, 100, 185); }');
  assert.deepEqual(css.candidates[0].themes.light.categorical.map(c => [c.name, c.hex]), [['chart-blue', '#265FFC'], ['chart-pink', '#F564B9']]);
  const array = parseImport("['#265FFC', '#38D1FF']");
  assert.equal(array.candidates[0].themes.dark.categorical[1].hex, '#38D1FF');
  assert.throws(() => parseImport('const palette = ["#265FFC"];'));
});
test('existing research JSON formats are accepted, groups remain separate', () => {
  const a = parseImport(JSON.stringify({ categorical: [{ name: '主蓝', hex: '#265FFC' }], up: '#009B67', down: '#FF381A' })).candidates[0];
  assert.equal(a.themes.light.categorical[0].name, '主蓝');
  assert.equal(a.themes.light.semantic[0].hex, '#009B67');
  const b = parseImport('{"白版":["42A363","74A2E6"],"黑版":["4AAC5F","4D7ECF"]}');
  assert.equal(b.candidates.length, 2);
  const c = parseImport('{"light":["#265FFC"],"dark":["#38D1FF"],"names":["科技"]}').candidates[0];
  assert.equal(c.themes.dark.categorical[0].name, '科技');
  assert.equal(c.themes.dark.categorical[0].hex, '#38D1FF');
});
test('exported palette and session restore independent A/B and theme values', () => {
  const baseline = structuredClone(presets[0]), draft = structuredClone(baseline);
  draft.themes.light.categorical[0].hex = '#123456';
  const restored = parseImport(JSON.stringify({ kind: 'palette-lab-session', schemaVersion: 1, baseline, draft, scene: 'stock', theme: 'dark' })).session;
  assert.equal(restored.baseline.themes.light.categorical[0].hex, '#265FFC');
  assert.equal(restored.draft.themes.light.categorical[0].hex, '#123456');
  assert.equal(restored.draft.themes.dark.categorical[0].hex, '#265FFC');
  assert.equal(parseImport(JSON.stringify(draft)).candidates[0].themes.light.categorical[0].hex, '#123456');
  assert.throws(() => parseImport(JSON.stringify({ kind: 'palette-lab-session', schemaVersion: 9 })));
});
test('malformed, empty, oversized and injected values cannot become palette styles', () => {
  for (const text of ['', '[]', '["not-a-color"]', '["#fff; background:url(x)"]', '{}', 'x'.repeat(500001)]) assert.throws(() => parseImport(text));
  const invalid = structuredClone(presets[0]); invalid.themes.light.surface = [];
  assert.throws(() => validatePalette(invalid));
});
test('preset provenance and available themes survive import', () => {
  const p = parseImport(JSON.stringify(createPalette({id:'import-test',name:'自定义深色色板',dark:['#123456'],availableThemes:['dark'],source:'仅确认深色版'}))).candidates[0];
  assert.deepEqual(p.availableThemes, ['dark']);
  assert.match(p.source, /仅确认深色版/);
});

test('plain text palettes preserve order, support mixed separators and independent dark values', async () => {
  const {parseTextPalette}=await import('../dist/lib/palettes.js');
  const light='#265ffc #38D1FF，#F564B9\n#733ED6;#00CCC3';
  const shared=parseTextPalette(light);
  assert.deepEqual(shared.themes.light.categorical.map(c=>c.hex),['#265FFC','#38D1FF','#F564B9','#733ED6','#00CCC3']);
  assert.deepEqual(shared.themes.dark.categorical,shared.themes.light.categorical);
  const separate=parseTextPalette('rgb(38, 95, 252), #abc','hsl(0, 100%, 50%)\n#000');
  assert.deepEqual(separate.themes.light.categorical.map(c=>c.hex),['#265FFC','#AABBCC']);
  assert.deepEqual(separate.themes.dark.categorical.map(c=>c.hex),['#FF0000','#000000']);
  for(const [a,b] of [['',''],['#fff','broken'],['#fff invalid',''],[Array(65).fill('#fff').join(' '),'']])assert.throws(()=>parseTextPalette(a,b));
});

test('brand palettes use the supplied values and backgrounds', () => {
  assert.deepEqual(presets.map(p => p.name), ['Ainvest 原始色板', 'Claude', 'TradingView', 'Simply Wall St', 'Robinhood']);
  assert.equal(new Set(presets.map(p => p.id)).size, presets.length);
  assert.ok(!presets.some(p => ['finary', 'robinhood', 'wealthsimple'].includes(p.id)), 'retired ids are reset to the default palette on load');
  const byId = Object.fromEntries(presets.map(p => [p.id, p])), hex = list => list.map(c => c.hex);
  assert.deepEqual(hex(byId.claude.themes.light.categorical), ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#4A3AA7', '#E34948']);
  assert.deepEqual(hex(byId.claude.themes.dark.categorical), ['#3987E5', '#D95926', '#199E70', '#C98500', '#D55181', '#008300', '#9085E9', '#E66767']);
  assert.deepEqual(hex(byId.tradingview.themes.dark.categorical), hex(byId.tradingview.themes.light.categorical));
  assert.deepEqual(hex(byId.tradingview.themes.dark.semantic), ['#089981', '#F23645']);
  assert.equal(byId['robinhood-brand'].themes.light.categorical.length, 11);
  assert.equal(byId['robinhood-brand'].themes.dark.categorical[1].hex, '#AF95F8');
  assert.deepEqual(hex(byId['robinhood-brand'].themes.light.semantic), ['#00C000', '#FF3800']);
  assert.deepEqual(hex(byId['robinhood-brand'].themes.dark.semantic), ['#00C805', '#FF5000']);
  assert.deepEqual(hex(byId['simply-wall-st'].themes.light.categorical), ['#1D96DC', '#19B299', '#BA4986', '#E6B068', '#9F50E7']);
  assert.deepEqual(hex(byId['simply-wall-st'].themes.dark.categorical), ['#1D96DC', '#73E6D5', '#BA4986', '#E6B068', '#9F50E7']);
  assert.deepEqual(hex(byId['simply-wall-st'].themes.light.semantic), ['#12A15B', '#E74142']);
  assert.deepEqual(hex(byId['simply-wall-st'].themes.dark.semantic), ['#2EC87C', '#E74142']);
  for (const preset of presets) for (const theme of ['light', 'dark']) assert.deepEqual(preset.themes[theme].surface.map(c => c.hex), presets[0].themes[theme].surface.map(c => c.hex), preset.id);
  assert.equal(presets[0].themes.light.surface[0].hex, '#F5F5F6');
});
test('shared palettes keep their identity so they match their tab again', () => {
  assert.equal(restorePalette(presets[1], presets).id, 'claude');
  const polluted = { ...structuredClone(presets[0]), id: 'imported' };
  assert.equal(restorePalette(polluted, presets).id, 'ainvest');
  assert.equal(restorePalette({ ...structuredClone(presets[1]), id: 'imported', name: 'Claude 色板' }, presets).id, 'claude');
  assert.equal(restorePalette({ ...structuredClone(presets[0]), id: 'imported', name: '别的方案' }, presets).id, 'imported');
});
test('saved palettes from a snapshot drop invalid or anonymous entries and tolerate old snapshots', () => {
  assert.deepEqual(restoreSavedPalettes(undefined), []);
  const good = { ...structuredClone(presets[0]), id: 'plan-a', name: '方案 A' };
  const restored = restoreSavedPalettes([good, { id: 'broken' }, { ...good, id: 'imported' }]);
  assert.deepEqual(restored.map(p => p.id), ['plan-a']);
  assert.equal(restoreSavedPalettes(Array.from({ length: 40 }, (_, i) => ({ ...good, id: 'plan-' + i }))).length, 30);
});

test('moving a categorical color keeps each series aligned across themes', () => {
  const palette = structuredClone(presets[1]), hex = theme => palette.themes[theme].categorical.map(c => c.hex);
  moveSeriesColor(palette, 0, 2);
  assert.deepEqual(hex('light').slice(0, 3), ['#EB6834', '#1BAF7A', '#2A78D6']);
  assert.deepEqual(hex('dark').slice(0, 3), ['#D95926', '#199E70', '#3987E5']);
  assert.equal(palette.themes.light.categorical[2].name, '蓝');
  assert.deepEqual(palette.themes.light.semantic, presets[1].themes.light.semantic);
});
test('the open editor follows the same color after a move', () => {
  assert.equal(indexAfterMove(1, 1, 4), 4);
  assert.equal(indexAfterMove(3, 1, 4), 2);
  assert.equal(indexAfterMove(2, 4, 1), 3);
  assert.equal(indexAfterMove(0, 1, 4), 0);
  assert.equal(indexAfterMove(5, 1, 4), 5);
});
test('removing and adding colors stay valid in both themes and never empty a palette', () => {
  const palette = structuredClone(presets[3]);
  removeSeriesColor(palette, 0);
  assert.equal(palette.themes.light.categorical[0].hex, '#19B299');
  assert.equal(palette.themes.dark.categorical[0].hex, '#73E6D5');
  for (let i = 0; i < 10; i++) removeSeriesColor(palette, 0);
  assert.equal(palette.themes.light.categorical.length, 1);
  addSeriesColor(palette); addSeriesColor(palette);
  const { light, dark } = palette.themes;
  assert.equal(light.categorical.length, 3); assert.equal(dark.categorical.length, 3);
  assert.equal(new Set(light.categorical.map(c => c.name)).size, 3);
  assert.equal(new Set(light.categorical.map(c => c.hex)).size, 3);
  assert.equal(light.categorical[2].name, dark.categorical[2].name);
  assert.equal(validatePalette(palette).themes.light.categorical.length, 3);
});
test('adding to a gray palette still produces a visible color', () => {
  const palette = createPalette({ id: 'gray', name: '灰', light: ['#808080'] });
  addSeriesColor(palette);
  const added = palette.themes.light.categorical[1].hex;
  assert.notEqual(added, '#808080'); assert.match(added, /^#[0-9A-F]{6}$/);
});

test('edits write back to the open palette without adding entries', () => {
  const scheme = { ...structuredClone(presets[1]), id: 'plan-a', name: '方案 A' };
  const state = { draft: structuredClone(scheme), saved: [scheme], presetEdits: {} };
  state.draft.themes.light.categorical[0].hex = '#123456';
  writeBackDraft(state, presets);
  assert.equal(state.saved.length, 1);
  assert.equal(state.saved[0].themes.light.categorical[0].hex, '#123456');
  assert.deepEqual(state.presetEdits, {});
  assert.notEqual(state.saved[0], state.draft);
});
test('preset edits stay in an overlay, leave the preset alone and clear when undone', () => {
  const original = presets[0].themes.light.categorical[0].hex;
  const state = { draft: structuredClone(presets[0]), saved: [], presetEdits: {} };
  state.draft.themes.light.categorical[0].hex = '#123456';
  writeBackDraft(state, presets);
  assert.equal(state.saved.length, 0);
  assert.equal(state.presetEdits.ainvest.themes.light.categorical[0].hex, '#123456');
  assert.equal(presets[0].themes.light.categorical[0].hex, original);
  state.draft.themes.light.categorical[0].hex = original;
  writeBackDraft(state, presets);
  assert.deepEqual(state.presetEdits, {});
});
test('a draft outside the lists is left for the app to adopt', () => {
  const state = { draft: { ...structuredClone(presets[0]), id: 'session-copy' }, saved: [], presetEdits: {} };
  writeBackDraft(state, presets);
  assert.equal(state.saved.length, 0);
  assert.deepEqual(state.presetEdits, {});
});
test('stored preset edits drop unknown ids, broken colors and old snapshots', () => {
  const good = structuredClone(presets[0]);
  assert.deepEqual(restorePresetEdits(undefined), {});
  assert.deepEqual(restorePresetEdits([good]), {});
  const restored = restorePresetEdits({ ainvest: good, retired: good, claude: { id: 'claude' } }, ['ainvest', 'claude']);
  assert.deepEqual(Object.keys(restored), ['ainvest']);
  assert.equal(restored.ainvest.id, 'ainvest');
});
test('color changes count every role in both themes and added colors', () => {
  const a = structuredClone(presets[0]), b = structuredClone(a);
  assert.equal(countColorChanges(a, b), 0);
  b.themes.dark.surface[0].hex = '#000001';
  addSeriesColor(b);
  assert.equal(countColorChanges(a, b), 3);
});

test('line colors are their own role and palettes saved without them get a default', () => {
  assert.deepEqual(presets[0].themes.light.line.map(c => c.hex), ['#FF7040', '#9EA9C7']);
  for (const preset of presets) for (const theme of ['light', 'dark']) assert.ok(preset.themes[theme].line.length >= 1);
  const old = structuredClone(presets[1]);
  delete old.themes.light.line; delete old.themes.dark.line;
  const restored = validatePalette(old), colors = restored.themes.dark.categorical;
  assert.deepEqual(restored.themes.dark.line.map(c => c.hex), [colors.at(-1).hex, colors.at(-2).hex]);
});
test('line colors can be reordered and resized without touching the categorical list', () => {
  const palette = structuredClone(presets[0]), categorical = structuredClone(palette.themes.light.categorical);
  moveSeriesColor(palette, 0, 1, 'line');
  assert.deepEqual(palette.themes.dark.line.map(c => c.hex), ['#9EA9C7', '#FF7040']);
  addSeriesColor(palette, 'line');
  assert.equal(palette.themes.light.line.at(-1).name, '折线 03');
  removeSeriesColor(palette, 0, 'line');
  assert.equal(palette.themes.light.line.length, 2);
  assert.deepEqual(palette.themes.light.categorical, categorical);
});

test('old preset backgrounds are dropped on load while hand-edited colors stay', () => {
  const claude = structuredClone(presets.find(p => p.id === 'claude'));
  claude.themes.dark.surface[0].hex = '#000000'; claude.themes.dark.surface[1].hex = '#191919'; claude.themes.light.surface[0].hex = '#ABCDEF';
  dropRetiredBackgrounds(claude);
  assert.deepEqual(claude.themes.dark.surface.slice(0, 2).map(c => c.hex), presets[0].themes.dark.surface.slice(0, 2).map(c => c.hex));
  assert.equal(claude.themes.light.surface[0].hex, '#ABCDEF');
  const scheme = { ...structuredClone(presets[0]), id: 'plan-a' };
  scheme.themes.dark.surface[0].hex = '#000000';
  assert.equal(dropRetiredBackgrounds(scheme).themes.dark.surface[0].hex, '#000000');
});

test('saved schemes follow the dragged order and keep anything it does not mention', () => {
  const scheme = id => ({ id, name: id }), saved = ['a', 'b', 'c', 'd'].map(scheme);
  const ids = list => list.map(p => p.id);
  assert.deepEqual(ids(orderSavedPalettes(saved, ['c', 'a', 'b', 'd'])), ['c', 'a', 'b', 'd']);
  assert.deepEqual(ids(orderSavedPalettes(saved, ['d', 'a'])), ['d', 'a', 'b', 'c']);
  assert.deepEqual(ids(saved), ['a', 'b', 'c', 'd']);
});

test('the neutral color stays apart from the two semantic colors and old palettes get the default', () => {
  for (const preset of presets) for (const theme of ['light', 'dark']) {
    assert.equal(preset.themes[theme].semantic.length, 2);
    assert.deepEqual(preset.themes[theme].neutral.map(c => c.hex), ['#F2B852']);
  }
  const old = structuredClone(presets[0]);
  delete old.themes.light.neutral; delete old.themes.dark.neutral;
  assert.equal(validatePalette(old).themes.dark.neutral[0].hex, '#F2B852');
  const edited = structuredClone(presets[0]);
  edited.themes.light.neutral[0].hex = '#123456';
  assert.equal(validatePalette(edited).themes.light.neutral[0].hex, '#123456');
  assert.equal(countColorChanges(presets[0], edited), 1);
});
test('the three color ramp hits each stop and moves when any of them changes', () => {
  assert.equal(rampColor('#FF0000', '#FFFF00', '#00FF00', 0), '#FF0000');
  assert.equal(rampColor('#FF0000', '#FFFF00', '#00FF00', .5), '#FFFF00');
  assert.equal(rampColor('#FF0000', '#FFFF00', '#00FF00', 1), '#00FF00');
  const base = rampColor('#FF0000', '#FFFF00', '#00FF00', .25);
  assert.notEqual(rampColor('#0000FF', '#FFFF00', '#00FF00', .25), base);
  assert.notEqual(rampColor('#FF0000', '#00FFFF', '#00FF00', .25), base);
  assert.notEqual(rampColor('#FF0000', '#FFFF00', '#00FF00', .75), rampColor('#FF0000', '#FFFF00', '#0000FF', .75));
  assert.equal(rampColor('#FFFFFF', '#808080', '#000000', .5), '#808080');
});

test('locks survive reloading only for palettes that still exist', () => {
  assert.deepEqual(restoreLockedPalettes(['claude', 'gone', 'claude', 'plan-a'], ['ainvest', 'claude', 'plan-a']), ['claude', 'plan-a']);
  assert.deepEqual(restoreLockedPalettes('claude', ['claude']), []);
  assert.deepEqual(restoreLockedPalettes(undefined, ['claude']), []);
});
