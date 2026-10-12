from pathlib import Path
import hashlib,json,subprocess
r=Path(Path('/tmp/muse-container-run').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();i=json.loads((r/'invocation.json').read_text());assert i.get('exitCode')==0
es=[json.loads(x) for x in (r/'events.jsonl').read_text().splitlines()];assert not [x for x in es if x.get('type')=='item.completed' and x.get('item',{}).get('type') not in ('agent_message','reasoning')]
msgs=[x['item']['text'] for x in es if x.get('type')=='item.completed' and x.get('item',{}).get('type')=='agent_message'];v=json.loads(msgs[-1]);(r/'candidate.json').write_text(json.dumps(v,indent=2)+'\n');(r/'provider-usage.json').write_text(json.dumps({'usage':[x['usage'] for x in es if x.get('type')=='turn.completed'],'durationSeconds':i['durationSeconds'],'cashCost':'unavailable'},indent=2)+'\n')
if v['disposition']=='refused':print(json.dumps(v));raise SystemExit(2)
for p,d in json.loads((r/'protected-inputs.json').read_text()).items():assert h(Path(p))==d,p
x=subprocess.run(['python','/tmp/materialize-muse-source-patchset.py',str(r/'inventory.json'),str(r/'candidate.json'),str(r/'stage')],capture_output=True,text=True);(r/'staging.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2)+'\n');assert x.returncode==0,x.stderr
before=(r/'original/scripts/canonical-json.mjs').read_text().split('class StrictJsonParser {',1)[1].split('/** Canonicalize one runtime JSON value:',1)[0];after=(r/'stage/scripts/canonical-json.mjs').read_text().split('class StrictJsonParser {',1)[1].split('/** Canonicalize one runtime JSON value:',1)[0];assert before==after,'phase A modified strict parser'
for p in (r/'stage/scripts').glob('*.mjs'):subprocess.run(['/home/emsenn/.local/bin/node','--check',str(p)],check=True)
print(json.dumps({'staged':str(r/'stage'),'finalReceivingPerformed':False,'sourceFiles':[{'path':str(p.relative_to(r/'stage')),'sha256':h(p)} for p in (r/'stage/scripts').glob('*.mjs')]}))
