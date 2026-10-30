import { normalizeColor } from './colors.js';
const colorJsPickerUrl='https://esm.sh/color-elements@0.0.14/color-picker?deps=colorjs.io@0.6.1';
let colorJsImport;
export function colorJsToHex(color){
  // The palette schema stores HEX. Map a clone so dragging never mutates the picker value.
  return normalizeColor(color.clone().toGamut({space:'srgb'}).to('srgb').toString({format:'hex',collapse:false}));
}
export async function loadColorJsPicker({registry=globalThis.customElements,importer=url=>import(url),timeout=10000}={}){
  if(registry.get('color-picker'))return;
  colorJsImport ||= Promise.resolve().then(()=>importer(colorJsPickerUrl));
  let timer;
  try{
    await Promise.race([
      colorJsImport.then(()=>registry.whenDefined('color-picker')),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Color.js 加载超时')),timeout);})
    ]);
  }finally{clearTimeout(timer);}
}
export function resetColorJsLoader(){colorJsImport=undefined;}
export async function waitForColorJsPicker(picker,{timeout=2500}={}){
  const started=Date.now();
  while(true){
    const sliders=[...(picker.shadowRoot?.querySelectorAll('channel-slider')||[])];
    if(sliders.length===3&&sliders.every(slider=>slider.shadowRoot?.querySelector('input[type="number"]'))){
      colorJsToHex(picker.color);
      return;
    }
    if(Date.now()-started>=timeout)throw new Error('Color.js 滑块未初始化');
    await new Promise(resolve=>setTimeout(resolve,40));
  }
}

export function bindColorJsPicker(shell,{hex,readonly=false,onBegin,onInput,onCommit,onError,loader=loadColorJsPicker,initializer=waitForColorJsPicker}){
  const picker=shell.querySelector('color-picker'),status=shell.querySelector('[data-picker-status]');
  let syncing=false,editing=false;
  const finish=()=>{if(editing){editing=false;onCommit();}};
  const begin=()=>{if(!editing&&!readonly){editing=true;onBegin();}};
  picker.addEventListener('pointerdown',begin,true);
  picker.addEventListener('keydown',begin,true);
  picker.addEventListener('input',()=>{
    if(syncing||readonly||shell.dataset.pickerState!=='ready')return;
    try{const value=colorJsToHex(picker.color);begin();onInput(value);}
    catch(error){onError?.(error);}
  });
  picker.addEventListener('change',finish);
  picker.addEventListener('pointerup',finish);
  picker.addEventListener('focusout',()=>queueMicrotask(()=>{if(!picker.matches(':focus-within'))finish();}));
  shell.dataset.pickerState='loading';
  status.textContent='正在加载 Color.js 选色器…';
  const ready=async()=>{
    try{
      await loader();
      if(!shell.isConnected)return;
      syncing=true;picker.spaceId='oklch';picker.color=hex;
      await initializer(picker);
      syncing=false;
      if(!shell.isConnected)return;
      shell.dataset.pickerState='ready';
      picker.inert=readonly;
      status.textContent='Color.js · OKLCH';
      const label=shell.closest('.color-editor')?.querySelector('[data-editor-model]');if(label)label.textContent='OKLCH';
    }catch{
      if(!shell.isConnected)return;
      shell.dataset.pickerState='fallback';status.textContent='Color.js 暂未加载，仍可使用 HSB 和 HEX 调色。';
    }
  };
  ready();
}
