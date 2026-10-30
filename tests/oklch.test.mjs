import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hexToOklch,checkOklch,oklchToLinearSrgb,oklchCss} from '../dist/lib/oklch.js';
const near=(actual,expected,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
test('sRGB primaries match reference OKLCH coordinates',()=>{
 const red=hexToOklch('#FF0000');near(red.l,.627955364);near(red.c,.257683304);near(red.h,29.23388028);
 const green=hexToOklch('#00FF00');near(green.l,.866439618);near(green.c,.294827225);
 const blue=hexToOklch('#0000FF');near(blue.l,.452013718);near(blue.c,.313214389);
});
test('neutral colors have no hue and canonical CSS uses none',()=>{
 for(const hex of ['#000000','#FFFFFF','#808080']){const value=hexToOklch(hex);assert.equal(value.c,0);assert.equal(value.h,null);assert.match(oklchCss(value),/ none\)$/);assert.deepEqual(checkOklch(value),{valid:true,inSrgb:true});}
});
test('conversion round trips sRGB without rounding before gamut checks',()=>{
 for(let i=0;i<256;i++){
   const channels=[i,(i*73)%256,(i*151)%256],hex='#'+channels.map(v=>v.toString(16).padStart(2,'0')).join('');
   const value=hexToOklch(hex);assert.equal(checkOklch(value).inSrgb,true);
   oklchToLinearSrgb(value).forEach((v,j)=>{const c=channels[j]/255;near(v,c<=.04045?c/12.92:((c+.055)/1.055)**2.4);});
 }
});
test('legal OKLCH values can be outside sRGB and chroma has no universal .4 ceiling',()=>{
 assert.deepEqual(checkOklch({l:.5,c:.5,h:30}),{valid:true,inSrgb:false});
 for(const value of [{l:-.1,c:.1,h:20},{l:.5,c:-1,h:20},{l:.5,c:.1,h:null},{l:NaN,c:0,h:null}])assert.equal(checkOklch(value).valid,false);
 assert.equal(checkOklch({l:.5,c:.1,h:740}).valid,true);
});
