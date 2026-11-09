import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneChartSlots,sceneViewBoxes,sceneModule,sceneChartConfig,sceneChartLayer} from '../dist/data/scene-charts.js';
import {aimeChartConfig} from '../dist/data/aime-reference.js';

const config=(scene,id,extra={})=>{const m={...sceneModule(sceneChartSlots[scene].find(s=>s.id===id)),...extra};return sceneChartConfig(m)||aimeChartConfig(m);};

test('every slot sits inside its page and the layer places it in percent',()=>{
 for(const [scene,slots] of Object.entries(sceneChartSlots)){
  const [x0,y0,w,h]=sceneViewBoxes[scene];
  for(const {rect:[x,y,sw,sh]} of slots)assert.ok(x>=x0&&y>=y0&&x+sw<=x0+w&&y+sh<=y0+h);
  const html=sceneChartLayer(scene);
  assert.equal((html.match(/data-chart-id=/g)||[]).length,slots.length);
  assert.match(html,new RegExp(`aspect-ratio:${w}/${h}`));
 }
});

test('the yield combination keeps Factory1 above Factory2 and its line on the second axis',()=>{
 for(const [scene,id] of [['terminal','web-yield'],['workspace','terminal-yield']]){
  const {series,categories}=config(scene,id);
  assert.equal(series.length,3);assert.equal(series[2].type,'line');assert.equal(series[2].axis,'secondary');
  assert.equal(series[0].data.length,categories.length);
  series[0].data.forEach((v,i)=>assert.ok(v>series[1].data[i]));
 }
});

test('the bonds line has one series with an area that climbs clearly',()=>{
 for(const [scene,id] of [['terminal','web-bonds'],['workspace','terminal-bonds']]){
  const {series}=config(scene,id),data=series[0].data,third=Math.floor(data.length/3),mean=list=>list.reduce((a,b)=>a+b,0)/list.length;
  assert.equal(series.length,1);assert.equal(series[0].area,true);
  assert.ok(mean(data.slice(-third))-mean(data.slice(0,third))>.3);
 }
});

test('the ETF donuts show seven items and the dominance bars stay at 100%',()=>{
 for(const [scene,id] of [['terminal','web-etf'],['workspace','terminal-etf']])assert.equal(config(scene,id).items.length,7);
 for(const [scene,id,n] of [['terminal','web-dominance',5],['workspace','terminal-dominance',7]]){
  const {series,stack,categories}=config(scene,id);
  assert.equal(stack,'percent');assert.equal(categories.length,n);
  assert.deepEqual(series.map(s=>s.name),['Bitcoin','Ethereum','BNB','USDT','Others']);
 }
});

test('per-chart settings keep only known fields and values',async()=>{
 const {normalizeSceneCharts}=await import('../dist/lib/chart-style.js');
 assert.deepEqual(normalizeSceneCharts({'web-yield':{labels:'on',area:'on',lineWidth:'2',texture:'dots',extra:1},'web-cap':{labels:'maybe'},'bad id!':{labels:'on'}}),{'web-yield':{labels:'on',area:'on',lineWidth:2,texture:'dots'}});
 assert.deepEqual(normalizeSceneCharts([1,2]),{});
});
test('area and labels follow the chart settings',()=>{
 assert.equal(config('terminal','web-bonds').series[0].area,true);
 assert.equal(config('terminal','web-bonds',{area:'off'}).series[0].area,false);
 assert.equal(config('terminal','web-yield',{area:'on'}).series[2].area,true);
 assert.equal(config('terminal','web-cap').dataLabel,undefined);
});
test('counts, series and DataZoom follow the chart settings, and bars vary from day to day',async()=>{
 const {normalizeSceneCharts}=await import('../dist/lib/chart-style.js');
 assert.deepEqual(normalizeSceneCharts({'web-cap':{count:'20',series:6,zoom:'on'},'web-rates':{count:0,series:99}}),{'web-cap':{count:20,series:6,zoom:'on'}});
 const cap=config('workspace','terminal-cap',{count:12,series:6,zoom:'on'});
 assert.equal(cap.categories.length,12);assert.equal(cap.series.length,6);assert.deepEqual(cap.zoom,{start:0,end:1});
 assert.equal(config('workspace','terminal-cap').zoom,false);
 const totals=cap.categories.map((_,i)=>cap.series.reduce((sum,s)=>sum+s.data[i],0));
 assert.ok(Math.max(...totals)/Math.min(...totals)>1.3);
 const dom=config('workspace','terminal-dominance'),first=dom.series.map(s=>s.data[0]/dom.series.reduce((a,t)=>a+t.data[0],0));
 assert.ok(dom.categories.some((_,i)=>Math.abs(dom.series[0].data[i]/dom.series.reduce((a,t)=>a+t.data[i],0)-first[0])>.1));
 const yieldCfg=config('terminal','web-yield',{count:9,series:6});
 assert.equal(yieldCfg.series.filter(s=>s.type==='bar').length,5);
 yieldCfg.series[0].data.forEach((v,i)=>assert.ok(v>yieldCfg.series[1].data[i]));
});
