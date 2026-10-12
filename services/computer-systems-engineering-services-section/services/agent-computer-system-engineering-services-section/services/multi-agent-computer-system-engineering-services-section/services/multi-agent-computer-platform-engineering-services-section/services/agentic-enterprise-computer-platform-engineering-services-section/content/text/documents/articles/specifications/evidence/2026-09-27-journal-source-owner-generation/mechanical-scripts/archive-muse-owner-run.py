from pathlib import Path
import json,hashlib,shutil,sys
s=Path(Path('/tmp/muse-spec-path').read_text());e=s/'evidence/2026-09-27-journal-source-owner-generation';r=Path(Path('/tmp/muse-owner-run').read_text());a=Path(Path('/tmp/muse-owner-assay').read_text());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert 'exitCode' in json.loads((r/'invocation.json').read_text()),'live invocation cannot be archived as terminal'
name=sys.argv[1];assert name.startswith('attempt') and '/' not in name
shutil.copytree(r,e/name,dirs_exist_ok=True);shutil.copytree(a,e/('private-receiving'+name[7:9]),dirs_exist_ok=True)
obs=json.loads((e/'observations.json').read_text());obs['order']['sha256']=h(s/obs['order']['path']);obs['attempts']=[]
for d in sorted(e.glob('attempt*')):
 u=d/'provider-usage.json'
 if u.exists():obs['attempts'].append({'attempt':d.name,**json.loads(u.read_text())})
obs['inputTokens']=sum(u.get('input_tokens',0) for x in obs['attempts'] for u in x.get('usage',[]));obs['outputTokens']=sum(u.get('output_tokens',0) for x in obs['attempts'] for u in x.get('usage',[]))
review=r/'public-source-review.json'
if review.exists():
 rv=json.loads(review.read_text());obs['latestSourceReview']={'attempt':name,**rv};obs['status']=rv.get('status','unaccepted candidate')
obs['latestAttempt']=name
(e/'observations.json').write_text(json.dumps(obs,indent=2)+'\n')
for n in ['prepare-muse-owner-b1a-revision.py','prepare-muse-owner-b1b.py','archive-muse-owner-run.py']:shutil.copy2(Path('/tmp')/n,e/'mechanical-scripts'/n)
print(json.dumps({'archived':name,'inputTokens':obs['inputTokens'],'outputTokens':obs['outputTokens'],'promoted':False}))
