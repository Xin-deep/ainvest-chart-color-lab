const SVG_NS='http://www.w3.org/2000/svg';
function applyChartLineWidth(host,module){
  const width=Number(module.lineWidth);
  if(!Number.isFinite(width)||width<.5||width>8)return;
  for(const token of ['--size-line-stroke','--size-line-stroke-multi','--size-radar-area-stroke'])host.style.setProperty(token,`${width}px`);
}
function installChartTexture(host,module,mode){
  if(!['stripes','cross','dots'].includes(module.texture))return {destroy(){}};
  const originals=new WeakMap();let serial=0;
  const svgElement=(name,attrs)=>{const el=document.createElementNS(SVG_NS,name);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
  const apply=()=>{
    for(const mark of host.querySelectorAll('.dv-bar,.dv-hbar__bar,.dv-line-stack-fill,.dv-line-area,.dv-pie-sector,.dv-radar-area,.dv-waterfall-bar')){
      const svg=mark.ownerSVGElement;if(!svg)continue;
      let pattern=svg.querySelector('[data-palette-texture]');
      if(!pattern){
        let defs=svg.querySelector('defs');if(!defs){defs=svgElement('defs',{});svg.prepend(defs);}
        pattern=svgElement('pattern',{id:`palette-texture-${++serial}`,width:8,height:8,patternUnits:'userSpaceOnUse','data-palette-texture':module.texture});
        const ink=mode==='dark'?'#FFFFFF':'#000000';
        if(module.texture==='dots')pattern.append(svgElement('circle',{cx:2,cy:2,r:1,fill:ink}));
        else pattern.append(svgElement('path',{d:module.texture==='cross'?'M-2 2L2-2M0 8L8 0M6 10L10 6M-2 6L2 10M0 0L8 8M6-2L10 2':'M-2 2L2-2M0 8L8 0M6 10L10 6',fill:'none',stroke:ink,'stroke-width':1}));
        defs.append(pattern);
      }
      let overlay=originals.get(mark);
      if(!overlay||overlay.parentNode!==mark.parentNode){overlay=svgElement(mark.tagName,{'class':'palette-texture-overlay','aria-hidden':'true','pointer-events':'none'});mark.after(overlay);originals.set(mark,overlay);}
      for(const key of ['d','x','y','width','height','rx','ry','transform']){const value=mark.getAttribute(key);if(value!==null)overlay.setAttribute(key,value);else overlay.removeAttribute(key);}
      overlay.setAttribute('fill',`url(#${pattern.id})`);overlay.setAttribute('stroke','none');overlay.setAttribute('opacity',mode==='dark'?.38:.28);
      // Keep the original mark's fill/gradient and opacity intact underneath the transparent texture.
    }
  };
  apply();const observer=new MutationObserver(apply);observer.observe(host,{childList:true,subtree:true});
  return {destroy(){observer.disconnect();}};
}
export {applyChartLineWidth,installChartTexture};
