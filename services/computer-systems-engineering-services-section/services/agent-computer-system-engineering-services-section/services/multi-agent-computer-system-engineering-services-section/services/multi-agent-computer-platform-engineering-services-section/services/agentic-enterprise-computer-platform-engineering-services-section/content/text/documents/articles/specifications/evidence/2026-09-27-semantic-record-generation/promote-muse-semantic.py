from pathlib import Path
import json,hashlib,shutil,os,time
s=Path(Path('/tmp/muse-spec-path').read_text().strip());r=Path(Path('/tmp/muse-semantic-run').read_text().strip());e=s/'evidence/2026-09-27-semantic-record-generation';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=json.loads((r/'review-disposition.json').read_text());assert review['accepted'] is True, 'source review has not accepted this candidate'
assessment=json.loads((r/'assessment.json').read_text());assert assessment['exitCode']==0;result=json.loads(assessment['stdout']);assert result['passed']==result['total'] and result['total']>0
boundary=json.loads((r/'boundary-observation.json').read_text());assert boundary['exitCode']==0 and boundary['beforeGeneration']
protected=json.loads((r/'protected-inputs.json').read_text());inv=json.loads((r/'inventory.json').read_text());assert len(inv['files'])==1
name=next(iter(inv['files']));target=Path(inv['sourceRoot'])/name;stage=r/'stage'/name;receipt=json.loads((r/'stage.receipt.json').read_text());assert receipt['outputs'][name]['sha256']==h(stage)
for p,digest in protected.items():assert h(Path(p))==digest,p
assert not os.path.lexists(target)
# Archive exact accepted candidate and the original dependency/specification bytes before touching the target.
shutil.copytree(r,e/'attempt-03');objects=e/'input-bytes';objects.mkdir(exist_ok=True)
for p,digest in protected.items():
 out=objects/digest
 if not out.exists():out.write_bytes(Path(p).read_bytes())
 assert h(out)==digest
(e/'input-bindings.json').write_text(json.dumps(protected,indent=2)+'\n')
for p,digest in protected.items():assert h(Path(p))==digest,p
assert not os.path.lexists(target)
record={'target':str(target),'candidateSha256':h(stage),'before':'absent','status':'promotion-started','startedAt':time.time(),'acceptance':'pure semantic record/import/projection laws only'};rp=e/'promotion.json';rp.write_text(json.dumps(record,indent=2)+'\n')
try:
 with target.open('xb') as stream:stream.write(stage.read_bytes());stream.flush();os.fsync(stream.fileno())
 target.chmod(0o644);assert h(target)==h(stage)
 record['status']='promoted';record['finishedAt']=time.time();rp.write_text(json.dumps(record,indent=2)+'\n')
except Exception as error:
 record['status']='promotion-failed';record['errorType']=type(error).__name__;rp.write_text(json.dumps(record,indent=2)+'\n');raise
p=e/'observations.json';d=json.loads(p.read_text());d['status']='third candidate accepted and pure dependency promoted';d['thirdAttempt']={'path':'attempt-03','candidateSha256':h(r/'candidate.json'),'passed':result['passed'],'total':result['total'],'promoted':True};d['limitations']=['Pure dependency only; no host query/record route is switched by this promotion.','Actual storage migration, domain authority, consumer retirement and assistant workflow remain unaccepted.','First two candidates were syntax-rejected; no private behavioral feedback was sent to any source generator.','Local process isolation observed; provider-server retention/isolation remains a trust assumption.'];p.write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({'target':str(target),'sha256':h(target),'passed':result['passed'],'total':result['total'],'integratedAcceptance':False}))
