import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseImport } from '../dist/lib/palettes.js';
import { normalizeColor } from '../dist/lib/colors.js';
import { presets } from '../dist/data/presets.js';
import { aimeChartConfig } from '../dist/data/aime-reference.js';
const context={console,URL,setTimeout,clearTimeout};
runInNewContext(await readFile(new URL('../dist/vendor/vis-lab.bundle.js',import.meta.url),'utf8'),context);
globalThis.PaletteVisEngine=context.PaletteVisEngine;
const {defaultAimeBoard,validateAimeBoard,renderAimeScene,aimeBoardPanel,aimeHeaderKind,applyAimePalette,aimeShownPalette}=await import('../dist/scenes/aime.js');
const {defaultCompactBoard,newCompactModule}=await import('../dist/scenes/custom.js');
test('every preset shows the original Aime page and card colors until they are edited',()=>{
 const byId=Object.fromEntries(presets.map(p=>[p.id,structuredClone(p)]));
 const shown=(id,theme,i)=>aimeShownPalette(byId[id],theme).themes[theme].surface[i].hex;
 for(const id of Object.keys(byId))for(const [theme,hex] of [['light','#FFFFFF'],['dark','#141414']])for(const i of [0,1])assert.equal(shown(id,theme,i),hex,id+theme+i);
 byId.claude.themes.light.surface[0].hex='#ABCDEF';assert.equal(shown('claude','light',0),'#ABCDEF');
});
test('the console reads the colors Aime shows without changing the palette',()=>{
 const ainvest=structuredClone(presets.find(p=>p.id==='ainvest')),stored=JSON.stringify(ainvest);
 const shown=hexes=>aimeShownPalette(ainvest,'dark').themes.dark.surface.map(c=>c.hex).slice(0,hexes);
 assert.deepEqual(shown(5),['#141414','#141414','#CCCCCC','#737373','#2E2E2E']);
 assert.equal(JSON.stringify(ainvest),stored);
 ainvest.themes.dark.surface[2].hex='#ABCDEF';assert.equal(shown(5)[2],'#ABCDEF');
 assert.deepEqual(aimeShownPalette(ainvest,'dark').themes.light,ainvest.themes.light);
});
test('Aime console values match the conversation styles',async()=>{
 const css=await readFile(new URL('../dist/styles.css',import.meta.url),'utf8');
 for(const [theme,selector] of [['light','.aime-stage{'],['dark','.aime-stage[data-aime-theme="dark"]{']]){
  const rule=css.slice(css.indexOf(selector)),value=name=>normalizeColor(rule.match(new RegExp(`--aime-${name}:(#[0-9a-fA-F]+)`))[1]);
  const palette=structuredClone(presets[0]);
  assert.deepEqual(aimeShownPalette(palette,theme).themes[theme].surface.map(c=>c.hex).slice(0,5),['bg','card','text','muted','line'].map(value));
 }
});
test('Aime uses five shared chart types with independent mobile scene state',()=>{
 const board=defaultAimeBoard(),other=defaultCompactBoard();
 assert.equal(board.platform,'mobile');assert.equal(board.modules.length,5);assert.equal(other.modules.length,26);
 assert.deepEqual(board.modules.map(m=>m.type),['line-multi','market-cap-race','donut','stack','grouped3']);
 const html=renderAimeScene(board,'dark');assert.match(html,/data-aime-theme="dark"/);assert.match(html,/Fundamentals remain rock-solid/);assert.equal((html.match(/data-chart-id=/g)||[]).length,5);
});
test('reference datasets retain financial values and respect module data counts',()=>{
 const board=defaultAimeBoard();
 assert.deepEqual(aimeChartConfig(board.modules[1]).items.map(i=>i.value),[23,14]);
 const sum=aimeChartConfig(board.modules[2]).items.reduce((sum,item)=>sum+item.value,0);assert.ok(Math.abs(sum-155250000)<.01);
 board.modules[0].count=18;board.modules[0].series=4;
 assert.equal(aimeChartConfig(board.modules[0]).series.length,4);assert.equal(aimeChartConfig(board.modules[0]).series[0].data.length,18);
});
test('new chart modules and fixtures survive full experiment import without polluting the board',()=>{
 const aime=defaultAimeBoard();aime.modules.push(newCompactModule('radar-basic'));aime.density='standard';
 const parsed=parseImport(JSON.stringify({kind:'palette-lab-session',schemaVersion:1,baseline:presets[0],draft:presets[0],scene:'aime',aimeBoard:aime}));
 const restored=validateAimeBoard(parsed.session.aimeBoard);assert.equal(restored.modules.length,6);assert.equal(restored.platform,'mobile');assert.equal(restored.density,'standard');assert.equal(restored.modules[0].fixture,'aime-growth');assert.equal(restored.modules[1].count,2);
 assert.equal(defaultCompactBoard().modules.length,26);
 const empty=validateAimeBoard({...aime,modules:[]});assert.equal(empty.modules.length,0);
});

