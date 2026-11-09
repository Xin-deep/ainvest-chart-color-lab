import {workspaceReference} from '../data/workspace-reference.js';
import { sceneChartLayer, sceneChartSlots, sceneModule } from '../data/scene-charts.js';
import {presets} from '../data/presets.js';
import {termText,termLine,termRect,termIcon,termArc,termMark,termButton,applyTerminalPalette} from './terminal.js';

const wsText=termText,wsLine=termLine,wsRect=termRect;
const wsDocument=(x,y,size=12)=>`<g transform="translate(${x} ${y}) scale(${size/14})" fill="none" stroke="var(--term-text)" stroke-width="1"><path d="M2 1h6l4 4v8H2ZM8 1v4h4M4 7h6M4 9h6"/></g>`;
const wsCat=(i,label,body)=>termMark('categorical',i,['#265FFC','#38D1FF','#F564B9','#733ED6','#00CCC3','#273D8F','#FF7040'][i%7],label,body);
const wsSemantic=(negative,label,body)=>termMark('semantic',negative?1:0,negative?'#FF381A':'#009B67',label,body);
const wsPath=points=>'M'+points.map(p=>p.join(' ')).join('L');
const wsAsset=(name,x,y,w,h=w)=>`<image data-workspace-asset="${name}" href="${workspaceReference.light.assets[name]}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const wsDates=(xs,y,values)=>xs.map((x,i)=>wsText(x,y,values[i],11,{anchor:'middle',fill:'var(--term-muted)'})).join('');
// The line of a bar and line combination takes the line palette, like the shared charts.
function wsTools(x,y){return `<path d="M${x+6.5} ${y}l2 4 4.5.6-3.3 3.2.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.2 4.5-.6Z" fill="none" stroke="var(--term-text)" stroke-width="1"/>`+termIcon('clock',x+26,y,12)+`<path d="M${x+60} ${y-1}l2 5 4 2-4 2-2 6-2-6-4-2 4-2Z" fill="var(--term-text)"/>`+wsText(x+81,y+10,'···',15,{bold:true});}
function wsHeading(x,y,w,title,plus=true){
 return `<g class="workspace-widget-heading"><g transform="translate(${x+6} ${y+10})" fill="var(--term-muted)">${[0,4,8].map(d=>`<circle cx="0" cy="${d}" r=".7"/><circle cx="3" cy="${d}" r=".7"/>`).join('')}</g>`+wsRect(x+16,y+6,22,23,'var(--ws-tag)',3)+wsRect(x+23,y+14,7,7,'var(--term-muted)',1)+wsRect(x+40,y+7,Math.min(w-160,title.length*6.1+12),21,'var(--ws-tag)',3)+wsText(x+48,y+22,title,12)+ (plus?wsText(x+Math.min(w-140,title.length*6.1+63),y+22,'+',17):'')+wsTools(x+w-106,y+11)+'</g>';
}
function wsCard(id,x,y,w,h,title,body,{shade=false,heading=true}={}){
 return `<g data-workspace-widget="${id}" role="group" aria-label="${title}">${wsRect(x,y,w,h,shade?'var(--ws-alt-card)':'var(--term-bg)',5)}${heading?wsHeading(x,y,w,title):''}${body}</g>`;
}
// Each volume bar becomes one candle: the curve inside its slot gives the high and low, the previous close the open.
export function stockCandles(points,bars){
 const step=bars.length>1?bars[1].x-bars[0].x:bars[0].width;
 let close=points[0][1];
 return bars.map(bar=>{
  const center=bar.x+bar.width/2,slot=points.filter(([x])=>x>=center-step/2&&x<center+step/2);
  const ys=slot.length?slot.map(p=>p[1]):[close],open=close;
  close=ys.at(-1);
  return {x:center,width:bar.width,open,close,high:Math.min(open,...ys),low:Math.max(open,...ys),down:close>open};
 });
}
// Volume bars take the rise or fall color of their candle.
function wsVolume(candles){
 return workspaceReference.light.bars.volume.map((r,i)=>wsSemantic(candles[i]?.down,'Volume',wsRect(r.x,r.y,r.width,r.height,'currentColor',0,`data-terminal-area data-workspace-bar="volume:${i}"`))).join('');
}
function wsHeader(){
 let out=wsRect(0,0,1781,1376,'var(--ws-frame)')+wsLine(63,37,1781,37,'var(--term-border)')+wsLine(63,0,63,1376,'var(--term-border)');
 for(const [x,c] of [[13,'#FF5F57'],[31,'#FEBC2E'],[50,'#28C840']])out+=`<circle cx="${x}" cy="18.5" r="5.5" fill="${c}"/>`;
 for(const [name,y] of [['layout',65],['edit',199],['cursor',240],['plug',283],['clock',325],['chart',366],['folder',407],['chat',447]])out+=wsAsset(name,20,y-10,22,21);
 out+=wsAsset('robot',14,90,35)+wsAsset('avatar',14,134,35);
 out+=`<foreignObject x="1382" y="6" width="223" height="24"><div xmlns="http://www.w3.org/1999/xhtml" class="workspace-search"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input placeholder="Search" aria-label="Terminal Search"/></div></foreignObject>`;
 for(const [name,x] of [['clock',1630],['exchange',1656],['bookmark',1683],['panel',1750]])out+=termIcon(name,x,12,13);
 out+=`<path d="M1722 18a7 4 0 1 1 14 0 7 4 0 1 1-14 0M1732 18a3 3 0 1 1-6 0 3 3 0 1 1 6 0" fill="none" stroke="var(--term-text)" stroke-width="1"/>`;
 return out;
}
function wsTabs(){
 let out='';for(let i=0;i<4;i++)out+=termButton(72+i*188,42,184,30,'Stock Details',{active:i===0,control:'workspace-tab-'+i,group:'workspace-tabs'});
 // File icons and left-aligned titles follow the desktop tab strip.
 out=out.replace(/<text x="[^"]+" y="61"[^>]*>Stock Details<\/text>/g,'');
 for(let i=0;i<4;i++)out+=wsDocument(82+i*188,50,11)+wsText(97+i*188,61,'Stock Details',12);
 return out+wsLine(827,49,827,65,'var(--term-border)')+wsText(841,63,'+',23)+wsText(1679,61,'+ Add Widget',12,{fill:'var(--term-muted)'});
}
function wsStock(){
 let b=wsRect(82,84,24,22,'var(--ws-tag)',3)+wsRect(89,91,7,7,'var(--term-muted)',1)+wsRect(110,84,69,22,'var(--ws-tag)',3)+wsAsset('BBD',116,88,16)+wsText(135,100,'BBD⌄',12);
 for(const [x,v] of [[188,'Watchlist'],[256,'Top List'],[314,'Market Calendar'],[420,'News Wire'],[491,'+']])b+=wsText(x,99,v,11.5,{bold:true});
 b+=wsTools(872,88)+wsText(83,130,'Pre ▾   ▮ ▾   fx ▾',11.5,{bold:true})+wsLine(209,115,209,135,'var(--term-border)');
 for(const [name,x] of [['chart',222],['panel',250],['list',277],['panel',304],['plus',332],['download',355]])b+=termIcon(name,x,118,12);
 b+=wsAsset('BBD',82,145,20)+wsText(104,159,'BBD ·1D ·NASDAQ',13,{bold:true})+wsRect(235,146,34,17,'var(--ws-tag)',8)+`<circle cx="245" cy="154" r="3" fill="#009B67"/><circle cx="259" cy="154" r="3" fill="var(--term-muted)"/>`+wsText(280,158,'Date:2024-09-19 Friday',11.5)+wsText(421,158,'To date:',11.5)+wsSemantic(false,'To date',wsText(468,158,'+100(+10.00%)',11.5,{fill:'currentColor'}));
 b+=wsText(82,180,'MA',9);['MA5:231.21','MA10:231.21','MA20:231.21','MA30:231.21','MA60:231.21'].forEach((v,i)=>b+=wsCat(i,v,wsText(104+i*80,180,v,9,{fill:'currentColor'})));
 b+=wsRect(83,193,23,14,'var(--term-bg)',3,'stroke="var(--term-border)"')+wsText(90,203,'⌄',12);
 ['400.00','390.00','380.00','370.00','360.00','350.00','340.00','330.00'].forEach((v,i)=>{const y=143+i*29.7;if(i>1)b+=wsLine(83,y,916,y);b+=wsText(955,y+4,v,11,{fill:'var(--term-muted)',anchor:'end'});});
 const candles=stockCandles(workspaceReference.light.lines.stock,workspaceReference.light.bars.volume);
 for(const c of candles)b+=wsSemantic(c.down,'BBD candle',`<path d="M${c.x} ${c.high}V${c.low}" stroke="currentColor" stroke-width="1" fill="none"/>`+wsRect(c.x-c.width/2,Math.min(c.open,c.close),c.width,Math.max(1,Math.abs(c.close-c.open)),'currentColor',0,'data-terminal-area'));
 b+=wsText(83,293,'VOL',11.5)+wsSemantic(false,'Volume',wsText(115,293,'VOLUME:12.98',11.5,{fill:'currentColor'}))+wsVolume(candles);
 b+=wsDates([98,375,653,937],391,['9:30','11:30','13:30','15:30'])+wsLine(78,401,968,401);
 for(const [i,v] of ['1D','5D','1M','3M','6M','YTD','1Y','5Y','All'].entries())b+=wsText(86+i*39,420,v,11.5);
 b+=termIcon('settings',846,410,12)+wsText(865,420,'02:12:23(UTC+8)',11.5);
 return wsCard('stock',71,78,906,353,'Stock Details',b,{heading:false});
}
function wsCalendar(){
 let b=termButton(79,477,55,22,'Today',{active:true,control:'today',group:'calendar'})+wsRect(139,477,98,22,'var(--term-bg)',3,'stroke="var(--term-border)"')+wsDocument(148,483,12)+wsText(162,492,'Sep 24,2026',11.5);
 const rows=[['Bitcoin','60.14%','-0.01%'],['Ethereum','10.59%','-0.05%'],['BNB','3.63%','-0.08%'],['USDT','6.82%','+0.66%'],['Others','18.82%','+0.02%']];
 rows.forEach(([name,v,c],i)=>{const y=518+i*27;b+=wsCat(i,name,`<circle cx="84" cy="${y-4}" r="3.7" fill="currentColor"/>`)+wsText(92,y,name,11)+wsText(471,y,v,11.5,{anchor:'end'})+wsSemantic(c.startsWith('-'),c,wsText(518,y,c,11.5,{fill:'currentColor',anchor:'end'}));if(i<4)b+=wsLine(79,y+9,518,y+9);});
 return wsCard('calendar',71,437,906,260,'Calendar',b);
}
function wsDonut(){
 let b='';['All','BTC','ETH','XRP','SOL'].forEach((v,i)=>b+=termButton(990+i*76.4,119,72,22,v,{active:!i,control:v,group:'workspace-etf'}));
 return wsCard('holding-donut',983,78,393,308,'ETF Holding Distribution',b,{shade:true});
}
function wsCap(){
 return wsCard('quick-quote-bars',1381,78,393,308,'Quick Quote','',{shade:true});
}
const wsNewsRows=[['TSLA','+2.87%',"Why is Elon Musk becoming Donald Trump's efficiency adviser?"],['APPL','+3.67%',"Apple is reportedly working on ‘LLM Siri’ to compete with ChatGPT as Nvidia shares fluctuate as investors dig..."],['NVDA','-7.88%',"Nvidia shares fluctuate as investors digest third-quarter earnings Nvidia shares fluctuate as investors diges..."],['MA','+1.23%',"Nike and A Ma Maniére Are Dropping the Sickest, Sleekest Air Max 95 in Years Apple is reportedly working o..."]];
function wsNews(){
 let b='';for(let j=0;j<2;j++){const y=440+j*129;b+=wsText(993,y,'Sunday Jul20,2025',12,{fill:'var(--term-muted)'});wsNewsRows.forEach(([name,c,headline],i)=>{const py=y+26+i*26;b+=wsRect(984,py-18,789,25,i%2?'var(--ws-news-row)':'transparent')+wsLine(984,py-18,1774,py-18)+wsText(993,py,'10:45',12,{fill:'var(--term-muted)'})+wsText(1072,py,name,12)+wsSemantic(c.startsWith('-'),c,wsText(1117,py,c,12,{fill:'currentColor'}))+`<text x="1200" y="${py}" font-size="11.5" fill="var(--term-text)" clip-path="url(#workspace-news-clip)">${headline.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text>`;});}
 return wsCard('news',983,392,791,305,'News Wire',`<defs><clipPath id="workspace-news-clip"><rect x="1200" y="442" width="566" height="247"/></clipPath></defs>${b}`,{shade:true});
}
function wsYield(){
 let b='';['All','BTC','ETH','XRP','SOL'].forEach((v,i)=>b+=termButton(79+i*59,744,55,22,v,{active:!i,control:v,group:'workspace-yield-filter'}));
 return wsCard('yield',71,702,451,287,'ETF Holding Distribution',b);
}
function wsTesla(y,x=535){return wsAsset('TSLA',x,y-13,16)+wsText(x+18,y,'TSLA',11.5)+wsText(x+49,y,'Testa',11.5,{fill:'var(--term-muted)'})+wsText(x+200,y,'$424.00',11.5)+wsSemantic(false,'TSLA quote',wsText(x+249,y,'-4.39 (-2.52%)',11,{fill:'currentColor'}))+wsText(x+327,y,'After-Hours 20:00 ET',10,{fill:'var(--term-muted)'});}
function wsRates(){
 let b=wsTesla(755);
 return wsCard('rates',527,702,450,287,'Quick Quote',b);
}
function wsSector(){
 // Seven segments stretched to the 377px the strip already fills.
 const widths=[122,80,44,35,27,19,19],sum=widths.reduce((total,w)=>total+w);
 let b='',x=990;widths.forEach((w,i)=>{const width=w*377/sum;b+=wsCat(i,'Holding sector',wsRect(x,742,width,55,'currentColor',0,'stroke="var(--term-bg)" stroke-width=".5" data-terminal-area'));x+=width;});
 const names=['Technology','Financial Services','Technology','Financial Services','Technology','Financial Services','Financial Services'];
 names.forEach((v,i)=>{const col=i%3,row=Math.floor(i/3),px=994+col*128,py=819+row*36;b+=wsCat(i,v,`<circle cx="${px}" cy="${py-5}" r="3" fill="currentColor"/>`)+wsText(px+7,py,v,10,{fill:'var(--term-muted)'})+wsText(px-4,py+17,i%2?'16.24%':'28.68%',12);});
 return wsCard('sector',983,702,393,242,'ETF Holding Distribution',b);
}
function wsBonds(){
 return wsCard('bonds',1381,702,393,242,'Quick Quote',wsTesla(754,1389));
}
const wsPortfolios=['AIME Super Portfolio','80/20 Aggressive Growth Portfolio','US Total Equity Portfolio','All Weather Plus','Golden Butterfly Portfolio','Treasury Bill Ladder','Ultra Short Reserve','Municipal Cash Plus','Short Duration Income','Floating Rate Reserve'];
function wsPortfolio(){
 let b='',x=79;for(const [label,w] of [['Investment purpose',137],['Risk tolerance',107],['Portfolio type',102],['Annualized return(1Y)',143],['Max drawdown',110],['Volatility',79],['Sharpe ratio',95],['⟳ Reset',61]]){b+=wsRect(x,1034,w,22,'var(--term-bg)',3,'stroke="var(--term-border)"')+wsText(x+7,1049,label+(label.includes('Reset')?'':'⌄'),11.5);x+=w+5;}
 b+=wsText(82,1082,'Thursday Sep 24,2026',10.5,{fill:'var(--term-muted)'});[[416,'Score'],[497,'Annual'],[580,'Manage'],[666,'Diversifi'],[768,'Cost'],[825,'Momentum'],[924,'Previous']].forEach(([x,v])=>b+=wsText(x,1082,v,10.5,{fill:'var(--term-muted)'}));
 wsPortfolios.forEach((name,i)=>{const y=1108+i*26;if(i%2)b+=wsRect(72,y-17,904,25,'var(--term-row)');b+=wsText(82,y,name,11.5)+wsSemantic(false,'Portfolio score',wsText(405,y,'86',11.5,{fill:'currentColor'}))+wsText(420,y,'/100',11.5);for(const [x,v] of [[508,'3.89'],[589,'72.88'],[671,'72.88'],[761,'72.88'],[849,'72.88'],[941,'8.95']])b+=wsText(x,y,v,11.5);});
 return wsCard('portfolios',71,994,906,365,'Popular Portfolios',b);
}
// The falling view mirrors the rising curve inside the same band, so it keeps its shape and stays on the chart.
function pnlPoints(points,trend){
 if(trend!=='down')return points;
 const ys=points.map(p=>p[1]),top=Math.min(...ys),bottom=Math.max(...ys);
 return points.map(([x,y])=>[x,top+bottom-y]);
}
function wsPnl(trend){
 const down=trend==='down';
 let b=wsText(990,1000,'Total Account Value',10.5,{fill:'var(--term-muted)'})+wsText(990,1017,'$51,996.13',12)+wsText(1146,1000,"Day’s P&L",10.5,{fill:'var(--term-muted)'})+wsSemantic(down,'Daily P&L',wsText(1146,1017,down?'-$467.89 (-0.13%)':'+$467.89 (+0.13%)',12,{fill:'currentColor'}))+wsLine(990,1027,1766,1027);
 [['up','涨',1688],['down','跌',1724]].forEach(([id,label,x])=>b+=termButton(x,992,34,22,label,{active:trend===id,control:id,group:'workspace-pnl-trend',action:'pnl-trend'}));
 for(const [i,label] of ['Unsettled Funds ⓘ','Cash Balance','Available Funds','Available Funds','Risk Level ⓘ','Market Value','Max Buying Power','Open P&L'].entries()){
  const col=i<5?i:i-5,x=990+col*156,y=i<5?1045:1086;b+=wsText(x,y,label,10.5,{fill:'var(--term-muted)'});b+=i===4?wsSemantic(false,'Secure',wsText(x,y+17,'Secure',12,{fill:'currentColor'})):wsText(x,y+17,'$2,887.56',12);
 }
 const points=pnlPoints(workspaceReference.light.lines.pnl,trend);
 b+=wsSemantic(down,'P&L chart',`<defs><linearGradient id="workspace-pnl-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${wsPath(points)}L1710 1283L990 1283Z" fill="url(#workspace-pnl-gradient)" data-terminal-area/><path d="${wsPath(points)}" fill="none" stroke="currentColor" stroke-width="1.1" data-terminal-line data-terminal-width="1.1" data-workspace-green="pnl" data-workspace-trend="${trend}"/>`);
 ['6,126.00','6,126.00','6,126.00','6,126.00','6,126.00','6,126.00','6,126.00','6,126.00'].forEach((v,i)=>b+=wsText(1721,1136+i*22,v,11,{fill:'var(--term-muted)'}));
 b+=wsDates(Array.from({length:10},(_,i)=>1010+i*75),1307,Array(10).fill('09:20'));
 return wsCard('pnl',983,949,791,378,'P&L',b);
}
export function renderWorkspaceTerminal({pnlTrend='up'}={}){
 return `<div class="terminal-scene workspace-terminal" role="group" aria-label="Terminal 工作区"><svg class="workspace-shell" viewBox="0 0 1781 1376" xmlns="http://www.w3.org/2000/svg" aria-label="Terminal 工具导航">${wsHeader()}</svg><main class="workspace-terminal-scroll" tabindex="0" aria-label="Terminal 工作区内容"><svg viewBox="63 37 1718 1339" class="workspace-terminal-content" xmlns="http://www.w3.org/2000/svg" aria-label="行情、持仓与组合工作区"><defs><pattern id="terminal-texture" width="8" height="8" patternUnits="userSpaceOnUse"/></defs>${wsTabs()+wsStock()+wsCalendar()+wsDonut()+wsCap()+wsNews()+wsYield()+wsRates()+wsSector()+wsBonds()+wsPortfolio()+wsPnl(pnlTrend)+wsRect(71,1364,906,50,'var(--term-bg)',5)+wsHeading(71,1364,906,'ETF Holding Distribution')}</svg>${sceneChartLayer('workspace')}</main><svg class="workspace-account" viewBox="0 1295 63 81" aria-label="Terminal 账户">${wsRect(0,1295,63,81,'var(--ws-frame)')+wsAsset('gift',20,1299,22,21)+`<circle cx="31" cy="1348" r="14" fill="#3371FF"/>`+wsText(31,1353,'J',14,{fill:'#fff',anchor:'middle'})}</svg></div>`;
}
export function applyWorkspacePalette(element,palette,theme,globalStyle={}){
 applyTerminalPalette(element,palette,theme,globalStyle);
 const page=element.querySelector('.workspace-terminal');if(!page)return;
 const dark=theme==='dark',colors=palette.themes[theme],original=presets[0].themes[theme];
 const value=(i,light,night)=>colors.surface[i].hex===original.surface[i].hex?(dark?night:light):colors.surface[i].hex;
 const vars={'--ws-frame':value(0,'#F4F5F7','#000000'),'--term-bg':value(1,'#FFFFFF','#141414'),'--ws-alt-card':value(1,'#FFFFFF','#171717'),'--term-text':value(2,'#202020','#D2D2D2'),'--term-muted':value(3,'#858585','#858585'),'--term-border':value(4,'#DFDFDF','#2F2F2F'),'--term-grid':value(5,'#F2F2F2','#242424'),'--term-row':dark?'#1A1A1A':'#FAFAFA','--ws-news-row':dark?'#1A1A1A':'#FAFAFA','--ws-tag':dark?'#2F2F2F':'#F2F2F2','--term-soft':dark?'#434343':'#F2F2F2','--ws-search':dark?'#333333':'#E8E9EB'};
 for(const [k,v] of Object.entries(vars))page.style.setProperty(k,v);
 const reference=workspaceReference[theme];for(const img of page.querySelectorAll('[data-workspace-asset]'))img.setAttribute('href',reference.assets[img.dataset.workspaceAsset]);
 for(const trace of page.querySelectorAll('[data-workspace-green]'))trace.setAttribute('d',wsPath(pnlPoints(reference.lines[trace.dataset.workspaceGreen],trace.dataset.workspaceTrend)));
}

export const workspaceChartSlots = () => sceneChartSlots.workspace.map(sceneModule);
