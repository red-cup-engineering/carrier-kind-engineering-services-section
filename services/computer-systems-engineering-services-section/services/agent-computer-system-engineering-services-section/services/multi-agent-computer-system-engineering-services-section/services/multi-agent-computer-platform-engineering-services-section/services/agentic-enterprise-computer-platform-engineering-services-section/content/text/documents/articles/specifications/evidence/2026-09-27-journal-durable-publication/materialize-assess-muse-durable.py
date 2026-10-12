from pathlib import Path
import json,hashlib,re,subprocess,difflib
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=Path(Path('/tmp/muse-durable-generation-run').read_text());packet=json.loads((r/'public-input.json').read_text());inv=json.loads((r/'invocation.json').read_text());assert inv['exitCode']==0
paths=json.loads((r/'source-paths.json').read_text());events=[json.loads(l) for l in (r/'events.jsonl').read_text().splitlines()];assert all(e.get('item',{}).get('type') in [None,'agent_message'] for e in events),'unexpected tool use'
messages=[e['item']['text'] for e in events if e.get('item',{}).get('type')=='agent_message'];candidate=json.loads(messages[-1]);assert set(candidate)=={'disposition','reason','edits'} and candidate['disposition']=='candidate' and candidate['edits'];(r/'candidate.json').write_text(json.dumps(candidate,indent=2))
texts={n:v['text'] for n,v in packet['inputs'].items()};clauses=set(re.findall(r'F-D\d+',packet['workOrder']['text']))
for e in candidate['edits']:
 assert set(e)=={'path','inputSha256','before','after','clauses'}
 assert e['path'] in texts and e['inputSha256']==packet['inputs'][e['path']]['sha256']
 assert isinstance(e['before'],str) and e['before'] and texts[e['path']].count(e['before'])==1
 assert isinstance(e['after'],str) and e['clauses'] and set(e['clauses'])<=clauses
 texts[e['path']]=texts[e['path']].replace(e['before'],e['after'],1)
assert all(sha(Path(paths[n]))==v['sha256'] for n,v in packet['inputs'].items())
stage=r/'candidate';assert not stage.exists()
for n,t in texts.items():
 f=stage/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(t)
manifest={'workOrderSha256':packet['workOrder']['sha256'],'inputs':{n:v['sha256'] for n,v in packet['inputs'].items()},'outputs':{n:sha(stage/n) for n in texts},'candidateJsonSha256':sha(r/'candidate.json'),'materializerSha256':sha(Path(__file__)),'status':'staged-unaccepted'};(r/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2))
base=json.loads((r/'assessment-profile.json').read_text());name='system/src/filesystem.mjs';base=[str(stage/name) if x==paths[name] else x for x in base]
x=subprocess.run(base+['/node','/assays/assay.mjs','/candidate.mjs'],capture_output=True,text=True,timeout=60);result={'argv':base+['/node','/assays/assay.mjs','/candidate.mjs'],'candidateSha256':sha(stage/name),'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr};(r/'assessment.json').write_text(json.dumps(result,indent=2));print('assessment exit',x.returncode);print(x.stderr[:1000]);report=json.loads(x.stdout);print('receiving observations',report['passed'],'/',report['total']);print(json.dumps([o for o in report['observations'] if not o['ok']],indent=2));print(''.join(difflib.unified_diff(packet['inputs'][name]['text'].splitlines(True),texts[name].splitlines(True))))
