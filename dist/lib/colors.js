export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); };
  return '#' + [f(5), f(3), f(1)].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function hexToHsv(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max ? d / max * 100 : 0, max * 100];
}
export function normalizeColor(input) {
  if (typeof input !== 'string') throw new Error('色值必须是文本');
  const value = input.trim();
  if (/^#?[0-9a-f]{3}$/i.test(value)) return '#' + value.replace('#', '').split('').map(c => c + c).join('').toUpperCase();
  if (/^#?[0-9a-f]{6}$/i.test(value)) return '#' + value.replace('#', '').toUpperCase();
  let m = value.match(/^rgb\(\s*(\d+(?:\.\d+)?%?)\s*[, ]\s*(\d+(?:\.\d+)?%?)\s*[, ]\s*(\d+(?:\.\d+)?%?)\s*\)$/i);
  if (m) {
    const values = m.slice(1).map(n => { const max = n.endsWith('%') ? 100 : 255; const v = parseFloat(n); if (v > max) throw new Error('RGB 色值超出范围'); return Math.round(v / max * 255); });
    return '#' + values.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  m = value.match(/^hsl\(\s*(-?\d+(?:\.\d+)?)(?:deg)?\s*[, ]\s*(\d+(?:\.\d+)?)%\s*[, ]\s*(\d+(?:\.\d+)?)%\s*\)$/i);
  if (m) {
    const h = ((Number(m[1]) % 360) + 360) % 360, s = Number(m[2]) / 100, l = Number(m[3]) / 100;
    if (s > 1 || l > 1) throw new Error('HSL 色值超出范围');
    const v = l + s * Math.min(l, 1 - l);
    return hsvToHex(h, v ? 200 * (1 - l / v) : 0, v * 100);
  }
  throw new Error(`无法识别色值：${value.slice(0, 48)}`);
}
export function rgbText(hex) { return hex.slice(1).match(/../g).map(n => parseInt(n, 16)).join(', '); }
