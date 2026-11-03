// Shared charts reuse the active palette when data outnumbers its color slots.
export function chartColorAt(colors,index,fallback){
  return colors.length&&Number.isInteger(index)&&index>=0?colors[index%colors.length]||fallback:fallback;
}
export function chartColorSlot(index,slots,colorCount){
  if(!Number.isInteger(index)||index<0||!colorCount)return -1;
  return slots?slots[index]??-1:index%colorCount;
}
// In a bar and line combination each kind counts along its own palette; anything else stays on the categorical one.
export function seriesPaletteSlots(series){
  const mixed=series.some(s=>s.type==='bar')&&series.some(s=>s.type==='line');
  let bars=0,lines=0;
  return series.map((s,index)=>mixed?(s.type==='line'?{role:'line',index:lines++}:{role:'categorical',index:bars++}):{role:'categorical',index});
}
export function completePiePreview(cfg,module){
  // Business fixtures keep their actual data; generic palette examples show every legend color.
  if(module.fixture||!['pie','donut'].includes(module.type))return cfg;
  return {...cfg,items:cfg.items.map((item,index)=>({...item,value:Number.isFinite(item.value)&&item.value>0?item.value:Math.round(1200/(index+1.6)+120)}))};
}
