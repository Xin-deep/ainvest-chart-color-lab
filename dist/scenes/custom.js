import { resolveChartStyle } from '../lib/chart-style.js';
const compactTypes = globalThis.PaletteVisEngine.compactCatalog;
const compactEscape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function newCompactModule(type) {
  const def=compactTypes.find(v=>v.id===type)||compactTypes[0];
  return {id:crypto.randomUUID(),type:def.id,count:def.count,series:def.series,labels:'auto',lineWidth:'auto',texture:'none',hidden:false,height:def.height,span:def.span};
}
function defaultCompactBoard(){const modules=compactTypes.map(v=>newCompactModule(v.id));return {catalogVersion:3,density:'compact',columns:3,selected:modules[0].id,modules};}
function validateCompactBoard(input){
  if(!input||!Array.isArray(input.modules))return defaultCompactBoard();
  const modules=input.modules.slice(0,60).filter(m=>compactTypes.some(t=>t.id===m.type)).map(m=>{
    const def=compactTypes.find(t=>t.id===m.type);
    const migrateDefaults=(Number(input.catalogVersion)||0)<3&&!m.fixtureCustomized&&def.legacyCounts.includes(m.count);
    return {id:typeof m.id==='string'&&/^[\w-]{1,80}$/.test(m.id)?m.id:crypto.randomUUID(),type:def.id,count:Math.max(def.range.min,Math.min(def.range.max,migrateDefaults?def.count:Math.round(Number(m.count)||def.count))),series:def.seriesRange?Math.max(def.seriesRange.min,Math.min(def.seriesRange.max,Math.round(Number(m.series)||def.series))):def.series,hidden:m.hidden===true,comparisonVariant:['few','many'].includes(m.comparisonVariant)?m.comparisonVariant:undefined,comparisonLabel:['少量数据','大量数据','结构示例'].includes(m.comparisonLabel)?m.comparisonLabel:undefined,labels:['auto','on','off'].includes(m.labels)?m.labels:'auto',fixtureCustomized:!!m.fixtureCustomized,lineWidth:m.lineWidth!=='auto'&&Number.isFinite(Number(m.lineWidth))?Math.max(.5,Math.min(8,Number(m.lineWidth))):'auto',texture:['none','stripes','cross','dots'].includes(m.texture)?m.texture:'none',height:migrateDefaults&&[220,300].includes(m.height)?'auto':['auto',180,220,300,400].includes(m.height)?m.height:'auto',span:m.span==='full'?'full':'auto'};
  });
  if((Number(input.catalogVersion)||0)<2)for(const def of compactTypes)if(!modules.some(m=>m.type===def.id))modules.push(newCompactModule(def.id));
  const selected=modules.find(m=>m.id===input.selected&&!m.hidden)||modules.find(m=>!m.hidden);
  return {catalogVersion:3,density:input.density==='standard'?'standard':'compact',columns:[1,2,3,4,5].includes(input.columns)?input.columns:3,selected:selected?.id,modules};
}
function renderCompactCards(board){return board.modules.filter(m=>!m.hidden).map(m=>{
    const def=compactTypes.find(t=>t.id===m.type);
    return `<section class="compact-card ${board.selected===m.id?'is-selected':''} ${m.span==='full'?'full-row':''}" data-module-id="${m.id}"><header><button data-action="module-select" data-value="${m.id}" aria-pressed="${board.selected===m.id}">${def.name}${m.comparisonLabel?` · ${m.comparisonLabel}`:''}</button><span>${def.fixed?(m.comparisonVariant?`${m.count} ${def.chart==='sankey'?'节点':'项'}`:compactEscape(def.summary)):`${m.count} ${def.chart==='radar'?'维度':def.chart==='pie'?'分项':'类目'}`}${def.seriesRange?` · ${m.series} 系列`:''}</span></header>${compactModuleTools(m,board)}<div class="compact-chart-target" data-chart-id="${m.id}" data-chart-type="${m.type}"></div><button class="compact-module-edit" data-action="module-select" data-value="${m.id}" aria-label="设置${def.name}">设置</button></section>`;
  }).join('');}
