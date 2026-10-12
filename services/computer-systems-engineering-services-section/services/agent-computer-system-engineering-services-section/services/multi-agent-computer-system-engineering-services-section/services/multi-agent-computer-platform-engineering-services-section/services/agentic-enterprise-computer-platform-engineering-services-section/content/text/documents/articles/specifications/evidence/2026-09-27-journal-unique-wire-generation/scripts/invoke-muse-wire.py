import json,hashlib,subprocess,time,os
from pathlib import Path
r=Path(Path('/tmp/muse-wire-generation-run').read_text().strip())
assert not (r/'invocation.json').exists(), 'Invocation already exists; inspect its live handle instead of restarting'
p=json.loads((r/'public-input.json').read_text())
assert p.get('assayCommitment'), 'Independent pre-generation assay commitment required'
root=Path('lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-knowledge-systems-services-section/apps/static-site-publisher')
paths=json.loads((r/'source-paths.json').read_text())
for n,v in p['inputs'].items():assert hashlib.sha256(Path(paths[n]).read_bytes()).hexdigest()==v['sha256'], 'stale-input: '+n
profile=json.loads((r/'profile.json').read_text())
args=['/generator','exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--model','gpt-6-luna','--disable','shell_tool','--disable','multi_agent','-c','apps._default.enabled=false','-c','web_search="disabled"','-c','model_reasoning_effort="high"','--output-schema','/input/output-schema.json','--json','-']
record={'startedAt':time.time(),'argv':args,'publicInputSha256':hashlib.sha256((r/'public-input.json').read_bytes()).hexdigest(),'modelRequested':'gpt-6-luna','cashCost':'unavailable','assayCommitment':p['assayCommitment']}
with (r/'public-input.json').open('rb') as inp,(r/'events.jsonl').open('wb') as out,(r/'stderr.log').open('wb') as err:
 proc=subprocess.Popen(profile+args,stdin=inp,stdout=out,stderr=err);record['pid']=proc.pid;(r/'invocation.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'run':str(r),'pid':proc.pid}),flush=True)
 try:record['exitCode']=proc.wait(timeout=600)
 except subprocess.TimeoutExpired:
  proc.terminate();record['exitCode']=proc.wait(timeout=15);record['refusal']='invocation-duration-exceeded'
record['finishedAt']=time.time();record['durationSeconds']=record['finishedAt']-record['startedAt'];(r/'invocation.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'exitCode':record['exitCode'],'durationSeconds':record['durationSeconds']}),flush=True)
