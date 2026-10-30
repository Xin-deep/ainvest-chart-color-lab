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
