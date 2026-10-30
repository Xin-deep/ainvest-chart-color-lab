import { encodeMobilePreview, decodeMobilePreview } from './lib/mobile-preview.js';
import { bindColorJsPicker } from './lib/colorjs-picker.js';
import { comparisonTemplates, createComparisonBoard, validateComparisonBoards, comparisonTemplatePanel } from './scenes/comparison.js';
import { normalizeGlobalChartStyle } from './lib/chart-style.js';
import { defaultCheckSettings, normalizeCheckSettings, buildPaletteCheckReport } from './lib/palette-checks.js';
import { renderColorChecks, renderColorCheckBadges } from './scenes/color-checks.js';
import { hexToOklch, checkOklch, oklchCss } from './lib/oklch.js';
import { presets } from './data/presets.js';
import { clone, roles, validatePalette, parseImport, parseTextPalette } from './lib/palettes.js';
import { normalizeColor, hexToHsv, hsvToHex, rgbText } from './lib/colors.js';
import { renderFinancialScene, applyFinancialPalette } from './scenes/financial.js';

import { compactTypes, newCompactModule, defaultCompactBoard, validateCompactBoard, renderCompactBoard, compactBoardPanel, mountCompactBoard, destroyCompactCharts, moveCompactModule, setCompactModuleHidden } from './scenes/custom.js';

import { defaultAimeBoard, validateAimeBoard, renderAimeScene, aimeBoardPanel, applyAimePalette } from './scenes/aime.js';

import { financialChartModules } from './data/financial-shared.js';

import { defaultFinancialBoard, validateFinancialBoard, renderFinancialExtras } from './scenes/financial-extras.js';

