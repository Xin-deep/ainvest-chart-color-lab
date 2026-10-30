import { financialChartModules } from '../data/financial-shared.js';
// Reference: 财报分析.png, 1919 × 1857. Logical drawing coordinates are 1600 × 1548.
// Chart marks are vector elements bound to palette roles; the reference is not a background image.
import { financialDividendYieldTrace, payoutIncomeBars, payoutCashBars, payoutRatioPoints } from '../data/financial-reference.js';
export const FINANCIAL_SIZE = { width: 1600, height: 1548 };
const financialEscape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reportText = (x, y, value, size = 7, options = {}) => `<text x="${x}" y="${y}" font-size="${size}" fill="${options.fill || 'var(--report-text)'}" ${options.bold ? 'font-weight="600"' : ''} ${options.anchor ? `text-anchor="${options.anchor}"` : ''}>${financialEscape(value)}</text>`;
const reportLine = (x1, y1, x2, y2, color = 'var(--report-grid)', width = .5, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const reportRect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const reportColor = (role, i) => `var(--viz-${role}-${i})`;
const reportMark = (role, index, label, content) => `<g class="report-color-mark" data-color-role="${role}" data-color-index="${index}" tabindex="0" role="button" aria-label="${financialEscape(label)}，编辑对应颜色" style="color:${reportColor(role, index)}"><title>${financialEscape(label)}</title>${content}</g>`;
const reportChart = (id, label, content) => `<g data-chart="${id}" role="group" aria-label="${label}">${content}</g>`;
const reportSubhead = (x, y, text) => reportText(x, y, text, 7.1, { bold: true });
const reportMuted = (x, y, text, size = 5, anchor) => reportText(x, y, text, size, { fill: 'var(--report-muted)', anchor });
const reportPath = (d, stroke, width = .8, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;

function reportLegend(x, y, items, size = 4.6) {
  let out = '';
  for (const item of items) {
    out += reportMark(item.role, item.index, item.label, `<circle cx="${x + 1.4}" cy="${y - size * .35}" r="${size >= 6 ? 2.5 : 2}" fill="currentColor"/>`) + reportMuted(x + 5, y, item.label, size);
    x += item.space || item.label.length * size * .52 + 13;
  }
  return out;
}
function reportHandle(x, y, r = 6.2) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--report-bg)" stroke="var(--report-divider)" stroke-width=".6"/>${[-2,0,2].map(a => reportLine(x + a, y - 2.5, x + a, y + 2.5, 'var(--report-muted)', .55)).join('')}`;
}
function reportRange(x1, x2, y, selection1, selection2) {
  return reportLine(x1, y, x2, y, 'var(--report-grid)', 1) + reportLine(selection1, y, selection2, y, 'var(--report-muted)', 1.2) + reportHandle(selection1, y) + reportHandle(selection2, y);
}
function reportWatermark(x, y) {
  return `<g opacity=".12">${reportPath(`M${x} ${y}l13-13v10l5-15v18`, 'var(--report-muted)', 1)}${reportText(x + 15, y - .7, 'AINVEST', 8, { fill: 'var(--report-muted)' })}</g>`;
}
function reportApple(x, y, scale = 1, fill = 'var(--report-text)') {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M6.7 3.9C7.2 2.6 8.2 2.3 8.3.8 7.1.8 5.7 1.7 5.6 3.2 4.1 2.6 3.2 3.6 2.1 3.3-.5 4.6.8 8.6 2.5 10.2c1 .8 1.5-.4 2.5-.4s1.7 1 2.5.2c.8-.7 1.4-1.7 1.7-2.6-2-.9-2.2-3.2-.4-4.1-.8-.8-1.4-.9-2.1.6z" fill="${fill}"/></g>`;
}
function reportSankey() {
  let out = '';
  // Ribbons use the reference's translucent fills, with opaque palette-colored nodes.
  const ribbon=(role,index,d,opacity=.23)=>reportMark(role,index,'Revenue & Expenses 流向',`<path d="${d}" fill="currentColor" fill-opacity="${opacity}"/>`);
  const inputs=[{y:354,h:23.5,end:379.2,label:'iPhone',value:'54.25B'},{y:390.3,h:13.2,end:403,label:'Services',value:'30.74B'},{y:415.7,h:5.4,end:416.2,label:'Mac',value:'10.35B'},{y:433.1,h:3.7,end:421.6,label:'Other Products',value:'7.88B'},{y:449.3,h:2.9,end:425.3,label:'iPad',value:'6.19B'}];
  for (const item of inputs) {
    const endH=item.h*.98;
    out += ribbon('categorical',0,`M68 ${item.y} C135 ${item.y} 148 ${item.end} 215 ${item.end} L215 ${item.end+endH} C148 ${item.end+endH} 135 ${item.y+item.h} 68 ${item.y+item.h} Z`);
    out += reportMark('categorical',0,`${item.label} ${item.value}`,reportRect(63,item.y,5,item.h,'currentColor') + reportText(61,item.y+item.h/2-.7,item.label,5.1,{anchor:'end'}) + reportText(61,item.y+item.h/2+6,item.value,5.7,{anchor:'end',fill:'currentColor'}));
  }
  out += reportMark('categorical',0,'AAPL Revenue 109.42B',reportRect(215,379.2,10,47.8,'currentColor'));
  out += reportRect(216,353.8,8,8,'var(--report-text)')+reportApple(217,354.3,.68,'var(--report-bg)')+reportText(220,369.1,'2026 Q3',5.4,{anchor:'middle'})+reportText(216,376,'Revenue',5.4,{anchor:'end'})+reportText(222,376,'109.42B',5.5,{fill:reportColor('categorical',0)});
  out += ribbon('semantic',0,'M225 379.2 C284 379.2 313 366.8 372 366.8 L372 391 C313 391 284 403.2 225 403.2 Z',.19);
  out += ribbon('semantic',1,'M225 403.2 C285 403.2 312 415.9 372 415.9 L372 439.7 C312 439.7 285 427 225 427 Z',.20);
  out += ribbon('semantic',0,'M377 366.8 C435 366.8 466 375.2 524 375.2 L524 390.1 C466 390.1 435 381.7 377 381.7 Z',.19);
  out += ribbon('semantic',1,'M377 381.7 C435 381.7 466 422.5 524 422.5 L524 431.8 C466 431.8 435 391 377 391 Z',.20);
  out += ribbon('semantic',0,'M529 375.2 C587 375.2 620 358.4 678 358.4 L678 371.2 C620 371.2 587 388 529 388 Z',.19);
  out += ribbon('semantic',1,'M529 388 C587 388 620 403.9 678 403.9 L678 407 C620 407 587 390.1 529 390.1 Z',.20);
  out += ribbon('semantic',1,'M529 422.5 C587 422.5 620 422.5 678 422.5 L678 426.2 C620 426.2 587 426.2 529 426.2 Z',.20);
  out += ribbon('semantic',1,'M529 426.2 C587 426.2 620 444.6 678 444.6 L678 450.2 C620 450.2 587 431.8 529 431.8 Z',.20);
  const node=(x,y,h,role,index,label,value)=>reportMark(role,index,`${label} ${value}`,reportRect(x,y,5,h,'currentColor')+reportText(x+7,y+h/2-.2,label,5.15)+reportText(x+7,y+h/2+6.5,value,5.6,{fill:'currentColor'}));
  out += node(372,366.8,24.2,'semantic',0,'Gross profit','54.77B') + node(372,415.9,23.8,'semantic',1,'Cost of reven...','54.65B');
  out += node(524,375.2,14.9,'semantic',0,'Operating pro...','35.70B') + node(524,422.5,9.3,'semantic',1,'Operating ex...','19.08B');
  out += node(678,358.4,12.8,'semantic',0,'Net profit','29.79B') + node(678,403.9,3.1,'semantic',1,'Tax','6.48B') + node(678,422.5,3.7,'semantic',1,'SG&A','7.35B') + node(678,444.6,5.6,'semantic',1,'R&D','11.73B');
  out += ribbon('semantic',1,'M681 371.2 C680 378 678 385 681 385 L681 385.6 C677 385.6 679 378 680.6 371.2 Z',.15)+reportText(685,386,'Other items',4.8)+reportText(685,392.5,'−572.00M',5.3);
  out += reportLine(27,473.3,715,473.3,'var(--report-soft)',3);
  const quarters=['2024 Q1','2024 Q2','2024 Q3','2024 Q4','2025 Q1','2025 Q2','2025 Q3','2025 Q4','2026 Q1','2026 Q2','2026 Q3'];
  quarters.forEach((q,i)=>{const x=31+i*68.4;out+=reportLine(x,474,x,476,'var(--report-muted)',.4)+reportMuted(x,482,q,3.9,'middle');});
  out += reportHandle(715,473.3,5.5) + `<circle cx="27.6" cy="491.6" r="5.5" fill="#FF2548"/><path d="m26.5 488.8 3.8 2.7-3.8 2.7z" fill="#fff"/>`;
  out += reportRect(660,487,29,10,'var(--report-soft)',1)+reportText(663,493.7,'◀Previous',4.4)+reportRect(692,487,27,10,'var(--report-soft)',1)+reportMuted(697,493.7,'Next  ▸',4.5);
  return reportChart('revenue-sankey','Revenue & Expenses：收入、成本与利润桑基图',out);
}
function reportBalance(part) {
  let out='<g transform="translate(198 -145) scale(1.48)">';
  const left=35.5,right=338,top=643.6,bottom=716.5;
  for(let i=0;i<5;i++){const y=top+i*(bottom-top)/4;out+=reportLine(left,y,right,y)+reportMuted(32,y+1.5,['480.00B','360.00B','240.00B','120.00B','0'][i],4.3,'end')+reportMuted(342,y+1.5,['100.00%','75.00%','50.00%','25.00%','0.00%'][i],4.2);}
  out+=reportLine(left,bottom,right,bottom,'var(--report-axis)',.65);
  const assets=[366.98,344.08,331.23,331.49,359.24,367.04,359.21,383.28],liabilities=[308.03,284.63,279.41,279.17,300.19,305.36,278.82,275.75],ratio=[84.40,80.60,79.83,80.14,79.48,76.75,71.90,72.65];
  const ratios=[];
  for(let i=0;i<8;i++){
    const x=51+i*36.2;
    out+=reportMark('categorical',0,`Assets ${assets[i]}B`,reportRect(x,bottom-assets[i]/480*(bottom-top),12.3,assets[i]/480*(bottom-top),'currentColor'));
    out+=reportMark('categorical',1,`Liabilities ${liabilities[i]}B`,reportRect(x+12.3,bottom-liabilities[i]/480*(bottom-top),11.5,liabilities[i]/480*(bottom-top),'currentColor'));
    const px=x+12,py=bottom-ratio[i]/100*(bottom-top);ratios.push([px,py]);
    out+=reportText(px,py-5,ratio[i].toFixed(2)+'%',4.7,{fill:reportColor('categorical',6),anchor:'middle'}).replace('<text ',`<text data-percent-index="${i}" data-percent-y="${py-5}" `);
    out+=`<text x="${x+12}" y="726" font-size="4.5" fill="var(--report-muted)" text-anchor="middle"><tspan x="${x+12}">${['Q4','Q1','Q2','Q3','Q4','Q1','Q2','Q3'][i]}</tspan><tspan x="${x+12}" dy="8">${i===0?'2024':i<5?'2025':'2026'}</tspan></text>`;
  }
  out+=reportMark('categorical',6,'Debt Ratio',reportPath('M'+ratios.map(p=>p.join(' ')).join('L'),'currentColor',.9)+ratios.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor"/>`).join(''));
  out+=reportWatermark(38,714)+reportRange(36,332,747.5,316,331);
  const trend=out+'</g>';
  out='<g transform="translate(201 -141) scale(1.48)">';
  const btm=705.3,ytop=612.8;
  const bars=[{x:389.5,w:102.5,y:ytop,h:92.5,v:'383.27B',p:'15.62%',label:'Assets',a:1},{x:504,w:102,y:ytop,h:66.5,v:'275.75B',p:'3.79%',label:'Liabilities',a:.22},{x:618,w:102,y:679.3,h:26,v:'107.52B',p:'63.33%',label:'Equity',a:1}];
  bars.forEach((b,i)=>{
    out+=reportMark('categorical',0,`${b.label} ${b.v}`,reportRect(b.x,b.y,b.w,b.h,'currentColor',0,`fill-opacity="${b.a}"`));
    out+=reportText(b.x+b.w/2,b.y-6.5,b.v,4.8,{anchor:'middle',bold:true}).replace('<text ',`<text data-badge-value="${b.y}" `);
    out+=reportRect(b.x+b.w/2-7,b.y-6,14,5.1,reportColor('semantic',0),.8,`data-badge-x="${b.x+b.w/2}" data-badge-y="${b.y}"`)+reportText(b.x+b.w/2,b.y-2,b.p,3.8,{fill:'#FFFFFF',anchor:'middle'}).replace('<text ',`<text data-badge-text="${b.y}" `);
    out+=reportMuted(b.x+b.w/2,713,b.label,4.3,'middle');
    if(i<2)out+=reportLine(b.x+b.w,b.y+b.h*(i===0?0:1),bars[i+1].x,b.y+b.h*(i===0?0:1),'var(--report-divider)',.55,'stroke-dasharray="1.5 1.5"');
  });
  out+=reportLine(384,btm,726,btm,'var(--report-axis)',.5)+reportMuted(498,713,'−',4,'middle')+reportMuted(612,713,'=',4,'middle');
  return reportChart(part==='trend'?'balance-trend':'balance-breakdown',part==='trend'?'资产负债趋势与负债率':'资产负债瀑布图',part==='trend'?trend:out+'</g>');
}
function reportDonutSegment(cx,cy,outer,inner,start,end) {
  const point=(radius,a)=>[cx+radius*Math.cos(a),cy+radius*Math.sin(a)];
  const a=point(outer,start),b=point(outer,end),c=point(inner,end),d=point(inner,start),large=end-start>Math.PI?1:0;
  return `M${a}A${outer},${outer} 0 ${large} 1 ${b}L${c}A${inner},${inner} 0 ${large} 0 ${d}Z`;
}
function reportDividend(part) {
  let out='';
  const left=35.5,right=338,top=1044.7,bottom=1117;
  for(let i=0;i<5;i++){const y=top+i*(bottom-top)/4;out+=reportLine(left,y,right,y)+reportMuted(31.5,y+1.4,['28.00%','21.00%','14.00%','7.00%','0.00%'][i],4.3,'end')+reportMuted(342,y+1.4,['140.00B','105.00B','70.00B','35.00B','0'][i],4.2);}
  out+=reportLine(left,bottom,right,bottom,'var(--report-axis)',.65);
  payoutIncomeBars.forEach((bar,i)=>{
    const cash=payoutCashBars[i];
    out+=reportMark('categorical',0,`Net Income Attributable to Parent ${2018+i}`,reportRect(bar.x,bar.y,bar.width,bar.height,'currentColor'));
    out+=reportMark('categorical',1,`Total Cash Dividends ${2018+i}`,reportRect(cash.x,cash.y,cash.width,cash.height,'currentColor'));
    out+=reportMuted(payoutRatioPoints[i][0],1127.4,String(2018+i),4.5,'middle');
  });
  out+=reportMark('categorical',6,'Payout Ratio',reportPath('M'+payoutRatioPoints.map(v=>v.join(' ')).join('L'),'currentColor',1)+payoutRatioPoints.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.5" fill="currentColor"/>`).join(''));
  payoutRatioPoints.forEach(([x,y],i)=>{out+=reportText(x,y-4.8,['22.75%','25.21%','24.13%','15.03%','14.65%','15.58%','16.63%','13.44%'][i],4.4,{fill:reportColor('categorical',6),anchor:'middle'});});
  out+=reportWatermark(38,1115)+reportRange(36,332,1138.5,176,332);
  const payout=out;out='';
  const rx=384,rw=342;
  for(let i=0;i<5;i++){const y=top+i*(bottom-top)/4;out+=reportLine(rx,y,rx+rw,y)+reportMuted(729,y+1.3,['0.56%','0.42%','0.28%','0.14%','0.00%'][i],4.3);}
  out+=reportLine(rx,bottom,rx+rw,bottom,'var(--report-axis)',.65);
  out+=reportMark('categorical',6,'Dividend Yield',reportPath('M'+financialDividendYieldTrace.map(([x,y])=>[(x-198)/1.48,(y+175)/1.48].join(' ')).join('L'),'currentColor',.85))+reportWatermark(405,1115);
  out+=reportMuted(384,1127.4,'Apr 11, 2026',4.5)+reportMuted(555,1127.4,'Jul 18, 2026',4.5,'middle')+reportMuted(717,1127.4,'Oct 28, 2026',4.5,'end')+reportRange(384,704,1138.5,647,704);
  return reportChart(part==='payout'?'dividend-payout':'dividend-yield',part==='payout'?'派息率、净利润与现金股息':'股息收益率',part==='payout'?payout:out);
}

export function financialPaletteStyle(palette, theme) {
  const colors=palette.themes[theme], vars={};
  for(const [role,list] of Object.entries(colors)) list.forEach((color,i)=>{vars[`--viz-${role}-${i}`]=color.hex;});
  const fallback=colors.categorical[0].hex;
  // Missing slots are neutral and visibly marked by the workbench rather than silently cycled.
  for(let i=0;i<7;i++) if(!vars[`--viz-categorical-${i}`]) vars[`--viz-categorical-${i}`]=colors.surface[3].hex;
  const [page,card,text,muted,divider,grid]=colors.surface.map(c=>c.hex);
  Object.assign(vars,{'--report-bg':card,'--report-page':page,'--report-text':text,'--report-muted':muted,'--report-divider':divider,'--report-grid':grid,'--report-axis':theme==='light'?'#A0A0A0':'#72727C','--report-soft':theme==='light'?'#F2F2F2':'#29292F','--report-primary':fallback,'--report-search':theme==='light'?'#E5E5E5':'#303037'});
  return vars;
}
export function applyFinancialPalette(element,palette,theme) {
  for(const [name,value] of Object.entries(financialPaletteStyle(palette,theme))) element.style.setProperty(name,value);
  initializeFinancialTypography(element);
}

const reportCard = (x,y,w,h) => reportRect(x,y,w,h,'var(--report-bg)',8,'stroke="var(--report-divider)" stroke-width="1"');
function productIcon(name,x,y,size=16,color='var(--report-text)') {
  const paths={
    edit:'M12 4H5a2 2 0 0 0-2 2v13h13a2 2 0 0 0 2-2v-7M10 14l1-4L19 2l3 3-8 8z',
    book:'M12 5 4 2 2 3v15l10 4 10-4V3l-2-1zM12 5v17',
    clock:'M12 7v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    search:'M15 15l6 6M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    history:'M3 4h18M3 10h8M3 16h5M21 16a5 5 0 1 1-10 0 5 5 0 0 1 10 0M16 13v4l2 1',
    money:'M12 6v12M15 8h-5a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    signal:'M4 18a9 9 0 1 1 15-1M5 10l4 3 5-5 5 3M4 18h5l2 4',
    bag:'M3 7h18v14H3zM7 7V4h10v3M3 12h18M10 11v3h4v-3',
    compare:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
    calendar:'M3 5h18v16H3zM3 10h18M7 2v6M17 2v6',
    building:'m2 7 10-5 10 5zM4 9v10M9 9v10M15 9v10M20 9v10M2 21h20',
    macro:'M7 4 17 7l-2 11-11-2zM7 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0M23 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M18 20a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    heat:'M3 3h7v18H3zm11 0h7v7h-7zm0 11h7v7h-7z',
    chart:'M2 4v17h20M3 15h7l4-7 4 1 4-7',
    file:'M5 2h14v20H5zM8 6h8M8 10h8M8 14h5M8 18h5',
    people:'M10 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M13 4a4 4 0 0 1 0 8M1 21v-3a5 5 0 0 1 10 0v3zM14 14a5 5 0 0 1 7 5v2h-6',
    user:'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3z',
    download:'M12 2v13m-4-4 4 4 4-4M3 15v6h18v-6',
    panel:'M3 4h18v16H3zM15 4v16',
    filter:'M3 4h18l-7 8v8l-4-2v-6z',
    expand:'M14 3h7v7m0-7-9 9M10 21H3v-7m0 7 9-9',
    plus:'M12 3v18M3 12h18',
  };
  return `<g transform="translate(${x} ${y}) scale(${size/24})" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.file}"/></g>`;
}
function productLogo(x=13,y=5,scale=.76) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" role="img" aria-label="AInvest Logo" fill="#0055FF"><path d="M0 26 27 3v12L37 2" fill="none" stroke="#0055FF" stroke-width="1.7"/><path d="m30 1 10-1-4 10-1.5-5zM6 26 24 10v16zm21 0V18l8-8v16z"/><text x="43" y="25" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="700">AInvest</text></g>`;
}
function productRobot(x,y) {
  return `<g transform="translate(${x} ${y})"><ellipse cx="7" cy="7" rx="7" ry="4.6" fill="#DFE9FF"/><rect x="2.5" y="3.5" width="9" height="6" rx="3" fill="#19376D"/><circle cx="5" cy="6.3" r="1" fill="#fff"/><circle cx="9" cy="6.3" r="1" fill="#fff"/><path d="M7 3V1" stroke="#265FFC" stroke-width="1"/></g>`;
}
function productHeader() {
  let out=reportRect(0,0,1600,1548,'var(--report-bg)')+reportLine(0,36,1600,36,'var(--report-divider)',1);
  out+=`<g data-report-nav="true" aria-label="Ainvest 产品顶部导航">${productLogo()}`;
  out+=reportRect(191,6,131,24,'var(--report-search)',5)+productIcon('search',198,12,14,'var(--report-muted)')+reportMuted(217,22.8,'Symbol/Name',12);
  for(const [x,label] of [[352,'Aime'],[413,'AI Charts'],[498,'Markets'],[575,'Portfolio'],[655,'News'],[720,'Trade']]) out+=reportText(x,22.5,label,12,{fill:label==='AI Charts'?'#265FFC':'var(--report-text)'});
  out+=reportRect(1467,6,51,24,'var(--report-bg)',12,'stroke="var(--report-divider)" stroke-width="1"')+reportText(1492.5,22,'Log In',10,{bold:true,anchor:'middle'});
  out+=reportRect(1529,6,58,24,'#153D2E',5)+reportText(1558,22.3,'93% Off',12,{fill:'#fff',anchor:'middle'});
  return out+'</g>';
}
function productSidebar() {
  let out=`<g data-product-sidebar="true" aria-label="Ainvest 左侧导航">`;
  out+=reportLine(190.5,36,190.5,1548,'var(--report-divider)',1)+productRobot(15,49)+reportMuted(41,59,'Aime',11)+productIcon('panel',164,50,11);
  for(const [y,icon,label] of [[88,'edit','New Chat'],[120,'book','Library'],[151,'clock','Automation'],[183,'search','Search chats'],[215,'history','History']])out+=productIcon(icon,15,y-7,14)+reportText(40,y+4,label,12);
  out+=reportLine(7,237,184,237,'var(--report-divider)',1)+reportMuted(15,260,'Tools',10);
  const items=[['money','Smart Money'],['signal','Premium Signals'],['bag','ETF Portfolio'],['compare','ETF Compare'],['calendar','Calendars'],['building','Congress Trading'],['macro','Macromaps'],['heat','Heatmaps'],['chart','Option Discovery'],['file','Earnings Hub'],['people','Community']];
  items.forEach(([icon,label],i)=>{const y=284+i*31.7;out+=productIcon(icon,15,y-7,14)+reportText(40,y+4,label,12);});
  out+=`<g data-product-login="true"><circle cx="26.5" cy="721" r="13.5" fill="var(--report-search)"/>`+productIcon('user',21,715,11)+reportText(50,725.2,'Log in',12)+productIcon('download',164,715,13,'var(--report-muted)')+'</g>';
  return out+'</g>';
}
function stockBadge(symbol,x,y) {
  const extra={NVDA:['#76B900','N'],MSFT:['#2378D4','M'],META:['#0866FF','∞'],NFLX:['#111111','N'],AMD:['#222222','A']}[symbol];
  if(extra)return `<circle cx="${x}" cy="${y}" r="6.5" fill="${extra[0]}"/>`+reportText(x,y+3.5,extra[1],9,{fill:'#FFFFFF',bold:true,anchor:'middle'});
  if(symbol==='AAPL')return `<circle cx="${x}" cy="${y}" r="6.5" fill="var(--report-text)"/>`+reportApple(x-3.7,y-5,.75,'var(--report-bg)');
  if(symbol==='TSLA')return `<circle cx="${x}" cy="${y}" r="6.5" fill="#E60928"/>`+reportText(x,y+4,'T',12,{fill:'#fff',bold:true,anchor:'middle'});
  if(symbol==='GOOGL')return `<circle cx="${x}" cy="${y}" r="6.5" fill="#E60928"/>`+reportText(x,y+3,'G',9,{fill:'#fff',bold:true,anchor:'middle'});
  if(symbol==='AMZN')return reportText(x,y+4,'a',14,{bold:true,anchor:'middle'})+reportPath(`M${x-4} ${y+5}q4 3 8-1`,'#FF9900',1.3);
  return `<g transform="translate(${x-6} ${y-5})" fill="#1A3B88"><path d="M0 8 6 1 12 8h-2L6 4 2 8zM1 9h10v2H1zM4 6h1v3H4zm3 0h1v3H7z"/></g>`;
}
function productWatchlist() {
  let out=`<g data-product-watchlist="true" aria-label="Watchlist">`+reportLine(1309,36,1309,1548,'var(--report-divider)',1)+reportCard(1323,50,264,290);
  out+=reportText(1333,69,'Watchlist',13,{bold:true})+reportRect(1457,55,65,19,'var(--report-bg)',4,'stroke="var(--report-divider)" stroke-width="1"')+productIcon('filter',1464,59,10)+reportText(1477,68.5,'My List',11)+productIcon('plus',1533,58,12)+productIcon('expand',1559,58,12);
  out+=reportLine(1331,78,1580,78,'var(--report-divider)',.7);
  for(const [x,label] of [[1331,'Symbol'],[1439,'Price'],[1509,'%Chg']])out+=reportText(x,92,label,10);
  out+=reportMuted(1466,90,'▲',5)+reportMuted(1466,96,'▼',5)+reportMuted(1540,90,'▲',5)+reportMuted(1540,96,'▼',5)+productIcon('expand',1566,85,8,'var(--report-muted)');
  const stocks=[['QQQ','721.25','+1.27%'],['TSLA','407.46','+4.04%'],['GOOGL','320.58','+1.19%'],['AAPL','347.10','+0.93%'],['AMZN','253.10','+1.61%'],['NVDA','207.38','+2.18%'],['MSFT','523.81','-0.42%'],['META','736.24','+0.86%'],['NFLX','1210.50','-1.12%'],['AMD','235.78','+3.24%']];
  stocks.forEach(([symbol,price,change],i)=>{const y=108+i*21;out+=reportLine(1331,y-10,1580,y-10,'var(--report-divider)',.6)+stockBadge(symbol,1337,y)+reportText(1348,y+4,symbol,10)+reportText(1441,y+4,price,10)+reportText(1511,y+4,change,10,{fill:reportColor('semantic',change.startsWith('-')?1:0)});});
  out+=reportRect(1330,328,63,4,'var(--report-search)',2);
  return out+'</g>';
}
function scoreCards(part) {
  let out=reportCard(760,79,532,95)+reportCard(760,180,532,144);
  out+=reportText(769,103,'1.00 / 10',13,{bold:true})+reportText(769,115.4,'Underperform',8,{bold:true,fill:reportColor('semantic',1)});
  out+=reportPath('M771 128v8m-3-5h6m-4-5 3 9','var(--report-text)',.8);
  for(const [y,text] of [[133,'Technical analysis reveals a score of 2.79/10, indicating challenging technical structure. Positive'],[141,'momentum is observed in no significant factors, whereas MACD Golden Cross and MACD Death Cross'],[149,'present headwinds. This configuration suggests a cautious near-term trajectory.']])out+=reportText(769,y,text,6.2);
  out+=reportText(769,162,'Analysis →',6.5,{fill:'#265FFC',bold:true});
  let radar='';for(const r of [8,16,24,32])radar+=`<circle cx="1200" cy="127" r="${r}" fill="#F6F6F6" fill-opacity=".35" stroke="var(--report-grid)" stroke-width=".55"/>`;
  for(const a of [-90,30,150]){const rad=a*Math.PI/180;radar+=reportLine(1200,127,1200+32*Math.cos(rad),127+32*Math.sin(rad),'var(--report-grid)',.5);}
  radar+=reportMuted(1200,94,'Fundamental',4,'middle')+`<text transform="translate(1170 144) rotate(62)" font-size="4" fill="var(--report-muted)">Momentum</text><text transform="translate(1228 150) rotate(-60)" font-size="4" fill="var(--report-muted)">Technical</text>`;
  radar+=reportMark('categorical',0,'Technical analysis radar',`<path d="M1199 114C1205 116 1211 127 1213 134Q1211 140 1200 133Q1193 129 1195 122Q1196 116 1199 114Z" fill="currentColor" fill-opacity=".76"/>`);
  if(part==='technical')return reportChart('technical-radar','技术评分雷达图',radar);
  out+=reportText(769,197,'4.10 / 10',10,{bold:true})+reportText(814,197,'Neutral',10,{bold:true})+reportMuted(769,205,'Overall Score',5.3)+reportMuted(814,205,'Investment Rating',5.3);
  const rows=[['down','The overall valuation of TSLA is overvalued.'],['up',"TSLA’s revenue will have seen periods of fluctuation in the next few years."],['down',"TSLA’s primary product is Automotive, with Automotive accounting for 73.3% of total",'revenue.'],['up','TSLA has a debt-to-equity ratio of 69.7%, indicating a moderate debt risk.']];
  rows.forEach(([direction,text,second],i)=>{const y=[213,238,263,297][i],h=i===2?29:22;out+=reportRect(769,y,288,h,'var(--report-bg)',6,'stroke="var(--report-grid)" stroke-width=".6"');const c=reportColor('semantic',direction==='up'?0:1);out+=direction==='up'?reportPath(`M774 ${y+8}h6l-3 4z`,c,.7,c):reportRect(774,y+8,5,5,c,1)+reportText(776.5,y+12.1,'×',5,{fill:'#fff',anchor:'middle'});out+=reportText(785,y+13,text,6);if(second)out+=reportText(785,y+21,second,6);out+=reportText(1047,y+14,'›',10);});
  const gradient=`<defs><radialGradient id="financial-rating-field"><stop offset="0" stop-color="${reportColor('semantic',1)}"/><stop offset=".28" stop-color="#FF8B37"/><stop offset=".55" stop-color="#FFE94B"/><stop offset=".83" stop-color="#A9EE32"/><stop offset="1" stop-color="color-mix(in srgb, ${reportColor('semantic',0)} 20%, #20FF00 80%)"/></radialGradient></defs>`;
  let rating=`<circle cx="1210" cy="244" r="35" fill="url(#financial-rating-field)"/>`;
  for(const r of [7,14,21,28,35])rating+=`<circle cx="1210" cy="244" r="${r}" fill="none" stroke="#638956" stroke-opacity=".2" stroke-width=".5"/>`;
  for(const a of [-90,-18,54,126,198]){const rad=a*Math.PI/180;rating+=reportLine(1210,244,1210+35*Math.cos(rad),244+35*Math.sin(rad),'#467348',.4);}
  rating+=reportPath('M1196 239 1226 238 1216 254 1195 263Z','#202020',1,'none')+reportMuted(1210,206,'Value',4.5,'middle')+reportMuted(1250,234,'Future',4.5,'middle')+reportMuted(1236,277,'Past',4.5,'middle')+reportMuted(1181,277,'Health',4.5,'middle')+reportMuted(1166,234,'Dividend',4.5,'middle')+reportWatermark(1088,263);
  return gradient+reportChart('investment-rating','投资评分彩色雷达图',reportMark('semantic',0,'Investment rating field',rating));
}
function financialDonut(cx,cy,items) {
  const total=items.reduce((sum,item)=>sum+item.value,0);let start=-Math.PI/2,out='';
  items.forEach((item,index)=>{const end=start+item.value/total*Math.PI*2;out+=reportMark('categorical',index,`${item.name} ${item.display}`,`<path d="${reportDonutSegment(cx,cy,57,32,start,end)}" fill="currentColor"/>`);start=end;});
  out+=reportMuted(cx,cy-8,'Total',9,'middle').replace('<text ','<text data-font-size="10" ')+reportText(cx,cy+12,'109.42B',12,{bold:true,anchor:'middle'}).replace('<text ','<text data-font-size="11" ');
  items.forEach((item,index)=>{if(!item.points)return;out+=reportPath(item.points,reportColor('categorical',index),.8)+reportMuted(item.x,item.y,item.name,9.5,item.anchor).replace('<text ','<text data-font-size="10" ')+reportText(item.x,item.y+16,item.display,10.2,{anchor:item.anchor}).replace('<text ','<text data-font-size="10" ');});
  return out;
}
function financialBreakdown(region) {
  let out='';
  out+=financialDonut(476,1146,[
    {name:'iPhone',value:54.25,display:'54.25B',x:559,y:1142,points:'M533 1145h23'},
    {name:'Services',value:30.74,display:'30.74B',x:410,y:1188,anchor:'end',points:'M433 1185l-9 6h-12'},
    {name:'Mac',value:10.35,display:'10.35B',x:401,y:1119,anchor:'end',points:'M427 1116l-15-2h-9'},
    {name:'Other Products',value:7.88,display:'7.88B',x:423,y:1079,anchor:'end',points:'M444 1101l-10-25h-9'},
    {name:'iPad',value:6.19,display:'6.19B'}]);
  const business=out;out='';
  out+=financialDonut(1040,1146,[
    {name:'Americas',value:45.78,display:'45.78B',x:1122,y:1126,points:'M1095 1132l14-4h11'},
    {name:'Europe',value:29.39,display:'29.39B',x:1003,y:1208,anchor:'end',points:'M1020 1200l-4 11h-11'},
    {name:'Greater China',value:18.82,display:'18.82B',x:956,y:1133,anchor:'end',points:'M983 1139l-12-3h-13'},
    {name:'Rest of Asia Pacific',value:8.87,display:'8.87B',x:986,y:1087,anchor:'end',points:'M1007 1102l-9-11h-10'},
    {name:'Japan',value:6.56,display:'6.56B'}]);
  return reportChart(region?'revenue-breakdown-region':'revenue-breakdown-business',region?'按地区收入构成':'按业务收入构成',region?out:business);
}

// Real CSS pixels for content typography/spacing; chart geometry stays in SVG.
const financialLayoutObservers=new Map();
function initializeFinancialTypography(element) {
  if(!element.querySelectorAll || typeof ResizeObserver==='undefined')return;
  for(const [svg,observer] of financialLayoutObservers)if(!svg.isConnected){observer.disconnect();financialLayoutObservers.delete(svg);}
  const page=element.querySelector('.financial-page-layout'),login=element.querySelector('[data-product-login]');
  if(page&&login&&!financialLayoutObservers.has(page)){
    const alignLogin=()=>{const bounds=page.getBoundingClientRect(),scale=bounds.width/1600;if(scale)login.setAttribute('transform',`translate(0 ${(bounds.height-24)/scale-721})`);};
    const observer=new ResizeObserver(alignLogin);observer.observe(page);financialLayoutObservers.set(page,observer);alignLogin();
  }
  for(const svg of element.querySelectorAll('.financial-plot')) {
    if(financialLayoutObservers.has(svg))continue;
    const update=()=>{
      if(!svg.isConnected)return;
      for(const badge of svg.querySelectorAll('[data-badge-x]')){
        const m=badge.getScreenCTM();if(!m)continue;const sx=Math.hypot(m.a,m.b),sy=Math.hypot(m.c,m.d);
        badge.setAttribute('x',Number(badge.dataset.badgeX)-17/sx);badge.setAttribute('y',Number(badge.dataset.badgeY)-18/sy);
        badge.setAttribute('width',34/sx);badge.setAttribute('height',14/sy);badge.setAttribute('rx',3/sx);
      }
      for(const text of svg.querySelectorAll('text')) {
        if(svg.classList.contains('financial-sankey-plot'))text.removeAttribute('transform');
        const matrix=text.getScreenCTM();
        if(!matrix)continue;
        const scale=Math.hypot(matrix.c,matrix.d);
        if(!scale)continue;
        const original=Number(text.getAttribute('font-size'))||10;
        const size=Number(text.getAttribute('data-font-size'))||(original>=11?12:original>=7?11:10);
        text.style.fontSize=`${size/scale}px`;
        if(text.hasAttribute('data-percent-y'))text.setAttribute('y',Number(text.dataset.percentY)-(svg.getBoundingClientRect().width<450&&Number(text.dataset.percentIndex)%2?11/scale:0));
        if(text.hasAttribute('data-badge-value'))text.setAttribute('y',Number(text.dataset.badgeValue)-22/scale);
        if(text.hasAttribute('data-badge-text'))text.setAttribute('y',Number(text.dataset.badgeText)-7/scale);
        if(svg.classList.contains('financial-sankey-plot')){
          const horizontal=Math.hypot(matrix.a,matrix.b),x=Number(text.getAttribute('x'))||0,y=Number(text.getAttribute('y'))||0;
          text.setAttribute('transform',`translate(${x} ${y}) scale(${scale/horizontal} 1) translate(${-x} ${-y})`);
        }
      }
    };
    const observer=new ResizeObserver(update);observer.observe(svg);
    financialLayoutObservers.set(svg,observer);update();
  }
}
function contentPlot(viewBox,content,label,extra='') {
  return `<svg ${extra==='financial-sankey-plot'?'preserveAspectRatio="none"':''} class="financial-plot ${extra}" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="group" aria-label="${label}">${content}</svg>`;
}
function contentLegend(items) {
  return `<div class="financial-legend">${items.map(([role,index,label])=>`<button type="button" class="report-color-mark" data-color-role="${role}" data-color-index="${index}" aria-label="${financialEscape(label)}，编辑对应颜色" style="color:${reportColor(role,index)}"><i></i><span>${financialEscape(label)}</span></button>`).join('')}</div>`;
}
function contentTabs(labels) {
  return `<div class="financial-tabs">${labels.map((label,i)=>`<span class="${i?'':'active'}">${label}</span>`).join('')}</div>`;
}
function contentCard(title,content,tools='',classes='') {
  return `<article class="financial-card ${classes}"><div class="financial-card-header"><h3>${title}</h3>${tools?`<div class="financial-card-tools">${tools}</div>`:''}</div>${content}</article>`;
}
function contentModule(title,content,tools='',id='') {
  return `<section class="financial-module" ${id?`data-chart="${id}"`:''}><div class="financial-module-header"><h2>${title}</h2>${tools?`<div class="financial-module-tools">${tools}</div>`:''}</div>${content}</section>`;
}
function contentEps() {
  // Reuse only the plot; titles/legend are regular HTML and no longer scale with the page.
  let plot='';
  for(const y of [159.5,202,244.5])plot+=reportLine(223,y,726,y,'var(--report-grid)',.8);
  plot+=reportLine(223,287,726,287,'var(--report-axis)',1);
  const xs=[273.5,374,474.5,575,675.5],actual=[208.5,166.5,202,202],est=[212,173,205,208,202];
  xs.forEach((x,i)=>{plot+=`<circle cx="${x}" cy="${est[i]}" r="5.1" fill="var(--report-bg)" stroke="var(--report-muted)" stroke-width="1"/>`;if(i<4)plot+=reportMark('semantic',0,`EPS actual ${[1.84,2.85,2.01,2.04][i]}`,`<circle cx="${x}" cy="${actual[i]}" r="5.1" fill="currentColor" stroke="var(--report-bg)" stroke-width="1"/>`);else plot+=reportMuted(x,194,'1.99',6,'middle');plot+=reportMuted(x,298.5,['Q4’25','Q1’26','Q2’26','Q3’26','Q4’26'][i],6.1,'middle')+reportText(x,311,i<4?'Beat':'Nov 2',6,{fill:i<4?'#53B998':'var(--report-muted)',anchor:'middle'});});
  return contentCard('EPS',contentLegend([['semantic',0,'Actual']])+`<span class="financial-estimate"><i></i>Estimate</span>`+contentPlot('215 147 519 172',reportChart('earnings','EPS 实际与预估',plot),'EPS Actual / Estimate','financial-eps-plot'),'','financial-eps-card');
}
function contentSharedChart(id,classes='') {
  const module=financialChartModules.find(m=>m.id===id);
  return `<div class="financial-shared-chart ${classes}" data-chart="${module.chartId}" data-chart-id="${id}" data-chart-type="${module.type}" aria-label="${module.chartId}"></div>`;
}
function contentScores() {
  // The two vector radar plots remain editable; all explanatory text uses a normal readable type scale.
  const tech=contentSharedChart('financial-technical','financial-shared-radar'),rating=contentSharedChart('financial-rating','financial-shared-radar');
  const technical=`<article class="financial-card financial-technical-card"><div class="financial-score-copy"><div class="financial-score-heading"><strong>1.00 / 10</strong><span class="financial-underperform">Underperform</span></div><p>Technical analysis reveals a score of 2.79/10, indicating challenging technical structure. Positive momentum is observed in no significant factors, whereas MACD Golden Cross and MACD Death Cross present headwinds. This configuration suggests a cautious near-term trajectory.</p><span class="financial-analysis-link">Analysis →</span></div>${tech}</article>`;
  const rows=[['down','The overall valuation of TSLA is overvalued.'],['up',"TSLA’s revenue will have seen periods of fluctuation in the next few years."],['down',"TSLA’s primary product is Automotive, with Automotive accounting for 73.3% of total revenue."],['up','TSLA has a debt-to-equity ratio of 69.7%, indicating a moderate debt risk.']];
  const investment=`<article class="financial-card financial-investment-card"><div class="financial-investment-heading"><div><strong>4.10 / 10</strong><span>Overall Score</span></div><div><strong>Neutral</strong><span>Investment Rating</span></div></div><div class="financial-rating-body"><div class="financial-insights">${rows.map(([direction,text])=>`<div class="financial-insight"><i style="color:${reportColor('semantic',direction==='up'?0:1)}">${direction==='up'?'▼':'⊠'}</i><span>${text}</span><b>›</b></div>`).join('')}</div>${rating}</div></article>`;
  return `<div class="financial-score-stack">${technical}${investment}</div>`;
}
function contentDonut(region) {
  return contentCard(region?'By Region':'By Business',`<p class="financial-card-caption">Data source: Q3,2026</p>`+contentSharedChart(region?'financial-region':'financial-business'));
}
export function renderFinancialScene(extraContent='') {
  const volume=contentModule('Volume Profile',`<div class="financial-card-grid">${contentEps()}${contentScores()}</div>`);
  const sankey=contentModule('Revenue &amp; Expenses',`<article class="financial-card">${contentLegend([['categorical',0,'Revenue'],['semantic',1,'Expenses'],['semantic',0,'Profit']])}${contentPlot('-24 342 774 160',reportSankey(),'收入成本桑基图','financial-sankey-plot')}</article>`,`<span class="financial-yoy">○ YoY</span><span class="financial-period">Quarterly ⌄</span>`);
  const trendTools=contentTabs(['Debt Ratio','Assets','Liabilities','Equity'])+`<span class="financial-period">Quarterly ⌄</span>`;
  const trend=contentCard('Trend',contentSharedChart('financial-trend'),trendTools);
  const breakdown=contentCard('Breakdown',contentSharedChart('financial-breakdown'),'<span class="financial-period">Q3,2026</span>');
  const balance=contentModule('Balance Sheet ›',`<div class="financial-card-grid">${trend}${breakdown}</div>`,'','balance-sheet');
  const revenue=contentModule('Revenue Breakdown ›',`<div class="financial-card-grid">${contentDonut(false)}${contentDonut(true)}</div>`,'','revenue-breakdown');
  const payout=contentCard('Payout Ratio',contentSharedChart('financial-payout'));
  const yieldCard=contentCard('Dividend Yield',contentSharedChart('financial-yield'));
  const dividend=contentModule('Dividend ›',`<div class="financial-card-grid">${payout}${yieldCard}</div>`,'','dividend');
  return `<div class="financial-page financial-page-layout" role="group" aria-label="AAPL 财报分析，内容区遵循统一字号与间距规范"><svg class="financial-product-shell" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1548" width="1600" height="1548" aria-label="Ainvest 产品导航与 Watchlist">${productHeader()}${productSidebar()}${productWatchlist()}</svg><main class="financial-content-frame"><div class="financial-content">${volume}${sankey}${balance}${revenue}${dividend}${extraContent}</div></main></div>`;
}
