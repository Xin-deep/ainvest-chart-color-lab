import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { examplesFor, defaultDensityCountOf } from '../dist/vendor/vis-lab/source/demos/examples.js';
const context={console,URL,setTimeout,clearTimeout};
runInNewContext(await readFile(new URL('../dist/vendor/vis-lab.bundle.js',import.meta.url),'utf8'),context);
globalThis.PaletteVisEngine=context.PaletteVisEngine;
const {compactTypes,defaultCompactBoard,validateCompactBoard,renderCompactBoard}=await import('../dist/scenes/custom.js');
test('all 25 public upstream examples are available without regression-only examples',()=>{
  assert.equal(compactTypes.length,25);
  assert.deepEqual(Array.from(compactTypes,t=>t.id),examplesFor('index').map(e=>e.id));
  assert.equal(new Set(defaultCompactBoard().modules.map(m=>m.type)).size,25);
});
test('v0.4.0 six-chart boards gain missing types while preserving module settings',()=>{
  const original={columns:2,selected:'retained',modules:[{id:'retained',type:'basic',count:31,height:400,span:'full',labels:'off'}]};
  const upgraded=validateCompactBoard(original);
  assert.equal(upgraded.modules.length,25);
  assert.equal(upgraded.selected,'retained');
  assert.equal(upgraded.columns,2);
  assert.equal(upgraded.modules[0].count,31);
  assert.equal(upgraded.modules[0].height,400);
  assert.equal(upgraded.modules[0].labels,'off');
  assert.equal(validateCompactBoard(upgraded).modules.length,25);
});
test('intentional removals survive reload and per-type data limits are respected',()=>{
  const board=defaultCompactBoard();
  board.modules=board.modules.filter(m=>m.type!=='pie');
  board.modules.find(m=>m.type==='radar-basic').count=1;
  board.modules.find(m=>m.type==='treemap-overall').count=54;
  board.modules.find(m=>m.type==='treemap-entry').count=40;
  const restored=validateCompactBoard(board);
  assert.equal(restored.modules.length,24);
  assert.equal(restored.modules.find(m=>m.type==='radar-basic').count,3);
  assert.equal(restored.modules.find(m=>m.type==='treemap-overall').count,54);
  assert.equal(restored.modules.find(m=>m.type==='treemap-entry').count,8);
});

test('default fixtures and heights follow the original Vis Lab examples',()=>{
  const board=defaultCompactBoard();
  for(const example of examplesFor('index')) {
    const module=board.modules.find(m=>m.type===example.id);
    assert.equal(module.count,defaultDensityCountOf(example));
    assert.equal(module.height,'auto');
  }
  assert.equal(board.modules.find(m=>m.type==='line').count,4);
  assert.match(renderCompactBoard(board),/25\/25/);
  const old=validateCompactBoard({catalogVersion:2,columns:3,modules:[{id:'line-old',type:'line',count:22,height:220,labels:'auto'}]});
  assert.equal(old.modules[0].count,4);
  assert.equal(old.modules[0].height,'auto');
});

test('chart density defaults to compact and survives experiment restore',()=>{
  const board=defaultCompactBoard();
  assert.equal(board.density,'compact');
  board.density='standard';
  assert.equal(validateCompactBoard(JSON.parse(JSON.stringify(board))).density,'standard');
  board.density='invalid';
  assert.equal(validateCompactBoard(board).density,'compact');
});

test('financial additions start empty and restore independently without filling the 25-chart board',async()=>{
  const {defaultFinancialBoard,validateFinancialBoard,renderFinancialExtras}=await import('../dist/scenes/financial-extras.js');
  const {newCompactModule}=await import('../dist/scenes/custom.js');
  const {parseImport}=await import('../dist/lib/palettes.js');
  const {presets}=await import('../dist/data/presets.js');
  const empty=defaultFinancialBoard();
  assert.equal(empty.modules.length,0);
  assert.equal(validateFinancialBoard({modules:[]}).modules.length,0);
  const module=newCompactModule('basic');module.count=12;
  const board={...empty,selected:module.id,modules:[module]};
  const session=parseImport(JSON.stringify({kind:'palette-lab-session',schemaVersion:1,baseline:presets[0],draft:presets[0],financialBoard:board})).session;
  const restored=validateFinancialBoard(session.financialBoard);
  assert.equal(restored.modules.length,1);assert.equal(restored.modules[0].count,12);
  assert.equal(restored.selected,module.id);assert.match(renderFinancialExtras(restored),/基础柱状图/);
  restored.modules=[];assert.equal(validateFinancialBoard(restored).modules.length,0);
  assert.equal(defaultCompactBoard().modules.length,25);
});

