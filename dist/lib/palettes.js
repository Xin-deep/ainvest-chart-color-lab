import { normalizeColor, hexToHsv, hsvToHex } from './colors.js';
export const clone = value => JSON.parse(JSON.stringify(value));
export const roles = { categorical: '分类色', line: '折线色', semantic: '涨跌色', surface: '界面色' };
// These roles can be reordered and resized; the others have fixed positions.
export const seriesRoles = ['categorical', 'line'];
export const surfaces = {
  light: ['#F5F5F6', '#FFFFFF', '#202024', '#787880', '#E6E6E9', '#EBEBEE'],
  dark: ['#111113', '#1B1B1F', '#F4F4F5', '#9B9BA4', '#323238', '#29292F']
};
export const surfaceNames = ['页面背景', '卡片背景', '主要文字', '次要文字', '分隔线', '网格线'];
// Palettes without their own line colors take the end of the categorical list, last color first.
const defaultLines = colors => colors.slice(-2).reverse().map((color, i) => ({ id: `line-${i + 1}`, name: `折线 ${String(i + 1).padStart(2, '0')}`, hex: color.hex }));
const colorList = (list, names, prefix) => list.map((hex, i) => ({ id: `${prefix}-${i + 1}`, name: names?.[i] || `系列 ${String(i + 1).padStart(2, '0')}`, hex: normalizeColor(hex) }));
export function createPalette({ id, name, light, dark, names, lines, up = '#009B67', down = '#FF381A', darkUp = up, darkDown = down, background, card = background, source = '自定义色板', availableThemes = ['light', 'dark'] }) {
  return {
    schemaVersion: 1, id, name, source, availableThemes,
    themes: Object.fromEntries(['light', 'dark'].map(theme => [theme, {
      categorical: colorList(theme === 'light' ? (light || dark) : (dark || light), names, 'category'),
      line: lines ? colorList(lines, lines.map((_, i) => `折线 ${String(i + 1).padStart(2, '0')}`), 'line') : defaultLines(colorList(theme === 'light' ? (light || dark) : (dark || light), names, 'category')),
      semantic: colorList(theme === 'light' ? [up, down] : [darkUp, darkDown], ['上涨', '下跌'], 'state'),
      surface: colorList(background ? [background[theme], card[theme], ...surfaces[theme].slice(2)] : surfaces[theme], surfaceNames, 'surface')
    }]))
  };
}
function validateColors(list) {
  if (!Array.isArray(list) || list.length === 0 || list.length > 64) throw new Error('每组需要包含 1–64 个颜色');
  return list.map((item, i) => ({ id: `color-${i + 1}`, name: typeof item === 'object' && item ? String(item.name || `系列 ${i + 1}`).slice(0, 60) : `系列 ${i + 1}`, hex: normalizeColor(typeof item === 'string' ? item : item?.hex || item?.value) }));
}
export function validatePalette(input) {
  if (input?.schemaVersion !== undefined && input.schemaVersion !== 1) throw new Error('暂不支持此色板文件版本');
  if (!input?.themes || !input.name) throw new Error('色板缺少名称或主题配置');
  const output = createPalette({ id: 'imported', name: String(input.name).slice(0, 80), light: ['#265FFC'], source: String(input.source || '导入色板').slice(0, 240) });
  output.availableThemes = Array.isArray(input.availableThemes) && input.availableThemes.length && input.availableThemes.every(t => ['light', 'dark'].includes(t)) ? input.availableThemes : ['light', 'dark'];
  for (const theme of ['light', 'dark']) {
    if (!input.themes[theme]) throw new Error(`缺少 ${theme} 主题配置`);
    for (const role of Object.keys(roles)) {
      // Palettes saved before line colors existed get the same default as a new palette.
      if (role === 'line' && !input.themes[theme].line) { output.themes[theme].line = defaultLines(output.themes[theme].categorical); continue; }
      output.themes[theme][role] = validateColors(input.themes[theme][role]).map((c, i) => ({ ...c, id: `${role}-${i + 1}` }));
    }
    if (output.themes[theme].surface.length !== 6) throw new Error('界面色需要包含 6 个颜色');
    if (output.themes[theme].semantic.length !== 2) throw new Error('涨跌色需要包含 2 个颜色');
  }
  return output;
}
// validatePalette resets ids; shared snapshots need them to match their palette tab again.
export function restorePalette(input, known = []) {
  const palette = validatePalette(input);
  const id = typeof input.id === 'string' && input.id && input.id !== 'imported' ? input.id.slice(0, 80) : known.find(p => p.name.replace(/ 色板$/, '') === palette.name.replace(/ 色板$/, ''))?.id;
  if (id) palette.id = id;
  return palette;
}
export function restoreSavedPalettes(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(-30).flatMap(item => {
    try { const palette = restorePalette(item); return palette.id === 'imported' ? [] : [palette]; } catch { return []; }
  });
}
// Preset edits are stored per preset id; entries for unknown ids or broken colors are dropped.
export function restorePresetEdits(input, knownIds) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).slice(0, 30).flatMap(([id, item]) => {
    if (knownIds && !knownIds.includes(id)) return [];
    try { return [[id, { ...restorePalette(item), id }]]; } catch { return []; }
  }));
}
export function countColorChanges(a, b) {
  let count = 0;
  for (const theme of ['light', 'dark']) for (const role of Object.keys(roles)) {
    const before = a.themes[theme][role], after = b.themes[theme][role];
    for (let i = 0; i < Math.max(before.length, after.length); i++) if (before[i]?.hex !== after[i]?.hex) count++;
  }
  return count;
}
// Edits stay on the palette they were made on: schemes update in place, presets keep a separate overlay.
export function writeBackDraft({ draft, saved, presetEdits }, presets) {
  const index = saved.findIndex(p => p.id === draft.id);
  if (index >= 0) { saved[index] = clone(draft); return; }
  const preset = presets.find(p => p.id === draft.id);
  if (!preset) return;
  if (countColorChanges(preset, draft)) presetEdits[draft.id] = clone(draft);
  else delete presetEdits[draft.id];
}
// A position is one series in both themes, so structure edits apply to light and dark together.
const seriesLists = (palette, role) => ['light', 'dark'].map(theme => palette.themes[theme][role]);
export function moveSeriesColor(palette, from, to, role = 'categorical') {
  for (const list of seriesLists(palette, role)) if (from < list.length && to < list.length) list.splice(to, 0, list.splice(from, 1)[0]);
}
export function removeSeriesColor(palette, index, role = 'categorical') {
  for (const list of seriesLists(palette, role)) if (list.length > 1 && index < list.length) list.splice(index, 1);
}
export function addSeriesColor(palette, role = 'categorical') {
  const lists = seriesLists(palette, role), label = role === 'line' ? '折线' : '系列';
  const taken = new Set(lists.flat().map(color => color.name));
  let number = Math.max(...lists.map(list => list.length)) + 1;
  while (taken.has(`${label} ${String(number).padStart(2, '0')}`)) number++;
  for (const list of lists) {
    // A golden-angle hue step keeps the new color distinct from the one before it.
    const [h, s, v] = hexToHsv(list.at(-1).hex);
    list.push({ id: `${role}-new-${number}`, name: `${label} ${String(number).padStart(2, '0')}`, hex: hsvToHex((h + 137.5) % 360, Math.max(s, 35), Math.min(95, Math.max(v, 45))) });
  }
}
// Where an index ends up after moving one item, so the open editor stays on the same color.
export function indexAfterMove(index, from, to) {
  if (index === from) return to;
  if (from < index && index <= to) return index - 1;
  if (to <= index && index < from) return index + 1;
  return index;
}
export function parseImport(text) {
  if (!text.trim()) throw new Error('请先输入色值或配置代码');
  if (text.length > 500000) throw new Error('配置内容过大，请使用小于 500 KB 的文件');
  let json;
  try { json = JSON.parse(text); } catch { /* CSS variables and color arrays are parsed as text. */ }
  if (json?.kind === 'palette-lab-session') {
    if (json.schemaVersion !== 1) throw new Error('暂不支持此实验文件版本');
    const baseline = validatePalette(json.baseline), draft = validatePalette(json.draft);
    return { session: { baseline, draft, scene: json.scene, theme: json.theme, customTemplate:json.customTemplate, comparisonBoards:json.comparisonBoards, customBoard: json.customBoard, aimeBoard: json.aimeBoard, financialDensity: json.financialDensity, financialBoard: json.financialBoard, checkSettings: json.checkSettings, globalChartStyle: json.globalChartStyle }, candidates: [] };
  }
  if (json?.themes) return { candidates: [validatePalette(json)] };
  if (Array.isArray(json)) return { candidates: [fromColors('导入色板', validateColors(json))] };
  if (json && typeof json === 'object') {
    if (json.light || json.dark) {
      const light = json.light ? validateColors(json.light) : null, dark = json.dark ? validateColors(json.dark) : null;
      const p = createPalette({ id: 'imported', name: json.name || '导入色板', light: light?.map(c => c.hex), dark: dark?.map(c => c.hex), names: json.names, availableThemes: light && dark ? ['light', 'dark'] : [light ? 'light' : 'dark'] });
      return { candidates: [p] };
    }
    if (Array.isArray(json.categorical)) {
      const p = fromColors(json.name || '导入分类色板', validateColors(json.categorical));
      for (const theme of ['light', 'dark']) {
        if (json.up) p.themes[theme].semantic[0].hex = normalizeColor(json.up);
        if (json.down) p.themes[theme].semantic[1].hex = normalizeColor(json.down);
      }
      return { candidates: [p] };
    }
    const groups = Object.entries(json).filter(([, v]) => Array.isArray(v) && v.length && v.every(c => typeof c === 'string' || c?.hex || c?.value));
    if (groups.length) return { candidates: groups.map(([name, list]) => fromColors(name, validateColors(list))) };
    throw new Error('未找到颜色数组，请使用示例格式或粘贴 CSS 变量');
  }
  const css = [...text.matchAll(/--([\w-]+)\s*:\s*([^;\n}]+)/g)];
  if (css.length) return { candidates: [fromColors('CSS 变量色板', validateColors(css.map(m => ({ name: m[1], hex: m[2].trim() }))))] };
  return { candidates: [fromColors('导入色板', parseColorText(text))] };
}
function parseColorText(text) {
  if (!text.trim()) throw new Error('请先输入色值');
  if (text.length > 500000) throw new Error('色值文本过大，请控制在 500 KB 内');
  const tokens = text.match(/(?:rgb|hsl)\([^)]*\)|#?[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi);
  if (!tokens?.length) throw new Error('未找到有效色值，支持 HEX、RGB、HSL、颜色数组和 CSS 变量');
  const remainder = text.replace(/(?:rgb|hsl)\([^)]*\)|#?[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi, '').replace(/[\s,，;；\[\]'"`]/g, '');
  if (remainder) throw new Error('存在无法识别的内容，请移除代码声明，只保留颜色数组或 CSS 变量');
  return validateColors(tokens);
}
export function parseTextPalette(lightText, darkText='') {
  const light = parseColorText(lightText), dark = darkText.trim() ? parseColorText(darkText) : light;
  return createPalette({ id:'imported', name:'文本色板', light:light.map(c=>c.hex), dark:dark.map(c=>c.hex), source:darkText.trim()?'手动输入 · 浅深主题独立色值':'手动输入 · 浅深主题共用色值' });
}

function fromColors(name, colors) {
  return createPalette({ id: 'imported', name, light: colors.map(c => c.hex), names: colors.map(c => c.name), source: '手动导入 · 浅深主题初始共用色值' });
}
