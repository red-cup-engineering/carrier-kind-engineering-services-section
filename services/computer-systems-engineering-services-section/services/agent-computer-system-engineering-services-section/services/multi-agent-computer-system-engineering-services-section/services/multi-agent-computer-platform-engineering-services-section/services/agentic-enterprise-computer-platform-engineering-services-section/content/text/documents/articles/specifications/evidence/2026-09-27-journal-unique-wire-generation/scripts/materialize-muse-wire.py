from pathlib import Path
import json,hashlib,re,subprocess,difflib
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=Path(Path('/tmp/muse-wire-generation-run').read_text()); packet=json.loads((r/'public-input.json').read_text()); invocation=json.loads((r/'invocation.json').read_text()); assert invocation.get('exitCode')==0,'Source provider has not completed successfully'
assert all(sha(Path(p))==d for p,d in json.loads((r/'protected-inputs.json').read_text()).items()),'stale protected input'
events=[json.loads(x) for x in (r/'events.jsonl').read_text().splitlines()]
assert all(x.get('item',{}).get('type') in [None,'agent_message'] for x in events),'unexpected tool use'
messages=[x['item']['text'] for x in events if x.get('item',{}).get('type')=='agent_message']; value=json.loads(messages[-1]); (r/'candidate.json').write_text(json.dumps(value,indent=2))
assert set(value)=={'disposition','reason','edits'} and value['disposition']=='candidate' and value['edits']
texts={n:v['text'] for n,v in packet['inputs'].items()}; allowed=set(re.findall(r'F-U\d+',packet['workOrder']['text']))
for e in value['edits']:
 assert set(e)=={'path','inputSha256','before','after','clauses'} and e['path'] in texts
 assert e['inputSha256']==packet['inputs'][e['path']]['sha256']
 assert isinstance(e['before'],str) and e['before'] and texts[e['path']].count(e['before'])==1
 assert isinstance(e['after'],str) and e['clauses'] and set(e['clauses'])<=allowed
 texts[e['path']]=texts[e['path']].replace(e['before'],e['after'],1)
stage=r/'candidate'; assert not stage.exists()
for n,t in texts.items():
 p=stage/n; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(t)
manifest={'inputs':{n:v['sha256'] for n,v in packet['inputs'].items()},'outputs':{n:sha(stage/n) for n in texts},'workOrderSha256':packet['workOrder']['sha256'],'candidateJsonSha256':sha(r/'candidate.json'),'materializerSha256':sha(Path(__file__)),'status':'staged-unaccepted'}
(r/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2))
base=json.loads((r/'assessment-profile.json').read_text()); paths=json.loads((r/'source-paths.json').read_text())
for i,arg in enumerate(base):
 if arg=='--ro-bind' and base[i+1] in paths.values():
  name=next(n for n,p in paths.items() if p==base[i+1]);base[i+1]=str(stage/name)
cmd=base+['/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/assays/assay.mjs']
x=subprocess.run(cmd,capture_output=True,text=True,timeout=60)
(r/'assessment.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr,'outputs':manifest['outputs']},indent=2))
print('assessment',x.returncode);print(x.stderr[:1500])
if x.stdout:
 result=json.loads(x.stdout);print('observations',result['passed'],result['total']);print(json.dumps([c for c in result['checks'] if not c['ok']],indent=2))
for n,t in texts.items():
 diff=''.join(difflib.unified_diff(packet['inputs'][n]['text'].splitlines(True),t.splitlines(True),fromfile=n,tofile=n));(r/'candidate.diff').write_text(diff)
 print('candidate lines',len(t.splitlines()),'diff bytes',len(diff))
