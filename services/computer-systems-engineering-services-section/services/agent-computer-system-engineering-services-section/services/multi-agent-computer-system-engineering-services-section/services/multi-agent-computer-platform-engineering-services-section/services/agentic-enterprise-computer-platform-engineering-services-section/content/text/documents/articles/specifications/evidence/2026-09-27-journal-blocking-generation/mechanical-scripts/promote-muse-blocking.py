from pathlib import Path
import hashlib,json,shutil,os,time,tempfile
s=Path(Path('/tmp/muse-spec-path').read_text().strip());r=Path(Path('/tmp/muse-blocking-run').read_text().strip());a=Path(Path('/tmp/muse-blocking-assay').read_text().strip());e=s/'evidence/2026-09-27-journal-blocking-generation';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assessment=json.loads((r/'assessment.json').read_text());result=json.loads(assessment['stdout']);assert assessment['exitCode']==0 and result['passed']==result['total']==39
review=json.loads((r/'review-disposition.json').read_text());assert review['accepted'] is True
commit=json.loads((a/'commitment.json').read_text());invocation=json.loads((r/'invocation.json').read_text());assert h(a/'commitment.json')==invocation['assayCommitment']['manifestSha256'];assert h(a/'assay.mjs')==commit['assaySha256'];assert h(a/'resolve.mjs')==commit['loaderSha256'];assert h(a/'dependencies.json')==commit['dependencyMapSha256']
boundary=json.loads((r/'boundary-observation.json').read_text());assert boundary['beforeGeneration'] and not boundary['observations']['checkoutVisible'] and not boundary['observations']['assayVisible']
inventory=json.loads((r/'inventory.json').read_text());name=next(iter(inventory['files']));prior=json.loads((r/'prior-attempt.json').read_text());target=Path(prior['originalTarget']);stage=r/'stage'/name;before=prior['originalSha256'];assert inventory['files'][name]['sha256']==prior['candidateSourceSha256']
assert review['sourceSha256']==h(stage)
receipt=json.loads((r/'stage.receipt.json').read_text());assert receipt['outputs'][name]['sha256']==h(stage)
protected=json.loads((r/'protected-inputs.json').read_text())
for p,d in protected.items():assert h(Path(p))==d,p
assert h(target)==before and not target.is_symlink()
shutil.copytree(r,e/'attempt-03-codemod');shutil.copytree(a,e/'private-receiving-03');objects=e/'input-bytes'
for p,d in protected.items():
 dest=objects/d
 if not dest.exists():dest.write_bytes(Path(p).read_bytes())
 assert h(dest)==d
(e/'input-bindings-03.json').write_text(json.dumps(protected,indent=2)+'\n')
scripts=e/'mechanical-scripts';scripts.mkdir()
for n in ['muse-blocking-dependencies.mjs','prepare-muse-blocking.py','prepare-muse-blocking-codemod.py','invoke-muse-blocking.py','assess-muse-blocking.py','promote-muse-blocking.py']:
 shutil.copy2(Path('/tmp')/n,scripts/n)
for p,d in protected.items():assert h(Path(p))==d,p
assert h(target)==before
record={'target':str(target),'beforeSha256':before,'sourceSha256':h(stage),'status':'promotion-started','startedAt':time.time(),'acceptance':'pure causal reconstruction preserving retained blocking decisions; host integration unaccepted'}
rp=e/'promotion.json';rp.write_text(json.dumps(record,indent=2)+'\n')
fd,tmp=tempfile.mkstemp(prefix='.muse-blocking-promote-',dir=target.parent)
try:
 with os.fdopen(fd,'wb') as stream:
  stream.write(stage.read_bytes());stream.flush();os.fchmod(stream.fileno(),target.stat().st_mode&0o777);os.fsync(stream.fileno())
 assert h(target)==before
 os.replace(tmp,target)
 dirfd=os.open(target.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(dirfd)
 finally:os.close(dirfd)
 assert h(target)==h(stage)
 record['status']='promoted';record['finishedAt']=time.time();rp.write_text(json.dumps(record,indent=2)+'\n')
except Exception as error:
 record['status']='promotion-failed';record['errorType']=type(error).__name__;rp.write_text(json.dumps(record,indent=2)+'\n');raise
finally:
 if os.path.exists(tmp):os.unlink(tmp)
usage=[json.loads((e/n/'provider-usage.json').read_text()) for n in ['attempt-01','attempt-02','attempt-03-codemod']]
observation={'status':'generated codemod independently observed, source reviewed and promoted','sourceSha256':h(target),'observedEffects':['historical cause and transitive descendants stay blocked','late source reception does not clear a retained block','unrelated eligible witnesses are admitted and pending ones recover','exact differing and falsy decisions survive reconstruction round trips','malformed inputs refuse without accessor execution'],'passed':result['passed'],'total':result['total'],'sourceCalls':3,'inputTokens':sum(x['usage'][0]['input_tokens'] for x in usage),'outputTokens':sum(x['usage'][0]['output_tokens'] for x in usage),'durationSeconds':sum(x['durationSeconds'] for x in usage),'cashCost':'unavailable','limits':['First two candidates passed their committed behavioral observations but were refused on public source review; the third call corrected only the documented comparison-key defect. No private feedback was supplied to generators.','Pure state reconstruction only; Systems owner, durable journal, actual consumers, migration and assistant workflow remain unaccepted.','Local generation and receiving isolation observed; provider server isolation/retention remain trust assumptions.']}
(e/'observations.json').write_text(json.dumps(observation,indent=2)+'\n')
dep={'path':str(target.relative_to('/home/emsenn/info')),'sha256':h(target),'promotionEvidence':'../2026-09-27-journal-blocking-generation/promotion.json','promotionEvidenceSha256':h(rp),'clause':'L-O22','hostIntegrationAccepted':False}
b=s/'evidence/2026-09-27-journal-operation-design/bindings.json';v=json.loads(b.read_text());v['acceptedBlockingReconstructionDependency']=dep;b.write_text(json.dumps(v,indent=2)+'\n')
m=s/'evidence/2026-09-27-context-admission-fabrication/source-bindings.json';old_m=h(m);v=json.loads(m.read_text());v['acceptedBlockingReconstructionDependency']=dep;assert v['generationReady'] is False;m.write_text(json.dumps(v,indent=2)+'\n')
cf=s/'2026-09-27-muse-assist-context-admission-fabrication.md';t=cf.read_text();assert old_m in t;cf.write_text(t.replace(old_m,h(m)))
o=s/'evidence/2026-09-27-context-admission-design/observations.json';v=json.loads(o.read_text());v['fabricationOrder']['sha256']=h(cf);o.write_text(json.dumps(v,indent=2)+'\n')
assert h(m) in cf.read_text();assert h(target)==review['sourceSha256']
print(json.dumps({'promoted':str(target),'sha256':h(target),'observationsPassed':result['passed'],'hostIntegrationAccepted':False,'totalInputTokens':observation['inputTokens'],'totalOutputTokens':observation['outputTokens']},indent=2))
