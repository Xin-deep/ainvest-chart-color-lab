import { fitWaterfallBarWidth } from './waterfall-layout.js';
import { chartColorAt, chartColorSlot, completePiePreview } from './chart-palette.js';
import { applyComparisonFixture } from './comparison-fixtures.js';
import { applyChartLineWidth, installChartTexture } from './chart-appearance.js';
import { financialChartConfig, financialPercent } from '../dist/data/financial-shared.js';
import { aimeChartConfig } from '../dist/data/aime-reference.js';
import { surfaces } from '../dist/lib/palettes.js';
import { CHARTS } from '../dist/vendor/vis-lab/source/demos/registry.js';
import { EXAMPLES, buildConfig, examplesFor, densityOptionsOf, defaultDensityCountOf, densityRangeOf, capabilitiesOf } from '../dist/vendor/vis-lab/source/demos/examples.js';
import tokensCSS from '../dist/vendor/vis-lab/source/tokens/tokens.css';
import chartCSS from '../dist/vendor/vis-lab/source/charts/styles.css';
const css = `${tokensCSS}\n${chartCSS}\n:host{display:block}*{box-sizing:border-box}.chart-host{width:100%;font-family:var(--font-family-cn);color:var(--color-text-primary)}.palette-chart-summary{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none;line-height:1.45;color:var(--color-text-primary);white-space:nowrap}.palette-chart-summary span{font-size:10px;color:var(--color-text-secondary)}.palette-chart-summary strong{font-size:12px;font-weight:600}svg{flex-shrink:0}.dv-chart__plot{min-width:0}.chart-host.row-fill{flex:1;min-height:0}.chart-host[data-preset="financial-business"].dv-chart--legend-bottom,.chart-host[data-preset="financial-region"].dv-chart--legend-bottom,.chart-host[data-preset="aime-factors"].dv-chart--legend-bottom{flex-direction:column-reverse}.chart-host[data-preset="aime-growth"] .dv-line-point{opacity:0}`;
const compactCatalog=examplesFor('index').map(e=>{
  const caps=capabilitiesOf(e),range=densityRangeOf(e);
  if(e.id==='treemap-entry')range.max=8;
  if(e.chart==='pie')range.max=12;
  return {id:e.id,name:e.title,group:e.group,chart:e.chart,count:defaultDensityCountOf(e),legacyCounts:e.chart==='cartesian'?[22,e.id==='grouped3'?16:e.id==='line-multi'?36:22]:e.chart==='pie'?[7]:[densityOptionsOf(e).many],series:e.indexSeriesRange?.default||1,seriesRange:e.indexSeriesRange||null,range,labels:!!(caps.dataLabel||caps.labelLayout),fixed:!caps.density,summary:e.summary||'',height:'auto',span:e.chart==='sankey'?'full':'auto'};
});
let sharedSheet;
function mountCompactChart(target,module,palette,mode,onColor,density='compact',platform='pc') {
  if(target.hasAttribute('data-row-fill')){delete target.dataset.rowFill;target.style.removeProperty('min-height');}
  const shadow=target.shadowRoot||target.attachShadow({mode:'open'});
  shadow.replaceChildren();
  if('adoptedStyleSheets' in shadow){sharedSheet ||= new CSSStyleSheet();if(!sharedSheet.cssRules.length)sharedSheet.replaceSync(css);shadow.adoptedStyleSheets=[sharedSheet];}
  else {const style=document.createElement('style');style.textContent=css;shadow.append(style);}
  const host=document.createElement('div');host.className='chart-host';
  Object.assign(host.dataset,{theme:'ainvest',density:density==='standard'?'standard':'compact',platform:platform==='mobile'?'mobile':'pc',mode,preset:module.fixture||''});
  if(module.height!=='auto')host.style.height=`${module.height}px`;
  host.style.minWidth='0';
  host.__paletteLabWaterfallWidth=fitWaterfallBarWidth;
  const colors=palette.themes[mode];host.__paletteLabColors=colors.categorical.map(c=>c.hex);host.__paletteLabNeutral=colors.surface[3].hex;
  if(module.colorSlots)host.__paletteLabColors=module.colorSlots.map(i=>colors.categorical[i]?.hex||host.__paletteLabNeutral);
  if(module.fixture==='aime-duration')host.__paletteLabColors=Array(12).fill(colors.categorical[0].hex);
  host.__paletteLabResolveColor=index=>chartColorAt(host.__paletteLabColors,index,host.__paletteLabNeutral);
  // Preserve the upstream axis, legend and grid tokens until the designer edits that surface role.
  for(const [index,variables] of [[1,['--color-background-layer1']],[2,['--color-text-primary']],[3,['--color-text-secondary','--color-text-axis','--color-text-legend']],[4,['--color-visualization-divider-deep']],[5,['--color-visualization-divider']]])
    if(colors.surface[index].hex!==surfaces[mode][index])for(const variable of variables)host.style.setProperty(variable,colors.surface[index].hex);
  for(const [key,value] of Object.entries({'--color-sankey-income':colors.categorical[0].hex,'--color-sankey-profit':colors.semantic[0].hex,'--color-sankey-expense':colors.semantic[1].hex,'--color-price-up':colors.semantic[0].hex,'--color-price-down':colors.semantic[1].hex}))host.style.setProperty(key,value);
  if(module.fixture==='aime-growth')host.__paletteLabFormat=v=>v==null?'—':`${Math.round(v*100)}%`;
  if(['financial-trend','financial-payout'].includes(module.fixture)){
    host.__paletteLabFormat=v=>v!==0&&Math.abs(v)<2?financialPercent(v):new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v/1e9)+(v===0?'':'B');
    host.__paletteLabSecondaryFormat=financialPercent;
  }
  if(['financial-business','financial-region','financial-breakdown'].includes(module.fixture))host.__paletteLabFormat=v=>`${Number((v/1e9).toFixed(2))}B`;
  if(module.fixture==='financial-yield')host.__paletteLabFormat=financialPercent;
  applyChartLineWidth(host,module);
  shadow.append(host);
  const example=EXAMPLES.find(e=>e.id===module.type);
  if(!example)throw new Error(`未接入图表：${module.type}`);
  const fillRow=target.closest('.compact-grid')&&['cartesian','hbar','waterfall'].includes(example.chart);
  // Use the upstream presentation pipeline, including its Ainvest English copy.
  const sourceCfg=example.cfg;
  const selected={...example,cfg:n=>sourceCfg(n,module.series)};
  let cfg=buildConfig(selected,{theme:'ainvest',platform:platform==='mobile'?'mobile':'pc',density:module.count,dataLabel:module.labels,animation:false,legend:example.chart==='pie'&&module.labels==='on'?'bottom':'right',labelLayout:example.chart==='pie'&&module.labels==='on'?'outside':'off',legendSelect:'multi',radarEditable:'off'});
  cfg=applyComparisonFixture(cfg,module);
  const fixture=financialChartConfig(module)||aimeChartConfig(module);if(fixture)Object.assign(cfg,fixture);
  cfg=completePiePreview(cfg,module);
  const instance=CHARTS[example.chart](host,cfg);
  if(fillRow){target.style.minHeight=`${host.getBoundingClientRect().height}px`;target.dataset.rowFill='';host.classList.add('row-fill');}
  const texture=installChartTexture(host,module,mode);
  const summary=module.summary||(module.fixture==='aime-factors'?{label:'Total',value:(cfg.items.reduce((sum,item)=>sum+item.value,0)/1e6).toFixed(2)+'M'}:null);
  let summaryObserver;
  if(summary&&example.chart==='pie'){
    const plot=host.querySelector('.dv-chart__plot'),el=document.createElement('div');el.className='palette-chart-summary';
    const label=document.createElement('span'),value=document.createElement('strong');label.textContent=summary.label;value.textContent=summary.value;el.append(label,value);
    const place=()=>{if(!plot.contains(el))plot.append(el);};place();summaryObserver=new MutationObserver(place);summaryObserver.observe(plot,{childList:true});
  }
  const keys=(cfg.items||cfg.series||cfg.entities||cfg.root?.children||[]).map(item=>typeof item==='string'?item:item.name);
  // Double click picks a palette slot; ordinary click keeps the upstream chart/legend interaction.
  host.addEventListener('dblclick',event=>{const group=event.target.closest('[data-key]');if(group){const index=keys.indexOf(group.dataset.key);const slot=example.chart==='treemap'?0:index;const paletteIndex=module.fixture==='aime-duration'?0:chartColorSlot(slot,module.colorSlots,colors.categorical.length);if(paletteIndex>=0&&paletteIndex<colors.categorical.length)onColor(paletteIndex);}});
  return {destroy(){texture.destroy();summaryObserver?.disconnect();instance.destroy();shadow.replaceChildren();}};
}
export { mountCompactChart, compactCatalog };
