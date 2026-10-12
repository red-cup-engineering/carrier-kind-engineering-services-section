from pathlib import Path
import json,hashlib,subprocess
r=Path(Path('/tmp/muse-owner-run').read_text());a=Path(Path('/tmp/muse-owner-assay').read_text());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((r/'public-source-review.json').read_text())['completeReceivingMayProceed'] is True
assert not (r/'assessment.json').exists(),'receiving already recorded'
i=json.loads((r/'invocation.json').read_text());assert i.get('exitCode')==0
commit=json.loads((a/'commitment.json').read_text());assert h(a/'commitment.json')==i['assayCommitment']['manifestSha256']
for n,key in [('assay.mjs','assaySha256'),('resolve.mjs','loaderSha256'),('dependencies.json','dependencyMapSha256')]:assert h(a/n)==commit[key]
receipt=json.loads((r/'stage.receipt.json').read_text());assert receipt['disposition']=='staged-unaccepted'
for key,n in [('inventorySha256','inventory.json'),('candidateSha256','candidate.json')]:assert receipt[key]==h(r/n)
assert receipt['materializerSha256']==h(Path('/tmp/materialize-muse-source-patchset.py'))
for p,record in receipt['outputs'].items():
 f=r/'stage'/p
 if record['state']=='present':assert f.is_file() and not f.is_symlink() and h(f)==record['sha256'] and (f.stat().st_mode & 0o7777)==record['mode']
 else:assert not f.exists()
for p,d in json.loads((r/'protected-inputs.json').read_text()).items():assert h(Path(p))==d,p
profile=json.loads((r/'assessment-profile.json').read_text());env={'PATH':'/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/assays/assay.mjs'],capture_output=True,text=True,env=env,timeout=60)
(r/'assessment.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr,'environmentKeys':sorted(env),'profileSha256':h(r/'assessment-profile.json'),'receiptSha256':h(r/'stage.receipt.json')},indent=2)+'\n')
result=json.loads(x.stdout) if x.stdout else {};print(json.dumps({'exitCode':x.returncode,'passed':result.get('passed'),'total':result.get('total'),'failed':[c for c in result.get('checks',[]) if not c['passed']],'stderr':x.stderr[:1800]}))
