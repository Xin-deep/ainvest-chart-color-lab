import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartColorAt,chartColorSlot,completePiePreview} from '../scripts/chart-palette.js';
import {EXAMPLES,buildConfig} from '../dist/vendor/vis-lab/source/demos/examples.js';

test('overflow items reuse the palette in order and pick the same editable color',()=>{
 const colors=['#123456','#ABCDEF','#FF0000'];
 for(let index=0;index<12;index++){
   assert.equal(chartColorAt(colors,index,'#999999'),colors[index%3]);
   assert.equal(chartColorSlot(index,null,3),index%3);
 }
 assert.equal(chartColorAt([],1,'#999999'),'#999999');
 assert.equal(chartColorSlot(0,[2,0,1],3),2);
 assert.equal(chartColorSlot(-1,null,3),-1);
});

test('all generic pie legend entries have visible values at both data volumes',()=>{
 for(const type of ['pie','donut'])for(const count of [3,10,12]){
   const example=EXAMPLES.find(e=>e.id===type),cfg=buildConfig(example,{theme:'ainvest',platform:'pc',density:count,animation:false});
   const before=structuredClone(cfg.items);
   const result=completePiePreview(cfg,{type});
   assert.equal(result.items.length,count);assert.ok(result.items.every(item=>item.value>0&&Number.isFinite(item.value)));
   assert.deepEqual(cfg.items,before);
   assert.deepEqual(result.items.map(i=>i.name),cfg.items.map(i=>i.name));
 }
});

test('business fixtures and line gaps keep their original values',()=>{
 const cfg={items:[{name:'zero',value:0},{name:'null',value:null}]};
 assert.equal(completePiePreview(cfg,{type:'donut',fixture:'aime-factors'}),cfg);
 assert.equal(completePiePreview(cfg,{type:'donut',fixture:'financial-business'}),cfg);
 assert.equal(completePiePreview(cfg,{type:'line'}),cfg);
});
