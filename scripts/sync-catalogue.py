"""Validate programme.json skip ranges and rebuild the embedded radio catalogue."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'programme.json').read_text());s=json.loads((root/'stations.json').read_text())
for t in p['tracks']:
 cursor=0;removed=0
 for interval in sorted(t.get('skip',[])):
  assert len(interval)==2 and all(type(v) in (int,float) for v in interval),t['slug']
  a,b=interval;assert 0<=a<b<=t['duration'],t['slug']
  removed+=max(0,b-max(cursor,a));cursor=max(cursor,b)
 t['broadcastDuration']=t['duration']-removed
 assert t['broadcastDuration']>0,t['slug']
by={t['slug']:t for t in p['tracks']};ix={t['slug']:i for i,t in enumerate(p['tracks'])}
p['total_seconds']=sum(t['broadcastDuration'] for t in p['tracks'])
for st in s['stations']:st['total_seconds']=sum(by[x]['broadcastDuration'] for x in st['tracks'])
h=(root/'index.html').read_text();h=re.sub(r'const tracks = .*?;\n',lambda _: 'const tracks = '+json.dumps(p['tracks'])+';\n',h,count=1)
ss=[dict(id=st['id'],name=st['name'],indices=[ix[x] for x in st['tracks']],duration=st['total_seconds']) for st in s['stations']]
h=re.sub(r'const stations=.*?;\n',lambda _: 'const stations='+json.dumps(ss)+';\n',h,count=1)
for name,data in [('programme',p),('stations',s)]:(root/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
(root/'index.html').write_text(h)
