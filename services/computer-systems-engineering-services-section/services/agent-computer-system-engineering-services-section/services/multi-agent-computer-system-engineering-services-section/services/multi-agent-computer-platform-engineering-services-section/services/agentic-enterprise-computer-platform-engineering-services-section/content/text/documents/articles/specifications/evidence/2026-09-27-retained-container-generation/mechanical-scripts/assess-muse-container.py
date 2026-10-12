from pathlib import Path
import hashlib,json,subprocess
r=Path(Path('/tmp/muse-container-run').read_text().strip());a=Path(Path('/tmp/muse-container-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();i=json.loads((r/'invocation.json').read_text());assert i.get('exitCode')==0,'generation not successfully terminal'
commit=json.loads((a/'commitment.json').read_text());assert h(a/'assay.mjs')==commit['assaySha256'];assert h(a/'resolve.mjs')==commit['loaderSha256'];assert h(a/'dependencies.json')==commit['dependencyMapSha256'];assert h(a/'commitment.json')==i['assayCommitment']['manifestSha256']
events=[json.loads(x) for x in (r/'events.jsonl').read_text().splitlines()];messages=[x['item']['text'] for x in events if x.get('type')=='item.completed' and x.get('item',{}).get('type')=='agent_message'];assert messages
assert not [x for x in events if x.get('type')=='item.completed' and x.get('item',{}).get('type') not in ('agent_message','reasoning')], 'unexpected generator activity'
candidate=json.loads(messages[-1]);(r/'candidate.json').write_text(json.dumps(candidate,indent=2)+'\n')
usage=[x.get('usage') for x in events if x.get('type')=='turn.completed'];(r/'provider-usage.json').write_text(json.dumps({'usage':usage,'durationSeconds':i['durationSeconds'],'cashCost':'unavailable'},indent=2)+'\n')
if candidate['disposition']=='refused':print(json.dumps({'disposition':'refused','reason':candidate['reason']}));raise SystemExit(2)
for path,digest in json.loads((r/'protected-inputs.json').read_text()).items():assert h(Path(path))==digest,path
stage=subprocess.run(['python','/tmp/materialize-muse-source-patchset.py',str(r/'inventory.json'),str(r/'candidate.json'),str(r/'stage')],capture_output=True,text=True);(r/'staging.json').write_text(json.dumps({'exitCode':stage.returncode,'stdout':stage.stdout,'stderr':stage.stderr},indent=2)+'\n');assert stage.returncode==0,stage.stderr
profile=json.loads((r/'assessment-profile.json').read_text());env={'PATH':'/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/assays/assay.mjs'],capture_output=True,text=True,env=env,timeout=60)
(r/'assessment.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr,'environmentKeys':sorted(env),'profileSha256':h(r/'assessment-profile.json')},indent=2)+'\n')
result=json.loads(x.stdout) if x.stdout else {};print(json.dumps({'exitCode':x.returncode,'passed':result.get('passed'),'total':result.get('total'),'failed':[c for c in result.get('checks',[]) if not c['ok']],'stderr':x.stderr[:1800]}))
