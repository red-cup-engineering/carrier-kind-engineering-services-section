from pathlib import Path
import json,hashlib,subprocess
r=Path(Path('/tmp/muse-semantic-codemod-run').read_text().strip());a=Path(Path('/tmp/muse-semantic-codemod-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();i=json.loads((r/'invocation.json').read_text());assert i.get('exitCode')==0
commit=json.loads((a/'codemod-commitment.json').read_text());assert h(a/'codemod-commitment.json')==i['assayCommitment']['manifestSha256']
for n,k in [('assay.mjs','priorAssaySha256'),('resolver-assay.mjs','resolverAssaySha256'),('resolve.mjs','loaderSha256'),('dependencies.json','dependencyMapSha256')]:assert h(a/n)==commit[k]
events=[json.loads(x) for x in (r/'events.jsonl').read_text().splitlines()];messages=[x['item']['text'] for x in events if x.get('type')=='item.completed' and x.get('item',{}).get('type')=='agent_message'];assert messages
assert not [x for x in events if x.get('type')=='item.completed' and x.get('item',{}).get('type') not in ('agent_message','reasoning')]
candidate=json.loads(messages[-1]);(r/'candidate.json').write_text(json.dumps(candidate,indent=2)+'\n');usage=[x.get('usage') for x in events if x.get('type')=='turn.completed'];(r/'provider-usage.json').write_text(json.dumps({'usage':usage,'durationSeconds':i['durationSeconds'],'cashCost':'unavailable'},indent=2)+'\n');assert candidate['disposition']=='candidate',candidate['reason']
for p,digest in json.loads((r/'protected-inputs.json').read_text()).items():assert h(Path(p))==digest,p
x=subprocess.run(['python','/tmp/materialize-muse-source-patchset.py',str(r/'inventory.json'),str(r/'candidate.json'),str(r/'stage')],capture_output=True,text=True);(r/'staging.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2)+'\n');assert x.returncode==0,x.stderr
profile=json.loads((r/'assessment-profile.json').read_text());reports=[]
for name in ['assay.mjs','resolver-assay.mjs']:
 x=subprocess.run(profile+['/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/assays/'+name],capture_output=True,text=True,env={'PATH':'/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8'},timeout=60);report={'assay':name,'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr};reports.append(report);result=json.loads(x.stdout) if x.stdout else {};print(json.dumps({'assay':name,'exitCode':x.returncode,'passed':result.get('passed'),'total':result.get('total'),'failures':[c for c in result.get('checks',[]) if c.get('ok',c.get('sameValue',False)) is False],'stderr':x.stderr[:1200]}))
(r/'assessment.json').write_text(json.dumps({'reports':reports,'acceptedByAssays':all(x['exitCode']==0 for x in reports)},indent=2)+'\n');print(json.dumps({'changes':candidate['changes']}))
