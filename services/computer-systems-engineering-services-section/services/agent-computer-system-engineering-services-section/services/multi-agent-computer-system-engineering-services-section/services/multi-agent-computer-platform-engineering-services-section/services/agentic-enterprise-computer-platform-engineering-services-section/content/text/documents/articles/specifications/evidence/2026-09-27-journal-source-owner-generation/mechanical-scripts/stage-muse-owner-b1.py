from pathlib import Path
import hashlib,json,subprocess
r=Path(Path('/tmp/muse-owner-run').read_text().strip());a=Path(Path('/tmp/muse-owner-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
i=json.loads((r/'invocation.json').read_text());assert i.get('exitCode')==0,'generation not successfully terminal'
commit=json.loads((a/'commitment.json').read_text())
for n,key in [('assay.mjs','assaySha256'),('resolve.mjs','loaderSha256'),('dependencies.json','dependencyMapSha256')]:assert h(a/n)==commit[key]
assert h(a/'commitment.json')==i['assayCommitment']['manifestSha256']
events=[json.loads(x) for x in (r/'events.jsonl').read_text().splitlines()]
messages=[x['item']['text'] for x in events if x.get('type')=='item.completed' and x.get('item',{}).get('type')=='agent_message'];assert messages
assert not [x for x in events if x.get('type')=='item.completed' and x.get('item',{}).get('type') not in ('agent_message','reasoning')], 'unexpected generator activity'
candidate=json.loads(messages[-1]);(r/'candidate.json').write_text(json.dumps(candidate,indent=2)+'\n')
usage=[x.get('usage') for x in events if x.get('type')=='turn.completed'];(r/'provider-usage.json').write_text(json.dumps({'usage':usage,'durationSeconds':i['durationSeconds'],'cashCost':'unavailable'},indent=2)+'\n')
if candidate['disposition']=='refused':print(json.dumps({'disposition':'refused','reason':candidate['reason']}));raise SystemExit(2)
for p,digest in json.loads((r/'protected-inputs.json').read_text()).items():assert h(Path(p))==digest,p
stage=subprocess.run(['python3','/tmp/materialize-muse-source-patchset.py',str(r/'inventory.json'),str(r/'candidate.json'),str(r/'stage')],capture_output=True,text=True)
(r/'staging.json').write_text(json.dumps({'exitCode':stage.returncode,'stdout':stage.stdout,'stderr':stage.stderr},indent=2)+'\n');assert stage.returncode==0,stage.stderr
for f in (r/'stage').rglob('*.mjs'):
 x=subprocess.run(['/home/emsenn/.local/bin/node','--check',str(f)],capture_output=True,text=True);assert x.returncode==0,x.stderr

print(json.dumps({'disposition':'staged-unaccepted-phase-b1','stage':str(r/'stage'),'syntaxChecked':True,'privateReceivingRun':False}))
