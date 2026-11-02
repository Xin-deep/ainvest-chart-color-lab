import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColor, hsvToHex, hexToHsv } from '../dist/lib/colors.js';
import { parseImport, validatePalette, createPalette, restorePalette, restoreSavedPalettes } from '../dist/lib/palettes.js';
import { presets } from '../dist/data/presets.js';

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
  assert.deepEqual(presets.map(p => p.name), ['Ainvest 原始色板', 'Claude 色板', 'TradingView 色板', 'Simply Wall St 色板', 'Robinhood 色板']);
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
  for (const [id, light, dark] of [['claude', '#FFFFFF', '#191919'], ['tradingview', '#FFFFFF', '#000000'], ['simply-wall-st', '#EFECE6', '#212121'], ['robinhood-brand', '#FFFFFF', '#000000']]) {
    assert.deepEqual(hex(byId[id].themes.light.surface).slice(0, 2), [light, light]);
    assert.deepEqual(hex(byId[id].themes.dark.surface).slice(0, 2), [dark, dark]);
    assert.equal(validatePalette(byId[id]).themes.dark.surface[0].hex, dark);
  }
  assert.equal(presets[0].themes.light.surface[0].hex, '#F5F5F6');
});
test('shared palettes keep their identity so they match their tab again', () => {
  assert.equal(restorePalette(presets[1], presets).id, 'claude');
  const polluted = { ...structuredClone(presets[0]), id: 'imported' };
  assert.equal(restorePalette(polluted, presets).id, 'ainvest');
  assert.equal(restorePalette({ ...structuredClone(presets[0]), id: 'imported', name: '别的方案' }, presets).id, 'imported');
});
test('saved palettes from a snapshot drop invalid or anonymous entries and tolerate old snapshots', () => {
  assert.deepEqual(restoreSavedPalettes(undefined), []);
  const good = { ...structuredClone(presets[0]), id: 'plan-a', name: '方案 A' };
  const restored = restoreSavedPalettes([good, { id: 'broken' }, { ...good, id: 'imported' }]);
  assert.deepEqual(restored.map(p => p.id), ['plan-a']);
  assert.equal(restoreSavedPalettes(Array.from({ length: 40 }, (_, i) => ({ ...good, id: 'plan-' + i }))).length, 30);
});
