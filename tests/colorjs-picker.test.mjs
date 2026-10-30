import {test} from 'node:test';
import assert from 'node:assert/strict';
import {colorJsToHex,loadColorJsPicker,resetColorJsLoader,bindColorJsPicker,waitForColorJsPicker} from '../dist/lib/colorjs-picker.js';

test('Color.js color conversion maps a clone and normalizes the existing HEX schema',()=>{
 const calls=[];
 const converted={toGamut(options){calls.push(options);return this;},to(space){calls.push(space);return this;},toString(options){calls.push(options);return '#abc';}};
 assert.equal(colorJsToHex({clone(){calls.push('clone');return converted;}}),'#AABBCC');
 assert.deepEqual(calls,['clone',{space:'srgb'},'srgb',{format:'hex',collapse:false}]);
});

test('loader handles registration, timeout and failed imports without blocking the app',async()=>{
 resetColorJsLoader();let imports=0;
 await loadColorJsPicker({registry:{get:()=>true},importer:()=>{imports++;}});assert.equal(imports,0);
 const registry={get:()=>false,whenDefined:()=>Promise.resolve()};
 await loadColorJsPicker({registry,importer:()=>{imports++;return Promise.resolve();}});
 await loadColorJsPicker({registry,importer:()=>{imports++;return Promise.resolve();}});assert.equal(imports,1);
 resetColorJsLoader();await assert.rejects(loadColorJsPicker({registry,importer:()=>new Promise(()=>{}),timeout:5}),/超时/);
 resetColorJsLoader();await assert.rejects(loadColorJsPicker({registry,importer:()=>Promise.reject(new Error('offline'))}),/offline/);
 resetColorJsLoader();
});

function fakePickerShell(){
 const listeners={};
 const picker={addEventListener:(name,fn)=>listeners[name]=fn,setAttribute(name,value){this[name]=value;},matches:()=>false};
 const status={},model={},shell={dataset:{},isConnected:true,querySelector:selector=>selector==='color-picker'?picker:status,closest:()=>({querySelector:()=>model})};
 return {shell,picker,status,listeners};
}

test('adapter uses only user input, commits once and preserves read-only baseline',async()=>{
 const {shell,picker,listeners}=fakePickerShell();let begin=0,commit=0,edits=[];
 bindColorJsPicker(shell,{hex:'#123456',loader:async()=>{},initializer:async()=>{},onBegin:()=>begin++,onInput:hex=>edits.push(hex),onCommit:()=>commit++});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(shell.dataset.pickerState,'ready');assert.equal(picker.color,'#123456');assert.deepEqual(edits,[]);
 picker.color={clone:()=>({toGamut(){return this;},to(){return this;},toString:()=> '#abcdef'})};
 listeners.input();listeners.change();listeners.pointerup();assert.deepEqual(edits,['#ABCDEF']);assert.equal(begin,1);assert.equal(commit,1);
 const other=fakePickerShell();bindColorJsPicker(other.shell,{hex:'#000000',readonly:true,loader:async()=>{},initializer:async()=>{},onBegin:()=>assert.fail(),onInput:()=>assert.fail(),onCommit:()=>assert.fail()});await new Promise(resolve=>setImmediate(resolve));other.listeners.input();assert.equal(other.picker.inert,true);
});

test('failed network leaves the HSB fallback available and gives a clear status',async()=>{
 const {shell,status}=fakePickerShell();
 bindColorJsPicker(shell,{hex:'#123456',loader:async()=>{throw new Error('offline');}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(shell.dataset.pickerState,'fallback');assert.match(status.textContent,/HSB 和 HEX/);
});

test('readiness requires all three initialized controls and a usable color',async()=>{
 const converted={clone(){return this;},toGamut(){return this;},to(){return this;},toString:()=> '#123456'};
 const slider={shadowRoot:{querySelector:()=>({})}};
 await waitForColorJsPicker({shadowRoot:{querySelectorAll:()=>[slider,slider,slider]},color:converted});
 await assert.rejects(waitForColorJsPicker({shadowRoot:{querySelectorAll:()=>[]}}, {timeout:0}),/未初始化/);
 const {shell,status}=fakePickerShell();
 bindColorJsPicker(shell,{hex:'#123456',loader:async()=>{},initializer:async()=>{throw new Error('empty sliders');}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(shell.dataset.pickerState,'fallback');assert.match(status.textContent,/HSB 和 HEX/);
});
