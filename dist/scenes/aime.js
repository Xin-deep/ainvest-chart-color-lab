import { compactTypes, newCompactModule, validateCompactBoard, compactBoardPanel, compactModuleTools } from './custom.js';
import { aimeFixtureTypes, aimeCardTitle } from '../data/aime-reference.js';
import { surfaces } from '../lib/palettes.js';
const aimeEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aimeGlyph=(name)=>{const shapes={menu:'M5 6h14M5 12h10M5 18h6',edit:'m14 4 6 6-9 9H5v-6zM12 6l6 6',sound:'m4 9 4 0 5-4v14l-5-4H4zM17 8l4 8M21 8l-4 8',plus:'M12 4v16M4 12h16',arrow:'M12 20V4m-6 6 6-6 6 6',robot:'M5 7h14v12H5zM9 7V4h6M8 12h.1M16 12h.1M9 16h6',down:'M12 4v16m-6-6 6 6 6-6'};return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${shapes[name]||shapes.edit}"/></svg>`;};
function defaultAimeBoard(){
  const defaults=[['aime-growth',12,3],['aime-duration',2,1],['aime-factors',7,1],['aime-stack',5,5],['aime-grouped',5,4]];
  const modules=defaults.map(([fixture,count,series])=>({...newCompactModule(aimeFixtureTypes[fixture]),fixture,count,series,fixtureCustomized:true}));
  return {catalogVersion:3,platform:'mobile',density:'compact',columns:1,selected:modules[0].id,modules};
}
function validateAimeBoard(input){
  if(!input||!Array.isArray(input.modules))return defaultAimeBoard();
  const board=validateCompactBoard({...input,catalogVersion:3,columns:1});board.platform='mobile';
  for(const m of board.modules){const original=input.modules.find(v=>v.id===m.id);if(original&&aimeFixtureTypes[original.fixture]===m.type){m.fixture=original.fixture;if(m.fixture==='aime-duration')m.count=2;}}
  return board;
}
function aimeCard(module,board){
  const def=compactTypes.find(t=>t.id===module.type),title=module.fixture==='aime-growth'?'AAPL Net Income YoY, Total Revenue YoY, Diluted EPS YoY':module.fixture?aimeCardTitle:def.name;
  return `<section class="aime-chart-card ${board.selected===module.id?'is-selected':''}" data-module-id="${module.id}"><header><button data-action="module-select" data-value="${module.id}" aria-pressed="${board.selected===module.id}">${aimeEsc(title)}</button><span class="aime-card-pages" aria-hidden="true">‹ <span>1/2</span> ›</span><button class="aime-insert" data-action="module-picker" data-value="${module.id}" aria-label="在此图表后添加组件">＋</button></header>${compactModuleTools(module,board)}<div class="aime-chart-body"><div class="compact-chart-target" data-chart-id="${module.id}" data-chart-type="${module.type}"></div></div></section>`;
}
const aimeCashCopy=()=>`<section class="aime-copy"><h2>Cash-return policy is intact, though not a yield play</h2><p>Current dividend yield is a modest 0.36 %4, but Apple has paid a dividend for 23 consecutive years and has grown it for 14 straight years</p></section>`;
function renderAimeScene(board,theme){
  return `<div class="aime-stage" data-aime-theme="${theme}"><article class="aime-page" aria-label="Aime 对话预览"><div class="aime-status" aria-hidden="true"><b>9:41</b><span>▮▮▮ ᯤ ▰</span></div><header class="aime-navigation"><span class="aime-round" aria-hidden="true">${aimeGlyph('menu')}</span><div class="aime-navigation-tabs"><b>Aime</b><span>Explore</span></div><span class="aime-round aime-nav-tools" aria-hidden="true">${aimeGlyph('sound')}${aimeGlyph('edit')}</span></header><div class="aime-content-scroll" tabindex="0" aria-label="对话内容"><div class="aime-question">How about aapl</div><div class="aime-answer-source"><span class="aime-bot">${aimeGlyph('robot')}</span><span>Aime is ready with the answer ›<small>21s · 6 sources</small></span></div><p class="aime-bottom-line">Bottom-line: <a>Apple (AAPL)</a> still looks like a high-quality compounder, but the shares are running hot—momentum-oriented traders may want to wait for a breather, while long-term investors can keep riding the trend and add on dips.</p><section class="aime-fundamentals"><h2>Fundamentals remain rock-solid</h2><ul><li>Latest quarter: revenue $111.18 B, net income $29.58 B, diluted EPS $2.011.</li><li>Year-over-year growth is equally impressive: revenue +16.6 %, net income +19.36 %, EPS +21.82 %.</li><li>Even over a three-year lens, revenue CAGR sits at 4.2 %, net income CAGR at 7.46 %, and EPS CAGR at 10.32 %—a respectable grind for a $3 T company3.</li></ul></section>${board.modules.filter(m=>!m.hidden).map(m=>(['aime-duration','aime-factors'].includes(m.fixture)?aimeCashCopy():'')+aimeCard(m,board)).join('')}<button class="aime-add-chart" data-action="module-picker">＋ 添加可视化组件</button><section class="aime-copy aime-closing"><h2>Street sentiment stays bullish</h2><p>Multiple recent targets cluster around $325–$400, with the latest print at $400 and a consistent ”Buy“ consensus10.</p><h2>Strategic catalysts &amp; risks to watch</h2><ul><li>Management just allocated &gt;10 % of revenue to R&amp;D—Apple’s highest level in 30 years—signaling a deep AI push11.</li><li>Options market expects a big move: 30-day implied volatility for puts is 0.232112, while near-term weekly calls carry triple-digit implied vols13.</li><li>Upcoming earnings (next report due July 30, 202614) could spark volatility, yet fundamentals and buyback authorization ($100 B program15) provide a cushion.</li></ul></section></div><footer class="aime-composer"><div class="aime-quick-actions"><span>ϟ Fast ⌄</span><span>▧ Price Forecast</span><span>◉ Circle Analysis</span></div><div class="aime-composer-field"><span>${theme==='dark'?'Send message or hold to talk':'How about aapl'}</span><button data-action="module-picker" aria-label="添加对话图表组件">${aimeGlyph('plus')}</button><i aria-hidden="true">${aimeGlyph('arrow')}</i></div><div class="aime-home-indicator"></div></footer></article></div>`;
}
function aimeBoardPanel(board){
  let html=compactBoardPanel(board);
  const start=html.indexOf('<div class="segment compact-columns" aria-label="看板列数">'),end=html.indexOf('<div class="section-heading" style="margin-top:12px">',start);
  if(start>=0&&end>start)html=html.slice(0,start)+html.slice(end);
  html=html.replace('看板布局','对话组件');
  html=html.replace(/<label>模块占位<select[\s\S]*?<\/select><\/label>/,'');
  if(board.modules.find(m=>m.id===board.selected)?.fixture==='aime-duration')html=html.replace(/<label>数据项数<input[^>]*><\/label>/,'<p class="editor-footnote">连续分红 23 年 · 分红增长 14 年</p>');
  return html;
}
function applyAimePalette(root,palette,theme){
  const colors=palette.themes[theme].surface;
  for(const [i,name] of [[0,'bg'],[1,'card'],[2,'text'],[3,'muted'],[4,'line']]){
    const page=root.querySelector('.aime-stage');
    if(colors[i].hex!==surfaces[theme][i])page?.style.setProperty(`--aime-${name}`,colors[i].hex);
    else page?.style.removeProperty(`--aime-${name}`);
  }
}
export {defaultAimeBoard,validateAimeBoard,renderAimeScene,aimeBoardPanel,applyAimePalette};
