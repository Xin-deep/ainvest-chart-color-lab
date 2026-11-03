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
// A patch that stops matching after an upstream update must fail the build, not disappear silently.
const applied=new Set();
const patchText=(text,from,to)=>{const next=text.replace(from,()=>to);if(next!==text)applied.add(String(from));return next;};
const chartPatches=[
  ["const barWidth = waterfallBarWidth(variant, x.bandwidth());", "const preferredBarWidth = waterfallBarWidth(variant, x.bandwidth()); const barWidth = host.__paletteLabWaterfallWidth?.(variant, preferredBarWidth, x.bandwidth()) ?? preferredBarWidth;"],
  ["const format = makeFormatter(b['number-format']);","const format = host.__paletteLabFormat || makeFormatter(b['number-format']);"],
  ["const format = makeFormatter(behavior['number-format']);","const format = host.__paletteLabFormat || makeFormatter(behavior['number-format']);"],
  ["const yFormat = stack === 'percent' ? pctFormat : format;","const yFormat = stack === 'percent' ? pctFormat : format; const y2Format=host.__paletteLabSecondaryFormat||yFormat;"],
  ["oppTicks, yS, { form: yForm, side: oppSide, format: yFormat","oppTicks, yS, { form: yForm, side: oppSide, format: y2Format"],
  ["side: oppSide, y: dual ? yS : yP, format: yFormat","side: oppSide, y: dual ? yS : yP, format: y2Format"]
];
const offlineAdapter={name:'offline-palette-adapter',setup(build){
  build.onLoad({filter:/charts\/charts\/(cartesian|pie|waterfall)\/index\.js$/},async({path})=>{
    let contents=await readFile(path,'utf8');
    for(const [from,to] of chartPatches)contents=patchText(contents,from,to);
    return {contents,loader:'js'};
  });
  build.onLoad({filter:/charts\/core\/(theme|palette)\.js$/},async({path})=>{
    let contents=await readFile(path,'utf8');
    if(path.endsWith('/theme.js'))contents=patchText(contents,/const load = async \(file\) =>[\s\S]*?const \[data, densityDoc\] = await Promise\.all\(\[load\('behavior.json'\), load\('density.json'\)\]\);/,'const data='+JSON.stringify(behavior)+',densityDoc='+JSON.stringify(density)+';');
    else{
      contents=patchText(contents,/const data = await \([\s\S]*?\)\.json\(\);/,'const data='+JSON.stringify(palette)+';');
      contents=patchText(contents,'export function resolveSeriesColors(host, { series }) {','export function resolveSeriesColors(host, { series }) {\n if(host.__paletteLabSeriesColors)return host.__paletteLabSeriesColors(series);');
    }
    return {contents,loader:'js'};
  });
}};
const shared={bundle:true,format:'iife',target:'es2022',minify:true,legalComments:'eof',nodePaths:[resolve(modulesRoot,'node_modules')],loader:{'.css':'text'}};
await build({...shared,entryPoints:[resolve(root,'scripts/vis-engine-entry.js')],outfile:resolve(root,'dist/vendor/vis-lab.bundle.js'),globalName:'PaletteVisEngine',plugins:[offlineAdapter]});
const missed=[...chartPatches.map(([from])=>from),'export function resolveSeriesColors(host, { series }) {'].filter(from=>!applied.has(from));
if(missed.length)throw new Error('Vis Lab 补丁未命中，上游代码可能已变：\n'+missed.join('\n'));
await writeFile(resolve(root,'dist/vendor/vis-lab/BUILD-NOTES.md'),'Generated from the pinned source snapshot by scripts/build-vis.mjs. Upstream JSON is inlined and resolveSeriesColors gains an optional host palette bridge with ordered palette reuse for overflow data items. Data waterfall bars fit the available band. Combination charts take line colors from the host line palette. The world heatmap keeps the pinned upstream CDN map and flags, so that chart alone needs network. D3 7.9.0 and esbuild 0.25.9 are pinned build dependencies; apart from the world heatmap the runtime bundle needs no network.\n');
console.log('已构建 Vis Lab 离线组件。');
