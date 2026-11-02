"""Extract small identity assets and vector chart geometry from Stocks.png.

The full screenshot is never embedded into the scene. Run with Pillow and the
original reference path to regenerate the checked-in reference fixture.
"""
import base64
import io
import json
import math
import sys
from collections import Counter, deque
from pathlib import Path
from PIL import Image

dark = '--dark' in sys.argv
source = Image.open(sys.argv[1]).convert('RGB')
sx, sy = source.width / 1856, source.height / 1335

def box_at(box):
    return tuple(round(v * (sx if i % 2 == 0 else sy)) for i, v in enumerate(box))

def icon(box):
    image = source.crop(box_at(box)).convert('RGBA')
    pixels = image.load()
    w, h = image.size
    queue = deque([(x, y) for x in range(w) for y in [0, h - 1]] + [(x, y) for y in range(h) for x in [0, w - 1]])
    background = Counter([pixels[x,y][:3] for x,y in queue]).most_common(1)[0][0]
    seen = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        seen.add((x, y))
        r, g, b, a = pixels[x, y]
        is_background = max(abs(v-b) for v,b in zip((r,g,b),background)) <= 8 if dark else min(r,g,b) >= 244
        if not is_background:
            continue
        pixels[x, y] = (r, g, b, 0)
        queue.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
    stream = io.BytesIO()
    image.save(stream, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(stream.getvalue()).decode()

def trace(box, color):
    x0, y0, x1, y1 = box_at(box)
    rgb = tuple(bytes.fromhex(color[1:]))
    pixels = source.load()
    points = []
    for x in range(x0, x1):
        ys = [y for y in range(y0, y1) if pixels[x, y] == rgb]
        if ys:
            points.append([round(x / sx, 3), round((ys[0]+ys[-1])/2/sy, 3)])
    return {'base': color, 'points': points}

def rectangles(box, colors):
    x0, y0, x1, y1 = box_at(box)
    pixels = source.load()
    output = []
    for color in colors:
        rgb = tuple(bytes.fromhex(color[1:]))
        mask = {(x,y) for x in range(x0,x1) for y in range(y0,y1) if pixels[x,y] == rgb}
        while mask:
            first = mask.pop()
            queue = [first]
            component = [first]
            while queue:
                x,y = queue.pop()
                for next_pixel in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                    if next_pixel in mask:
                        mask.remove(next_pixel)
                        component.append(next_pixel)
                        queue.append(next_pixel)
            if len(component) < 35:
                continue
            xs, ys = zip(*component)
            output.append({'base':color,'x':round(min(xs)/sx,3),'y':round(min(ys)/sy,3),'width':round((max(xs)-min(xs)+1)/sx,3),'height':round((max(ys)-min(ys)+1)/sy,3)})
    return sorted(output, key=lambda r:(r['x'],r['y']))

assets = {'logo': icon((12,5,127,36))}
for name, y in [('robot',62),('new-chat',99),('library',136),('profile',173),('automation',210),('search',247),('history',284),('calendar',370),('money',407),('signal',443),('macro',480),('compare',517),('congress',554),('chart',591),('file',628),('heatmap',664)]:
    assets[name] = icon((14,y-11,35,y+10))
for name, y in zip(['TSLA','AAPL','NVDA','MA','WSM','DOLE','YSG','VKTX','YMM','CSCO'],[133,160,187,214,241,268,295,323,350,377]):
    assets['watch-'+name] = icon((1553,y-8,1570,y+9))
for name, y in zip(['TSLA','AAPL','MSFT','NVDA','AMZN','GOOGL','META','AVGO','AMD','INTC','CSCO','ORCL'],[986,1013.5,1041,1068.5,1096,1123.5,1151,1178.5,1206,1233.5,1261,1288.5]):
    assets['stock-'+name] = icon((275,y-10,295,y+10))
for name,y in zip(['SPY','SQQQ','DIA','IWM','BTC'],[128,156,183,211,239]):
    assets[name] = icon((248,y-9,267,y+9))
for name,y in zip(['USA','GB10Y','DE10Y','FR10Y','CN10Y','JP10Y'],[667,695,723,751,779,807]):
    assets[name] = icon((576,y-10,594,y+10))

lines = {
    'bonds':[trace((1207,145,1469,232),c) for c in (['#3371FF','#FFB114','#9EA9C7'] if dark else ['#165DFF','#FFAA00','#9EA9C7'])],
    'rates':[trace((891,684,1470,801),c) for c in ['#265FFC','#38D1FF','#F564B9','#733ED6','#00CCC3']],
    'yield':[trace((246,680,502,800),'#E57E17')]
}
bars = {
    'dominance':rectangles((568,449,838,590),['#1F5FD6','#D9720B','#C14696','#0E9C84','#7647C8']),
    'cap':rectangles((885,327,1147,495),['#1F5FD6','#D9720B','#C14696','#0E9C84']),
    'yield':rectangles((247,684,504,800),['#1F5FD6','#168CB8'])
}
target = Path(__file__).resolve().parents[1] / ('dist/data/terminal-dark-reference.js' if dark else 'dist/data/terminal-reference.js')
gauge = []
for degree in range(180):
    angle=math.pi+(degree+.5)*math.pi/180
    rgb=source.getpixel((round((392+100*math.cos(angle))*sx),round((420+100*math.sin(angle))*sy)))
    gauge.append('#%02X%02X%02X' % rgb)
payload = {'assets':assets,'lines':lines,'bars':bars,'gauge':gauge}
target.write_text('// Traced from user-supplied '+('Stocks深色.png' if dark else 'Stocks.png')+' (2880 × 2073); 1856 × 1335 logical coordinates.\nexport const '+('terminalDarkReference' if dark else 'terminalReference')+' = '+json.dumps(payload,separators=(',',':'))+';\n')
print(f'Wrote {target}; {len(assets)} identity assets; {sum(len(x) for x in lines.values())} vector traces')
