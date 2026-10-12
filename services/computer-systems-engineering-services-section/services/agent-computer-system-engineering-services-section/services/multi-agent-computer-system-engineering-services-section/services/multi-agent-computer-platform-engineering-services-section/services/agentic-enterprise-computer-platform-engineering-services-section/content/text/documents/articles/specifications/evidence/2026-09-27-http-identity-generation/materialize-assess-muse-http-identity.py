from pathlib import Path
import hashlib,json,subprocess,os,difflib
r=Path(Path('/tmp/muse-http-identity-run').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inv=json.loads((r/'invocation.json').read_text());assert inv.get('exitCode')==0,'generation not successful/finished'
events=[json.loads(l) for l in (r/'events.jsonl').read_text().splitlines() if l.strip()]
assert all(e.get('item',{}).get('type') in [None,'agent_message'] for e in events),'undeclared generator tool use'
messages=[e['item']['text'] for e in events if e.get('type')=='item.completed' and e.get('item',{}).get('type')=='agent_message'];assert len(messages)==1
candidate=json.loads(messages[0]);assert set(candidate)=={'disposition','reason','edits'} and candidate['disposition']=='candidate' and isinstance(candidate['reason'],str) and candidate['edits'];(r/'candidate.json').write_text(json.dumps(candidate,indent=2)+'\n')
packet=json.loads((r/'public-input.json').read_text());paths=json.loads((r/'source-paths.json').read_text());protected=json.loads((r/'protected-inputs.json').read_text());texts={p:v['text'] for p,v in packet['inputs'].items()}
for p,digest in protected.items():assert sha(Path(p))==digest,'stale input '+p
for i,e in enumerate(candidate['edits']):
 assert set(e)=={'path','inputSha256','before','after','clauses'},i
 assert e['path'] in texts and e['inputSha256']==packet['inputs'][e['path']]['sha256'],i
 assert isinstance(e['before'],str) and e['before'] and texts[e['path']].count(e['before'])==1,('ambiguous/missing edit',i)
 assert isinstance(e['after'],str) and e['clauses'] and set(e['clauses'])<={f'L-A{x:02}' for x in range(1,8)},i
 texts[e['path']]=texts[e['path']].replace(e['before'],e['after'],1)
stage=r/'candidate';stage.mkdir();diff=[]
for p,txt in texts.items():
 out=stage/p;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(txt);os.chmod(out,Path(paths[p]).stat().st_mode & 0o777)
 diff.extend(difflib.unified_diff(packet['inputs'][p]['text'].splitlines(True),txt.splitlines(True),fromfile=p,tofile=p))
manifest={'status':'staged-unaccepted','candidateJsonSha256':sha(r/'candidate.json'),'materializerSha256':sha(Path(__file__)),'workOrderSha256':packet['workOrder']['sha256'],'inputs':{p:v['sha256'] for p,v in packet['inputs'].items()},'outputs':{p:sha(stage/p) for p in texts}}
(r/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(r/'candidate.diff').write_text(''.join(diff))
(r/'candidate-source-map.json').write_text(json.dumps({p:str(stage/p) for p in paths}));profile=json.loads((r/'assessment-profile.json').read_text());profile=[str(r/'candidate-source-map.json') if x==str(r/'source-map.json') else str(stage/next(k for k,v in paths.items() if v==x)) if x in paths.values() else x for x in profile]
# Both source and mount destination are changed consistently to staged paths.
(r/'candidate-assessment-profile.json').write_text(json.dumps(profile))
x=subprocess.run(profile+['/node','--no-warnings','--experimental-vm-modules','/assays/assay.mjs'],capture_output=True,text=True,timeout=30)
(r/'assessment.json').write_text(json.dumps({'candidateManifestSha256':sha(r/'candidate-manifest.json'),'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2)+'\n')
report=json.loads(x.stdout) if x.stdout else {};print(json.dumps({'stage':str(stage),'edits':len(candidate['edits']),'exitCode':x.returncode,'passed':report.get('passed'),'total':report.get('total'),'failed':[c for c in report.get('checks',[]) if not c['ok']],'stderr':x.stderr[:1000]}))
