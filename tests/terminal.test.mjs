import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderTerminalScene,terminalPaletteStyle,applyTerminalPalette,terminalStockRows,TERMINAL_SIZE,yieldBars,risingCurve} from '../dist/scenes/terminal.js';
import {terminalDarkReference} from '../dist/data/terminal-dark-reference.js';
import {terminalReference} from '../dist/data/terminal-reference.js';
import {presets} from '../dist/data/presets.js';

test('Stocks reference retains all twelve market cards, independent quotes and the task list',()=>{
 const html=renderTerminalScene();
 assert.equal((html.match(/data-terminal-chart=/g)||[]).length,12);
 assert.equal((html.match(/data-terminal-stock="/g)||[]).length,12);
 for(const value of ['Market Trackers','Advancers &amp; Decliners','Stock Heatmap','Fear &amp; Greed Index','24h Dominance','24h Crypto Market Cap','Altcoin Season Index','Crypto ETF Fund Flow','Global yield curves','Key interest rates','155.25M','JJdumpling','Daily Position Analysis','Sectors, Industries and Themes'])assert.ok(html.includes(value),value);
 assert.match(html,/248\.98/);assert.equal(terminalStockRows[0][2],'362.44');
 assert.equal((html.match(/data-terminal-group="tasks"/g)||[]).length,6);
 assert.equal(TERMINAL_SIZE.sourceWidth,2880);
 assert.match(html,/viewBox="222 42 1306 1293"/);
 // Raster assets are small identities only; full charts, text and layout are native SVG.
 assert.ok(!html.includes('Stocks.png"'));
 assert.ok((html.match(/data-terminal-area/g)||[]).length>100);
 assert.ok(!html.includes('undefined'));
});

test('traced curves and bars retain reference positions instead of generating replacement data',()=>{
 assert.deepEqual(Object.keys(terminalReference.lines),['bonds','rates','yield']);
 for(const traces of Object.values(terminalReference.lines))for(const trace of traces){
  assert.ok(trace.points.length>100);
  assert.ok(trace.points.every(([x,y],i)=>Number.isFinite(x)&&Number.isFinite(y)&&(!i||x>trace.points[i-1][0])));
 }
 for(const bars of Object.values(terminalReference.bars))for(const bar of bars){assert.ok(bar.width>0&&bar.height>0);assert.ok(bar.x>=238&&bar.x+bar.width<1188&&bar.y>=327&&bar.y+bar.height<=801);}
 assert.equal(terminalReference.gauge.length,180);
 assert.ok(Object.keys(terminalReference.assets).includes('watch-TSLA'));
});

test('series use exact palette values at baseline and edits remain isolated by role',()=>{
 const palette=structuredClone(presets[0]),vars=new Map();
 const base={dataset:{colorRole:'categorical',colorIndex:'0',terminalBase:'#1F5FD6'},style:{}},semantic={dataset:{colorRole:'semantic',colorIndex:'0',terminalBase:'#00B58C'},style:{}};
 const line={dataset:{terminalWidth:'1.25'},setAttribute(name,value){this[name]=value;}};
 const host={style:{setProperty:(name,value)=>vars.set(name,value)},querySelectorAll:selector=>selector==='[data-terminal-base]'?[base,semantic]:selector==='[data-terminal-line]'?[line]:[],querySelector:()=>null};
 applyTerminalPalette(host,palette,'light');assert.equal(base.style.color,'#265FFC');assert.equal(semantic.style.color,'#00B58C');
 palette.themes.light.categorical[0].hex='#123456';
 applyTerminalPalette(host,palette,'light',{lineWidth:.5});assert.equal(base.style.color,'#123456');assert.equal(semantic.style.color,'#00B58C');assert.equal(line['stroke-width'],.5);
 applyTerminalPalette(host,presets[0],'light',{lineWidth:'inherit'});assert.equal(base.style.color,'#265FFC');assert.equal(line['stroke-width'],'1.25');
 assert.equal(vars.get('--term-bg'),'#FFFFFF');assert.equal(terminalPaletteStyle(presets[0],'dark')['--term-bg'],'#171717');
 palette.themes.light.surface[0].hex='#EEDDCC';assert.equal(terminalPaletteStyle(palette,'light')['--term-page'],'#EEDDCC');
});


test('dark theme uses reference surfaces and identity assets while series follow both theme palettes',()=>{
 const palette=structuredClone(presets[0]),vars=new Map();
 const marks=Array.from({length:8},(_,i)=>({dataset:{colorRole:'categorical',colorIndex:String(i),terminalSlot:String(i),terminalBase:'#ABCDEF'},style:{}}));
 const asset={dataset:{terminalAsset:'new-chat'},setAttribute(name,value){this[name]=value;}};
 const trace={dataset:{terminalTrace:'bonds:0'},setAttribute(name,value){this[name]=value;}};
 const host={style:{setProperty:(name,value)=>vars.set(name,value)},querySelectorAll:s=>s==='[data-terminal-base]'?marks:s==='[data-terminal-asset]'?[asset]:s==='[data-terminal-trace]'?[trace]:[],querySelector:()=>null};
 for(const theme of ['light','dark']){
  palette.themes[theme].categorical.forEach((c,i)=>c.hex=['#112233','#223344','#334455','#445566','#556677','#667788','#778899'][i]);
  applyTerminalPalette(host,palette,theme);
  marks.forEach((m,i)=>assert.equal(m.style.color,palette.themes[theme].categorical[i%7].hex));
  const reference=theme==='dark'?terminalDarkReference:terminalReference;
  assert.equal(asset.href,reference.assets['new-chat']);
  assert.equal(trace.d,'M'+risingCurve(reference.lines.bonds[0].points,222,154).map(p=>p.join(' ')).join('L'));
 }
 palette.themes.dark.categorical.push({name:'Series 8',hex:'#8899AA'});
 applyTerminalPalette(host,palette,'dark');assert.equal(marks[7].style.color,'#8899AA');assert.equal(marks[7].dataset.colorIndex,'7');
 assert.equal(vars.get('--term-page'),'#141414');assert.equal(vars.get('--term-bg'),'#171717');
 assert.equal(vars.get('--term-panel'),'#141414');assert.equal(vars.get('--term-search-bg'),'#1F1F1F');
 assert.notEqual(terminalReference.assets['new-chat'],terminalDarkReference.assets['new-chat']);
 const html=renderTerminalScene();
 for(const id of ['major-bonds-trend','crypto-market-cap','crypto-etf-flow','global-yield-curves','key-interest-rates'])assert.ok(html.includes('data-terminal-chart="'+id+'"'),id);
 // Line points and their legend dots must address the same palette slots.
 assert.match(html,/data-color-index="2"[^>]+data-terminal-base="[^"]+"[^>]+aria-label="rates 3/);
 assert.equal(html.match(/data-color-role="line" data-color-index="0"[^>]+data-terminal-base="#E57E17"/g).length,7);
});

test('the crypto ETF donut shows seven slices and seven legend items',()=>{
 const html=renderTerminalScene(),card=html.slice(html.indexOf('Crypto ETF Fund Flow'));
 const slices=card.match(/<path d="[^"]*"[^>]*stroke-width="\.6" data-terminal-area\/>/g);
 assert.equal(slices.length,7);
 assert.doesNotMatch(card.slice(0,card.indexOf('155.25M')),/Factory8/);
});

test('every preset uses the original interface colors outside Aime until they are edited',()=>{
 for(const preset of presets)for(const theme of ['light','dark'])for(const name of ['--term-page','--term-bg','--term-panel','--term-text','--term-border'])assert.equal(terminalPaletteStyle(preset,theme)[name],terminalPaletteStyle(presets[0],theme)[name],preset.id+name);
 const claude=structuredClone(presets.find(p=>p.id==='claude'));
 claude.themes.light.surface[0].hex='#EEDDCC';
 assert.equal(terminalPaletteStyle(claude,'light')['--term-page'],'#EEDDCC');
});

test('only the yield combination uses the line palette, in its legend, line and points',()=>{
 const html=renderTerminalScene(),marks=[...html.matchAll(/data-color-role="line"[^>]*aria-label="([^"]*)"/g)].map(m=>m[1]);
 assert.equal(marks.filter(label=>label.startsWith('Factory3')).length,6);
 assert.equal(marks.filter(label=>label.startsWith('yield')).length,1);
 assert.equal(marks.length,7);
});

test('every yield period has two whole bars with the first series taller',()=>{
 const bars=yieldBars(terminalReference.bars.yield);
 assert.equal(bars.length,10);
 for(let i=0;i<bars.length;i+=2){
  assert.equal(bars[i].base,'#1F5FD6');assert.equal(bars[i+1].base,'#168CB8');
  assert.ok(bars[i].height>bars[i+1].height);
  assert.ok(Math.abs(bars[i].y+bars[i].height-(bars[i+1].y+bars[i+1].height))<.01);
 }
});
test('the bonds card is one line with an area that follows the theme curve',()=>{
 const html=renderTerminalScene(),card=html.slice(html.indexOf('Major 10-year bonds'),html.indexOf('data-terminal-chart="crypto-market-cap"'));
 assert.equal((card.match(/data-terminal-trace="bonds:/g)||[]).length,1);
 assert.equal((card.match(/data-terminal-area-trace="bonds:0"/g)||[]).length,1);
 assert.doesNotMatch(card,/Factory2/);
 const area={dataset:{terminalAreaTrace:'bonds:0',terminalBaseline:'232'},setAttribute(name,value){this[name]=value;}};
 applyTerminalPalette({style:{setProperty(){}},querySelector:()=>null,querySelectorAll:s=>s==='[data-terminal-area-trace]'?[area]:[]},presets[0],'dark');
 const points=risingCurve(terminalDarkReference.lines.bonds[0].points,222,154);
 assert.ok(area.d.startsWith('M'+points[0].join(' ')));assert.ok(area.d.endsWith('L'+points[0][0]+' 232Z'));
});

test('the bonds curve climbs clearly and stays inside its grid in both themes',()=>{
 for(const reference of [terminalReference,terminalDarkReference]){
  const points=risingCurve(reference.lines.bonds[0].points,222,154),ys=points.map(p=>p[1]),third=Math.floor(ys.length/3);
  const mean=list=>list.reduce((sum,v)=>sum+v,0)/list.length;
  assert.ok(Math.min(...ys)>=144&&Math.max(...ys)<=232);
  // SVG y grows downward, so a larger value sits higher up on the page.
  assert.ok(mean(ys.slice(0,third))-mean(ys.slice(-third))>30);
  assert.ok(ys[0]-ys.at(-1)>50);
  assert.deepEqual(points.map(p=>p[0]),reference.lines.bonds[0].points.map(p=>p[0]));
 }
});
