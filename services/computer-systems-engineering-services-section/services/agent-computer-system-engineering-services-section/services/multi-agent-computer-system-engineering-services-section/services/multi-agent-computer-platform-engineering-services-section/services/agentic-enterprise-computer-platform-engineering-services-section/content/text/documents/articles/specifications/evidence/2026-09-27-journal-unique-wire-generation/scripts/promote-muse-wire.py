from pathlib import Path
import json,hashlib,shutil,os,subprocess,time
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=Path(Path('/tmp/muse-wire-generation-run').read_text());a=Path(Path('/tmp/muse-wire-assay').read_text());s=Path(Path('/tmp/muse-spec-path').read_text())
packet=json.loads((r/'public-input.json').read_text());manifest=json.loads((r/'candidate-manifest.json').read_text());assessment=json.loads((r/'assessment.json').read_text());assert assessment['exitCode']==0
report=json.loads(assessment['stdout']);assert report['passed']==report['total'] and report['total']>40
commit=json.loads((a/'commitment.json').read_text());assert sha(a/'assay.mjs')==commit['assaySha256'] and sha(a/'resolve.mjs')==commit['loaderSha256'] and sha(a/'commitment.json')==packet['assayCommitment']['manifestSha256']
protected=json.loads((r/'protected-inputs.json').read_text());protected.update(json.loads((r/'resolution-environment.json').read_text())['packageFiles'])
assert all(sha(Path(p))==d for p,d in protected.items()),'Refusing stale input batch'
assert sha(r/'candidate.json')==manifest['candidateJsonSha256']
paths=json.loads((r/'source-paths.json').read_text());assert set(paths)==set(manifest['outputs'])
for n,d in manifest['outputs'].items():assert sha(r/'candidate'/n)==d and assessment['outputs'][n]==d
assert json.loads((r/'boundary-probe.json').read_text())['exitCode']==0
ev=s/'evidence/2026-09-27-journal-unique-wire-generation';assert not ev.exists(), 'Evidence destination already exists; inspect instead of overwriting'
# One admitted file: all current input checks precede its atomic replacement.
for name,target in paths.items():
 p=Path(target); tmp=p.with_name(p.name+'.muse-wire-promote-'+str(os.getpid()));assert not tmp.exists()
 tmp.write_bytes((r/'candidate'/name).read_bytes());shutil.copymode(p,tmp);os.replace(tmp,p)
receipt={'promotedAt':time.time(),'inputs':manifest['inputs'],'outputs':{n:sha(Path(p)) for n,p in paths.items()},'workOrderSha256':packet['workOrder']['sha256'],'assessmentSha256':sha(r/'assessment.json'),'assayCommitmentSha256':sha(a/'commitment.json'),'sourceReview':'Only admitted pure record functions and source-set compatibility; no I/O, authority or dispatch behavior introduced.','limits':report['limits']}
assert receipt['outputs']==manifest['outputs'];(r/'promotion-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
ev.mkdir()
shutil.copytree(r,ev/'accepted-generation');shutil.copytree(a,ev/'private-assay')
shutil.copytree('/tmp/muse-wire-assay-j13clq2d',ev/'superseded-private-assay')
previousRuns=['/tmp/muse-wire-generation-g53qstru','/tmp/muse-wire-generation-4upjekya','/tmp/muse-wire-generation-dgyshfkw','/tmp/muse-wire-generation-s0q46pxi']
for index,previous in enumerate(previousRuns,1):
 prior=Path(previous)
 if prior!=r:shutil.copytree(prior,ev/('prior-generation-'+str(index)))
for f in ['/tmp/muse-wire-dependencies.mjs','/tmp/prepare-muse-wire.py','/tmp/invoke-muse-wire.py','/tmp/materialize-muse-wire.py','/tmp/promote-muse-wire.py','/tmp/retry-muse-wire.py','/tmp/revise-muse-wire-assay.py','/tmp/diagnose-wire-envelope.py','/tmp/diagnose-wire-envelope.mjs']:
 dest=ev/'scripts'/Path(f).name;dest.parent.mkdir(exist_ok=True);shutil.copy2(f,dest)
# Preserve the input source and governing specification bytes alongside output.
(ev/'governing-specifications').mkdir(); saved={}
for p in s.glob('2026-09-27-*.md'):
 if any(x in p.name for x in ['muse-assist-customer-demand','muse-assist-requirements','muse-assist-architecture-arc42','muse-assist-sas','muse-assist-hld','muse-assist-work-platform-lld','muse-assist-personal-interaction-lld','muse-assist-shared-effect-lld','muse-assist-journal-admission-lld','muse-assist-fabrication-lld','journal-unique-wire-fabrication']):
  shutil.copy2(p,ev/'governing-specifications'/p.name);saved[p.name]=sha(p)
(ev/'governing-specifications/manifest.json').write_text(json.dumps(saved,indent=2))
events=[json.loads(l) for l in (r/'events.jsonl').read_text().splitlines()]
usage=[e.get('usage') for e in events if e.get('usage')]
binary=Path('/mnt/c/Users/emsen/.codex/bin/wsl/7d1db4ccd85248a5/codex');node='/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node'
(ev/'environment.json').write_text(json.dumps({'generatorSha256':sha(binary),'generatorVersion':subprocess.check_output([str(binary),'--version'],text=True).strip(),'nodeVersion':subprocess.check_output([node,'--version'],text=True).strip(),'modelRequested':'gpt-6-luna','reportedUsage':usage,'cashCost':'unavailable','scope':'Pure shared Code/Data laws. Journal source integration, authority enforcement and assistant operation remain unaccepted.'},indent=2)+'\n')
print(json.dumps({'promoted':receipt['outputs'],'evidence':str(ev),'observations':report['total']}))
