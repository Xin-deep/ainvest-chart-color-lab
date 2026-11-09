// Vis Lab charts placed over the web and Terminal pages. Each slot is a rectangle in the page's SVG coordinates;
// the card frame, title and buttons stay in the SVG, the chart inside it comes from the shared component.
const sceneViewBoxes = { terminal: [222, 42, 1306, 1293], workspace: [63, 37, 1718, 1339] };
const sceneEtfFlow = { type: 'donut', fixture: 'aime-factors', count: 7, labels: 'off', summary: { label: 'Total', value: '155.25M' } };
const sceneChartSlots = {
  terminal: [
    { id: 'web-bonds', name: 'Major 10-year bonds', area: 'on', rect: [1202, 108, 306, 148], type: 'line', fixture: 'scene-bonds', count: 60 },
    { id: 'web-dominance', name: '24h Dominance', rect: [562, 438, 306, 174], type: 'percent', fixture: 'scene-dominance', count: 5, series: 5 },
    { id: 'web-cap', name: '24h Crypto Market Cap', rect: [882, 290, 302, 228], type: 'grouped3', fixture: 'scene-cap', count: 5, series: 4 },
    { id: 'web-etf', name: 'Crypto ETF Fund Flow', rect: [1198, 356, 310, 256], ...sceneEtfFlow },
    { id: 'web-yield', name: 'Global yield curves', rect: [242, 646, 313, 179], type: 'combo', fixture: 'scene-yield', count: 5, series: 3 },
    { id: 'web-rates', name: 'Key interest rates', rect: [882, 645, 626, 180], type: 'line-multi', fixture: 'scene-rates', count: 8, series: 5 }
  ],
  workspace: [
    { id: 'terminal-etf', name: 'ETF Holding Distribution · 环状图', rect: [987, 148, 385, 234], ...sceneEtfFlow },
    { id: 'terminal-cap', name: 'Quick Quote · 分组柱', rect: [1385, 112, 385, 270], type: 'grouped3', fixture: 'scene-cap', count: 6, series: 4 },
    { id: 'terminal-dominance', name: 'Calendar', rect: [528, 478, 445, 214], type: 'percent', fixture: 'scene-dominance', count: 7, series: 5 },
    { id: 'terminal-yield', name: 'ETF Holding Distribution · 折柱图', rect: [75, 772, 443, 213], type: 'combo', fixture: 'scene-yield', count: 7, series: 3 },
    { id: 'terminal-rates', name: 'Quick Quote · 多折线', rect: [531, 766, 442, 219], type: 'line-multi', fixture: 'scene-rates', count: 8, series: 5 },
    { id: 'terminal-bonds', name: 'Quick Quote · 面积图', area: 'on', rect: [1385, 764, 385, 176], type: 'line', fixture: 'scene-bonds', count: 60 }
  ]
};
const sceneModule = slot => ({ series: 1, labels: 'off', area: 'off', zoom: 'off', height: 'auto', ...slot });
// Category labels only on a few ticks; zero-width spaces keep the hidden labels unique.
const sceneSparseLabels = (n, labels) => Array.from({ length: n }, (_, i) => {
  const at = labels.findIndex((_, j) => Math.round(j * (n - 1) / Math.max(1, labels.length - 1)) === i);
  return at >= 0 ? labels[at] : '​'.repeat(i + 1);
});
const sceneWiggle = (i, seed) => Math.sin(i * 1.7 + seed) * .6 + Math.sin(i * .53 + seed * 2) * .4;
// A repeatable 0–1 value per position, so every count gives the same data for the same index.
const sceneNoise = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const sceneDate = (i, first = 24) => { const day = first + i; return day <= 31 ? `${day}.Aug` : day <= 61 ? `${day - 31}.Sep` : `${day - 61}.Oct`; };
const sceneTenors = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
const sceneTenor = i => sceneTenors[i] || `P${i + 1}`;
const sceneCoins = ['Bitcoin', 'Ethereum', 'BNB', 'USDT', 'Others'];
const sceneCountries = ['USA', 'United Kingdom', 'Germany', 'France', 'Italy', 'Japan', 'Canada', 'Australia', 'Spain', 'Mainland', 'India', 'Brazil'];
const sceneZoom = module => module.zoom === 'on' ? { start: 0, end: 1 } : false;
function sceneChartConfig(module) {
  const n = module.count, s = module.series;
  switch (module.fixture) {
    // Rises clearly from low to high, with short-term noise; extra series sit lower and climb less.
    case 'scene-bonds': return { categories: sceneSparseLabels(n, [0, 1, 2, 3, 4].map(i => sceneDate(i))), series: Array.from({ length: s }, (_, k) => ({ name: `Factory${k + 1}`, type: 'line', area: k === 0 && module.area !== 'off', data: Array.from({ length: n }, (_, i) => Number(((.18 + .74 * (i / Math.max(1, n - 1)) ** 1.3) * (1 - k * .18) + sceneWiggle(i, 1 + k) * .05).toFixed(4))) })), zoom: sceneZoom(module) };
    // Shares swing from day to day, so the columns do not look alike.
    case 'scene-dominance': {
      const base = [.52, .14, .06, .08, .2];
      return { categories: Array.from({ length: n }, (_, i) => sceneDate(i)), series: Array.from({ length: s }, (_, k) => ({ name: sceneCoins[k] || `Coin${k + 1}`, type: 'bar', data: Array.from({ length: n }, (_, i) => Number(((base[k] ?? .06) * (.35 + 1.3 * sceneNoise(i, k))).toFixed(4))) })), stack: 'percent', zoom: sceneZoom(module) };
    }
    // Each day and each series has its own level, from well under 1T to about 3T.
    case 'scene-cap': return { categories: Array.from({ length: n }, (_, i) => sceneDate(i, 25)), series: Array.from({ length: s }, (_, k) => ({ name: `Factory${k + 1}`, type: 'bar', data: Array.from({ length: n }, (_, i) => Math.round((.5 + 2.5 * sceneNoise(i, k + 3)) * 100) / 100 * 1e12) })), zoom: sceneZoom(module) };
    // Bars before the last series, Factory1 always the tallest; the last series is the line on the second axis.
    case 'scene-yield': {
      const bars = Math.max(1, s - 1);
      return { categories: Array.from({ length: n }, (_, i) => sceneTenor(i)), series: [...Array.from({ length: bars }, (_, k) => ({ name: `Factory${k + 1}`, type: 'bar', data: Array.from({ length: n }, (_, i) => Number(((.03 + .03 * sceneNoise(i, 7)) * (1 - k * .6 / bars)).toFixed(4))) })), { name: `Factory${bars + 1}`, type: 'line', axis: 'secondary', area: module.area === 'on', data: Array.from({ length: n }, (_, i) => Number((.025 + .03 * sceneNoise(i, 11)).toFixed(4))) }], zoom: sceneZoom(module) };
    }
    // Rates hold for a while and then jump, so the lines read as steps.
    case 'scene-rates': return { categories: Array.from({ length: n }, (_, i) => sceneTenor(i)), series: Array.from({ length: s }, (_, k) => ({ name: sceneCountries[k] || `Country${k + 1}`, type: 'line', area: k === 0 && module.area === 'on', data: Array.from({ length: n }, (_, i) => Number(Math.max(.25, 5 - k * .8 + Math.round((sceneNoise(Math.floor(i / 2), k + 20) - .5) * 4) * .25).toFixed(2))) })), zoom: sceneZoom(module) };
    default: return null;
  }
}
export { sceneViewBoxes, sceneChartSlots, sceneModule, sceneChartConfig };
// Slots sit at percent positions and keep the page's own pixel size; app.js scales them with the page and mounts the charts.
function sceneChartLayer(scene) {
  const [x0, y0, w, h] = sceneViewBoxes[scene], pct = v => `${(v * 100).toFixed(4)}%`;
  const slots = sceneChartSlots[scene].map(({ id, rect: [x, y, sw, sh] }) => `<div class="scene-chart-slot" data-chart-id="${id}" style="left:${pct((x - x0) / w)};top:${pct((y - y0) / h)};width:${sw}px;height:${sh}px"></div>`).join('');
  return `<div class="scene-chart-layer" style="aspect-ratio:${w}/${h}">${slots}</div>`;
}
export { sceneChartLayer };
