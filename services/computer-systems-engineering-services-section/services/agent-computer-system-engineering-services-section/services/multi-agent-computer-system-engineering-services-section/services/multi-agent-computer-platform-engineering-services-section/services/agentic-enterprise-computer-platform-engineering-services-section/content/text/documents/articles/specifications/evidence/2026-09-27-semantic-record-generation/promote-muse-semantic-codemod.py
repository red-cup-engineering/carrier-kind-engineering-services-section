from pathlib import Path
import json,hashlib,shutil,os,time
s=Path(Path('/tmp/muse-spec-path').read_text().strip());r=Path(Path('/tmp/muse-semantic-codemod-run').read_text().strip());a=Path(Path('/tmp/muse-semantic-codemod-assay').read_text().strip());e=s/'evidence/2026-09-27-semantic-record-generation';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
reports=json.loads((r/'assessment.json').read_text());assert reports['acceptedByAssays'] and len(reports['reports'])==2
for x in reports['reports']:
 result=json.loads(x['stdout']);assert x['exitCode']==0 and result['passed']==result['total']
assert json.loads((r/'boundary-observation.json').read_text())['exitCode']==0
prior=json.loads((r/'prior-attempt.json').read_text());target=Path(prior['originalTarget']);name='src/semiotic-eavt/semantic-record.mjs';stage=r/'stage'/name;receipt=json.loads((r/'stage.receipt.json').read_text());assert receipt['outputs'][name]['sha256']==h(stage)
candidate=json.loads((r/'candidate.json').read_text());assert len(candidate['changes'])==1;change=candidate['changes'][0];assert change['operation']=='edit' and change['path']==name and change['inputSha256']==prior['candidateSourceSha256']
# Review accepts only the generated local exception-presence bookkeeping change.
original=Path(prior['path'])/'stage'/name;prefix=original.read_text().split('export function projectSemanticRecords')[0];assert stage.read_text().startswith(prefix+'export function projectSemanticRecords')
review={'accepted':True,'scope':'F-E01/F-E02 resolver failure presence independent of thrown value; existing pure laws unchanged','candidateSourceSha256':h(stage),'originalSourceSha256':h(original),'replacements':len(change['replacements']),'privateFeedbackShared':False};(r/'review-disposition.json').write_text(json.dumps(review,indent=2)+'\n')
protected=json.loads((r/'protected-inputs.json').read_text())
for path,digest in protected.items():assert h(Path(path))==digest,path
assert not os.path.lexists(target)
shutil.copytree(r,e/'attempt-04-codemod');shutil.copytree(a,e/'codemod-private-receiving');objects=e/'input-bytes';objects.mkdir(exist_ok=True)
for path,digest in protected.items():
 out=objects/digest
 if not out.exists():out.write_bytes(Path(path).read_bytes())
 assert h(out)==digest
(e/'codemod-input-bindings.json').write_text(json.dumps(protected,indent=2)+'\n')
for script in ['/tmp/prepare-muse-semantic-codemod.py','/tmp/invoke-muse-semantic-codemod.py','/tmp/assess-muse-semantic-codemod.py','/tmp/promote-muse-semantic-codemod.py']:shutil.copy2(script,e/Path(script).name)
for path,digest in protected.items():assert h(Path(path))==digest,path
assert not os.path.lexists(target)
record={'target':str(target),'sourceSha256':h(stage),'before':'absent','status':'promotion-started','startedAt':time.time(),'acceptance':'pure record construction, historical custody representation and record projection only','candidateChain':['attempt-03','attempt-04-codemod']};p=e/'promotion.json';p.write_text(json.dumps(record,indent=2)+'\n')
try:
 with target.open('xb') as stream:stream.write(stage.read_bytes());stream.flush();os.fsync(stream.fileno())
 target.chmod(0o644);assert h(target)==h(stage);record['status']='promoted';record['finishedAt']=time.time();p.write_text(json.dumps(record,indent=2)+'\n')
except Exception as error:
 record['status']='promotion-failed';record['errorType']=type(error).__name__;p.write_text(json.dumps(record,indent=2)+'\n');raise
p=e/'observations.json';d=json.loads(p.read_text());d['status']='composed generated candidate accepted and pure dependency promoted';d['fourthAttempt']={'path':'attempt-04-codemod','candidateSha256':h(r/'candidate.json'),'priorObservations':53,'resolverIdentityObservations':11,'sourceReviewAccepted':True,'promoted':True};d['limitations']=['Pure dependency only; host writer/query routes remain unchanged pending connected migration.','Actual journal custody, current domain authority, consumer retirement and assistant workflow remain unaccepted.','Three earlier complete candidates were unaccepted; fourth invocation generated only an exact-substring codemod.','Private receiving content/results were never sent to a generator.','Local process isolation observed; provider-server retention/isolation remains a trust assumption.'];d['nextAction']='Bind this accepted pure interface into Systems journal semantic-record host and the connected source-owner/consumer migration order.';p.write_text(json.dumps(d,indent=2)+'\n')
usage=json.loads((e/'provider-usage-total.json').read_text());new=json.loads((r/'provider-usage.json').read_text());usage['sourceCalls']+=1;usage['inputTokens']+=new['usage'][0]['input_tokens'];usage['outputTokens']+=new['usage'][0]['output_tokens'];usage['durationSeconds']+=new['durationSeconds'];(e/'provider-usage-total.json').write_text(json.dumps(usage,indent=2)+'\n')
print(json.dumps({'promoted':str(target),'sha256':h(target),'priorObservations':53,'resolverObservations':11,'hostIntegrationAccepted':False,'codemodUsage':new}))
