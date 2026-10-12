from pathlib import Path
import json,hashlib,subprocess,time,os
r=Path(Path('/tmp/muse-semantic-run').read_text().strip());assert not (r/'invocation.json').exists();h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for path,digest in json.loads((r/'protected-inputs.json').read_text()).items():assert h(Path(path))==digest,path
inv=json.loads((r/'inventory.json').read_text());assert all(not (Path(inv['sourceRoot'])/p).exists() for p in inv['files']);p=json.loads((r/'public-input.json').read_text());profile=json.loads((r/'profile.json').read_text())
args=['/generator','exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--model','gpt-6-luna','--disable','shell_tool','--disable','multi_agent','-c','apps._default.enabled=false','-c','web_search="disabled"','-c','model_reasoning_effort="high"','--output-schema','/input/output-schema.json','--json','-']
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'}
record={'startedAt':time.time(),'argv':args,'publicInputSha256':h(r/'public-input.json'),'profileSha256':h(r/'profile.json'),'modelRequested':'gpt-6-luna','cashCost':'unavailable','generatorSha256':h(Path(profile[profile.index('/generator')-1])),'assayCommitment':p['assayCommitment'],'environmentKeys':sorted(env)}
with (r/'public-input.json').open('rb') as inp,(r/'events.jsonl').open('wb') as out,(r/'stderr.log').open('wb') as err:
 proc=subprocess.Popen(profile+args,stdin=inp,stdout=out,stderr=err,env=env);record['pid']=proc.pid;(r/'invocation.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'run':str(r),'pid':proc.pid}),flush=True)
 try:record['exitCode']=proc.wait(timeout=600)
 except subprocess.TimeoutExpired:
  proc.terminate();record['exitCode']=proc.wait(timeout=15);record['refusal']='invocation-duration-exceeded'
record['finishedAt']=time.time();record['durationSeconds']=record['finishedAt']-record['startedAt'];(r/'invocation.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'exitCode':record['exitCode'],'durationSeconds':record['durationSeconds']}),flush=True)
