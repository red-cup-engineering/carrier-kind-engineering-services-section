from pathlib import Path
import json,hashlib,subprocess,datetime
r=Path(Path('/tmp/muse-owner-run').read_text());a=Path(Path('/tmp/muse-owner-assay').read_text());s=r/'supplement-corrected'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not (s/'assessment.json').exists()
assert not (s/'commitment.json').exists()
profile=json.loads((s/'profile.json').read_text())
shadowedPackage=str(Path(Path('/tmp/muse-system-path').read_text())/'package.json')
drifts=[]
for p,digest in json.loads((r/'protected-inputs.json').read_text()).items():
 actual=h(Path(p))
 if actual!=digest:
  bindings=[profile[i+1] for i,x in enumerate(profile[:-2]) if x=='--ro-bind' and profile[i+2]==p]
  assert bindings,p
  if p==shadowedPackage:assert bindings[-1]==str(r/'stage/package.json'),bindings
  else:assert h(Path(bindings[-1]))==digest,(p,bindings[-1])
  drifts.append({'path':p,'generationDigest':digest,'currentDigest':actual,'disposition':'current checkout file is shadowed by exact committed candidate or recovered protected input in assessment namespace; no checkout modification'})
(s/'checkout-drift.json').write_text(json.dumps(drifts,indent=2)+'\n')
receipt=json.loads((r/'stage.receipt.json').read_text())
for p,record in receipt['outputs'].items():
 if record['state']=='present':assert h(r/'stage'/p)==record['sha256'],p
original=json.loads((a/'commitment.json').read_text())
for n,key in [('assay.mjs','assaySha256'),('resolve.mjs','loaderSha256'),('dependencies.json','dependencyMapSha256')]:assert h(a/n)==original[key]
files=[s/'checkout-drift.json',s/'assay.mjs',s/'profile.json',s/'plan.md',r/'assessment.json',r/'stage.receipt.json',r/'candidate.json',a/'commitment.json',Path(__file__)]+[r/'stage'/p for p,x in receipt['outputs'].items() if x['state']=='present']
files.extend(sorted((s/'pinned-inputs').iterdir()))
files.extend([s/'pinned-inputs.json'])
commit={'kind':'post-generation-supplement-commitment','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':{str(p):h(p) for p in files},'providerRetryAllowed':False,'originalAssayChanged':False}
(s/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
profile=json.loads((s/'profile.json').read_text());env={'PATH':'/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/supplement/assay.mjs'],capture_output=True,text=True,env=env,timeout=60)
result={'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr,'commitmentSha256':h(s/'commitment.json'),'environmentKeys':sorted(env),'inputsUnchanged':all(h(Path(p))==d for p,d in commit['files'].items())}
(s/'assessment.json').write_text(json.dumps(result,indent=2)+'\n')
obs=json.loads(x.stdout) if x.stdout else {}
print(json.dumps({'exitCode':x.returncode,'passed':obs.get('passed'),'total':obs.get('total'),'failed':[c for c in obs.get('checks',[]) if not c['passed']],'inputsUnchanged':result['inputsUnchanged'],'stderr':x.stderr[:1500]},indent=2))