test('module appearance settings survive restore and reject unsupported texture values',()=>{
  const board=defaultCompactBoard(),line=board.modules.find(m=>m.type==='line-stack');
  assert.equal(line.lineWidth,'auto');assert.equal(line.texture,'none');
  line.lineWidth=3;line.texture='cross';
  const restored=validateCompactBoard(JSON.parse(JSON.stringify(board))).modules.find(m=>m.id===line.id);
  assert.equal(restored.lineWidth,3);assert.equal(restored.texture,'cross');
  line.lineWidth=100;line.texture='url(invalid)';
  const sanitized=validateCompactBoard(board).modules.find(m=>m.id===line.id);
  assert.equal(sanitized.lineWidth,8);assert.equal(sanitized.texture,'none');
});

test('module order, hiding and five-column layout survive restore',async()=>{
 const {moveCompactModule,setCompactModuleHidden,renderCompactCards}=await import('../dist/scenes/custom.js');
 const board=defaultCompactBoard();board.modules=board.modules.slice(0,4);board.columns=5;
 const [a,b,c,d]=board.modules;board.selected=b.id;
 setCompactModuleHidden(board,b.id,true);
 assert.equal(board.modules.length,4);assert.equal(board.selected,a.id);
 assert.ok(!renderCompactCards(board).includes(`data-module-id="${b.id}"`));
 moveCompactModule(board,d.id,0);assert.deepEqual(Array.from(board.modules.filter(m=>!m.hidden),m=>m.id),[d.id,a.id,c.id]);
 const restored=validateCompactBoard(JSON.parse(JSON.stringify(board)));
 assert.equal(restored.columns,5);assert.equal(restored.modules.find(m=>m.id===b.id).hidden,true);
 setCompactModuleHidden(restored,b.id,false);assert.equal(restored.selected,b.id);
 assert.match(renderCompactCards(restored),new RegExp(`data-module-id="${b.id}"`));
});

test('only two layout choices expose all 25 sparse/dense chart pairs',async()=>{
 const {createComparisonBoard,validateComparisonBoards,comparisonTemplatePanel}=await import('../dist/scenes/comparison.js');
 const board=createComparisonBoard();
 assert.equal(board.columns,2);assert.equal(board.modules.length,50);
 for(const def of compactTypes){
   const pair=board.modules.filter(m=>m.type===def.id);assert.equal(pair.length,2);
   const [few,many]=pair;assert.ok(few.count<many.count);assert.equal(few.series,many.series);
   assert.equal(few.comparisonLabel,'少量数据');assert.equal(many.comparisonLabel,'大量数据');
   assert.equal(few.comparisonVariant,'few');assert.equal(many.comparisonVariant,'many');
 }
 const html=comparisonTemplatePanel('all');assert.equal((html.match(/<option /g)||[]).length,2);
 assert.ok(html.includes('对比模板'));assert.ok(html.includes('自由布局'));
 board.columns=5;board.modules[0].hidden=true;
 const saved=validateComparisonBoards(JSON.parse(JSON.stringify({all:board}))).all;
 assert.equal(saved.modules.length,50);assert.equal(saved.columns,5);assert.equal(saved.modules[0].hidden,true);
 assert.equal(saved.modules[0].comparisonVariant,'few');
 const migrated=validateComparisonBoards({bars:{modules:[{...board.modules[0],count:7}]}}).all;
 assert.equal(migrated.modules.length,50);assert.equal(migrated.modules[0].count,7);
 assert.deepEqual(validateComparisonBoards(null),{});
});

test('fixed Sankey and waterfall comparison pairs use different valid data volumes',async()=>{
 const {createComparisonBoard}=await import('../dist/scenes/comparison.js');
 const {applyComparisonFixture}=await import('../scripts/comparison-fixtures.js');
 const {resolveWaterfall}=await import('../dist/vendor/vis-lab/source/charts/charts/waterfall/model.js');
 for(const module of createComparisonBoard().modules.filter(m=>m.type.startsWith('waterfall'))){
   const cfg=applyComparisonFixture({},module);assert.equal(cfg.items.length,module.count);
   const resolved=resolveWaterfall(cfg.items);assert.equal(resolved.total,100e9+(module.count-2)*-5e9);
 }
 const few=createComparisonBoard().modules.find(m=>m.type==='sankey-financial');
 const cfg=applyComparisonFixture({},few);assert.equal(cfg.nodes.length,few.count);
 for(const node of cfg.nodes){
   const incoming=cfg.links.filter(l=>l.target===node.id).reduce((sum,l)=>sum+l.value,0);
   const outgoing=cfg.links.filter(l=>l.source===node.id).reduce((sum,l)=>sum+l.value,0);
   if(incoming&&outgoing)assert.equal(incoming,outgoing);
 }
});
