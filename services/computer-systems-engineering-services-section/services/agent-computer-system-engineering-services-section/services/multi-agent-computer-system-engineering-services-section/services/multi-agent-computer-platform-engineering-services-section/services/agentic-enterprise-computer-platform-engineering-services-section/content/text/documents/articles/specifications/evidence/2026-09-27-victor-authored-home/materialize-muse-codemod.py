from pathlib import Path
import json,hashlib,re,shutil
r=Path(Path('/tmp/muse-generation-run').read_text());packet=json.loads((r/('composition-input.json' if (r/'composition-input.json').exists() else 'public-input.json')).read_text());candidate=json.loads((r/'candidate.json').read_text());root=Path('lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-knowledge-systems-services-section/apps/static-site-publisher').resolve()
assert set(candidate)=={'disposition','reason','edits'};assert candidate['disposition']=='candidate';assert isinstance(candidate['reason'],str) and candidate['edits']
events=[json.loads(x) for x in (r/'events.jsonl').read_text().splitlines()];assert all(x.get('item',{}).get('type') in [None,'agent_message'] for x in events),'unexpected-tool-use'
inputs=packet['inputs'];texts={n:v['text'] for n,v in inputs.items()};clauses=set(re.findall(r'F-H\d+',packet['workOrder']['text']))
for i,e in enumerate(candidate['edits']):
 assert set(e)=={'path','inputSha256','before','after','clauses'},i
 assert e['path'] in inputs and e['inputSha256']==inputs[e['path']]['sha256'],i
 assert e['before'] and texts[e['path']].count(e['before'])==1,('ambiguous-or-missing-match',i,e['path'],texts[e['path']].count(e['before']))
 assert e['clauses'] and set(e['clauses'])<=clauses,i
 texts[e['path']]=texts[e['path']].replace(e['before'],e['after'],1)
for n,v in inputs.items():assert hashlib.sha256((root/n).read_bytes()).hexdigest()==v['sha256'],('stale-input',n)
stage=r/'candidate';assert not stage.exists();shutil.copytree(root/'src',stage/'src');shutil.copy2(root/'package.json',stage/'package.json');shutil.copy2(root/'README.md',stage/'README.md')
for n,t in texts.items():(stage/n).write_text(t)
manifest={'workOrderSha256':packet['workOrder']['sha256'],'inputManifest':{n:v['sha256'] for n,v in inputs.items()},'outputs':{n:hashlib.sha256(t.encode()).hexdigest() for n,t in texts.items()},'candidateJsonSha256':hashlib.sha256((r/'candidate.json').read_bytes()).hexdigest(),'materializerSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'status':'staged-unaccepted'}
(r/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'stage':str(stage),'edits':len(candidate['edits']),'changedFiles':[n for n in texts if manifest['outputs'][n]!=manifest['inputManifest'][n]]}))
