import { normalizeColor } from './colors.js';
export const clone = value => JSON.parse(JSON.stringify(value));
export const roles = { categorical: '分类色', semantic: '涨跌色', surface: '界面色' };
export const surfaces = {
  light: ['#F5F5F6', '#FFFFFF', '#202024', '#787880', '#E6E6E9', '#EBEBEE'],
  dark: ['#111113', '#1B1B1F', '#F4F4F5', '#9B9BA4', '#323238', '#29292F']
};
export const surfaceNames = ['页面背景', '卡片背景', '主要文字', '次要文字', '分隔线', '网格线'];
const colorList = (list, names, prefix) => list.map((hex, i) => ({ id: `${prefix}-${i + 1}`, name: names?.[i] || `系列 ${String(i + 1).padStart(2, '0')}`, hex: normalizeColor(hex) }));
export function createPalette({ id, name, light, dark, names, up = '#009B67', down = '#FF381A', darkUp = up, darkDown = down, source = '自定义色板', availableThemes = ['light', 'dark'] }) {
  return {
    schemaVersion: 1, id, name, source, availableThemes,
    themes: Object.fromEntries(['light', 'dark'].map(theme => [theme, {
      categorical: colorList(theme === 'light' ? (light || dark) : (dark || light), names, 'category'),
      semantic: colorList(theme === 'light' ? [up, down] : [darkUp, darkDown], ['上涨', '下跌'], 'state'),
      surface: colorList(surfaces[theme], surfaceNames, 'surface')
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
      output.themes[theme][role] = validateColors(input.themes[theme][role]).map((c, i) => ({ ...c, id: `${role}-${i + 1}` }));
    }
    if (output.themes[theme].surface.length !== 6) throw new Error('界面色需要包含 6 个颜色');
    if (output.themes[theme].semantic.length !== 2) throw new Error('涨跌色需要包含 2 个颜色');
  }
  return output;
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