const VERSION = '0.11.0';
const STORAGE_KEY = 'ainvest-palette-lab:v1';
const scenes = [
  { id: 'financial', name: '财报分析', en: 'Financial analysis', icon: 'file' },
  { id: 'aime', name: 'Aime 对话', en: 'Aime conversation', icon: 'chat' },
  { id: 'custom', name: '自由看板', en: 'Custom dashboard', icon: 'grid' }
];
const paths = {
  logo: '<path d="M5 18V6h5a4 4 0 0 1 0 8H8"/><path d="M14 18h5M17 6v12"/>',
  pie: '<path d="M12 3v9h9"/><path d="M20.3 15.5A9 9 0 1 1 8.5 3.7M15 3.5a9 9 0 0 1 5.5 5.5H15z"/>',
  chart: '<path d="M4 4v16h16M7 14l4-5 4 3 5-7"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-9a9 9 0 1 1 18-1z"/><path d="M7 10h8M7 14h5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  export: '<path d="M12 15V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  save: '<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  undo: '<path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 7 7v3"/>',
  redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0-7 7v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  moon: '<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14z"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16M18 9v6"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  sliders: '<path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 14v6h16v-6"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 13h8M8 17h5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let state = { baseline: clone(presets[0]), draft: clone(presets[0]), scene: 'financial', theme: 'light', mode: 'draft', role: 'categorical', selected: 0, panel: 'palette', editorOpen: false, collapsed: innerWidth < 650, previewFullscreen: new URLSearchParams(location.search).get('preview') === 'fullscreen', saved: [], globalChartStyle: normalizeGlobalChartStyle(), checkSettings: defaultCheckSettings(), financialBoard: defaultFinancialBoard(), financialDensity: 'compact', customTemplate:'all', comparisonBoards:{}, customBoard: defaultCompactBoard(), aimeBoard: defaultAimeBoard() };
let storageAvailable = true, loaded = false;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (stored?.schemaVersion === 1) {
    const base = validatePalette(stored.baseline), draft = validatePalette(stored.draft);
    base.id = stored.baseline.id; draft.id = stored.draft.id;
    // Update the unmodified old 8-color Ainvest preset to the newly confirmed 7 colors.
    for (const p of [base, draft]) if (p.id === 'ainvest') {
      for (const theme of ['light', 'dark']) if (p.themes[theme].categorical.length === 8 && p.themes[theme].categorical[7].hex === '#9EA9C7') p.themes[theme].categorical.pop();
      p.source = presets[0].source;
    }
    state = { ...state, customTemplate: [...comparisonTemplates.map(t=>t.id),'free'].includes(stored.customTemplate)?stored.customTemplate:'all', comparisonBoards:validateComparisonBoards(stored.comparisonBoards), globalChartStyle: normalizeGlobalChartStyle(stored.globalChartStyle), checkSettings: normalizeCheckSettings(stored.checkSettings), financialBoard: validateFinancialBoard(stored.financialBoard), financialDensity: stored.financialDensity === 'standard' ? 'standard' : 'compact', customBoard: validateCompactBoard(stored.customBoard), aimeBoard: validateAimeBoard(stored.aimeBoard), baseline: base, draft, scene: scenes.some(s => s.id === stored.scene) ? stored.scene : 'financial', collapsed: typeof stored.collapsed === 'boolean' ? stored.collapsed : state.collapsed, theme: ['light', 'dark'].includes(stored.theme) ? stored.theme : 'light', saved: (stored.saved || []).slice(-30).flatMap(p => { try { const v = validatePalette(p); v.id = p.id; return [v]; } catch { return []; } }) };
    loaded = true;
  }
} catch { storageAvailable = false; }
if (['finary','robinhood','wealthsimple'].includes(state.draft.id)) { state.baseline = clone(presets[0]); state.draft = clone(presets[0]); }
const mobileEntry = document.body.dataset.mobilePreview === 'true';
const requestedScene = new URLSearchParams(location.search).get('scene') || (mobileEntry ? 'aime' : null);
if (scenes.some(s => s.id === requestedScene)) state.scene = requestedScene;
let mobileShareError = '', sharedPreviewLoaded = false;
try {
  const shared = decodeMobilePreview(location.hash);
  if (shared) {
    const baseline = validatePalette(shared.baseline), draft = validatePalette(shared.draft);
    const aimeBoard = validateAimeBoard(shared.aimeBoard);
    state = { ...state, baseline, draft, aimeBoard, scene: 'aime', theme: shared.theme === 'dark' ? 'dark' : 'light', mode: shared.mode === 'baseline' ? 'baseline' : 'draft', globalChartStyle: normalizeGlobalChartStyle(shared.globalChartStyle) };
    sharedPreviewLoaded = true;
  }
} catch { mobileShareError = '分享链接无效，已显示本机方案'; }
const requestedTheme = new URLSearchParams(location.search).get('theme');
if (['light', 'dark'].includes(requestedTheme)) state.theme = requestedTheme;
if (mobileEntry || (state.scene === 'aime' && innerWidth <= 650)) { state.collapsed = true; state.previewFullscreen = false; }
const isMobileAime = () => state.scene === 'aime' && (mobileEntry || innerWidth <= 650);
function activeCustomBoard(){
  if(state.customTemplate==='free')return state.customBoard;
  return state.comparisonBoards[state.customTemplate]||=(createComparisonBoard(state.customTemplate));
}
const activeModuleBoard = () => state.scene === 'financial' ? state.financialBoard : state.scene === 'aime' ? state.aimeBoard : activeCustomBoard();
let compactColorFrame;
function financialDensityPanel(){
  return `<section class="panel-section"><div class="section-heading"><span class="section-label">预览模块密度</span><button class="text-button" data-action="module-picker">＋ 添加模块</button></div><div class="segment compact-columns" aria-label="财报模块密度">${[['compact','高密度'],['standard','低密度']].map(([value,label])=>`<button data-action="financial-density" data-value="${value}" class="${state.financialDensity===value?'active':''}" aria-pressed="${state.financialDensity===value}">${label}</button>`).join('')}</div></section>${state.financialBoard.modules.length?compactBoardPanel(state.financialBoard,{title:'新增组件设置',layout:true,density:false,add:false}):''}`;
}
function repaintFinancialCharts(){
  const canvas=document.querySelector('#preview-canvas');
  mountCompactBoard(canvas,{modules:[...financialChartModules,...state.financialBoard.modules],density:state.financialDensity,platform:'pc',globalChartStyle:state.globalChartStyle},current(),state.theme,(index,id)=>{if(state.financialBoard.modules.some(m=>m.id===id))state.financialBoard.selected=id;state.editorOpen=true;state.role='categorical';state.selected=index;state.panel='palette';state.collapsed=false;if(state.previewFullscreen)setPreviewFullscreen(false);else render();});
}
function repaintCompactBoard() {
  const board=activeModuleBoard();
  mountCompactBoard(document.querySelector('#preview-canvas'), {...board,globalChartStyle:state.globalChartStyle}, current(), state.theme, (index, id) => { board.selected = id; state.editorOpen = true; state.role = 'categorical'; state.selected = index; state.panel = 'palette'; state.collapsed = false; if (state.previewFullscreen) setPreviewFullscreen(false); else render(); });
  if(state.scene==='aime')applyAimePalette(document.querySelector('#preview-canvas'),current(),state.theme);
}
let history = [], future = [], pendingImport = null, importedIndex = 0, editorTransaction = null, toastTimer, deletedScheme = null;
const app = document.querySelector('#app'), modal = document.querySelector('#modal');
const current = () => state.mode === 'baseline' ? state.baseline : state.draft;
const selectedColor = () => state.draft.themes[state.theme][state.role][state.selected];
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, toolVersion: VERSION, baseline: state.baseline, draft: state.draft, scene: state.scene, theme: state.theme, collapsed: state.collapsed, saved: state.saved, customTemplate:state.customTemplate, comparisonBoards:state.comparisonBoards, customBoard: state.customBoard, aimeBoard: state.aimeBoard, financialDensity: state.financialDensity, financialBoard: state.financialBoard, checkSettings: state.checkSettings, globalChartStyle: state.globalChartStyle })); storageAvailable = true; }
  catch { storageAvailable = false; }
}
function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.remove('actionable'); el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3000);
}
function deletePalette(id) {
  const index=state.saved.findIndex(p=>p.id===id);if(index<0)return;
  const active=state.draft.id===id;
  deletedScheme={palette:clone(state.saved[index]),index,snapshot:active?{baseline:clone(state.baseline),draft:clone(state.draft),mode:state.mode,role:state.role,selected:state.selected,editorOpen:state.editorOpen,history:history.map(clone),future:future.map(clone)}:null};
  state.saved.splice(index,1);
  if(active){state.baseline=clone(presets[0]);state.draft=clone(presets[0]);state.mode='draft';state.role='categorical';state.selected=0;state.editorOpen=false;history=[];future=[];}
  persist();render();toast('已删除方案');
  const notice=document.querySelector('#toast'),undo=document.createElement('button');undo.textContent='撤销删除';undo.className='toast-undo';undo.addEventListener('click',undoDeletePalette);notice.append(undo);notice.classList.add('actionable');clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.classList.remove('visible'),8000);
}
function undoDeletePalette(){
  if(!deletedScheme)return;
  const removed=deletedScheme;deletedScheme=null;
  if(!state.saved.some(p=>p.id===removed.palette.id))state.saved.splice(Math.min(removed.index,state.saved.length),0,removed.palette);
  if(removed.snapshot&&state.draft.id===presets[0].id&&!changedCount()){
    const {history:oldHistory,future:oldFuture,...paletteState}=removed.snapshot;Object.assign(state,paletteState);history=oldHistory;future=oldFuture;
  }
  persist();render();toast('已恢复方案');
}
function remember(snapshot = state.draft) { history.push(clone(snapshot)); if (history.length > 60) history.shift(); future = []; }
function changedCount() {
  let count = 0;
  for (const theme of ['light', 'dark']) for (const role of Object.keys(roles)) {
    const a = state.baseline.themes[theme][role], b = state.draft.themes[theme][role];
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i]?.hex !== b[i]?.hex) count++;
  }
  return count;
}
function globalChartStylePanel(){
  const style=state.globalChartStyle;
  return `<section class="panel-section compact-settings"><div class="section-heading"><span class="section-label">全局图表样式</span></div><label>线条粗细<select data-global-chart-style="lineWidth" aria-label="全局线条粗细">${[['inherit','按模块设置'],['auto','统一默认'],...[.5,1,1.5,2,3].map(v=>[v,v+' px'])].map(([value,label])=>`<option value="${value}" ${style.lineWidth===value?'selected':''}>${label}</option>`).join('')}</select></label><label>面积纹理<select data-global-chart-style="texture" aria-label="全局面积纹理">${[['inherit','按模块设置'],['none','无纹理'],['stripes','斜线'],['cross','交叉线'],['dots','圆点']].map(([value,label])=>`<option value="${value}" ${style.texture===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="editor-footnote">三个预览界面同步生效；全局设置优先于模块设置。</p></section>`;
}
function moduleSettingsPanel(){return globalChartStylePanel()+(state.scene==='custom'?comparisonTemplatePanel(state.customTemplate)+compactBoardPanel(activeCustomBoard()):state.scene==='aime'?aimeBoardPanel(state.aimeBoard):financialDensityPanel());}
function selectPreviewModule(id){
  const board=activeModuleBoard();if(!board.modules.some(module=>module.id===id))return;
  if(board.selected===id&&state.panel==='palette'&&!state.editorOpen&&!state.collapsed)return;
  const shellChanged=state.collapsed||state.previewFullscreen||state.panel!=='palette';
  board.selected=id;state.panel='palette';state.editorOpen=false;state.collapsed=false;
  if(shellChanged){state.previewFullscreen=false;persist();render();return;}
  // Update only the selection and sidebar. Keep live chart nodes, legend state and scroll position.
  for(const card of document.querySelectorAll('[data-module-id]')){
    const selected=card.dataset.moduleId===id;card.classList.toggle('is-selected',selected);
    for(const button of card.querySelectorAll('[data-action="module-select"][aria-pressed]'))button.setAttribute('aria-pressed',String(selected));
  }
  document.querySelector('.sidebar>.color-editor')?.remove();
  const side=document.querySelector('.side-scroll');side.innerHTML=moduleSettingsPanel()+palettePanel();side.scrollTop=0;
  bindInputs();persist();
}
function render() {
  cancelAnimationFrame(compactColorFrame);
  const scroll = document.querySelector('.side-scroll')?.scrollTop || 0;
  const paletteTabsScroll = document.querySelector('.palette-tabs')?.scrollLeft || 0;
  const oldCanvas = document.querySelector('#preview-canvas');
  const oldSceneScroller = oldCanvas?.querySelector('.financial-content-frame, .compact-board-scroll, .aime-content-scroll') || oldCanvas;
  const canvasScroll = { top: oldCanvas?.dataset.scene===state.scene ? oldSceneScroller?.scrollTop || 0 : 0, left: oldSceneScroller?.scrollLeft || 0, sceneHeight: oldSceneScroller?.scrollHeight || 0 };
  const oldCustomFrame = oldCanvas?.dataset.scene===state.scene ? oldCanvas?.querySelector('.compact-board-scroll, .aime-content-scroll') : null;
  const visibleCard = oldCustomFrame && [...oldCustomFrame.querySelectorAll('[data-module-id]')].find(card => card.getBoundingClientRect().bottom > oldCustomFrame.getBoundingClientRect().top);
  const customAnchor = visibleCard && { id: visibleCard.dataset.moduleId, offset: visibleCard.getBoundingClientRect().top - oldCustomFrame.getBoundingClientRect().top };
  destroyCompactCharts();
  const scene = scenes.find(s => s.id === state.scene), palette = current(), mobileAime = isMobileAime();
  app.innerHTML = `<main class="app-shell two-pane ${mobileAime ? 'aime-mobile' : ''} ${state.collapsed ? 'panel-collapsed' : ''} ${state.previewFullscreen ? 'preview-fullscreen' : ''}">
    ${state.previewFullscreen ? `<button class="button fullscreen-exit" data-action="exit-fullscreen" aria-label="退出全屏预览">${icon('close')}退出全屏 <kbd>Esc</kbd></button>` : ''}
    ${state.collapsed && !state.previewFullscreen && !mobileAime ? `<button class="icon-button workbench-launcher" data-action="collapse" aria-label="展开颜色工作台" title="展开颜色工作台" aria-expanded="false">${icon('panel')}</button>` : ''}
    ${mobileAime ? `<nav class="aime-preview-controls" aria-label="手机预览工具"><span>Aime 预览</span><button data-action="theme" data-value="${state.theme==='light'?'dark':'light'}" aria-label="切换到${state.theme==='light'?'深色':'浅色'}主题">${icon(state.theme==='light'?'moon':'sun')}</button><button data-action="share-mobile">分享</button><button data-action="collapse" aria-expanded="${!state.collapsed}" aria-controls="color-workbench">调色</button></nav>` : ''}
    <div class="workspace">
      ${mobileAime && !state.collapsed ? '<button class="aime-workbench-backdrop" data-action="collapse" aria-label="关闭颜色工作台"></button>' : ''}
      <section class="preview-workspace" aria-label="场景预览工作区">
        <div class="preview-canvas ${['financial','custom','aime'].includes(state.scene) ? 'has-scene' : ''}" id="preview-canvas" role="region" aria-label="${scene.name}${['financial','custom','aime'].includes(state.scene) ? '，图表预览' : '，内容待添加'}" style="--canvas-bg:${palette.themes[state.theme].surface[0].hex}" data-scene="${state.scene}" data-theme="${state.theme}">${state.scene === 'financial' ? renderFinancialScene(renderFinancialExtras(state.financialBoard)) : state.scene === 'custom' ? renderCompactBoard(activeCustomBoard(),state.customTemplate==='free'?{}:{title:comparisonTemplates.find(t=>t.id===state.customTemplate).name,description:'全部 25 种图表 · 每种少量 / 大量数据对比'}) : state.scene === 'aime' ? renderAimeScene(state.aimeBoard,state.theme) : ''}</div>
      </section>
      <aside class="sidebar" id="color-workbench" aria-label="颜色操作面板">
        <div class="sidebar-header">
          <div class="sidebar-title"><div class="workbench-heading"><span>颜色工作台</span><small>Palette Lab <span class="mono">v${VERSION}</span></small></div><div class="workbench-history"><button class="icon-button" data-action="undo" title="撤销（⌘/Ctrl Z）" aria-label="撤销" ${!history.length ? 'disabled' : ''}>${icon('undo')}</button><button class="icon-button" data-action="redo" title="重做（⌘/Ctrl Shift Z）" aria-label="重做" ${!future.length ? 'disabled' : ''}>${icon('redo')}</button><button class="icon-button" data-action="collapse" title="收起颜色工作台" aria-label="收起颜色工作台" aria-expanded="true">${icon('panel')}</button></div></div>
          <nav class="workbench-scenes" aria-label="产品使用场景">${scenes.map(s => `<button class="scene-tab ${s.id === state.scene ? 'active' : ''}" data-action="scene" data-value="${s.id}" aria-current="${s.id === state.scene ? 'page' : 'false'}">${s.name}</button>`).join('')}</nav>
          <div class="workbench-controls"><div class="segment" aria-label="预览主题"><button data-action="theme" data-value="light" class="${state.theme === 'light' ? 'active' : ''}" aria-pressed="${state.theme === 'light'}">${icon('sun')}浅色</button><button data-action="theme" data-value="dark" class="${state.theme === 'dark' ? 'active' : ''}" aria-pressed="${state.theme === 'dark'}">${icon('moon')}深色</button></div><div class="segment compare-switch" aria-label="调整前后对比"><button data-action="mode" data-value="baseline" class="${state.mode === 'baseline' ? 'active' : ''}" aria-pressed="${state.mode === 'baseline'}">A 原始</button><button data-action="mode" data-value="draft" class="${state.mode === 'draft' ? 'active' : ''}" aria-pressed="${state.mode === 'draft'}">B 调整后</button></div></div>
          <div class="workbench-actions"><button class="button primary" data-action="save" aria-label="保存方案">${icon('save')}保存方案</button></div>
          ${state.scene==='aime'?'<button class="button mobile-share-button" data-action="share-mobile">分享手机预览</button>':''}
          ${paletteTabs()}
          <div class="sidebar-tabs" role="tablist" aria-label="颜色操作"><button role="tab" aria-selected="${state.panel === 'palette'}" class="${state.panel === 'palette' ? 'active' : ''}" data-action="panel" data-value="palette">${icon('sliders')}编辑色板</button><button role="tab" aria-selected="${state.panel === 'import'}" class="${state.panel === 'import' ? 'active' : ''}" data-action="panel" data-value="import">${icon('upload')}导入颜色</button><button role="tab" aria-selected="${state.panel === 'check'}" class="${state.panel === 'check' ? 'active' : ''}" data-action="panel" data-value="check">色值检验</button></div>
        </div>
        ${state.mode === 'baseline' && state.panel === 'palette' ? `<div class="baseline-notice">${icon('lock')}正在查看原始基线 · 切换 B 后可调色</div>` : ''}
        <div class="side-scroll">${state.panel === 'palette' ? moduleSettingsPanel() + palettePanel() : state.panel === 'check' ? renderColorChecks(current(),state.theme,state.role,state.checkSettings) : importPanel()}</div>
        <div class="sidebar-footer"><span id="save-status">${state.panel === 'import' ? '本地解析 · 文件内容不会上传' : storageAvailable ? `已自动保存 · ${changedCount()} 处颜色修改` : '浏览器存储不可用，请导出保存'}</span></div>
      </aside>
    </div>
  </main>`;
  document.querySelector('.side-scroll').scrollTop = scroll;
  const tabStrip = document.querySelector('.palette-tabs'), activeTab = tabStrip.querySelector('[aria-selected="true"]')?.closest('.palette-tab-item');
  tabStrip.scrollLeft = paletteTabsScroll;
  if (activeTab && (activeTab.offsetLeft < tabStrip.scrollLeft || activeTab.offsetLeft + activeTab.offsetWidth > tabStrip.scrollLeft + tabStrip.clientWidth)) tabStrip.scrollLeft = activeTab.offsetLeft - 3;
  const editor = document.querySelector(".color-editor");
  if (editor) document.querySelector(".sidebar-footer").before(editor);
  const canvas = document.querySelector('#preview-canvas');
  if (state.scene === 'financial') { applyFinancialPalette(canvas, palette, state.theme); repaintFinancialCharts(); }
  if (['custom','aime'].includes(state.scene)) repaintCompactBoard();
  const sceneScroller = canvas.querySelector('.financial-content-frame, .compact-board-scroll, .aime-content-scroll') || canvas;
  const newSceneHeight = sceneScroller.scrollHeight;
  if (['custom','aime'].includes(state.scene)) {
    sceneScroller.scrollTop = canvasScroll.top;
    const anchor = customAnchor && [...sceneScroller.querySelectorAll('[data-module-id]')].find(card => card.dataset.moduleId === customAnchor.id);
    if (anchor) sceneScroller.scrollTop += anchor.getBoundingClientRect().top - sceneScroller.getBoundingClientRect().top - customAnchor.offset;
  } else sceneScroller.scrollTop = canvasScroll.sceneHeight && newSceneHeight ? canvasScroll.top * newSceneHeight / canvasScroll.sceneHeight : canvasScroll.top;
  sceneScroller.scrollLeft = canvasScroll.left;
  bindInputs();
}
function paletteTabs() {
  const options = [...presets, ...state.saved];
  const known = options.some(p => p.id === state.draft.id), showCurrent = !known || changedCount() > 0;
  if (showCurrent) options.push({...state.draft, id:'current', name:state.draft.name + (known?' · 当前调整':'')});
  const selected = showCurrent ? 'current' : state.draft.id;
  return `<div class="palette-tab-heading"><span>色板方案</span><div class="palette-heading-actions">${state.saved.some(p=>p.id===state.draft.id)?`<button class="text-button" data-action="rename-palette" aria-label="重命名当前色板">重命名</button>`:''}<button class="text-button" data-action="panel" data-value="import">＋ 导入</button></div></div><div class="palette-tabs" role="tablist" aria-label="色板方案">${options.map(p=>`<div class="palette-tab-item ${state.saved.some(v=>v.id===p.id)?'can-delete':''}"><button role="tab" data-action="palette-tab" data-value="${esc(p.id)}" aria-selected="${p.id===selected}" tabindex="${p.id===selected?0:-1}" class="palette-tab ${p.id===selected?'active':''}" title="${esc(p.name)}"><i style="background:${p.themes[state.theme].categorical[0].hex}"></i><span>${esc(p.id==='ainvest'?'原始色板':p.name)}</span></button>${state.saved.some(v=>v.id===p.id)?`<button class="palette-tab-delete" data-action="delete-palette" data-value="${esc(p.id)}" aria-label="删除方案：${esc(p.name)}" title="删除方案">${icon('close')}</button>`:''}</div>`).join('')}</div>`;
}
function compactOklch(hex){
  const value=hexToOklch(hex);
  return `<span>L${(value.l*100).toFixed(1)}% C${value.c.toFixed(3).replace(/^0/,'')} h${value.h===null?'—':value.h.toFixed(1)}</span>`;
}
function oklchDetails(hex){
  const value=hexToOklch(hex),check=checkOklch(value);
  return `<div class="oklch-heading"><span>OKLCH 换算</span><span class="oklch-pass">${check.valid?'数值有效':'数值无效'}</span></div><div class="oklch-components"><span>L 明度<strong>${(value.l*100).toFixed(2)}%</strong></span><span>C 彩度<strong>${value.c.toFixed(5)}</strong></span><span>h 色相<strong>${value.h===null?'无彩色':value.h.toFixed(2)+'°'}</strong></span></div><div class="oklch-css"><code>${oklchCss(value)}</code><button class="icon-button" data-action="copy-oklch" aria-label="复制 OKLCH 色值">${icon('copy')}</button></div><p class="oklch-note">OKLCH 判断数值有效性；ΔE 和对比度按「色值检验」设置判断。<a href="https://www.w3.org/TR/css-color-4/#ok-lab" target="_blank" rel="noopener noreferrer">计算依据</a></p>`;
}
function palettePanel() {
  const p = current(), colors = p.themes[state.theme][state.role], report=buildPaletteCheckReport(p,state.theme,state.role,state.checkSettings);
  state.selected = Math.min(state.selected, colors.length - 1);
  const color = colors[state.selected], base = state.baseline.themes[state.theme][state.role][state.selected], hsv = hexToHsv(color.hex), readonly = state.mode === 'baseline';
  return `<section class="panel-section"><div class="section-heading"><span class="section-label">Palette / 当前色板</span><button class="text-button" data-action="reset" ${!changedCount() ? 'disabled' : ''}>恢复原始</button></div><div class="active-palette-name">${esc(p.name)}</div><div class="preset-source">${esc(p.source)}</div>${!p.availableThemes.includes(state.theme) ? '<div class="theme-warning">当前主题为实验复用色值，未经竞品来源确认。</div>' : ''}<div class="reference-caption">${icon('lock')}A 为冻结基线，B 为当前调整</div></section>
    <section class="panel-section"><div class="section-heading"><span class="section-label">Colors / 颜色角色</span><span class="mono muted" style="font-size:9px">${state.theme === 'light' ? 'LIGHT' : 'DARK'}</span></div><div class="role-tabs" aria-label="颜色角色">${Object.entries(roles).map(([id, name]) => `<button class="${state.role === id ? 'active' : ''}" data-action="role" data-value="${id}" aria-pressed="${state.role === id}">${name}<small>${p.themes[state.theme][id].length}</small></button>`).join('')}</div><div class="color-list">${colors.map((c, i) => `<button class="color-row ${state.editorOpen && state.selected === i ? 'selected' : ''}" data-action="color" data-value="${i}" aria-label="${esc(c.name)} ${c.hex}" aria-pressed="${state.editorOpen && state.selected === i}" aria-expanded="${state.editorOpen && state.selected === i}"><span class="color-index mono">${String(i + 1).padStart(2, '0')}</span><i class="swatch" style="background:${c.hex}" data-swatch="${i}"></i><span class="color-description"><span class="color-main"><span class="color-name">${esc(c.name)}</span><span class="color-value mono" data-color-value="${i}">${c.hex}</span></span><span class="color-oklch mono" data-oklch="${i}">${compactOklch(c.hex)}</span><span class="color-check-badges" data-color-checks="${i}">${renderColorCheckBadges(report.entries[i],report)}</span></span>${state.mode === 'draft' && c.hex !== state.baseline.themes[state.theme][state.role][i]?.hex ? '<i class="changed-dot"></i>' : ''}${state.editorOpen && state.selected === i ? icon('sliders') : ''}</button>`).join('')}</div><div class="colors-note">${icon('info')}仅修改当前角色，其他用途保持独立</div></section>
    ${state.editorOpen ? `<section class="panel-section color-editor"><div class="editor-heading"><span class="editor-name"><span>编辑</span>${esc(color.name)}</span><div class="editor-tools"><span class="mono" data-editor-model>HSB</span><button class="icon-button" data-action="editor-close" aria-label="收起颜色编辑器">${icon('close')}</button></div></div><div class="color-inputs"><label class="picker-wrap" style="background:${color.hex}" title="打开颜色选择器"><input type="color" id="native-color" value="${color.hex}" aria-label="${esc(color.name)}颜色选择器" ${readonly ? 'disabled' : ''}></label><label class="hex-field"><span>HEX</span><input class="mono" id="hex-input" value="${color.hex}" maxlength="64" aria-label="色值，支持 HEX、RGB、HSL" spellcheck="false" ${readonly ? 'disabled' : ''}></label><button class="icon-button" data-action="copy-color" title="复制色值" aria-label="复制色值">${icon('copy')}</button></div><div class="colorjs-picker-shell" data-colorjs-picker><color-picker space="oklch" color="${color.hex}" gamut="none" aria-label="OKLCH 颜色选择器"><span slot="color-space" class="picker-space-name">OKLCH</span></color-picker><div class="hsb-fallback">${['色相', '饱和', '明度'].map((label, i) => `<div class="slider-row"><label for="slider-${i}">${label}</label><input id="slider-${i}" data-hsv="${i}" type="range" min="0" max="${i === 0 ? 359 : 100}" step="1" value="${Math.round(hsv[i])}" aria-label="${label}" ${readonly ? 'disabled' : ''} style="background:${i === 0 ? 'linear-gradient(to right,#ff7777,#dddd55,#55cc88,#55cddd,#7777ee,#dd77dd,#ff7777)' : i === 1 ? `linear-gradient(to right,#ddd,${hsvToHex(hsv[0], 100, 100)})` : `linear-gradient(to right,#222,${hsvToHex(hsv[0], hsv[1], 100)})`}"><span class="hsv-number mono"><input id="output-${i}" data-hsv-number="${i}" type="number" min="0" max="${i === 0 ? 359 : 100}" step="1" value="${Math.round(hsv[i])}" aria-label="${label}数值" ${readonly ? 'disabled' : ''}><span aria-hidden="true">${i === 0 ? '°' : '%'}</span></span></div>`).join('')}</div><p class="picker-status" data-picker-status role="status">正在加载 Color.js 选色器…</p></div><div class="oklch-readout" id="oklch-readout">${oklchDetails(color.hex)}<div class="color-check-badges" data-color-checks="${state.selected}">${renderColorCheckBadges(report.entries[state.selected],report)}</div></div><div class="mini-diff"><i style="background:${base?.hex || '#FFFFFF'}"></i><span class="mono">${base?.hex || '新增'}</span>${icon('arrow')}<i id="after-swatch" style="background:${color.hex}"></i><span id="after-hex" class="mono">${color.hex}</span></div><div class="editor-footnote">修改应用于${state.theme === 'light' ? '浅色' : '深色'}主题的「${roles[state.role]}」。<br>RGB <span class="mono" id="rgb-value">${rgbText(color.hex)}</span></div></section>` : ''}`;
}
let importText = '', importError = '', importInputMode = 'text', importLightText = '', importDarkText = '', importName = '';
function importPanel() {
  const textMode = importInputMode === 'text';
  return `<section class="panel-section"><div class="section-heading"><span class="section-label">Import / 导入颜色</span></div><label class="import-name-label" for="import-name">色板名称</label><input id="import-name" class="import-name-input" maxlength="80" value="${esc(importName)}" placeholder="例如：测试版1029（留空自动命名）" autocomplete="off"><div class="segment import-modes" aria-label="颜色导入方式"><button data-action="import-mode" data-value="text" class="${textMode?'active':''}" aria-pressed="${textMode}">色值文本</button><button data-action="import-mode" data-value="code" class="${!textMode?'active':''}" aria-pressed="${!textMode}">JSON / 配置</button></div>${textMode?`<p class="import-intro">直接输入色值，用空格、逗号或换行分隔。支持 HEX、RGB、HSL。</p><div class="import-label"><label for="import-light">浅色色值</label><button class="text-button" data-action="example">填入示例</button></div><textarea id="import-light" class="code-area color-text-area" spellcheck="false" placeholder="#265FFC #38D1FF #F564B9">${esc(importLightText)}</textarea><div class="import-label"><label for="import-dark">深色色值（留空则与浅色相同）</label></div><textarea id="import-dark" class="code-area color-text-area" spellcheck="false" placeholder="可选：输入深色主题的色值">${esc(importDarkText)}</textarea>`:`<p class="import-intro">上传 JSON，或粘贴颜色数组、CSS 变量与色值。</p><label class="drop-zone" id="drop-zone">${icon('upload')}<strong>点击选择，或拖入 JSON 文件</strong><small>.json · 最大 500 KB</small><input type="file" id="file-input" accept=".json,application/json" hidden></label><div class="import-label"><span>粘贴色值 / 配置代码</span><button class="text-button" data-action="example">填入示例</button></div><textarea id="import-code" class="code-area" aria-label="粘贴色板配置" spellcheck="false" placeholder='["#265FFC", "#38D1FF"]'>${esc(importText)}</textarea>`}<button class="button primary import-action" data-action="parse">${icon('check')}解析颜色</button>${importError?`<div class="inline-error" role="alert">${esc(importError)}</div>`:''}${pendingImport?importPreview():''}<div class="editor-footnote">导入前会预览解析结果。<br>已有的修改会自动保留为草稿。</div></section>`;
}

function importPreview() {
  if (pendingImport.session) return `<div class="import-preview"><div class="import-preview-title">已识别完整实验文件</div><div style="font-size:11px;color:#999">恢复基线、候选色板、场景与主题。</div><button class="button accent import-action" data-action="apply-import">恢复此实验</button></div>`;
  const p = pendingImport.candidates[importedIndex], colors = p.themes[state.theme].categorical;
  return `<div class="import-preview"><div class="import-preview-title">已识别 ${pendingImport.candidates.length > 1 ? `${pendingImport.candidates.length} 组色板，请选择` : `${colors.length} 个分类色`}</div>${pendingImport.candidates.length > 1 ? `<div class="select-wrap"><select id="import-group" aria-label="选择导入颜色组">${pendingImport.candidates.map((c, i) => `<option value="${i}" ${i === importedIndex ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>${icon('chevron')}</div>` : `<div class="import-preview-name" style="font-size:11px;color:#89899b">${esc(importName.trim()||p.name)}</div>`}<div class="import-swatches">${colors.map(c => `<i style="background:${c.hex}" title="${c.hex}"></i>`).join('')}</div><button class="button accent import-action" data-action="apply-import">应用此色板</button></div>`;
}
let nativePreviewFullscreen = false;
async function setPreviewFullscreen(enabled) {
  state.previewFullscreen = enabled;
  if (!enabled) {
    const url = new URL(location.href);
    if (url.searchParams.get('preview') === 'fullscreen') { url.searchParams.delete('preview'); window.history.replaceState(null, '', url); }
    nativePreviewFullscreen = false;
  }
  render();
  if (enabled && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen(); nativePreviewFullscreen = Boolean(document.fullscreenElement); }
    catch { /* The in-window fullscreen layout remains available when native fullscreen is unavailable. */ }
  } else if (!enabled && document.fullscreenElement && document.exitFullscreen) {
    try { await document.exitFullscreen(); } catch { /* The normal workbench is already restored. */ }
  }
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && nativePreviewFullscreen) { nativePreviewFullscreen = false; state.previewFullscreen = false; render(); }
});
function stashDraft() {
  if (!changedCount()) return;
  state.saved.push({ ...clone(state.draft), id: crypto.randomUUID(), name: `${state.draft.name} · 草稿 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` });
  state.saved = state.saved.slice(-30);
}
function applyPalette(p) {
  stashDraft(); state.editorOpen = false; state.draft = clone(p); state.baseline = clone(p); state.role = 'categorical'; state.selected = 0; state.mode = 'draft'; history = []; future = []; persist(); render();
}
function setColor(value, record = true, repaint = true) {
  if (state.mode === 'baseline') return;
  const hex = normalizeColor(value);
  if (hex === selectedColor().hex) return;
  if (record) remember(); selectedColor().hex = hex; persist(); if (repaint) render(); else liveColor(hex);
}
function liveColor(hex) {
  const i = state.selected;
  document.querySelector(`[data-swatch="${i}"]`).style.background = hex;
  document.querySelector(`[data-color-value="${i}"]`).textContent = hex;
  document.querySelector('#hex-input').value = hex;
  document.querySelector('#native-color').value = hex;
  document.querySelector('#after-swatch').style.background = hex;
  document.querySelector('#after-hex').textContent = hex;
  document.querySelector('#rgb-value').textContent = rgbText(hex);
  document.querySelector(`[data-oklch="${i}"]`).innerHTML = compactOklch(hex);
  const report=buildPaletteCheckReport(current(),state.theme,state.role,state.checkSettings);
  document.querySelector('#oklch-readout').innerHTML = oklchDetails(hex)+`<div class="color-check-badges" data-color-checks="${i}">${renderColorCheckBadges(report.entries[i],report)}</div>`;
  // A changed color can become another color's closest neighbor; recalculate every badge.
  for(const badges of document.querySelectorAll('[data-color-checks]'))badges.innerHTML=renderColorCheckBadges(report.entries[Number(badges.dataset.colorChecks)],report);
  if (state.role === 'surface' && i === 0) document.querySelector('#preview-canvas').style.setProperty('--canvas-bg', hex);
  if (state.scene === 'financial') { applyFinancialPalette(document.querySelector('#preview-canvas'), current(), state.theme); cancelAnimationFrame(compactColorFrame);compactColorFrame=requestAnimationFrame(repaintFinancialCharts); }
  if (['custom','aime'].includes(state.scene)) { cancelAnimationFrame(compactColorFrame); compactColorFrame = requestAnimationFrame(repaintCompactBoard); }
}
function bindInputs() {
  const pickerShell=document.querySelector('[data-colorjs-picker]');
  let pickerRecorded=false;
  if(pickerShell)bindColorJsPicker(pickerShell,{
    hex:current().themes[state.theme][state.role][state.selected].hex,readonly:state.mode==='baseline',
    onBegin:()=>{editorTransaction=clone(state.draft);pickerRecorded=false;},
    onInput:hex=>{
      if(hex!==selectedColor().hex&&!pickerRecorded){remember(editorTransaction);pickerRecorded=true;}
      setColor(hex,false,false);
      document.querySelector('#save-status').textContent=`已自动保存 · ${changedCount()} 处颜色修改`;
      document.querySelector('[data-action="undo"]').disabled=!history.length;
      document.querySelector('[data-action="redo"]').disabled=!future.length;
    },
    onCommit:()=>{
      editorTransaction=null;
      document.querySelector('[data-action="undo"]').disabled=!history.length;
      document.querySelector('[data-action="redo"]').disabled=!future.length;
    },
    onError:()=>toast('选色值暂不可用，请继续调整或使用 HEX 输入')
  });
  document.querySelector('[data-comparison-template]')?.addEventListener('change',event=>{
    const id=event.target.value;if(![...comparisonTemplates.map(t=>t.id),'free'].includes(id))return;
    state.customTemplate=id;state.editorOpen=false;
    // Switching templates starts at its heading; changing module settings still preserves position.
    document.querySelector('#preview-canvas').dataset.scene='';persist();render();
  });
  document.querySelector('[data-module-position]')?.addEventListener('change',event=>{
    const board=activeModuleBoard();moveCompactModule(board,board.selected,Number(event.target.value));persist();render();
    document.querySelector(`[data-module-id="${board.selected}"]`)?.scrollIntoView({block:'nearest'});
  });
  for(const input of document.querySelectorAll('[data-global-chart-style]'))input.addEventListener('change',()=>{
    state.globalChartStyle=normalizeGlobalChartStyle({...state.globalChartStyle,[input.dataset.globalChartStyle]:input.value});
    persist();render();
  });
  for(const input of document.querySelectorAll('[data-check-field]'))input.addEventListener('change',()=>{
    const field=input.dataset.checkField;
    if(field==='role')state.role=Object.hasOwn(roles,input.value)?input.value:'categorical';
    else state.checkSettings=normalizeCheckSettings({...state.checkSettings,[field]:field==='opacity'?Number(input.value)/100:input.value});
    persist();const side=document.querySelector('.side-scroll'),scroll=side.scrollTop;side.innerHTML=renderColorChecks(current(),state.theme,state.role,state.checkSettings);side.scrollTop=scroll;bindInputs();
  });
  document.querySelector('#import-name')?.addEventListener('input',e=>{importName=e.target.value;const preview=document.querySelector('.import-preview-name');if(preview&&pendingImport?.candidates?.[importedIndex])preview.textContent=importName.trim()||pendingImport.candidates[importedIndex].name;});
  for (const input of document.querySelectorAll('[data-module-field]')) input.addEventListener('change', () => {
    const module = activeModuleBoard().modules.find(m => m.id === activeModuleBoard().selected);
    const field = input.dataset.moduleField;
    if(field==='count')module.fixtureCustomized=true;
    if(field==='lineWidth')module.lineWidth=input.value==='auto'?'auto':Math.max(.5,Math.min(8,Number(input.value)));
    else module[field] = field==='height'&&input.value==='auto'?'auto':['count','series','height'].includes(field) ? Math.max(Number(input.min)||1, Math.min(Number(input.max)||400, Math.round(Number(input.value)||1))) : input.value;
    persist(); render();
  });
  document.querySelector('#hex-input')?.addEventListener('change', e => { try { setColor(e.target.value); } catch (error) { e.target.setAttribute('aria-invalid', 'true'); toast(error.message); } });
  document.querySelector('#hex-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  for (const id of ['import-light','import-dark']) document.querySelector('#'+id)?.addEventListener('input',e=>{if(id==='import-light')importLightText=e.target.value;else importDarkText=e.target.value;pendingImport=null;importError='';document.querySelector('.import-preview')?.remove();document.querySelector('.inline-error')?.remove();});
  document.querySelector('#import-code')?.addEventListener('input', e => { importText = e.target.value; pendingImport = null; importError = ''; document.querySelector('.import-preview')?.remove(); document.querySelector('.inline-error')?.remove(); });
  document.querySelector('#import-group')?.addEventListener('change', e => { importedIndex = Number(e.target.value); render(); });
  document.querySelector('#file-input')?.addEventListener('change', e => readFile(e.target.files[0]));
  const zone = document.querySelector('#drop-zone');
  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone?.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragging'); readFile(e.dataTransfer.files[0]); });
  const colorInput = document.querySelector('#native-color');
  const sliders = [...document.querySelectorAll('[data-hsv]')];
  for (const numberInput of document.querySelectorAll('[data-hsv-number]')) {
    const index = Number(numberInput.dataset.hsvNumber);
    let numberEdited = false;
    const applyNumber = (commit = false) => {
      if (state.mode === 'baseline' || !numberEdited) return;
      const parsed = numberInput.value.trim() === '' ? NaN : Number(numberInput.value);
      if (!Number.isFinite(parsed)) { if (commit) numberInput.value = sliders[index].value; return; }
      const value = Math.round(Math.min(Number(numberInput.max), Math.max(0, parsed)));
      if (!commit && (parsed < 0 || parsed > Number(numberInput.max))) return;
      if (!editorTransaction) editorTransaction = clone(state.draft);
      sliders[index].value = value;
      if (commit) numberInput.value = value;
      setColor(hsvToHex(...sliders.map(slider => Number(slider.value))), false, false);
    };
    numberInput.addEventListener('focus', () => { numberEdited = false; editorTransaction = clone(state.draft); });
    numberInput.addEventListener('input', () => { numberEdited = true; applyNumber(); });
    numberInput.addEventListener('change', () => { numberEdited = true; applyNumber(true); });
    numberInput.addEventListener('keydown', event => { if (event.key === 'Enter') numberInput.blur(); });
    numberInput.addEventListener('blur', () => {
      applyNumber(true);
      if (editorTransaction && JSON.stringify(editorTransaction.themes) !== JSON.stringify(state.draft.themes)) remember(editorTransaction);
      editorTransaction = null;
      render();
    });
  }
  for (const input of [colorInput, ...sliders].filter(Boolean)) {
    input.addEventListener('focus', () => { editorTransaction = clone(state.draft); });
    input.addEventListener('pointerdown', () => { editorTransaction = clone(state.draft); });
    input.addEventListener('input', () => {
      if (!editorTransaction) editorTransaction = clone(state.draft);
      let hex;
      if (input === colorInput) {
        hex = input.value; const values = hexToHsv(hex); sliders.forEach((s, i) => { s.value = Math.round(values[i]); document.querySelector(`#output-${i}`).value = Math.round(values[i]); });
      } else {
        const values = sliders.map(s => Number(s.value)); hex = hsvToHex(...values); sliders.forEach((s, i) => { document.querySelector(`#output-${i}`).value = values[i]; });
      }
      setColor(hex, false, false);
    });
    input.addEventListener('change', () => {
      if (editorTransaction && JSON.stringify(editorTransaction.themes) !== JSON.stringify(state.draft.themes)) remember(editorTransaction);
      editorTransaction = null; render();
    });
  }
}
async function readFile(file) {
  if (!file) return;
  try {
    if (!file.name.toLowerCase().endsWith('.json')) throw new Error('请选择 JSON 文件');
    if (file.size > 500000) throw new Error('文件大小不能超过 500 KB');
    importText = await file.text(); importInputMode = 'code'; pendingImport = parseImport(importText); importedIndex = 0; importError = '';
  } catch (error) { pendingImport = null; importError = error.message; }
  render();
}
function openModal(html) { modal.innerHTML = html; modal.showModal(); }
function modalHead(title) { return `<div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="icon-button" data-modal-action="close" aria-label="关闭">${icon('close')}</button></div>`; }
function download(value, name) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
app.addEventListener('click', async e => {
  const card=e.target.closest('[data-module-id]'),cardAction=e.target.closest('[data-action]');
  if(card&&(!cardAction||cardAction.dataset.action==='module-select')){selectPreviewModule(card.dataset.moduleId);return;}
  const mark = e.target.closest('[data-color-role]');
  if (mark) {
    const role = mark.dataset.colorRole, index = Number(mark.dataset.colorIndex);
    if (current().themes[state.theme][role]?.[index]) { state.editorOpen = true; state.role = role; state.selected = index; state.panel = 'palette'; state.collapsed = false; if (state.previewFullscreen) await setPreviewFullscreen(false); else render(); }
    else toast('当前色板缺少此颜色，请先导入完整色板');
    return;
  }
  const target = e.target.closest('[data-action]'); if (!target || target.disabled) return;
  const { action, value } = target.dataset;
  if (action === 'fullscreen' || action === 'exit-fullscreen') { await setPreviewFullscreen(action === 'fullscreen'); return; }
  if (action === 'share-mobile') {
    if (!/^https?:$/.test(location.protocol)) { toast('请通过已部署的网址分享，离线文件可导出实验 JSON'); return; }
    try {
      const url = new URL('aime.html', location.href);
      url.hash = 'aime=' + encodeMobilePreview({ baseline: state.baseline, draft: state.draft, aimeBoard: state.aimeBoard, theme: state.theme, mode: state.mode, globalChartStyle: state.globalChartStyle });
      openModal(`${modalHead('分享手机预览')}<p>复制链接到手机打开，可还原当前 A/B 配色、主题及 Aime 图表。链接是本次方案的快照，后续修改请重新分享。</p><textarea class="code-area" id="mobile-share-url" readonly aria-label="手机预览链接">${esc(url.href)}</textarea><div class="modal-actions"><button class="button" data-modal-action="close">关闭</button><button class="button primary" data-modal-action="copy-mobile-link">复制链接</button></div>`);
      const field = document.querySelector('#mobile-share-url'); field.focus(); field.select();
    } catch (error) { toast(error.message); }
    return;
  }
  if (action === 'scene') { state.scene = value; state.editorOpen = false; }
  if (action === 'rename-palette') {
    const palette=state.saved.find(p=>p.id===state.draft.id);if(!palette)return;
    openModal(`${modalHead('重命名色板')}<label for="rename-name">色板名称</label><input id="rename-name" class="modal-input" maxlength="80" value="${esc(palette.name)}" autocomplete="off"><div class="inline-error" id="rename-error" role="alert"></div><div class="modal-actions"><button class="button" data-modal-action="close">取消</button><button class="button primary" data-modal-action="rename-palette" data-value="${esc(palette.id)}">保存名称</button></div>`);
    const field=document.querySelector('#rename-name');field.focus();field.select();field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();modal.querySelector('[data-modal-action="rename-palette"]').click();}});return;
  }
  if (action === 'delete-palette') { deletePalette(value); return; }
  if (action === 'editor-close') state.editorOpen = false;
  if (action === 'palette-tab') {
    if (value === 'current') return;
    const palette = [...presets,...state.saved].find(p=>p.id===value);
    if (palette) { state.panel=state.panel==='check'?'check':'palette';applyPalette(palette);document.querySelector('.palette-tabs [aria-selected="true"]')?.focus({preventScroll:true}); }
    return;
  }
  if (action === 'module-picker' && value && state.scene==='aime') activeModuleBoard().selected=value;
  if (action === 'financial-density' && ['compact','standard'].includes(value)) state.financialDensity = value;
  if (action === 'board-density' && ['compact','standard'].includes(value)) activeModuleBoard().density = value;
  if (action === 'board-columns' && [1,2,3,4,5].includes(Number(value))) activeModuleBoard().columns = Number(value);
  if (action === 'module-select') { selectPreviewModule(value);return; }
  if (action === 'module-picker') { openModal(`${modalHead('添加可视化模块')}<p>Ainvest · ${state.scene==='aime'?'对话组件':'可视化组件'} · 共 ${compactTypes.length} 种</p>${[...new Set(compactTypes.map(t=>t.group))].map(group=>`<div class="compact-picker-group"><h3>${group}</h3>${compactTypes.filter(t=>t.group===group).map(t=>`<button class="export-choice" data-modal-action="add-module" data-value="${t.id}"><span><strong>${t.name}</strong></span></button>`).join('')}</div>`).join('')}`); return; }
  if(['module-move-up','module-move-down','module-hide','module-show','module-show-all'].includes(action)){
    const board=activeModuleBoard(),id=value||board.selected;
    if(action==='module-show-all'){for(const module of board.modules)module.hidden=false;board.selected||=board.modules[0]?.id;}
    else if(action==='module-hide'||action==='module-show')setCompactModuleHidden(board,id,action==='module-hide');
    else {const visible=board.modules.filter(m=>!m.hidden);moveCompactModule(board,id,visible.findIndex(m=>m.id===id)+(action==='module-move-up'?-1:1));board.selected=id;}
    persist();render();
    if(action==='module-show'||action.startsWith('module-move'))document.querySelector(`[data-module-id="${id}"]`)?.scrollIntoView({block:'nearest'});
    return;
  }
  if (action === 'module-duplicate') { const selected = activeModuleBoard().modules.find(m => m.id === activeModuleBoard().selected); if(selected && activeModuleBoard().modules.length < 60) { const added = {...selected, id:crypto.randomUUID()}; activeModuleBoard().modules.splice(activeModuleBoard().modules.indexOf(selected)+1,0,added); activeModuleBoard().selected=added.id; } }
  if (action === 'module-remove') { activeModuleBoard().modules=activeModuleBoard().modules.filter(m=>m.id!==activeModuleBoard().selected); activeModuleBoard().selected=activeModuleBoard().modules.find(m=>!m.hidden)?.id; }
  if (action === 'theme') { state.theme = value; state.editorOpen = false; }
  if (action === 'mode') state.mode = value;
  if (action === 'collapse') state.collapsed = !state.collapsed;
  if (action === 'panel') { state.panel = value; state.editorOpen = false; }
  if (action === 'role') { state.role = value; state.selected = 0; state.editorOpen = false; }
  if (action === 'color') { state.selected = Number(value); state.editorOpen = true; }
  if (action === 'undo' && history.length) { future.push(clone(state.draft)); state.draft = history.pop(); state.mode = 'draft'; }
  if (action === 'redo' && future.length) { history.push(clone(state.draft)); state.draft = future.pop(); state.mode = 'draft'; }
  if (action === 'reset' && changedCount()) { remember(); state.draft = clone(state.baseline); state.mode = 'draft'; toast('已恢复原始色板，可撤销此操作'); }
  if (action === 'copy-oklch') {
    try { await navigator.clipboard.writeText(oklchCss(hexToOklch(current().themes[state.theme][state.role][state.selected].hex)));toast('已复制 OKLCH 色值'); } catch {toast('无法访问剪贴板，请从 OKLCH 文本手动复制');}
    return;
  }
  if (action === 'copy-color') {
    const hex = current().themes[state.theme][state.role][state.selected].hex;
    try { await navigator.clipboard.writeText(hex); toast(`已复制 ${hex}`); } catch { toast('无法访问剪贴板，请从色值输入框手动复制'); }
    return;
  }
  if (action === 'save') {
    openModal(`${modalHead('保存候选方案')}<p>保存当前色板的两个主题，之后可从「我的方案」中继续使用。</p><label for="save-name">方案名称</label><input id="save-name" class="modal-input" maxlength="80" value="${esc(state.draft.name + ' · 调整版')}"><div class="modal-actions"><button class="button" data-modal-action="close">取消</button><button class="button primary" data-modal-action="save">保存方案</button></div>`); return;
  }
  if (action === 'export') {
    openModal(`${modalHead('导出与分享')}<p>导出的 JSON 可在其他设备上导入。完整实验文件可以复现本次比较条件。</p><button class="export-choice" data-modal-action="export-palette">${icon('file')}<span><strong>导出当前色板</strong><small>颜色角色、浅深主题、来源信息</small></span></button><button class="export-choice" data-modal-action="export-session">${icon('copy')}<span><strong>导出完整实验</strong><small>A/B 色板、当前场景、主题与工具版本</small></span></button><div class="editor-footnote">当前查看 ${state.mode === 'baseline' ? 'A · 原始基线' : 'B · 调整后色板'}；色板导出与当前查看版本一致。</div>`); return;
  }
  if (action === 'import-mode' && ['text','code'].includes(value)) { importInputMode=value;pendingImport=null;importError=''; }
  if (action === 'example' && importInputMode === 'text') { importLightText='#265FFC #38D1FF #F564B9 #733ED6 #00CCC3 #273D8F #FF7040';importDarkText='';pendingImport=null;importError=''; }
  if (action === 'example' && importInputMode === 'code') { importText = '[\n  "#265FFC",\n  "#38D1FF",\n  "#F564B9",\n  "#733ED6",\n  "#00CCC3"\n]'; pendingImport = null; importError = ''; }
  if (action === 'parse') { try { pendingImport = importInputMode === 'text' ? {candidates:[parseTextPalette(importLightText,importDarkText)]} : parseImport(importText); importedIndex = 0; importError = ''; } catch (error) { pendingImport = null; importError = error.message; } }
  if (action === 'apply-import' && pendingImport) {
    if (pendingImport.session) {
      const s = pendingImport.session; state.customTemplate=[...comparisonTemplates.map(t=>t.id),'free'].includes(s.customTemplate)?s.customTemplate:'all';state.comparisonBoards=validateComparisonBoards(s.comparisonBoards); state.globalChartStyle=normalizeGlobalChartStyle(s.globalChartStyle); state.checkSettings=normalizeCheckSettings(s.checkSettings); state.financialBoard = validateFinancialBoard(s.financialBoard); state.financialDensity = s.financialDensity === 'standard' ? 'standard' : 'compact'; if (s.customBoard) state.customBoard = validateCompactBoard(s.customBoard); if(s.aimeBoard)state.aimeBoard=validateAimeBoard(s.aimeBoard); stashDraft(); state.baseline = clone(s.baseline); state.draft = clone(s.draft); state.draft.id = crypto.randomUUID(); state.baseline.id = state.draft.id;
      state.scene = scenes.some(v => v.id === s.scene) ? s.scene : 'financial'; state.theme = ['light', 'dark'].includes(s.theme) ? s.theme : 'light'; history = []; future = [];
    } else { const p = clone(pendingImport.candidates[importedIndex]); p.name = importName.trim() || p.name; p.id = crypto.randomUUID(); const sourceName=p.name;let suffix=2;while([...presets,...state.saved].some(v=>v.name===p.name))p.name=sourceName+' '+suffix++;state.saved.push(clone(p)); state.saved = state.saved.slice(-30); applyPalette(p); }
    state.mode = 'draft'; state.panel = 'palette'; state.editorOpen = false; state.role = 'categorical'; state.selected = 0; pendingImport = null; toast('已导入，可以开始调整颜色');
  }
  persist(); render();
});
modal.addEventListener('click', async e => {
  if (e.target.closest('[data-modal-action="copy-mobile-link"]')) {
    const field = document.querySelector('#mobile-share-url');
    try { await navigator.clipboard.writeText(field.value); toast('已复制手机预览链接'); }
    catch { field.focus(); field.select(); toast('请复制已选中的链接'); }
    return;
  }
  const target = e.target.closest('[data-modal-action]'); if (!target) return;
  const action = target.dataset.modalAction;
  if (action === 'rename-palette') {
    const palette=state.saved.find(p=>p.id===target.dataset.value);if(!palette)return;
    const name=document.querySelector('#rename-name').value.trim();
    const error=document.querySelector('#rename-error');
    if(!name){error.textContent='请输入色板名称';document.querySelector('#rename-name').focus();return;}
    if([...presets,...state.saved].some(p=>p.id!==palette.id&&p.name===name)){error.textContent='已有同名色板，请换一个名称';return;}
    palette.name=name;
    if(state.draft.id===palette.id)state.draft.name=name;
    if(state.baseline.id===palette.id)state.baseline.name=name;
    persist();modal.close();render();toast('色板名称已更新');return;
  }
  if (action === 'close') modal.close();
  if (action === 'add-module') { if(activeModuleBoard().modules.length >= 60) { toast('最多展示 60 个模块'); return; } const added=newCompactModule(target.dataset.value); const board=activeModuleBoard(); const index=board.modules.findIndex(m=>m.id===board.selected); if(state.scene==='aime')board.modules.splice(index+1,0,added);else board.modules.push(added); activeModuleBoard().selected=added.id; persist(); modal.close(); render(); document.querySelector(`[data-module-id="${added.id}"]`)?.scrollIntoView({block:'nearest'}); }
  if (action === 'save') {
    const name = document.querySelector('#save-name').value.trim();
    if (!name) { document.querySelector('#save-name').focus(); return; }
    state.saved.push({ ...clone(state.draft), id: crypto.randomUUID(), name }); state.saved = state.saved.slice(-30); persist(); modal.close(); render(); toast(`已保存「${name}」`);
  }
  if (action === 'export-palette') { download(current(), 'palette-lab-colors.json'); modal.close(); toast('已导出色板文件'); }
  if (action === 'export-session') {
    download({ kind: 'palette-lab-session', schemaVersion: 1, toolVersion: VERSION, exportedAt: new Date().toISOString(), scene: state.scene, theme: state.theme, baseline: state.baseline, draft: state.draft, customTemplate:state.customTemplate, comparisonBoards:state.comparisonBoards, customBoard: state.customBoard, aimeBoard: state.aimeBoard, financialDensity: state.financialDensity, financialBoard: state.financialBoard, checkSettings: state.checkSettings, globalChartStyle: state.globalChartStyle }, 'palette-lab-experiment.json'); modal.close(); toast('已导出完整实验文件');
  }
});
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close(); } });
document.addEventListener('keydown', async e => {
  if (e.target.closest?.('.palette-tabs') && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
    e.preventDefault();const tabs=[...document.querySelectorAll('.palette-tab')],index=tabs.indexOf(e.target.closest('.palette-tab'));
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next]?.click();tabs[next]?.focus({preventScroll:true});return;
  }
  if (e.key === 'Escape' && state.previewFullscreen && !modal.open) { e.preventDefault(); await setPreviewFullscreen(false); return; }
  if (e.target.closest?.('[data-color-role]') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || modal.open) return;
  e.preventDefault(); document.querySelector(`[data-action="${e.shiftKey ? 'redo' : 'undo'}"]`)?.click();
});
render();
if (mobileShareError) toast(mobileShareError);
else if (sharedPreviewLoaded) toast('已载入分享的 Aime 方案');
else if (loaded) toast('已恢复上次的色板与实验设置');
