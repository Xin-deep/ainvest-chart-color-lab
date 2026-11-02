import { createPalette } from '../lib/palettes.js';
// Neutral stand-ins, not brand colors. Replace `light` and `dark` with each brand's real values when available.
const placeholderGrays = ['#2F2F33', '#48484D', '#616167', '#7A7A81', '#93939A', '#ABABB1', '#C3C3C8'];
const placeholder = (id, name) => createPalette({ id, name, light: placeholderGrays, dark: [...placeholderGrays].reverse(), source: '占位色板 · 颜色待补充' });
export const presets = [
  createPalette({ id: 'ainvest', name: 'Ainvest 原始色板', light: ['#265FFC', '#38D1FF', '#F564B9', '#733ED6', '#00CCC3', '#273D8F', '#FF7040'], names: ['主蓝', '天蓝', '粉', '紫', '青', '深蓝', '橙'], source: '本轮用户确认 · 7 个分类色 · 黑白版色值一致' }),
  placeholder('claude', 'Claude 色板'),
  placeholder('tradingview', 'TradingView 色板'),
  placeholder('simply-wall-st', 'Simply Wall St 色板'),
  // app.js resets the retired `robinhood` id to the default palette on load.
  placeholder('robinhood-brand', 'Robinhood 色板')
];