function renderCompactBoard(board,{title='可视化组件看板',description=''}={}){
  const visible=board.modules.filter(m=>!m.hidden);
  return `<div class="compact-board-scroll"><div class="compact-board-content"><header class="compact-board-heading"><h1>${compactEscape(title)}</h1><span>Ainvest · PC · ${board.density==='standard'?'宽松':'紧凑'}<span class="compact-divider">/</span>${visible.length} 个模块${board.modules.length!==visible.length?` · ${board.modules.length-visible.length} 个隐藏`:``} · ${new Set(visible.map(m=>m.type)).size}/${compactTypes.length} 种样式</span></header>${description?`<p class="compact-hint comparison-description">${compactEscape(description)}</p>`:''}<div class="compact-grid" style="--board-columns:${board.columns}">${renderCompactCards(board)}</div>${!visible.length?'<p class="compact-hint">暂无显示模块，可从右侧恢复隐藏模块或添加组件。</p>':''}<button class="compact-add-tile" data-action="module-picker">＋ 添加可视化模块</button><p class="compact-hint">悬停查看数据 · 点击图例切换系列显隐 · 双击图形定位色板颜色</p></div></div>`;
}
function compactModuleTools(module,board){
  const visible=board.modules.filter(m=>!m.hidden),index=visible.findIndex(m=>m.id===module.id);
  return `<div class="compact-card-tools" aria-label="模块操作"><button data-action="module-move-up" data-value="${module.id}" aria-label="前移模块" title="前移" ${index===0?'disabled':''}>↑</button><button data-action="module-move-down" data-value="${module.id}" aria-label="后移模块" title="后移" ${index===visible.length-1?'disabled':''}>↓</button><button data-action="module-hide" data-value="${module.id}" aria-label="隐藏模块" title="隐藏模块">隐藏</button></div>`;
}
function moveCompactModule(board,id,position){
  const visible=board.modules.filter(m=>!m.hidden),module=visible.find(m=>m.id===id);
  const target=visible[Math.max(0,Math.min(visible.length-1,position))];
  if(!module||!target||target===module)return;
  const forward=visible.indexOf(target)>visible.indexOf(module);
  board.modules.splice(board.modules.indexOf(module),1);
  board.modules.splice(board.modules.indexOf(target)+(forward?1:0),0,module);
}
function setCompactModuleHidden(board,id,hidden){
  const module=board.modules.find(m=>m.id===id);if(!module)return;
  module.hidden=hidden;
  if(hidden&&board.selected===id)board.selected=board.modules.find(m=>!m.hidden)?.id;
  if(!hidden)board.selected=id;
}
function hiddenCompactPanel(board){
  const hidden=board.modules.filter(m=>m.hidden);
  return hidden.length?`<details class="compact-hidden"><summary>已隐藏 ${hidden.length} 个模块</summary>${hidden.map(m=>`<div><span>${compactEscape(compactTypes.find(t=>t.id===m.type)?.name)}${m.comparisonLabel?' · '+compactEscape(m.comparisonLabel):''}</span><button class="text-button" data-action="module-show" data-value="${m.id}">恢复显示</button></div>`).join('')}<button class="text-button" data-action="module-show-all">显示全部</button></details>`:'';
}
function compactBoardPanel(board,{title='看板布局',layout=true,density=true,add=true}={}){
  const m=board.modules.find(v=>v.id===board.selected),def=compactTypes.find(t=>t.id===m?.type);
  const hasLine=def&&(def.chart==='radar'||/^(line|combo)/.test(def.id));
  const hasTexture=def&&['cartesian','pie','radar','hbar','waterfall'].includes(def.chart)&&(m.fixture==='aime-growth'||!['line','line-negative','line-multi'].includes(def.id));
  return `<section class="panel-section compact-settings"><div class="section-heading"><span class="section-label">${compactEscape(title)}</span>${add?'<button class="text-button" data-action="module-picker">＋ 添加模块</button>':''}</div>${layout?`<div class="segment compact-columns" aria-label="看板列数">${[1,2,3,4,5].map(n=>`<button data-action="board-columns" data-value="${n}" class="${board.columns===n?'active':''}">${n===1?'整行':n+' 列'}</button>`).join('')}</div>`:''}${density?`<div class="section-heading" style="margin-top:12px"><span class="section-label">图表版式</span></div><div class="segment compact-columns" aria-label="图表版式">${[['compact','紧凑'],['standard','宽松']].map(([value,label])=>`<button data-action="board-density" data-value="${value}" class="${board.density===value?'active':''}" aria-pressed="${board.density===value}">${label}</button>`).join('')}</div>`:''}${hiddenCompactPanel(board)}${m?`<div class="compact-settings-title">${def.name}<span>所选模块</span></div><div class="compact-module-actions"><button class="button" data-action="module-move-up" ${board.modules.filter(v=>!v.hidden)[0]?.id===m.id?'disabled':''}>↑ 前移</button><button class="button" data-action="module-move-down" ${board.modules.filter(v=>!v.hidden).at(-1)?.id===m.id?'disabled':''}>↓ 后移</button><button class="button" data-action="module-hide">隐藏</button></div><label>移动到<select data-module-position aria-label="模块位置">${board.modules.filter(v=>!v.hidden).map((v,index)=>`<option value="${index}" ${v.id===m.id?'selected':''}>第 ${index+1} 位</option>`).join('')}</select></label>${!def.fixed?`<label>${def.chart==='radar'?'维度数量':'数据项数'}<input data-module-field="count" type="number" min="${def.range.min}" max="${def.range.max}" value="${m.count}"></label>`:`<p class="editor-footnote">${m.comparisonVariant?`${m.comparisonLabel} · ${m.count} ${def.chart==='sankey'?'节点':'项'}`:compactEscape(def.summary)}</p>`}${def.seriesRange?`<label>系列数量<input data-module-field="series" type="number" min="${def.seriesRange.min}" max="${def.seriesRange.max}" value="${m.series}"></label>`:''}<label>模块高度<select data-module-field="height">${['auto',180,220,300,400].map(h=>`<option value="${h}" ${m.height===h?'selected':''}>${h==='auto'?'原始尺寸':h+'px'}</option>`).join('')}</select></label><label>模块占位<select data-module-field="span"><option value="auto" ${m.span==='auto'?'selected':''}>跟随列数</option><option value="full" ${m.span==='full'?'selected':''}>独占整行</option></select></label>${def.labels?`<label>数据标签<select data-module-field="labels">${[['auto','默认规则'],['on','显示'],['off','隐藏']].map(([v,n])=>`<option value="${v}" ${m.labels===v?'selected':''}>${n}</option>`).join('')}</select></label>`:''}${hasLine?`<label>线条粗细<select data-module-field="lineWidth" aria-label="线条粗细">${['auto',.5,1,1.5,2,3].map(value=>`<option value="${value}" ${(m.lineWidth??'auto')===value?'selected':''}>${value==='auto'?'默认':value+' px'}</option>`).join('')}</select></label>`:''}${hasTexture?`<label>填充纹理<select data-module-field="texture" aria-label="填充纹理">${[['none','无纹理'],['stripes','斜线'],['cross','交叉线'],['dots','圆点']].map(([value,label])=>`<option value="${value}" ${(m.texture||'none')===value?'selected':''}>${label}</option>`).join('')}</select></label>`:''}<div class="compact-module-actions"><button class="button" data-action="module-duplicate">复制模块</button><button class="button" data-action="module-remove">移除模块</button></div>`:'<p class="editor-footnote">添加模块后可调整展示参数。</p>'}</section>`;
}
let compactInstances=[];
function destroyCompactCharts(){for(const chart of compactInstances)chart.destroy();compactInstances=[];}
function mountCompactBoard(root,board,palette,theme,onColor){
  destroyCompactCharts();
  const c=palette.themes[theme];
  for(const [key,hex] of Object.entries({bg:c.surface[0].hex,card:c.surface[1].hex,text:c.surface[2].hex,muted:c.surface[3].hex,line:c.surface[4].hex}))root.style.setProperty(`--compact-${key}`,hex);
  for(const target of root.querySelectorAll('[data-chart-id]')){
    const module=board.modules.find(v=>v.id===target.dataset.chartId);
    try{compactInstances.push(globalThis.PaletteVisEngine.mountCompactChart(target,resolveChartStyle(module,board.globalChartStyle),palette,theme,index=>onColor(index,module.id),board.density,board.platform));}
    catch(error){target.textContent=`图表加载失败：${error.message}`;}
  }
}
export {compactTypes,newCompactModule,defaultCompactBoard,validateCompactBoard,renderCompactCards,renderCompactBoard,compactModuleTools,moveCompactModule,setCompactModuleHidden,compactBoardPanel,mountCompactBoard,destroyCompactCharts};
