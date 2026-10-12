from pathlib import Path
import hashlib,json,shutil,os,time,tempfile
s=Path(Path('/tmp/muse-spec-path').read_text().strip());r=Path(Path('/tmp/muse-container-run').read_text().strip());a=Path(Path('/tmp/muse-container-assay').read_text().strip());e=s/'evidence/2026-09-27-retained-container-generation';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();write=lambda p,v:p.write_text(json.dumps(v,indent=2)+'\n')
assess=json.loads((r/'assessment.json').read_text());res=json.loads(assess['stdout']);assert assess['exitCode']==0 and res['passed']==res['total']==16
review=json.loads((r/'review-disposition.json').read_text());assert review['accepted'] is True
inv=json.loads((r/'inventory.json').read_text());phase=json.loads((r/'generation-phase.json').read_text());original=phase['originalTargets'];commit=json.loads((a/'commitment.json').read_text());call=json.loads((r/'invocation.json').read_text());assert call['exitCode']==0 and h(a/'commitment.json')==call['assayCommitment']['manifestSha256'];assert h(a/'assay.mjs')==commit['assaySha256'];assert h(a/'resolve.mjs')==commit['loaderSha256'];assert h(a/'dependencies.json')==commit['dependencyMapSha256']
protected=json.loads((r/'protected-inputs.json').read_text());receipt=json.loads((r/'stage.receipt.json').read_text())
for p,d in protected.items(): assert h(Path(p))==d,p
for name,item in inv['files'].items():
 assert h(r/'stage'/name)==review['sources'][name]==receipt['outputs'][name]['sha256'];assert h(Path(inv['sourceRoot'])/name)==item['sha256'];assert h(Path(original['sourceRoot'])/name)==original['files'][name]['sha256']
boundary=json.loads((r/'boundary-observation.json').read_text());assert boundary['beforeGeneration'] and not boundary['observations']['checkoutVisible'] and not boundary['observations']['assayVisible']
shutil.copytree(Path(phase['priorRun']),e/'attempt-03-phase-a');shutil.copytree(Path(phase['priorAssay']),e/'private-receiving-03');shutil.copytree(r,e/'attempt-04-phase-b');shutil.copytree(a,e/'private-receiving-04');objects=e/'input-bytes';objects.mkdir(exist_ok=True)
for p,d in protected.items():
 dest=objects/d
 if not dest.exists():dest.write_bytes(Path(p).read_bytes())
 assert h(dest)==d
scripts=e/'mechanical-scripts';scripts.mkdir(exist_ok=True)
for n in ['prepare-muse-container.py','invoke-muse-container.py','assess-muse-container.py','promote-muse-container.py','materialize-muse-source-patchset.py','stage-muse-container-phase-a.py','prepare-muse-container-phase-b.py']:
 shutil.copy2(Path('/tmp')/n,scripts/n)
record={'status':'promotion-started','startedAt':time.time(),'files':[],'multiFileAtomic':False,'acceptance':'shared pure JSON traversal; owner integration remains unaccepted'};rp=e/'promotion.json';write(rp,record)
try:
 for p,d in protected.items():assert h(Path(p))==d,p
 for name,item in original['files'].items():
  target=Path(original['sourceRoot'])/name;stage=r/'stage'/name;assert h(target)==item['sha256'] and not target.is_symlink();fd,tmp=tempfile.mkstemp(prefix='.muse-container-promote-',dir=target.parent)
  try:
   with os.fdopen(fd,'wb') as f:f.write(stage.read_bytes());f.flush();os.fchmod(f.fileno(),target.stat().st_mode&0o777);os.fsync(f.fileno())
   assert h(target)==item['sha256'];os.replace(tmp,target);df=os.open(target.parent,os.O_RDONLY|os.O_DIRECTORY)
   try:os.fsync(df)
   finally:os.close(df)
   assert h(target)==h(stage);record['files'].append({'path':str(target),'beforeSha256':item['sha256'],'sha256':h(target),'status':'promoted'});write(rp,record)
  finally:
   if os.path.exists(tmp):os.unlink(tmp)
 record['status']='promoted';record['finishedAt']=time.time();write(rp,record)
except Exception as ex:
 record['status']='promotion-failed';record['errorType']=type(ex).__name__;write(rp,record);raise
usage=[json.loads((e/n/'provider-usage.json').read_text()) for n in ['attempt-01','attempt-02','attempt-03-phase-a','attempt-04-phase-b']]
obs={'status':'generated codemod independently received, source reviewed and promoted','observedEffects':['canonical JSON identities and shallow diagnostics preserved','deep finite container and ordinary witness metadata traversed without call-stack recursion','explicit depth bounds retain typed refusal','large composite artifact wrapper round-tripped with unchanged inner bounds','strict malformed Unicode/UTF8/duplicate-key refusal and descriptor safety retained'],'passed':res['passed'],'total':res['total'],'deepLevels':res['deepLevels'],'sourceCalls':4,'inputTokens':sum(x['usage'][0]['input_tokens'] for x in usage),'outputTokens':sum(x['usage'][0]['output_tokens'] for x in usage),'durationSeconds':sum(x['durationSeconds'] for x in usage),'cashCost':'unavailable','ownerIntegrated':False,'limitations':['Two whole-change calls refused without code. Two dependent generation phases then supplied the composed candidate; public source review of phase A specified diagnostic-path and raw-array iteration repairs. No private feedback was supplied.','Pure shared traversal acceptance does not establish protected storage, migrated consumers or assistant operation.','Local namespace isolation was observed; provider server isolation/retention remain trust assumptions.']};write(e/'observations.json',obs)
dep={'files':[{'path':str(Path(x['path']).relative_to('/home/emsenn/info')),'sha256':x['sha256']} for x in record['files']],'promotionEvidence':'../2026-09-27-retained-container-generation/promotion.json','promotionEvidenceSha256':h(rp),'clause':'L-O23','hostIntegrationAccepted':False}
b=s/'evidence/2026-09-27-journal-operation-design/bindings.json';v=json.loads(b.read_text());v['acceptedRetainedContainerCodecDependency']=dep;write(b,v)
m=s/'evidence/2026-09-27-context-admission-fabrication/source-bindings.json';old=h(m);v=json.loads(m.read_text());v['acceptedRetainedContainerCodecDependency']=dep;assert v['generationReady'] is False;write(m,v)
order=s/'2026-09-27-muse-assist-context-admission-fabrication.md';assert old in order.read_text();order.write_text(order.read_text().replace(old,h(m)))
c=s/'evidence/2026-09-27-context-admission-design/observations.json';v=json.loads(c.read_text());v['fabricationOrder']['sha256']=h(order);write(c,v)
assert h(m) in order.read_text();print(json.dumps({'promoted':record['files'],'passed':res['passed'],'deepLevels':res['deepLevels'],'ownerIntegrated':False,'inputTokens':obs['inputTokens'],'outputTokens':obs['outputTokens']},indent=2))