test('chart headers show a pager or three actions, and the choice survives validation',()=>{
 const board=defaultAimeBoard();
 assert.deepEqual(board.modules.map(aimeHeaderKind),['actions','pager','pager','pager','pager']);
 assert.equal(aimeHeaderKind(newCompactModule('radar-basic')),'actions');
 const html=renderAimeScene(board,'light');
 assert.equal((html.match(/aime-card-page"/g)||[]).length,4);
 assert.equal((html.match(/aime-card-more/g)||[]).length,4);
 board.modules[0].header='pager';board.modules[1].header='actions';
 const restored=validateAimeBoard(JSON.parse(JSON.stringify(board)));
 assert.deepEqual(restored.modules.slice(0,2).map(aimeHeaderKind),['pager','actions']);
 assert.equal(validateAimeBoard({...board,modules:[{...board.modules[0],header:'bad'}]}).modules[0].header,undefined);
 restored.selected=restored.modules[1].id;
 assert.match(aimeBoardPanel(restored),/data-module-field="header"[\s\S]*value="actions" selected/);
});

test('phones only have theme and palette controls above the input, computers keep the quick actions',()=>{
 const board=defaultAimeBoard();
 const phone=renderAimeScene(board,'light',{themeSwitch:{disabled:false}}),computer=renderAimeScene(board,'light');
 assert.match(phone,/aime-theme-switch" data-action="theme" data-value="dark"/);assert.doesNotMatch(phone,/Fast|Price Forecast|Circle Analysis/);assert.doesNotMatch(phone,/aime-composer-field/);
 assert.doesNotMatch(computer,/aime-theme-switch/);assert.match(computer,/Fast/);assert.match(computer,/aime-composer-field/);assert.match(computer,/Price Forecast/);assert.match(computer,/Circle Analysis/);
 assert.match(renderAimeScene(board,'dark',{themeSwitch:{disabled:true}}),/data-value="light"[^>]*disabled/);
 const withPalettes=renderAimeScene(board,'light',{themeSwitch:{status:'<span class="live-dot"></span>',palettes:'<div class="aime-viewer-palettes"></div>'}});
 assert.ok(withPalettes.indexOf('live-dot')<withPalettes.indexOf('aime-theme-switch')&&withPalettes.indexOf('aime-theme-switch')<withPalettes.indexOf('aime-viewer-palettes'));
});

test('the growth chart can show one line and only its main line has an area',()=>{
 const growth={...defaultAimeBoard().modules[0]};
 const areas=module=>aimeChartConfig(module).series.map(s=>s.area);
 assert.deepEqual(areas(growth),[true,false,false]);
 assert.deepEqual(areas({...growth,area:'off'}),[false,false,false]);
 const board=defaultAimeBoard();board.modules[0].series=1;board.modules[0].area='off';
 const restored=validateAimeBoard(board).modules[0];
 assert.equal(restored.series,1);assert.equal(restored.area,'off');
 assert.deepEqual(areas({...restored,area:'on'}),[true]);
 assert.equal(aimeChartConfig(restored).series.length,1);
 assert.match(renderAimeScene({...board,modules:[restored]},'light'),/AAPL Net Income YoY</);
 const other=validateAimeBoard({...board,modules:[{...restored,fixture:undefined,series:1}]}).modules[0];
 assert.equal(other.series,2);
});

test('the growth chart has dense lines that cross',()=>{
 const growth=defaultAimeBoard().modules[0];
 assert.equal(growth.count,36);
 const series=aimeChartConfig(growth).series.map(s=>s.data);
 assert.ok(series.every(line=>line.length===36&&line.every(v=>v>0&&v<1)));
 const crossings=(a,b)=>a.slice(1).filter((v,i)=>Math.sign(a[i]-b[i])!==Math.sign(v-b[i+1])).length;
 for(const [a,b] of [[0,1],[0,2],[1,2]])assert.ok(crossings(series[a],series[b])>=3,'lines '+a+' and '+b);
 const stored=defaultAimeBoard();stored.modules[0].count=12;
 assert.equal(validateAimeBoard(stored).modules[0].count,36);
 stored.modules[0].count=20;
 assert.equal(validateAimeBoard(stored).modules[0].count,20);
});
