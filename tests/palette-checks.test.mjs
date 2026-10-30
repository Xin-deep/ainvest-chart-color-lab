import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contrastRatio,deltaEOK,simulateLinearRgb,buildPaletteChecks,defaultCheckSettings,normalizeCheckSettings} from '../dist/lib/palette-checks.js';
import {renderColorChecks} from '../dist/scenes/color-checks.js';
import {presets} from '../dist/data/presets.js';
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('WCAG contrast reference values and symmetry are correct',()=>{
 near(contrastRatio('#000','#fff'),21);near(contrastRatio('#fff','#000'),21);near(contrastRatio('#123456','#123456'),1);
 near(contrastRatio('#777777','#fff'),4.478089453577214);assert.ok(contrastRatio('#777777','#fff')<4.5);
 near(contrastRatio('#000','#fff',0),1);assert.ok(contrastRatio('#000','#fff',.2)<contrastRatio('#000','#fff'));
});
test('Delta E OK is Euclidean OKLab distance times 100, not CIEDE2000',()=>{
 near(deltaEOK([0,0,0],[1,0,0]),100);near(deltaEOK([.5,.1,.2],[.5,.1,.2]),0);
 near(deltaEOK([0,0,0],[.1,.2,.2]),30);near(deltaEOK([.2,.1,0],[.5,0,.3]),deltaEOK([.5,0,.3],[.2,.1,0]));
});
test('CVD matrices operate in linear RGB and clip to displayable gamut',()=>{
 assert.deepEqual(simulateLinearRgb([1,0,0],'protan'),[.152286,.114503,0]);
 assert.deepEqual(simulateLinearRgb([.2,.4,.6],'normal'),[.2,.4,.6]);
 for(const vision of ['protan','deutan','tritan']){assert.deepEqual(simulateLinearRgb([0,0,0],vision),[0,0,0]);simulateLinearRgb([1,1,1],vision).forEach(value=>near(value,1,2e-6));}
});
test('all pairs are checked, exact duplicates and single-color palettes are handled',()=>{
 const colors=[{name:'A',hex:'#265FFC'},{name:'B',hex:'#265FFC'},{name:'C',hex:'#FFFFFF'}];
 const report=buildPaletteChecks(colors,'#FFFFFF',defaultCheckSettings());
 assert.equal(report.validCount,3);assert.equal(report.contrastPass,2);
 for(const mode of Object.values(report.modes)){assert.equal(mode.pairs.length,3);assert.equal(mode.nearest.delta,0);assert.deepEqual([mode.nearest.a,mode.nearest.b],[0,1]);}
 assert.equal(buildPaletteChecks(colors.slice(0,1),'#FFFFFF',{}).modes.normal.nearest,null);
});
test('threshold comparisons use unrounded values and settings are normalized',()=>{
 const settings=normalizeCheckSettings({contrastTarget:4.5,opacity:.2,deltaThreshold:12,vision:'deutan',background:'custom',customBackground:'#abc'});
 assert.equal(settings.customBackground,'#AABBCC');assert.equal(settings.opacity,.2);
 const report=buildPaletteChecks([{name:'gray',hex:'#777777'}],'#FFFFFF',{contrastTarget:4.5});assert.equal(report.contrastPass,0);
 const invalid=normalizeCheckSettings({vision:'bad',customBackground:'url(x)',deltaThreshold:-20,opacity:5});assert.equal(invalid.vision,'normal');assert.equal(invalid.deltaThreshold,0);assert.equal(invalid.opacity,1);assert.equal(invalid.customBackground,'#FFFFFF');
});
test('checks show all three independent metrics and escape user palette names',()=>{
 const palette=structuredClone(presets[0]);palette.name='<script>bad</script>';
 const html=renderColorChecks(palette,'light','categorical',defaultCheckSettings());
 for(const text of ['OKLCH / OKLab','ΔE 色差','对比度','参考阈值','图形不透明度'])assert.ok(html.includes(text));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});

test('each color reports independent checks and updates both ends of changed color pairs',()=>{
 const colors=[{name:'A',hex:'#265FFC'},{name:'B',hex:'#265FFC'},{name:'C',hex:'#FFFFFF'}];
 const before=buildPaletteChecks(colors,'#FFFFFF',{});
 assert.equal(before.entries[0].deltaPass,false);assert.equal(before.entries[1].deltaPass,false);
 assert.equal(before.entries[2].contrastPass,false);assert.equal(before.entries[0].oklchPass,true);
 colors[1].hex='#000000';
 const after=buildPaletteChecks(colors,'#FFFFFF',{});
 assert.equal(after.entries[0].deltaPass,true);assert.equal(after.entries[1].deltaPass,true);
 assert.equal(after.entries[1].contrastPass,true);
 assert.equal(buildPaletteChecks(colors.slice(0,1),'#FFFFFF',{}).entries[0].deltaPass,null);
});

test('inline badges share report thresholds, background, vision and contain no gamut analysis',async()=>{
 const {buildPaletteCheckReport}=await import('../dist/lib/palette-checks.js');
 const {renderColorCheckBadges}=await import('../dist/scenes/color-checks.js');
 const p=structuredClone(presets[0]);
 const report=buildPaletteCheckReport(p,'light','categorical',{background:'custom',customBackground:'#777777',vision:'deutan',contrastTarget:7,deltaThreshold:100});
 assert.equal(report.background,'#777777');
 for(const entry of report.entries){
   const pair=report.modes.deutan.pairs.find(pair=>pair.a===entry.index||pair.b===entry.index);
   assert.deepEqual(entry.nearest,pair);assert.equal(entry.deltaPass,false);assert.equal(entry.contrastPass,entry.contrast>=7);
   const html=renderColorCheckBadges(entry,report);
   assert.equal((html.match(/data-check-metric=/g)||[]).length,3);
   assert.ok(html.includes('未达到参考要求'));assert.ok(html.includes('≥ 100'));assert.ok(!html.includes('sRGB'));
 }
 assert.ok(!renderColorChecks(p,'light','categorical',defaultCheckSettings()).includes('sRGB'));
});
