import { normalizeColor } from './colors.js';
// CSS Color 4 reference conversions, D65: https://www.w3.org/TR/css-color-4/#color-conversion-code
const oklchMultiply=(matrix,vector)=>matrix.map(row=>row.reduce((sum,value,index)=>sum+value*vector[index],0));
const oklchRgbToXyz=[[.4123907992659595,.357584339383878,.1804807884018343],[.2126390058715104,.715168678767756,.0721923153607337],[.0193308187155918,.1191947797946259,.9505321522496607]];
const oklchXyzToLms=[[.819022437996703,.3619062600528904,-.1288737815209879],[.0329836539323885,.9292868615863434,.0361446663506424],[.0481771893596242,.2642395317527308,.6335478284694309]];
const oklchLmsToLab=[[.210454268309314,.7936177747023054,-.0040720430116193],[1.9779985324311684,-2.4285922420485799,.450593709617411],[.0259040424655478,.7827717124575296,-.8086757549230774]];
export function linearSrgbToOklab(rgb){return oklchMultiply(oklchLmsToLab,oklchMultiply(oklchXyzToLms,oklchMultiply(oklchRgbToXyz,rgb)).map(Math.cbrt));}
export function hexToOklch(hex){
  const rgb=normalizeColor(hex).slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const [l,a,b]=linearSrgbToOklab(rgb);
  const c=Math.hypot(a,b),neutral=c<=.000004;
  return {l:Math.min(1,Math.max(0,l)),c:neutral?0:c,h:neutral?null:(Math.atan2(b,a)*180/Math.PI+360)%360};
}
export function oklchToLinearSrgb({l,c,h}){
  const angle=(h??0)*Math.PI/180;
  const lms=oklchMultiply([[1,.3963377773761749,.2158037573099136],[1,-.1055613458156586,-.0638541728258133],[1,-.0894841775298119,-1.2914855480194092]],[l,c*Math.cos(angle),c*Math.sin(angle)]).map(v=>v**3);
  const xyz=oklchMultiply([[1.2268798758459243,-.5578149944602171,.2813910456659647],[-.0405757452148008,1.112286803280317,-.0717110580655164],[-.0763729366746601,-.4214933324022432,1.5869240198367816]],lms);
  return oklchMultiply([[3.2409699419045226,-1.537383177570094,-.4986107602930034],[-.9692436362808796,1.8759675015077202,.0415550574071756],[.0556300796969937,-.2039769588889765,1.0569715142428786]],xyz);
}
export function checkOklch(value){
  const {l,c,h}=value,valid=Number.isFinite(l)&&l>=0&&l<=1&&Number.isFinite(c)&&c>=0&&(Number.isFinite(h)||(h===null&&c<=.000004));
  return {valid,inSrgb:valid&&oklchToLinearSrgb(value).every(v=>v>=-1e-7&&v<=1+1e-7)};
}
export function oklchCss(value){return `oklch(${(value.l*100).toFixed(3)}% ${value.c.toFixed(5)} ${value.h===null?'none':value.h.toFixed(3)})`;}
