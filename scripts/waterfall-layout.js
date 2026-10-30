// Data waterfalls have a fixed preferred bar width upstream; cap it to the actual slot.
export function fitWaterfallBarWidth(variant,preferred,slot){
  if(variant!=='data')return preferred;
  const gap=Math.min(8,slot/3);
  return Math.min(preferred,Math.max(1,slot-gap));
}
