import { createPalette, surfaces } from '../lib/palettes.js';
export const presets = [
  createPalette({ id: 'ainvest', name: 'Ainvest 原始色板', light: ['#265FFC', '#38D1FF', '#F564B9', '#733ED6', '#00CCC3', '#273D8F', '#FF7040'], names: ['主蓝', '天蓝', '粉', '紫', '青', '深蓝', '橙'], lines: ['#FF7040', '#9EA9C7'], source: '本轮用户确认 · 7 个分类色 · 黑白版色值一致' }),
  createPalette({ id: 'claude', name: 'Claude', light: ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#4A3AA7', '#E34948'], dark: ['#3987E5', '#D95926', '#199E70', '#C98500', '#D55181', '#008300', '#9085E9', '#E66767'], names: ['蓝', '橙', '水绿', '黄', '洋红', '绿', '紫', '红'], source: '用户提供 · 8 个分类色 · 涨跌色沿用默认' }),
  createPalette({ id: 'tradingview', name: 'TradingView', light: ['#1F8CFF', '#4DD0E1', '#F57F17', '#B388FF', '#FBC02D', '#5B9CF6', '#EA80FC'], up: '#089981', down: '#F23645', source: '用户提供 · 7 个分类色 · 黑白版色值一致' }),
  createPalette({ id: 'simply-wall-st', name: 'Simply Wall St', light: ['#1D96DC', '#19B299', '#BA4986', '#E6B068', '#9F50E7'], dark: ['#1D96DC', '#73E6D5', '#BA4986', '#E6B068', '#9F50E7'], names: ['首色', '轮循 1', '轮循 2', '轮循 3', '轮循 4'], up: '#12A15B', down: '#E74142', darkUp: '#2EC87C', darkDown: '#E74142', source: '色板研究 · 5 个分类色 · 涨跌色取自走势线像素' }),
  // app.js resets the retired `robinhood` id to the default palette on load.
  createPalette({ id: 'robinhood-brand', name: 'Robinhood', light: ['#89C5FF', '#987AEC', '#D291D2', '#EFAAA5', '#FCA000', '#FFC557', '#FDDE00', '#C2F43B', '#80E764', '#00C805', '#84C6D2'], dark: ['#89C5FF', '#AF95F8', '#E2A6E2', '#F9C4C0', '#FFAA05', '#FFC557', '#FEE600', '#D8FF6E', '#7EE862', '#00C805', '#A8E4EC'], up: '#00C000', down: '#FF3800', darkUp: '#00C805', darkDown: '#FF5000', source: '用户提供 · 11 个分类色' })
];
// Every preset uses the original interface colors. Browsers and links may still store these older backgrounds; any other value was edited by hand.
const retiredBackgrounds = {
  claude: { light: ['#F5F5F5', '#FFFFFF'], dark: ['#000000', '#191919'] },
  tradingview: { light: ['#F5F5F5', '#FFFFFF'], dark: ['#000000', '#1A1A1A'] },
  'simply-wall-st': { light: ['#F6F4EF', '#EFECE6'], dark: ['#1A1A1A', '#212121'] },
  'robinhood-brand': { light: ['#F5F5F5', '#FFFFFF'], dark: ['#000000', '#1A1A1A'] }
};
export function dropRetiredBackgrounds(palette) {
  for (const theme of ['light', 'dark']) retiredBackgrounds[palette.id]?.[theme].forEach((hex, i) => {
    if (palette.themes[theme].surface[i].hex === hex) palette.themes[theme].surface[i].hex = surfaces[theme][i];
  });
  return palette;
}
