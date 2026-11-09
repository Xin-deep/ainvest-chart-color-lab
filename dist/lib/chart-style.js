// Global overrides are resolved at render time; each module keeps its own settings.
export function normalizeGlobalChartStyle(input) {
  const raw = input?.lineWidth;
  const width = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '') ? Number(raw) : NaN;
  return {
    lineWidth: raw === 'auto' ? 'auto' : Number.isFinite(width) && width >= .5 && width <= 8 ? width : 'inherit',
    texture: ['none', 'stripes', 'cross', 'dots'].includes(input?.texture) ? input.texture : 'inherit'
  };
}
export function resolveChartStyle(module, globalStyle) {
  const style = normalizeGlobalChartStyle(globalStyle);
  return {
    ...module,
    ...(style.lineWidth === 'inherit' ? {} : { lineWidth: style.lineWidth }),
    ...(style.texture === 'inherit' ? {} : { texture: style.texture })
  };
}
// Display settings the designer changed on a web or Terminal chart, keyed by its slot id.
export function normalizeSceneCharts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([id]) => /^[\w-]{1,40}$/.test(id)).slice(0, 40).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== 'object') return [];
    const value = {}, width = Number(raw.lineWidth);
    if (['auto', 'on', 'off'].includes(raw.labels)) value.labels = raw.labels;
    if (['on', 'off'].includes(raw.area)) value.area = raw.area;
    if (raw.lineWidth === 'auto' || (Number.isFinite(width) && width >= .5 && width <= 8)) value.lineWidth = raw.lineWidth === 'auto' ? 'auto' : width;
    if (['none', 'stripes', 'cross', 'dots'].includes(raw.texture)) value.texture = raw.texture;
    if (['on', 'off'].includes(raw.zoom)) value.zoom = raw.zoom;
    for (const [field, max] of [['count', 200], ['series', 12]]) { const number = Math.round(Number(raw[field])); if (raw[field] !== '' && raw[field] != null && Number.isFinite(number) && number >= 1 && number <= max) value[field] = number; }
    return Object.keys(value).length ? [[id, value]] : [];
  }));
}
