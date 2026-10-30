import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitWaterfallBarWidth} from '../scripts/waterfall-layout.js';

test('data waterfall bars stay inside their slots and leave nonnegative connector gaps',()=>{
 for(const columns of [1,2,3,4,5])for(const count of [3,12,50])for(const canvas of [800,1280,1800]){
   const plot=(canvas-(columns-1)*6)/columns-18,slot=plot/count;
   const width=fitWaterfallBarWidth('data',110,slot);
   assert.ok(width>0&&width<=110&&width<slot);
   for(let i=0;i<count;i++){
     const center=(i+.5)*slot;
     assert.ok(center-width/2>=0);assert.ok(center+width/2<=plot+1e-8);
     if(i+1<count)assert.ok(center+width/2<(i+1.5)*slot-width/2);
   }
 }
});

test('wide data bars and standard waterfall widths retain their preferred size',()=>{
 assert.equal(fitWaterfallBarWidth('data',110,150),110);
 assert.equal(fitWaterfallBarWidth('standard',64,100),64);
 assert.equal(fitWaterfallBarWidth('standard',12,18),12);
});
