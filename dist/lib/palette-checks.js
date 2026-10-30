import { normalizeColor } from './colors.js';
import { hexToOklch, checkOklch, linearSrgbToOklab } from './oklch.js';
export const checkVisionModes={normal:'正常视觉',protan:'红色觉缺陷',deutan:'绿色觉缺陷',tritan:'蓝色觉缺陷'};
// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear sRGB.
// https://doi.org/10.1109/TVCG.2009.113 ; blue-cone simulation is an approximation.
const checkCvdMatrices={
 protan:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],
 deutan:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]],
 tritan:[[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]]
};
const checkBound=(value,min,max)=>Math.min(max,Math.max(min,value));
const checkDecode=value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
const checkEncode=value=>value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055;
const checkRgb=hex=>normalizeColor(hex).slice(1).match(/../g).map(value=>parseInt(value,16)/255);
const checkHex=rgb=>'#'+rgb.map(value=>Math.round(checkBound(value,0,1)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export function defaultCheckSettings(){return {vision:'normal',background:'card',customBackground:'#FFFFFF',opacity:1,deltaThreshold:10,contrastTarget:3};}
export function normalizeCheckSettings(input={}){
 const settings=defaultCheckSettings(),number=(value,fallback,min,max)=>Number.isFinite(Number(value))?checkBound(Number(value),min,max):fallback;
 if(!input||typeof input!=='object')return settings;
 settings.vision=Object.hasOwn(checkVisionModes,input.vision)?input.vision:'normal';
 settings.background=['card','page','custom'].includes(input.background)?input.background:'card';
 try{if(input.customBackground)settings.customBackground=normalizeColor(input.customBackground);}catch{}
 settings.opacity=number(input.opacity,1,.01,1);settings.deltaThreshold=number(input.deltaThreshold,10,0,100);
 settings.contrastTarget=[3,4.5,7].includes(Number(input.contrastTarget))?Number(input.contrastTarget):3;
 return settings;
}
export function simulateLinearRgb(rgb,vision='normal'){
 const matrix=checkCvdMatrices[vision];return matrix?matrix.map(row=>checkBound(row.reduce((sum,value,index)=>sum+value*rgb[index],0),0,1)):[...rgb];
}
export function deltaEOK(labA,labB){return Math.hypot(...labA.map((value,index)=>value-labB[index]))*100;}
export function contrastRatio(foreground,background,opacity=1){
 const bg=checkRgb(background),fg=checkRgb(foreground).map((value,index)=>value*opacity+bg[index]*(1-opacity));
 const luminance=rgb=>rgb.map(checkDecode).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export function buildPaletteChecks(colors,background,settingsInput){
 const settings=normalizeCheckSettings(settingsInput),bg=checkRgb(background),modeData={};
 const entries=colors.map((color,index)=>{
   const value=hexToOklch(color.hex),state=checkOklch(value),painted=checkRgb(color.hex).map((v,i)=>v*settings.opacity+bg[i]*(1-settings.opacity));
   return {index,name:color.name,hex:color.hex,value,state,painted,contrast:contrastRatio(color.hex,background,settings.opacity)};
 });
 for(const vision of Object.keys(checkVisionModes)){
   const samples=entries.map(entry=>{const linear=simulateLinearRgb(entry.painted.map(checkDecode),vision);return {lab:linearSrgbToOklab(linear),hex:checkHex(linear.map(checkEncode))};});
   const pairs=[];for(let a=0;a<samples.length;a++)for(let b=a+1;b<samples.length;b++)pairs.push({a,b,delta:deltaEOK(samples[a].lab,samples[b].lab)});
   pairs.sort((a,b)=>a.delta-b.delta||a.a-b.a||a.b-b.b);
   modeData[vision]={samples,pairs,nearest:pairs[0]||null,closeCount:pairs.filter(pair=>pair.delta<settings.deltaThreshold).length};
 }
 const active=modeData[settings.vision];
 for(const entry of entries){
   entry.nearest=active.pairs.find(pair=>pair.a===entry.index||pair.b===entry.index)||null;
   entry.oklchPass=entry.state.valid;
   entry.deltaPass=entry.nearest?entry.nearest.delta>=settings.deltaThreshold:null;
   entry.contrastPass=entry.contrast>=settings.contrastTarget;
 }
 const lightness=entries.map(entry=>entry.value.l*100),chroma=entries.map(entry=>entry.value.c);
 return {settings,background,entries,modes:modeData,validCount:entries.filter(entry=>entry.state.valid).length,contrastPass:entries.filter(entry=>entry.contrast>=settings.contrastTarget).length,lightnessRange:entries.length?[Math.min(...lightness),Math.max(...lightness)]:null,chromaRange:entries.length?[Math.min(...chroma),Math.max(...chroma)]:null};
}

export function buildPaletteCheckReport(palette,theme,role,settingsInput){
 const settings=normalizeCheckSettings(settingsInput);
 const background=settings.background==='custom'?settings.customBackground:palette.themes[theme].surface[settings.background==='page'?0:1].hex;
 return buildPaletteChecks(palette.themes[theme][role],background,settings);
}
