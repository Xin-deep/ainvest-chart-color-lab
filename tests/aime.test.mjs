import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseImport } from '../dist/lib/palettes.js';
import { presets } from '../dist/data/presets.js';
import { aimeChartConfig } from '../dist/data/aime-reference.js';
const context={console,URL,setTimeout,clearTimeout};
runInNewContext(await readFile(new URL('../dist/vendor/vis-lab.bundle.js',import.meta.url),'utf8'),context);
globalThis.PaletteVisEngine=context.PaletteVisEngine;
const {defaultAimeBoard,validateAimeBoard,renderAimeScene}=await import('../dist/scenes/aime.js');
const {defaultCompactBoard,newCompactModule}=await import('../dist/scenes/custom.js');
test('Aime uses five shared chart types with independent mobile scene state',()=>{
 const board=defaultAimeBoard(),other=defaultCompactBoard();
 assert.equal(board.platform,'mobile');assert.equal(board.modules.length,5);assert.equal(other.modules.length,25);
 assert.deepEqual(board.modules.map(m=>m.type),['line-multi','market-cap-race','donut','stack','grouped3']);
 const html=renderAimeScene(board,'dark');assert.match(html,/data-aime-theme="dark"/);assert.match(html,/Fundamentals remain rock-solid/);assert.equal((html.match(/data-chart-id=/g)||[]).length,5);
});
test('reference datasets retain financial values and respect module data counts',()=>{
 const board=defaultAimeBoard();
 assert.deepEqual(aimeChartConfig(board.modules[1]).items.map(i=>i.value),[23,14]);
 const sum=aimeChartConfig(board.modules[2]).items.reduce((sum,item)=>sum+item.value,0);assert.ok(Math.abs(sum-155250000)<.01);
 board.modules[0].count=18;board.modules[0].series=4;
 assert.equal(aimeChartConfig(board.modules[0]).series.length,4);assert.equal(aimeChartConfig(board.modules[0]).series[0].data.length,18);
});
test('new chart modules and fixtures survive full experiment import without polluting the board',()=>{
 const aime=defaultAimeBoard();aime.modules.push(newCompactModule('radar-basic'));aime.density='standard';
 const parsed=parseImport(JSON.stringify({kind:'palette-lab-session',schemaVersion:1,baseline:presets[0],draft:presets[0],scene:'aime',aimeBoard:aime}));
 const restored=validateAimeBoard(parsed.session.aimeBoard);assert.equal(restored.modules.length,6);assert.equal(restored.platform,'mobile');assert.equal(restored.density,'standard');assert.equal(restored.modules[0].fixture,'aime-growth');assert.equal(restored.modules[1].count,2);
 assert.equal(defaultCompactBoard().modules.length,25);
 const empty=validateAimeBoard({...aime,modules:[]});assert.equal(empty.modules.length,0);
});
