import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderWorkspaceTerminal,applyWorkspacePalette} from '../dist/scenes/workspace-terminal.js';
import {workspaceReference} from '../dist/data/workspace-reference.js';
import {presets} from '../dist/data/presets.js';

test('desktop workspace keeps all eleven widgets, source labels and measured chart paths',()=>{
 const html=renderWorkspaceTerminal();
 assert.equal((html.match(/data-workspace-widget=/g)||[]).length,11);
 for(const label of ['BBD ·1D ·NASDAQ','Date:2024-09-19 Friday','VOLUME:12.98','ETF Holding Distribution','155.25M','News Wire','Sunday Jul20,2025','Sep 24,2026','Popular Portfolios','AIME Super Portfolio','Floating Rate Reserve','Total Account Value','$51,996.13','+$467.89 (+0.13%)'])assert.ok(html.includes(label),label);
 assert.ok(!html.includes('undefined'));assert.match(html,/viewBox="63 37 1718 1339"/);
 for(const theme of ['light','dark']){
  const ref=workspaceReference[theme];
  assert.equal(ref.lines.rates.length,5);assert.equal(ref.lines.bonds.length,3);
  for(const points of [...ref.lines.rates,...ref.lines.bonds,ref.lines.stock,ref.lines.pnl])assert.ok(points.length>250,'curve retains thin antialiased source segments');
  assert.ok(ref.bars.volume.length>70);assert.ok(ref.bars.dominance.length>20);
 }
});

test('workspace theme surfaces and series update independently of the web scene',()=>{
 const vars=new Map(),page={style:{setProperty:(k,v)=>vars.set(k,v)},dataset:{bound:'true'},querySelectorAll:()=>[]};
 const mark={dataset:{colorRole:'categorical',colorIndex:'0',terminalSlot:'0',terminalBase:'#265FFC'},style:{}};
 const host={style:{setProperty:()=>{}},querySelector:s=>s==='.terminal-scene'||s==='.workspace-terminal'?page:null,querySelectorAll:s=>s==='[data-terminal-base]'?[mark]:[]};
 const palette=structuredClone(presets[0]);
 applyWorkspacePalette(host,palette,'dark');assert.equal(vars.get('--ws-frame'),'#000000');assert.equal(vars.get('--term-bg'),'#141414');
 palette.themes.dark.categorical[0].hex='#AABBCC';applyWorkspacePalette(host,palette,'dark');assert.equal(mark.style.color,'#AABBCC');
 applyWorkspacePalette(host,palette,'light');assert.equal(vars.get('--ws-frame'),'#F4F5F7');assert.equal(vars.get('--term-bg'),'#FFFFFF');assert.equal(mark.style.color,'#265FFC');
});

test('the holding donut and sector strip each show seven items',()=>{
 const html=renderWorkspaceTerminal();
 assert.equal(html.match(/<path[^>]*stroke-width="\.5" data-terminal-area\/>/g)?.length,7);
 assert.equal(html.match(/<rect[^>]*y="742"[^>]*data-terminal-area/g)?.length,7);
 const widths=[...html.matchAll(/<rect x="[\d.]+" y="742" width="([\d.]+)"/g)].reduce((sum,m)=>sum+Number(m[1]),0);
 assert.ok(Math.abs(widths-377)<.01);
});

test('the yield combination takes its legend, line and points from the line palette',()=>{
 const html=renderWorkspaceTerminal(),marks=[...html.matchAll(/data-color-role="line"[^>]*aria-label="([^"]*)"/g)].map(m=>m[1]);
 assert.equal(marks.filter(label=>label.startsWith('Factory3')).length,8);
 assert.equal(marks.filter(label=>label.startsWith('yield')).length,1);
 assert.equal(marks.length,9);
});

test('the P&L switch turns the curve, area and daily figure to falling',()=>{
 const up=renderWorkspaceTerminal(),down=renderWorkspaceTerminal({pnlTrend:'down'});
 const line=html=>html.match(/<path d="([^"]+)"[^>]*data-workspace-green="pnl"/)[1].slice(1).split('L').map(p=>p.split(' ').map(Number));
 const riseUp=line(up),riseDown=line(down);
 // SVG y grows downward, so a falling curve ends lower on the page than it starts.
 assert.ok(riseUp.at(-1)[1]<riseUp[0][1]);assert.ok(riseDown.at(-1)[1]>riseDown[0][1]);
 const ys=points=>points.map(p=>p[1]);
 assert.ok(Math.abs(Math.min(...ys(riseUp))-Math.min(...ys(riseDown)))<1e-6);assert.ok(Math.abs(Math.max(...ys(riseUp))-Math.max(...ys(riseDown)))<1e-6);
 assert.match(up,/\+\$467\.89 \(\+0\.13%\)/);assert.match(down,/-\$467\.89 \(-0\.13%\)/);assert.doesNotMatch(down,/\+\$467\.89/);
 const mark=(html,label)=>html.match(new RegExp('data-color-index="(\\d)"[^>]*aria-label="'+label))[1];
 assert.equal(mark(up,'P&amp;L chart'),'0');assert.equal(mark(down,'P&amp;L chart'),'1');
 assert.equal(mark(up,'Daily P&amp;L'),'0');assert.equal(mark(down,'Daily P&amp;L'),'1');
 assert.equal(mark(down,'Secure'),'0');
 assert.match(down,/is-active[^>]*data-terminal-control="down"/);assert.match(up,/is-active[^>]*data-terminal-control="up"/);
});
