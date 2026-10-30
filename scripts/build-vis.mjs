import { readFile,writeFile,readdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const modulesRoot=process.env.PALETTE_LAB_BUILD_ROOT||root;
const require=createRequire(resolve(modulesRoot,'package.json'));
const {build}=require('esbuild');
const upstream=resolve(root,'dist/vendor/vis-lab/source');
const readJSON=async name=>JSON.parse(await readFile(resolve(upstream,'tokens',name),'utf8'));
const [behavior,density,palette]=await Promise.all(['behavior.json','density.json','palette.json'].map(readJSON));
const iconDir=resolve(upstream,'assets/company-icons/ainvest');
const iconData=Object.fromEntries(await Promise.all((await readdir(iconDir)).filter(f=>f.endsWith('.png')).map(async f=>[f,'data:image/png;base64,'+(await readFile(resolve(iconDir,f))).toString('base64')])));
await build({entryPoints:[resolve(root,'scripts/vis-engine-entry.js')],outfile:resolve(root,'dist/vendor/vis-lab.bundle.js'),bundle:true,format:'iife',globalName:'PaletteVisEngine',target:'es2022',minify:true,legalComments:'eof',nodePaths:[resolve(modulesRoot,'node_modules')],loader:{'.css':'text'},plugins:[{name:'offline-palette-adapter',setup(build){
  build.onLoad({filter:/demos\/company-icons\.js$/},async({path})=>({contents:(await readFile(path,'utf8')).replace(/const AINVEST_ICON_ROOT = .*?;/,`const INLINE_ICONS=${JSON.stringify(iconData)};`).replace('new URL(file, AINVEST_ICON_ROOT).href','INLINE_ICONS[file]'),loader:'js'}));
  build.onLoad({filter:/charts\/charts\/(cartesian|pie|waterfall)\/index\.js$/},async({path})=>({contents:(await readFile(path,'utf8')).replace("const barWidth = waterfallBarWidth(variant, x.bandwidth());", "const preferredBarWidth = waterfallBarWidth(variant, x.bandwidth()); const barWidth = host.__paletteLabWaterfallWidth?.(variant, preferredBarWidth, x.bandwidth()) ?? preferredBarWidth;").replace("const format = makeFormatter(b['number-format']);","const format = host.__paletteLabFormat || makeFormatter(b['number-format']);").replace("const format = makeFormatter(behavior['number-format']);","const format = host.__paletteLabFormat || makeFormatter(behavior['number-format']);").replace("const yFormat = stack === 'percent' ? pctFormat : format;","const yFormat = stack === 'percent' ? pctFormat : format; const y2Format=host.__paletteLabSecondaryFormat||yFormat;").replace("oppTicks, yS, { form: yForm, side: oppSide, format: yFormat","oppTicks, yS, { form: yForm, side: oppSide, format: y2Format").replace("side: oppSide, y: dual ? yS : yP, format: yFormat","side: oppSide, y: dual ? yS : yP, format: y2Format"),loader:'js'}));
  build.onLoad({filter:/charts\/charts\/waterfall\/render\.js$/},async({path})=>({contents:(await readFile(path,'utf8')).replace("const { x, top, height } = geometry;", "const { x, top, height, width } = geometry;").replace("const label = layer.append('g')", "const widths=[...measureTexts(host,nameLines,'dv-waterfall-segment-label__name'),...measureTexts(host,[format(segment.value)],'dv-waterfall-segment-label__value')]; if(Math.max(...widths)>width-padX*2)return; const label = layer.append('g')"),loader:'js'}));
  build.onLoad({filter:/charts\/core\/(theme|palette)\.js$/},async({path})=>{
    let contents=await readFile(path,'utf8');
    if(path.endsWith('/theme.js'))contents=contents.replace(/const load = async \(file\) =>[\s\S]*?const \[data, densityDoc\] = await Promise\.all\(\[load\('behavior.json'\), load\('density.json'\)\]\);/,`const data=${JSON.stringify(behavior)},densityDoc=${JSON.stringify(density)};`);
    else contents=contents.replace(/const data = await \([\s\S]*?\)\.json\(\);/,`const data=${JSON.stringify(palette)};`).replace('export function resolveSeriesColors(host, { series }) {','export function resolveSeriesColors(host, { series }) {\n if(host.__paletteLabResolveColor)return series.map((_,i)=>host.__paletteLabResolveColor(i));');
    return {contents,loader:'js'};
  });
}}]});
await writeFile(resolve(root,'dist/vendor/vis-lab/BUILD-NOTES.md'),'Generated from the pinned source snapshot by scripts/build-vis.mjs. Upstream JSON is inlined and resolveSeriesColors gains an optional host palette bridge with ordered palette reuse for overflow data items. Data waterfall bars fit the available band and omit labels that do not fit. D3 7.9.0 and esbuild 0.25.9 are pinned build dependencies; the runtime bundle needs no network.\n');
console.log('已构建 Vis Lab 离线组件。');
