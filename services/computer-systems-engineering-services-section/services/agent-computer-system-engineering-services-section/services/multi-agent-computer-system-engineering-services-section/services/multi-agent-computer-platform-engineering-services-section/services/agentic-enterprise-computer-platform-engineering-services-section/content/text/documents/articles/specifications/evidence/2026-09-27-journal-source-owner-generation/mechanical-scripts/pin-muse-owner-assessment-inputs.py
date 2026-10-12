from pathlib import Path
import json,hashlib
r=Path(Path('/tmp/muse-owner-run').read_text());out=r/'supplement-corrected';protected=json.loads((r/'protected-inputs.json').read_text());h=lambda b:hashlib.sha256(b).hexdigest()
profile=json.loads((out/'profile.json').read_text());bound={profile[i+1]:profile[i+2] for i,x in enumerate(profile[:-2]) if x=='--ro-bind'}
needed={d:p for p,d in protected.items() if p in bound and h(Path(p).read_bytes())!=d and not p.endswith('/package.json')}
found={}
def walk(x,origin):
 if isinstance(x,dict):
  for k,v in x.items():
   if k in ['text','content','source'] and isinstance(v,str):
    b=v.encode();d=h(b)
    if d in needed and d not in found:found[d]=(b,str(origin),k)
   elif isinstance(v,(dict,list)):walk(v,origin)
 elif isinstance(x,list):
  for v in x:walk(v,origin)
for p in sorted(Path('/tmp').glob('muse-owner-generation-*/public-input.json')):
 walk(json.loads(p.read_text()),p)
for p in out.glob('recovered-*.json'):walk(json.loads(p.read_text()),p)
print('RECOVERED',[Path(needed[d]).name for d in found]);print('MISSING',[(p,d) for d,p in needed.items() if d not in found])
if len(found)!=len(needed):raise SystemExit(2)
pins=out/'pinned-inputs';pins.mkdir(exist_ok=False);records=[]
for i,(p,d) in enumerate(protected.items()):
 if p not in bound or p.endswith('/package.json'):continue
 b=Path(p).read_bytes();provenance='protected current checkout bytes'
 if h(b)!=d:
  b,origin,key=found[d];provenance={'file':origin,'field':key,'sourceFileSha256':h(Path(origin).read_bytes())}
 assert h(b)==d,p
 target=pins/(str(i)+'-'+Path(p).name);target.write_bytes(b);profile+=['--ro-bind',str(target),p];records.append({'path':p,'snapshot':str(target),'sha256':d,'recoveredFrom':provenance})
(out/'pinned-inputs.json').write_text(json.dumps(records,indent=2)+'\n');(out/'profile.json').write_text(json.dumps(profile,indent=2)+'\n');print('PINNED',len(records))
