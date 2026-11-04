import { terminalDarkReference } from '../data/terminal-dark-reference.js';
import { terminalReference } from '../data/terminal-reference.js';
import { presets } from '../data/presets.js';
import { rampColor } from '../lib/oklch.js';

export const TERMINAL_SIZE = {width:1856,height:1335,sourceWidth:2880,sourceHeight:2073};
const termE = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const termText=(x,y,value,size=12,options={})=>`<text x="${x}" y="${y}" font-size="${size}" fill="${options.fill||'var(--term-text)'}" ${options.bold?'font-weight="600"':''} ${options.anchor?`text-anchor="${options.anchor}"`:''}>${termE(value)}</text>`;
const termLine=(x1,y1,x2,y2,color='var(--term-grid)',width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const termRect=(x,y,width,height,fill='var(--term-bg)',rx=0,extra='')=>`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" ${extra.includes('stroke-width=')?'':'stroke-width="1"'} ${extra}/>`;
const termAsset=(name,x,y,width,height=width)=>`<image data-terminal-asset="${name}" href="${terminalReference.assets[name]}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
const termMark=(role,index,base,label,content)=>`<g class="terminal-color-mark" data-color-role="${role}" data-color-index="${index}" data-terminal-slot="${index}" data-terminal-base="${base}" style="color:${base}" tabindex="0" role="button" aria-label="${termE(label)}，编辑颜色"><title>${termE(label)}</title>${content}</g>`;
const termCat=(index,base,label,content)=>termMark('categorical',index,base,label,content);
const termValue=(x,y,value,size=12,anchor)=>termMark('semantic',value.startsWith('-')?1:0,value.startsWith('-')?'#FF381A':'#00B58C',value,termText(x,y,value,size,{fill:'currentColor',anchor}));
const termCard=(id,x,y,w,h,title,body)=>`<g data-terminal-chart="${id}" role="group" aria-label="${termE(title)}">${termRect(x,y,w,h,'var(--term-bg)',5,'stroke="var(--term-border)"')}${termText(x+8,y+20,title,12.5,{bold:true})}${body}</g>`;
const termGrid=(x,y,w,h,ticks,options={})=>ticks.map((label,i)=>{const py=y+i*h/(ticks.length-1);return termLine(x,py,x+w,py)+termText(x+w+5,py+4,label,11.5,{fill:options.muted?'var(--term-muted)':'var(--term-text)'});}).join('');
const termDates=(xs,y,labels)=>xs.map((x,i)=>termText(x,y,labels[i],11.5,{anchor:'middle'})).join('');
const termSeriesColors=['#1F5FD6','#D9720B','#C14696','#0E9C84','#7647C8','#BB8D13','#8AA126','#168CB8'];
const termSeriesSlots=[0,1,2,3,4,5,6,7];
function termLegend(x,y,items,spacing=72,size=12){
 return items.map((item,i)=>{const name=typeof item==='string'?item:item.name,index=typeof item==='string'?i:item.index,base=typeof item==='string'?termSeriesColors[i]:item.base;return termMark(item.role||'categorical',termSeriesSlots[index]??index,base,name,`<circle cx="${x+i*spacing}" cy="${y-4}" r="4.6" fill="currentColor"/>`)+termText(x+9+i*spacing,y,name,size);}).join('');
}
function termButton(x,y,w,h,label,{active=false,black=false,control='',group='',action=''}={}){
 return `<g class="terminal-button ${active?'is-active':''} ${black?'terminal-button-black':''}" ${control?`data-terminal-control="${termE(control)}" data-terminal-group="${termE(group)}" tabindex="0" role="button" aria-pressed="${active}" aria-label="${termE(label)}"`:''} ${action?`data-action="${termE(action)}" data-value="${termE(control)}"`:''}>${termRect(x,y,w,h,'var(--term-soft)',3,'class="terminal-button-bg"')}${termText(x+w/2,y+h/2+4,label,12,{anchor:'middle'})}</g>`;
}
function termIcon(name,x,y,size=16){
 const p={plus:'M12 3v18M3 12h18',expand:'M14 3h7v7m0-7-9 9M10 21H3v-7m0 7 9-9',panel:'M3 4h18v16H3zM15 4v16',filter:'M3 4h18l-7 8v8l-4-2v-6z',down:'m7 9 5 5 5-5',mail:'M3 5h18v14H3zM3 5l9 8 9-8',bookmark:'M5 3h14v18l-7-5-7 5zM8 7h8',list:'M4 3h16v18H4zM8 7h8M8 11h8M8 15h8',clock:'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',exchange:'M5 8h14l-4-4M19 16H5l4 4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',download:'M12 2v13m-4-4 4 4 4-4M3 15v6h18v-6',gift:'M3 8h18v5H3zM5 13v9h14v-9M12 8v14M12 8C0 8 5-3 12 8c7-11 12 0 0 0',settings:'M9 2h6l1 4 4 1 2 5-3 3v4l-5 3-3-3-4 1-4-4 1-4-2-3 3-5 4 1zM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'}[name]||'';
 return `<g transform="translate(${x} ${y}) scale(${size/24})" fill="none" stroke="var(--term-text)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></g>`;
}
function termHeader(){
 let out=termRect(0,0,1856,1335,'var(--term-page)')+termLine(0,42,1856,42,'var(--term-border)')+termLine(222,42,222,1335,'var(--term-border)')+termLine(1527,42,1527,1335,'var(--term-border)')+termAsset('logo',12,5,115,31);
 out+=`<foreignObject x="222" y="7" width="151" height="28"><div xmlns="http://www.w3.org/1999/xhtml" class="terminal-search"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input type="search" data-terminal-search aria-label="Terminal Symbol/Name" placeholder="Symbol/Name"/></div></foreignObject>`;
 for(const [x,label] of [[408,'Aime'],[476,'AI Charts'],[571,'Markets'],[658,'Portfolio'],[751,'News'],[822,'Trade']]){
  if(label==='Markets')out+=termRect(559,7,76,28,'var(--term-selected)',6);
  out+=termText(x,27,label,14,{fill:label==='Markets'?'var(--term-selected-text)':label==='AI Charts'?'#265FFC':'var(--term-text)'});
 }
 out+=`<defs><linearGradient id="terminal-off"><stop stop-color="#00699C"/><stop offset="1" stop-color="#004122"/></linearGradient></defs>`+termRect(1595,7,87,28,'url(#terminal-off)',5)+termText(1638,26,'75% Off',13,{fill:'#fff',bold:true,anchor:'middle'})+termLine(1698,10,1698,32,'var(--term-border)');
 for(const [name,x] of [['bookmark',1714],['mail',1752],['exchange',1788],['list',1823]])out+=termIcon(name,x,13,16);
 out+=termAsset('robot',14,51,21,21)+termText(46,66,'Aime',13,{fill:'var(--term-muted)'})+termIcon('panel',189,55,16);
 const items=[['new-chat','New Chat',99],['library','Library',136],['profile','Profile',173],['automation','Automation',210],['search','Search Chat',247],['history','History',284]];
 for(const [name,label,y] of items)out+=termAsset(name,14,y-11,21,21)+termText(46,y+5,label,14);
 for(const y of [210,284])out+=`<circle cx="200" cy="${y}" r="3" fill="#265FFC"/>`;
 out+=termLine(7,312,215,312)+termText(14,343,'Tools',12,{fill:'var(--term-muted)'});
 for(const [name,label,y] of [['calendar','Calendars',370],['money','Smart Money',407],['signal','Premium Signals',443],['macro','Macromaps',480],['compare','ETF Compare',517],['congress','Congress Trading',554],['chart','Option Discovery',591],['file','Earnings Hub',628],['heatmap','Heatmaps',664]])out+=termAsset(name,14,y-11,21,21)+termText(46,y+5,label,14);
 return out+termWatchlist()+termTasks();
}
function termUserBar(){
 return termRect(0,1229,222,106,'var(--term-page)')+termRect(8,1233,206,35,'var(--term-rewards)',6)+termIcon('gift',16,1243,17)+termText(46,1255,'Rewards',14)+`<circle cx="191" cy="1250" r="3" fill="#FF381A"/>`+termText(202,1254,'›',16)+termLine(8,1278,214,1278,'var(--term-border)')+`<circle cx="21" cy="1307" r="10" fill="#165DFF"/>`+termText(21,1311,'J',11,{fill:'#fff',anchor:'middle'})+termText(39,1303,'JJdumpling',14)+termText(39,1320,'Free Plan',12,{fill:'var(--term-muted)'})+termIcon('download',197,1299,15);
}
function termWatchlist(){
 let out=termRect(1542,54,299,337,'var(--term-panel)',7,'stroke="var(--term-border)"')+termText(1554,79,'Watchlist',14,{bold:true})+termRect(1686,62,84,23,'var(--term-panel)',3,'stroke="var(--term-border)"')+termIcon('filter',1695,68,12)+termText(1710,78,'My List',11.5)+termIcon('down',1752,69,10)+termIcon('plus',1787,68,13)+termIcon('expand',1815,68,13);
 for(const [x,label] of [[1554,'200 Symbol'],[1658,'Price'],[1717,'Change%'],[1785,'Volume'],[1834,'F']])out+=termText(x,110,label,10);
 const rows=[['TSLA','248.98','+2.87%'],['AAPL','227.48','+3.67%'],['NVDA','135.37','-7.88%'],['MA','517.88','+1.23%'],['WSM','132.2','+4.45%'],['DOLE','16.1','+12.34%'],['YSG','3.89','-18.9%'],['VKTX','72.88','+6.66%'],['YMM','8.95','+1.23%'],['CSCO','55.5','-13.88%']];
 rows.forEach(([symbol,price,change],i)=>{const y=133+i*27.1;out+=termLine(1549,y-13,1839,y-13)+termAsset('watch-'+symbol,1553,y-8,17,17)+termText(1578,y+5,symbol,12)+termText(1684,y+5,price,12,{anchor:'end'})+termValue(1761,y+5,change,12,'end')+termText(1829,y+5,'35.46M',12,{anchor:'end'});});
 return `<g data-terminal-watchlist="true">${out}</g>`;
}
function termTasks(){
 let out=termRect(1542,402,299,379,'var(--term-panel)',7,'stroke="var(--term-border)"')+termText(1554,428,'My Active Tasks',14,{bold:true})+termIcon('settings',1813,416,13)+termText(1554,451,'No tasks yet, choose one below.',11.5,{fill:'var(--term-muted)'});
 ['Daily Position Analysis','Daily Trade Summary','Watchlist Analysis','Daily Strategy Summary','Daily Strategy Summary','Daily Strategy Summary'].forEach((name,i)=>{const y=466+i*52.1;out+=termRect(1554,y,275,46,'var(--term-panel)',6,'stroke="var(--term-grid)"')+termIcon('clock',1565,y+16,13)+termText(1589,y+19,name,11.5)+termText(1589,y+35,'Daily at 9:00 AM',11,{fill:'var(--term-muted)'})+termButton(1761,y+12,57,23,'Add',{control:'task-'+i,group:'tasks'});});
 return out;
}
function termMarketTrackers(){
 let out='';
 const rows=[['SPY','773.38','-0.02%','+0.71%'],['SQQQ','747.46','+0.81%','+0.34%'],['DIA','518','-0.34%','+1.21%'],['IWM','287.21','+0.57%','+1.71%'],['BTC','314.62','+8.03%','+0.71%']];
 rows.forEach(([name,price,change,post],i)=>{const y=[128,156,183,211,239][i];if(!(i%2))out+=termRect(240,y-14,310,27,'var(--term-tracker-row)');out+=termAsset(name,248,y-9,19,18)+termText(270,y+4,name,12)+termText(name==='SQQQ'?305:296,y+3,'D',8,{fill:'#D7A12D'})+termRect(name==='SQQQ'?317:309,y-2,8,3,'#747474',1)+termText(407,y+5,price,12,{anchor:'end'})+termValue(457,y+5,change,12,'end')+termText(465,y+5,'Post:',12)+termValue(539,y+5,post,12,'end');});
 return termCard('market-trackers',238,83,314,176,'Market Trackers',out);
}
function termAdvancers(){
 let out='';
 const labels=['≤-10%','-10%','-7%','-5%','-3%','0','+3%','+5%','+7%','+10%','≥+10%'];
 [113,111,165,518,2866,760,1718,280,130,93,75].forEach((value,i)=>{const x=572+i*26.7,h=value/2866*83,base=i<5?'#FF381A':i===5?'#666666':'#00B58C';out+=termMark(i===5?'surface':'semantic',i===5?3:i<5?1:0,base,`${labels[i]} ${value}`,termRect(x+3,214-h,12,h,'currentColor')+termText(x+9,210-h,value,10.5,{fill:'currentColor',anchor:'middle'}))+termText(x+9,224,labels[i],7.6,{fill:'var(--term-muted)',anchor:'middle'});});
 out+=termMark('semantic',1,'#FF381A','Decliners 3,626',termRect(567,235,132,3.5,'currentColor')+termText(567,251,'Decliners:3,626',10.5,{fill:'currentColor'}))+termRect(702,235,19,3.5,'#666666')+termMark('semantic',0,'#00B58C','Advancers 2,618',termRect(725,235,137,3.5,'currentColor')+termText(862,251,'Advancers:2,618',10.5,{fill:'currentColor',anchor:'end'}));
 return termCard('advancers-decliners',558,83,314,176,'Advancers & Decliners',out);
}
function termHeatmap(){
 const cells=[
 [885,114,100,35,'#981400','Lidar sensor','-13.88%'],[985,114,100,35,'#F05045','Hydrogen','-3.76%'],[1085,114,99,35,'#F05045','Innovative Material','-2.39%'],
 [885,149,75,36,'#009959','India Tech','+2.65%'],[960,149,75,36,'#F05045','Argentina','-2.39%'],[1035,149,75,36,'#2CBD80','Fiber optics','+1.23%'],[1110,149,74,36,'#009959','Cyber Security','+4.31%'],
 [885,185,75,36,'#009959','Catalite Communication','+4.31%'],[960,185,75,36,'#009959','India','+4.31%'],[1035,185,75,36,'#F05045','Infrastructure','-2.16%'],[1110,185,74,36,'#F05045','Coffee','-2.02%'],
 [885,221,75,31,'#009959','Alzheimer','+4.31%'],[960,221,75,31,'#F77C7C','Infrastructure','-1.81%'],[1035,221,75,31,'#009959','Turkish','+4.31%'],[1110,221,74,31,'#009959','Digital Payment','+4.31%']];
 const body=cells.map(([x,y,w,h,base,name,value])=>termMark('semantic',value.startsWith('-')?1:0,base,`${name} ${value}`,termRect(x,y,w,h,'currentColor',0,'stroke="var(--term-bg)" stroke-width=".6" data-terminal-area')+termText(x+w/2,y+13,name,name.length>20?6.3:name.length>13?8:11,{fill:'#fff',anchor:'middle'})+termText(x+w/2,y+27,value,11,{fill:'#fff',anchor:'middle'}))).join('');
 return termCard('stock-heatmap',878,83,314,176,'Stock Heatmap ›',body);
}
// The line of a bar and line combination takes the line palette, like the shared charts.
const termComboLine=(base,label,content)=>termMark('line',0,base,label,content);
function termTraceSet(id){
 return terminalReference.lines[id].map(({base,points},i)=>(id==='yield'?termComboLine:termCat.bind(null,i))(base,`${id} ${i+1}`,`<path d="M${points.map(p=>p.join(' ')).join('L')}" fill="none" stroke="currentColor" stroke-width="1.25" data-terminal-trace="${id}:${i}" data-terminal-line data-terminal-width="1.25"/>`)).join('');
}
// The traced yield bars come in fragments; each period is rebuilt as two whole bars with the first series taller.
export function yieldBars(bars){
 const groups=[];
 for(const bar of [...bars].sort((a,b)=>a.x-b.x)){const last=groups.at(-1);if(last&&bar.x-last[0].x<30)last.push(bar);else groups.push([bar]);}
 return groups.flatMap(group=>{
  const whole=['#1F5FD6','#168CB8'].map(base=>{const parts=group.filter(bar=>bar.base===base);return {base,x:Math.min(...parts.map(p=>p.x)),width:Math.max(...parts.map(p=>p.width)),top:Math.min(...parts.map(p=>p.y)),bottom:Math.max(...parts.map(p=>p.y+p.height))};});
  const bottom=Math.max(whole[0].bottom,whole[1].bottom),heights=whole.map(bar=>bottom-bar.top).sort((a,b)=>b-a);
  return whole.map((bar,i)=>({base:bar.base,x:bar.x,width:bar.width,y:bottom-heights[i],height:heights[i]}));
 });
}
function termBarSet(id){
 return (id==='yield'?yieldBars(terminalReference.bars.yield):terminalReference.bars[id]).map(({base,x,y,width,height})=>{const index=termSeriesColors.indexOf(base),slot=base==='#168CB8'?1:termSeriesSlots[index];return termCat(slot,base,`${id} bar`,termRect(x,y,width,height,'currentColor',0,'data-terminal-area'));}).join('');
}
// Keeps the traced short-term wiggles but replaces the flat overall level with a clear climb.
export function risingCurve(points,start,end){
 const first=points[0][0],span=points.at(-1)[0]-first;
 return points.map(([x,y],i)=>{
  const near=points.slice(Math.max(0,i-12),i+13),level=near.reduce((sum,p)=>sum+p[1],0)/near.length;
  return [x,Number((start+(end-start)*((x-first)/span)**1.3+(y-level)*1.4).toFixed(3))];
 });
}
const termBondsPoints=points=>risingCurve(points,222,154);
function termBondsPlot(){
 const line=terminalReference.lines.bonds[0],points=termBondsPoints(line.points),path='M'+points.map(p=>p.join(' ')).join('L');
 const series=termCat(0,line.base,'Factory1',`<defs><linearGradient id="terminal-bonds-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${path}L${points.at(-1)[0]} 232L${points[0][0]} 232Z" fill="url(#terminal-bonds-gradient)" data-terminal-area data-terminal-area-trace="bonds:0" data-terminal-baseline="232"/><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.25" data-terminal-trace="bonds:0" data-terminal-line data-terminal-width="1.25"/>`);
 const body=termLegend(1211,126,['Factory1'],71)+termGrid(1206,144,264,88,['100%','80%','60%','40%','20%','0%'])+series+termDates([1223,1281,1340,1399,1458],250,['24.Aug','25.Aug','26.Aug','27.Aug','28.Aug']);
 return termCard('major-bonds-trend',1198,83,314,176,'Major 10-year bonds ›',body);
}
function termArc(cx,cy,outer,inner,start,end){
 const point=(r,a)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)],a=point(outer,start),b=point(outer,end),c=point(inner,end),d=point(inner,start),large=end-start>Math.PI?1:0;
 return `M${a}A${outer} ${outer} 0 ${large} 1 ${b}L${c}A${inner} ${inner} 0 ${large} 0 ${d}Z`;
}
function termFear(){
 let body=`<path d="M284 420A108 108 0 0 1 500 420Z" fill="var(--term-gauge-inner)"/><path d="M348 420A44 44 0 0 1 436 420Z" fill="var(--term-gauge-center)"/>`;const cx=392,cy=420;
 for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/10,b=a+Math.PI/10-.017;body+=`<path d="${termArc(cx,cy,121,110,a,b)}" fill="var(--term-gauge-track)"/>`;}
 // Each slice is computed from the palette, so editing any of the three colors redraws the whole gradient.
 terminalReference.gauge.forEach((base,i)=>{if(base==='#FFFFFF')return;const a=Math.PI+i*Math.PI/180,b=a+Math.PI/180*1.015,t=i/179,[role,index,label]=t<.4?['semantic',1,'Fear & Greed 下跌']:t<=.6?['neutral',0,'Fear & Greed 中性']:['semantic',0,'Fear & Greed 上涨'];body+=termMark(role,index,base,label,`<path d="${termArc(cx,cy,108,89,a,b)}" fill="currentColor" data-terminal-area data-terminal-gauge="${t}"/>`);});
 body+=`<path d="M389 375 392 304 396 375Z" fill="var(--term-text)"/>`+termText(392,401,'58',16,{bold:true,anchor:'middle'})+termText(392,416,'Fear',10,{fill:'var(--term-muted)',anchor:'middle'})+termText(306,416,'0',11,{fill:'var(--term-muted)'})+termText(482,416,'100',11,{fill:'var(--term-muted)',anchor:'end'})+termText(271,433,'Extreme Fear',10.5,{fill:'var(--term-muted)'})+termText(512,433,'Extreme Greed',10.5,{fill:'var(--term-muted)',anchor:'end'});
 body+=termRect(246,447,293,23,'var(--term-bg)',3,'stroke="var(--term-border)"');['1 Year','1 Month','1 Week'].forEach((label,i)=>body+=termButton(247+i*97,448,95,21,label,{active:!i,control:label,group:'fear-period'}));
 [['Extreme Fear','17 Days(5.11%)'],['Fear','75 Days(20.60%)'],['Neutral','48 Days(13.19%)'],['Greed','175 Days(48.08%)'],['Extreme Greed','49 Days(13.46%)']].forEach(([label,value],i)=>{const y=489+i*28;body+=termText(246,y,label,12,{fill:'var(--term-muted)'})+termText(540,y,value,12,{anchor:'end'});if(i<4)body+=termLine(245,y+8,544,y+8);});
 return termCard('fear-greed',238,266,314,350,'Fear & Greed Index',body);
}
function termDominance(){
 let body='';
 [['Bitcoin','60.14%','-0.01%','#FFAA00',0],['Ethereum','10.59%','-0.05%','#165DFF',1],['BNB','3.63%','-0.08%','#38D1FF',2],['USDT','6.82%','+0.66%','#733ED6',3],['Others','18.82%','+0.02%','#858585',4]].forEach(([label,value,change,base,index],i)=>{const y=310+i*28;body+=termCat(index,base,label,`<circle cx="567" cy="${y-4}" r="3.7" fill="currentColor"/>`)+termText(575,y,label,11.5)+termText(817,y,value,12,{anchor:'end'})+termValue(863,y,change,12,'end');if(i<4)body+=termLine(567,y+9,862,y+9);});
 body+=termGrid(566,450,266,139,['100%','80%','60%','40%','20%','0%'])+termBarSet('dominance')+termDates([586,640,694,748,802],606,['24.Aug','25.Aug','26.Aug','27.Aug','28.Aug']);
 return termCard('crypto-dominance',558,266,314,350,'24h Dominance',body);
}
function termMarketCap(){
 const body=termLegend(891,310,['Factory1','Factory2','Factory3','Factory4'],71)+termGrid(885,327,262,167,['2.85T','2.80T','2.75T','2.70T','2.65T','2.65T','2.60T'])+termBarSet('cap')+termDates([910,963,1017,1070,1123],511,['25.Aug','26.Aug','27.Aug','28.Aug','29.Aug']);
 const season=termCat(1,'#FFAA00','Bitcoin',termRect(885,587,146,4,'currentColor')+termText(885,606,'Bitcoin',12,{fill:'currentColor'}))+termCat(0,'#265FFC','Altcoin',termRect(1031,587,149,4,'currentColor')+termText(1180,606,'Altcoin',12,{fill:'currentColor',anchor:'end'}))+termText(1033,576,'43',12,{anchor:'middle'})+`<path d="m1026 578 7 6 7-6Z" fill="var(--term-text)"/>`;
 return termCard('crypto-market-cap',878,266,310,255,'24h Crypto Market Cap',body)+termCard('altcoin-season',878,528,310,88,'Altcoin Season Index',season);
}
function termEtfFlow(){
 let body='';
 ['All','BTC','ETH','XRP','SOL'].forEach((name,i)=>body+=termButton(1202+i*61,297,56,23,name,{active:!i,control:name,group:'etf-asset'}));
 ['1M','3M','1Y','YTD','3Y'].forEach((name,i)=>body+=termButton(1202+i*60.5,328,60,22,name,{active:!i,control:name,group:'etf-period'}));
 body+=termRect(1202,328,301,22,'none',3,'stroke="var(--term-border)"')+termLegend(1207,370,['Factory1','Factory2','Factory3','Factory4'],70,11.5)+termLegend(1207,388,[{name:'Factory5',index:4,base:termSeriesColors[4]},{name:'legend',index:5,base:termSeriesColors[5]},{name:'legend',index:6,base:termSeriesColors[6]}],70,11.5);
 // The slices are shares of the ring, so they still close after dropping to seven items.
 const colors=['#4C7BFF','#FF8759','#EF60AB','#57D4C0','#A783EF','#E5B045','#ABC53B'],amounts=[25,17.3,15.3,8.8,12,8.6,7.5],total=amounts.reduce((sum,value)=>sum+value);let angle=-Math.PI/2;
 amounts.forEach((value,i)=>{const end=angle+value/total*Math.PI*2;body+=termCat(termSeriesSlots[i],colors[i],`Factory${i+1}`,`<path d="${termArc(1351,500,77,47,angle,end)}" fill="currentColor" stroke="var(--term-bg)" stroke-width=".6" data-terminal-area/>`);angle=end;});
 body+=termText(1351,495,'Total',12,{fill:'var(--term-muted)',anchor:'middle'})+termText(1351,515,'155.25M',16,{bold:true,anchor:'middle'});
 return termCard('crypto-etf-flow',1194,266,318,350,'Crypto ETF Fund Flow',body);
}
function termYield(){
 const body=termLegend(251,665,['Factory1','Factory2',{name:'Factory3',index:0,role:'line',base:'#E57E17'}],71)+termGrid(246,683,272,117,['6.0%','5.5%','5.0%','4.5%','4.0%','3.5%','3.0%','2.5%'])+termBarSet('yield')+termTraceSet('yield')+[ [285,760],[336,724],[386,793],[438,726],[489,688] ].map(([x,y])=>termComboLine('#E57E17','Factory3',`<circle cx="${x}" cy="${y}" r="3.8" fill="currentColor"/>`)).join('')+termDates([272,325,377,430,483],817,['1M','3M','6M','1Y','2Y']);
 return termCard('global-yield-curves',238,623,321,205,'Global yield curves',body);
}
function termBondsTable(){
 let body='';
 const rows=[['USA','US10Y','USA','5.000%','0.00%'],['GB10Y','GB10Y','United Kingdom','5.357%','-0.24%'],['DE10Y','DE10Y','Germany','3.369%','+0.77%'],['FR10Y','FR10Y','France','4.983%','-0.89%'],['CN10Y','CN10Y','Mainland','1.638%','-0.15%'],['JP10Y','JP10Y','Japan','2.807%','+0.29%']];
 rows.forEach(([asset,ticker,name,yieldValue,change],i)=>{const y=667+i*28;body+=termAsset(asset,576,y-10,18,20)+termRect(596,y-8,36,15,'var(--term-soft)',2)+termText(598,y+3,ticker,9)+termText(637,y+4,name,12)+termText(805,y+4,yieldValue,12,{anchor:'end'});body+=i?termValue(860,y+4,change,12,'end'):termText(860,y+4,change,12,{anchor:'end'});if(i<5)body+=termLine(576,y+12,864,y+12);});
 return termCard('major-bonds-table',566,623,306,205,'Major 10-year bonds ›',body);
}
function termInterestRates(){
 let body='';
 [['USA',0,'#265FFC',887],['United Kingdom',1,'#38D1FF',942],['Germany',2,'#F564B9',1063],['France',3,'#733ED6',1145],['Italy',4,'#00CCC3',1214]].forEach(([name,index,base,x])=>{body+=termCat(index,base,name,`<rect x="${x}" y="655" width="11" height="11" rx="1" fill="currentColor"/><path d="m${x+2} 660 2 2 5-5" stroke="#fff" stroke-width="1.1" fill="none"/>`)+termText(x+17,665,name,12);});
 body+=termGrid(891,683,596,117,['6','5','4','3','2','1','0'])+termTraceSet('rates')+termDates([893,973,1053,1133,1213,1293,1373,1453],817,['1M','3M','6M','1Y','2Y','3Y','5Y','7Y']);
 return termCard('key-interest-rates',878,623,634,205,'Key interest rates ›',body);
}
export const terminalStockRows=[
 ['TSLA','Tesla','362.44','-1.29%','26.48M','0.67%','1.43T','335.59','1.08','0.00%','Auto Manufacturers',false],
 ['AAPL','Apple','342.00','-0.28%','39.61M','0.27%','4.99T','39.22','8.72','0.31%','Consumer Electronics',false],
 ['MSFT','Microsoft','539.44','+1.08%','23.48M','0.32%','4.01T','30.05','17.95','0.67%','Software - Infrastructure',false],
 ['NVDA','NVIDIA','217.23','-1.84%','126.40M','0.52%','5.25T','27.46','7.91','0.13%','Semiconductors',false],
 ['AMZN','Amazon.com','254.76','+0.27%','34.05M','0.32%','2.75T','20.50','12.43','0.00%','Internet Retail',true],
 ['GOOGL','Alphabet','349.22','+0.45%','20.89M','0.36%','4.27T','17.52','19.93','0.24%','Internet Content & Info.',true],
 ['META','Meta Platforms','736.72','-0.11%','16.41M','0.74%','1.88T','27.76','26.54','0.29%','Internet Content & Info.',false],
 ['AVGO','Broadcom','344.33','-0.55%','28.20M','0.59%','1.64T','45.37','7.59','0.76%','Semiconductors',true],
 ['AMD','Advanced Micro Devices','562.23','-1.50%','28.53M','1.75%','917.83B','143.43','3.92','0.00%','Semiconductors',true],
 ['INTC','Intel','95.37','-2.80%','146.12M','2.76%','504.14B','-2.12','','0.00%','Semiconductors',true],
 ['CSCO','Cisco Systems','109.85','-3.34%','20.83M','0.53%','433.09B','32.99','3.33','1.51%','Communication Equipment',false],
 ['ORCL','Oracle','134.47','+3.00%','30.12M','0.99%','407.65B','21.08','6.38','1.49%','Software - Infrastructure',false]
];
function termStar(x,y,filled){
 const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?3.1:7;return [x+r*Math.cos(a),y+r*Math.sin(a)].join(' ');});
 return `<path d="M${points.join('L')}Z" fill="${filled?'#FFAA00':'none'}" stroke="${filled?'#FFAA00':'var(--term-muted)'}" stroke-width="1.1"/>`;
}
function termStockTable(){
 let out='';
 const tabs=[['Stock Movers',238],['Key Metrics',329],['Extended',411],['Technicals',480],['Financials',554],['Region',624],['Sectors, Industries and Themes',679],['Magic Signal',868],['Trend Sight',979]];
 tabs.forEach(([name,x],i)=>out+=`<g class="terminal-market-tab ${i===1?'is-active':''}" data-terminal-control="${name}" data-terminal-group="metrics" role="button" tabindex="0">${termText(x,856,name,12)}${i===1?termLine(x,864,x+65,864,'var(--term-text)',2):''}</g>`);
 out+=termRect(941,846,23,11,'#3B73FF',2)+termText(952.5,854,'PRO',8,{fill:'#fff',anchor:'middle'})+termRect(1045,846,23,11,'#3B73FF',2)+termText(1056.5,854,'PRO',8,{fill:'#fff',anchor:'middle'});
 const filters=[['All Stocks',70],['Trending Tickers',106],['Top Gainers',83],['Top Losers',75],['Most Active',82],['Mega Companies',114],['Small Cap',69],['High Turnover Rate',123],['Most Volatile',91],['Best Performing',109],['YTD Gainers',83],['YTD Losers',79],['Gap Up',58],['More⌄',59]];let x=238;
 for(const [label,width] of filters){out+=termButton(x,873,width,23,label,{active:label==='All Stocks',black:true,control:label,group:'stock-filter'});x+=width+4;}
 out+=termRect(238,908,1274,415,'var(--term-panel)',6,'stroke="var(--term-border)"');x=247;
 for(const [label,width] of [['Overview',83],['Price',58],['Volume',73],['Market cap',93],['Category',84]]){out+=termRect(x,916,width,23,'var(--term-bg)',3,'stroke="var(--term-border)"')+termText(x+8,932,label,12)+termIcon('down',x+width-17,923,11);x+=width+5;}
 const headers=[[276,'Symbol · Oct 15, 2026'],[583,'Last (USD)'],[672,'Change %'],[760,'Volume'],[849,'Turnover'],[939,'Turnover %'],[1028,'Market Cap'],[1117,'P/E (TTM)'],[1206,'EPS (TTM)'],[1312,'Div Yield % (TTM)'],[1335,'Industry']];
 for(const [px,label] of headers)out+=termText(px,964,label,11,{fill:'var(--term-muted)',anchor:px>276&&px<1335?'end':undefined});
 out+=`<defs><clipPath id="terminal-stocks-clip"><rect x="239" y="972" width="1272" height="315"/></clipPath></defs><g clip-path="url(#terminal-stocks-clip)">`;
 terminalStockRows.forEach((row,i)=>{const [symbol,name,price,change,volume,turnover,cap,pe,eps,dividend,industry,star]=row,y=986+i*27.5;out+=`<g data-terminal-stock="${symbol}" data-terminal-name="${termE(name)}" data-terminal-change="${Number.parseFloat(change)}">`;if(i%2)out+=termRect(240,y-14,1270,27.5,'var(--term-row)');out+=termLine(239,y-14,1511,y-14)+termStar(258,y,star)+termAsset('stock-'+symbol,275,y-10,20,20)+`<text x="300" y="${y+4}" font-size="12" fill="var(--term-text)">${termE(symbol)}<tspan dx="7" fill="var(--term-muted)">${termE(name)}</tspan></text>`+termText(583,y+4,price,12,{anchor:'end'})+termValue(672,y+4,change,12,'end')+termText(760,y+4,volume,12,{anchor:'end'})+termText(849,y+4,'—',12,{fill:'var(--term-muted)',anchor:'end'})+termText(939,y+4,turnover,12,{anchor:'end'})+termText(1028,y+4,cap,12,{anchor:'end'})+termText(1117,y+4,pe,12,{anchor:'end'})+termText(1206,y+4,eps,12,{anchor:'end'})+termText(1312,y+4,dividend,12,{anchor:'end'})+`<text x="1335" y="${y+4}" font-size="12" fill="var(--term-text)">${termE(industry)}<tspan dx="5" font-size="17">›</tspan></text>`+'</g>';});
 out+='</g>'+termRect(240,1287,1270,35,'var(--term-panel)')+termLine(239,1287,1511,1287);
 ['‹','1','2','3','4','5','…','88','988','›'].forEach((label,i)=>out+=termButton(250+i*29.2,1293,23,23,label,{active:i===1,black:true,control:label,group:'stock-page'}));
 return `<g data-terminal-stock-table="true">${out}</g>`;
}
function termContent(){
 let tabs='';const items=[['Stocks',238],['Crypto',304],['ETFs',370],['Options',421],['Bonds',493],['Government Bonds',552],['Economy',699],['Prediction',782]];
 for(const [label,x] of items)tabs+=termText(x,69,label,14,{bold:label==='Stocks',fill:label==='Stocks'?'var(--term-text)':'var(--term-muted)'});
 return tabs+termMarketTrackers()+termAdvancers()+termHeatmap()+termBondsPlot()+termFear()+termDominance()+termMarketCap()+termEtfFlow()+termYield()+termBondsTable()+termInterestRates()+termStockTable();
}
export function renderTerminalScene(){
 return `<div class="terminal-scene" role="group" aria-label="Terminal · Stocks，按 Stocks.png 还原"><svg class="terminal-shell" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1856 1335" aria-label="Terminal 顶部导航、工具导航与 Watchlist">${termHeader()}</svg><main class="terminal-content-frame" tabindex="0" aria-label="Terminal Stocks 内容区"><svg class="terminal-content" xmlns="http://www.w3.org/2000/svg" viewBox="222 42 1306 1293" aria-label="Stocks 市场数据与股票列表"><defs><pattern id="terminal-texture" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M-2 2 2-2M0 8 8 0M6 10 10 6" stroke="#fff" stroke-width="1" opacity=".65"/></pattern></defs>${termContent()}</svg></main><svg class="terminal-userbar" xmlns="http://www.w3.org/2000/svg" viewBox="0 1229 222 106" aria-label="Rewards 与账户">${termUserBar()}</svg></div>`;
}
export function terminalPaletteStyle(palette,theme){
 const colors=palette.themes[theme],original=presets[0].themes[theme],dark=theme==='dark';
 const reference=dark?['#141414','#171717','#FFFFFF','#A2A2A2','#303030','#242424']:['#FFFFFF','#FFFFFF','#202020','#858585','#E5E5E5','#F2F2F2'];
 const value=i=>colors.surface[i].hex.toUpperCase()===original.surface[i].hex.toUpperCase()?reference[i]:colors.surface[i].hex;
 return {'--term-page':value(0),'--term-bg':value(1),'--term-panel':value(0),'--term-text':value(2),'--term-muted':value(3),'--term-border':value(4),'--term-grid':value(5),'--term-soft':dark?'#434343':'#F2F2F2','--term-row':dark?'#1A1A1A':'#F8F8F8','--term-tracker-row':dark?'#292929':'#F2F2F2','--term-rewards':dark?'#292929':'#F2F2F2','--term-search-bg':dark?'#1F1F1F':'#E7E7E7','--term-search-text':dark?'#E2E2E2':'#202020','--term-search-placeholder':dark?'#A5A5A5':'#757575','--term-gauge-track':dark?'#292929':'#F2F2F2','--term-gauge-inner':dark?'#292929':'transparent','--term-gauge-center':dark?'#383838':'transparent','--term-selected':dark?'#FFFFFF':'#000000','--term-selected-text':dark?'#141414':'#FFFFFF'};
}
export function applyTerminalPalette(element,palette,theme,globalStyle={}){
 const page=element.querySelector('.terminal-scene');
 for(const [name,value] of Object.entries(terminalPaletteStyle(palette,theme))){element.style.setProperty(name,value);page?.style.setProperty(name,value);}
 const original=presets[0].themes[theme],colors=palette.themes[theme],reference=theme==='dark'?terminalDarkReference:terminalReference;
 for(const asset of element.querySelectorAll('[data-terminal-asset]'))asset.setAttribute('href',reference.assets[asset.dataset.terminalAsset]);
 for(const trace of element.querySelectorAll('[data-terminal-trace]')){
  const [id,index]=trace.dataset.terminalTrace.split(':');
  const geometry=id==='yield'?terminalReference:reference;
  const points=geometry.lines[id][index].points;
  trace.setAttribute('d','M'+(id==='bonds'?termBondsPoints(points):points).map(p=>p.join(' ')).join('L'));
 }
 for(const area of element.querySelectorAll('[data-terminal-area-trace]')){
  const [id,index]=area.dataset.terminalAreaTrace.split(':'),points=termBondsPoints(reference.lines[id][index].points),base=area.dataset.terminalBaseline;
  area.setAttribute('d','M'+points.map(p=>p.join(' ')).join('L')+`L${points.at(-1)[0]} ${base}L${points[0][0]} ${base}Z`);
 }
 for(const mark of element.querySelectorAll('[data-terminal-base]')){
  const role=mark.dataset.colorRole,slot=Number(mark.dataset.terminalSlot??mark.dataset.colorIndex),index=slot%colors[role].length,color=colors[role][index];
  mark.dataset.colorIndex=String(index);
  const gauge=mark.querySelector?.('[data-terminal-gauge]');
  if(gauge){mark.style.color=rampColor(colors.semantic[1].hex,colors.neutral[0].hex,colors.semantic[0].hex,Number(gauge.dataset.terminalGauge));continue;}
  // Series and legends always use the exact active palette value, including the baseline.
  // Other semantic marks keep their reference shades until the semantic role is edited.
  mark.style.color=role==='semantic'&&color.hex.toUpperCase()===original[role][index]?.hex.toUpperCase()?mark.dataset.terminalBase:color.hex;
 }
 for(const line of element.querySelectorAll('[data-terminal-line]'))line.setAttribute('stroke-width',typeof globalStyle.lineWidth==='number'?globalStyle.lineWidth:line.dataset.terminalWidth);
 for(const overlay of element.querySelectorAll('.terminal-texture-overlay'))overlay.remove();
 const texture=globalStyle.texture;
 if(['stripes','cross','dots'].includes(texture)){
  const pattern=element.querySelector('#terminal-texture');
  pattern.innerHTML=texture==='dots'?'<circle cx="2" cy="2" r="1" fill="#fff" opacity=".7"/>':`<path d="M-2 2 2-2M0 8 8 0M6 10 10 6${texture==='cross'?'M-2 6 2 10M0 0 8 8M6-2 10 2':''}" stroke="#fff" stroke-width="1" opacity=".65"/>`;
  for(const area of element.querySelectorAll('[data-terminal-area]')){const copy=area.cloneNode(false);copy.removeAttribute('data-terminal-area');copy.setAttribute('class','terminal-texture-overlay');copy.setAttribute('fill','url(#terminal-texture)');copy.setAttribute('stroke','none');copy.setAttribute('pointer-events','none');area.after(copy);}
 }
 if(!page||page.dataset.bound)return;page.dataset.bound='true';
 const filterRows=()=>{
  const query=(page.querySelector('[data-terminal-search]')?.value||'').trim().toLowerCase(),filter=page.querySelector('[data-terminal-group="stock-filter"].is-active')?.dataset.terminalControl;
  let visible=0;
  for(const row of page.querySelectorAll('[data-terminal-stock]')){const change=Number(row.dataset.terminalChange),show=(!query||`${row.dataset.terminalStock} ${row.dataset.terminalName}`.toLowerCase().includes(query))&&(filter!=='Top Gainers'||change>0)&&(filter!=='Top Losers'||change<0);row.style.display=show?'':'none';row.setAttribute('transform',show?`translate(0 ${(visible++-terminalStockRows.findIndex(r=>r[0]===row.dataset.terminalStock))*27.5})`:'');}
 };
 page.querySelector('[data-terminal-search]')?.addEventListener('input',filterRows);
 page.addEventListener('click',event=>{
  const control=event.target.closest('[data-terminal-control]');if(!control)return;
  const group=control.dataset.terminalGroup;
  if(group==='tasks'){const text=control.querySelector('text'),added=text.textContent==='Added';text.textContent=added?'Add':'Added';control.setAttribute('aria-pressed',String(!added));return;}
  for(const other of page.querySelectorAll(`[data-terminal-group="${group}"]`)){other.classList.toggle('is-active',other===control);other.setAttribute('aria-pressed',String(other===control));}
  if(group==='stock-filter')filterRows();
 });
 page.addEventListener('keydown',event=>{const button=event.target.closest('[data-terminal-control]');if(button&&['Enter',' '].includes(event.key)){event.preventDefault();button.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
}

export {termText,termLine,termRect,termIcon,termArc,termMark,termButton};
