import { financialChartModules, financialChartConfig, financialPercent } from '../dist/data/financial-shared.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presets } from '../dist/data/presets.js';
import { renderFinancialScene, financialPaletteStyle, applyFinancialPalette } from '../dist/scenes/financial.js';
import { financialDividendYieldTrace } from '../dist/data/financial-reference.js';

test('replacement financial page includes the full product layout and all editable chart sections', () => {
  const svg = renderFinancialScene();
  assert.match(svg, /viewBox="0 0 1600 1548"/);
  for (const id of ['earnings', 'technical-radar', 'investment-rating', 'revenue-sankey', 'balance-sheet', 'revenue-breakdown', 'dividend']) assert.match(svg, new RegExp(`data-chart="${id}"`));
  assert.doesNotMatch(svg, /<image|<img|(?:href|src)="https?:\/\//);
  assert.match(svg, /data-product-sidebar/);
  assert.match(svg, /data-product-watchlist/);
  assert.match(svg, /Volume Profile/);
  assert.doesNotMatch(svg, /Earnings ›|AAPL 347.10|Download/);
  assert.match(svg, /109.42B/);
  assert.ok(financialChartConfig(financialChartModules.find(m=>m.id==='financial-payout')).series.some(s=>s.name==='Total Cash Dividends'));
  assert.equal((svg.match(/data-chart-id=/g)||[]).length,8);
});
test('user-confirmed seven original categorical colors are the same in both themes', () => {
  const expected = ['#265FFC', '#38D1FF', '#F564B9', '#733ED6', '#00CCC3', '#273D8F', '#FF7040'];
  for (const theme of ['light', 'dark']) assert.deepEqual(presets[0].themes[theme].categorical.map(c => c.hex), expected);
});
test('chart colors update by role, while theme variants and semantic colors remain independent', () => {
  const palette = structuredClone(presets[0]);
  palette.themes.light.categorical[0].hex = '#123456';
  const vars = new Map();
  applyFinancialPalette({ style: { setProperty: (k, v) => vars.set(k, v) } }, palette, 'light');
  assert.equal(vars.get('--viz-categorical-0'), '#123456');
  assert.equal(vars.get('--viz-semantic-0'), '#009B67');
  assert.equal(financialPaletteStyle(palette, 'dark')['--viz-categorical-0'], '#265FFC');
  assert.notEqual(financialPaletteStyle(palette, 'dark')['--report-bg'], vars.get('--report-bg'));
});
test('short palettes use a neutral fallback without silently cycling category identities', () => {
  const palette = structuredClone(presets[0]);
  palette.themes.light.categorical = palette.themes.light.categorical.slice(0, 2);
  const vars = financialPaletteStyle(palette, 'light');
  assert.equal(vars['--viz-categorical-6'], palette.themes.light.surface[3].hex);
  assert.notEqual(vars['--viz-categorical-6'], vars['--viz-categorical-0']);
});
test('traced dividend yield geometry stays within its reference chart coordinates', () => {
  assert.ok(financialDividendYieldTrace.length > 400);
  assert.ok(financialDividendYieldTrace.every(([x, y], i) => x >= 785 && x <= 1264 && y > 1390 && y < 1430 && (!i || x > financialDividendYieldTrace[i - 1][0])));
});

test('shared financial charts retain monetary amounts, percentage units and original color roles',()=>{
  const config=id=>financialChartConfig(financialChartModules.find(m=>m.id===id));
  const trend=config('financial-trend');
  assert.equal(trend.series[0].data.at(-1),383.28e9);
  assert.equal(trend.series[2].axis,'secondary');
  assert.equal(financialPercent(trend.series[2].data[0]),'84.4%');
  assert.equal(financialPercent(0),'0%');
  assert.deepEqual(financialChartModules.find(m=>m.id==='financial-trend').colorSlots,[0,1,6]);
  assert.equal(config('financial-breakdown').items[2].value,107.52e9);
  assert.ok(config('financial-yield').series[0].data.every(v=>v>0&&v<.0056));
  assert.ok(Math.abs(config('financial-business').items.reduce((sum,item)=>sum+item.value,0)-109.42e9)<=.011e9);
});
