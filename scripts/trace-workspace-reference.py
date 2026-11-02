"""Extract small identities and measured chart geometry from supplied workspace designs."""
from PIL import Image
from collections import Counter,deque
from pathlib import Path
import json,base64,io
ROOT=Path(__file__).resolve().parents[1]
W,H=1781,1376

def extract(path):
 im=Image.open(path).convert('RGB');sx,sy=im.width/W,im.height/H;px=im.load()
 def box(b):return tuple(round(v*(sx if i%2==0 else sy)) for i,v in enumerate(b))
 def asset(b):
  img=im.crop(box(b)).convert('RGBA');p=img.load();w,h=img.size
  q=deque([(x,y) for x in range(w) for y in [0,h-1]]+[(x,y) for y in range(h) for x in [0,w-1]])
  bg=Counter(p[x,y][:3] for x,y in q).most_common(1)[0][0];seen=set()
  while q:
   x,y=q.popleft()
   if (x,y) in seen or not(0<=x<w and 0<=y<h):continue
   seen.add((x,y));v=p[x,y]
   if max(abs(v[i]-bg[i]) for i in range(3))>5:continue
   p[x,y]=(*v[:3],0);q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
  out=io.BytesIO();img.save(out,format='PNG',optimize=True)
  return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
 def line(b,base=None,green=False):
  x0,y0,x1,y1=box(b);out=[];rgb=tuple(bytes.fromhex(base[1:])) if base else None
  background=(255,255,255) if '工作区.png' in path else (20,20,20)
  vector=[rgb[i]-background[i] for i in range(3)] if rgb else [0,0,0]
  norm=sum(v*v for v in vector) or 1
  def matches(v):
   diff=[v[i]-background[i] for i in range(3)];alpha=sum(diff[i]*vector[i] for i in range(3))/norm
   return .12<alpha<1.05 and sum((diff[i]-alpha*vector[i])**2 for i in range(3))<24
  for x in range(x0,x1):
   ys=[y for y in range(y0,y1) if (matches(px[x,y]) if not green else px[x,y][1]>80 and px[x,y][1]>px[x,y][0]*1.6 and px[x,y][1]>px[x,y][2]*1.13)]
   if ys:out.append([round(x/sx,3),round((min(ys) if green else (min(ys)+max(ys))/2)/sy,3)])
  return out
 def bars(b,colors):
  x0,y0,x1,y1=box(b);out=[]
  for base in colors:
   rgb=tuple(bytes.fromhex(base[1:]));mask={(x,y) for x in range(x0,x1) for y in range(y0,y1) if px[x,y]==rgb}
   while mask:
    first=mask.pop();q=[first];comp=[first]
    while q:
     x,y=q.pop()
     for v in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
      if v in mask:mask.remove(v);q.append(v);comp.append(v)
    if len(comp)<15:continue
    xs,ys=zip(*comp);out.append({'base':base,'x':min(xs)/sx,'y':min(ys)/sy,'width':(max(xs)-min(xs)+1)/sx,'height':(max(ys)-min(ys)+1)/sy})
  return sorted(out,key=lambda r:(r['x'],r['y']))
 colors=['#1F5FD6','#D9720B','#C14696','#0E9C84','#7647C8']
 assets={'robot':asset((14,90,49,125)),'avatar':asset((14,134,49,169)),'BBD':asset((81,145,102,165)),'TSLA':asset((534,741,551,759))}
 for name,y in [('layout',65),('edit',199),('cursor',240),('plug',283),('clock',325),('chart',366),('folder',407),('chat',447),('gift',1309)]:assets[name]=asset((20,y-10,42,y+11))
 return {'assets':assets,'lines':{'stock':line((83,202,883,276),green=True),'pnl':line((990,1118,1710,1291),green=True),'yield':[line((94,800,460,963),'#E57E17')],'rates':[line((539,801,949,940),c) for c in ['#265FFC','#38D1FF','#F564B9','#733ED6','#00CCC3']],'bonds':[line((1393,803,1710,918),c) for c in (['#165DFF','#FFAA00','#9EA9C7'] if '工作区.png' in path else ['#3371FF','#FFB114','#9EA9C7'])]},'bars':{'volume':bars((83,318,883,367),(['#009B67','#FF381A'] if '工作区.png' in path else ['#00A36D','#FF4A2E'])),'cap':bars((1393,136,1730,336),colors[:4]),'dominance':bars((537,508,934,667),colors),'yield':bars((83,801,481,963),['#1F5FD6','#168CB8'])}}
payload={k:extract(v) for k,v in [('light','/Users/xin/Downloads/工作区.png'),('dark','/Users/xin/Downloads/工作区-1.png')]}
# Yield is a seven-point polyline, not a pixel trace. Preserve the marker centers.
for reference in payload.values():
 points=reference['lines']['yield'][0]
 reference['lines']['yield']=[[min(points,key=lambda p:abs(p[0]-x)) for x in [109,166,223,279,336,392,449]]]
(ROOT/'dist/data/workspace-reference.js').write_text('// Measured from user supplied 工作区.png and 工作区-1.png; 1781 × 1376 coordinates.\nexport const workspaceReference = '+json.dumps(payload,separators=(',',':'))+';\n')
print('Generated workspace geometry and small identity assets')
