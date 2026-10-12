from pathlib import Path
import hashlib,json,shutil,os,time
s=Path(Path('/tmp/muse-spec-path').read_text().strip());r=Path(Path('/tmp/muse-packet-run').read_text().strip());a=Path(Path('/tmp/muse-packet-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
e=s/'evidence/2026-09-27-journal-packet-generation';assert not e.exists()
inv=json.loads((r/'inventory.json').read_text());name=next(iter(inv['files']));target=Path(inv['sourceRoot'])/name;stage=r/'stage'/name
assessment=json.loads((r/'assessment.json').read_text());result=json.loads(assessment['stdout']);assert assessment['exitCode']==0 and result['passed']==result['total']==57
correction=json.loads((a/'infrastructure-correction.json').read_text());commit=json.loads((a/'commitment.json').read_text());assert h(a/'assay-original.mjs')==commit['assaySha256']==correction['originalAssaySha256'];assert h(a/'assay.mjs')==correction['correctedAssaySha256'];assert h(a/'commitment.json')==correction['originalCommitmentSha256'];assert h(a/'infrastructure-correction.json')==assessment['infrastructureCorrectionSha256']
boundary=json.loads((r/'boundary-observation.json').read_text());assert boundary['beforeGeneration'] and not boundary['observations']['checkoutVisible'] and not boundary['observations']['assayVisible']
protected=json.loads((r/'protected-inputs.json').read_text())
for p,digest in protected.items():assert h(Path(p))==digest,p
receipt=json.loads((r/'stage.receipt.json').read_text());assert receipt['outputs'][name]['sha256']==h(stage)
assert not os.path.lexists(target)
review={'accepted':True,'sourceSha256':h(stage),'reviewedExports':['journalPacket','resolveJournalPacket'],'findings':['Only declared pure imports are present; no host IO or executable evaluation path.','Constructor and resolver use existing canonical/artifact identity and byte limits without a second body carrier.','Own data-descriptor inspection avoids invoking resolver-pair accessors and preserves large composite-body capacity.','Resolver invocation is outside validation catches; all thrown values escape unchanged.','Canonical body, content address, digest and byte length must agree.','Outputs contain no custody/admission/durability claims.'],'limitations':['No host adapter, legacy packet migration or assistant effect accepted.','One operator-authored assessment syntax fault was corrected after generation but before any behavioral observation; unchanged candidate and no provider feedback.']}
(r/'review-disposition.json').write_text(json.dumps(review,indent=2)+'\n')
shutil.copytree(r,e/'attempt-01');shutil.copytree(a,e/'private-receiving');objects=e/'input-bytes';objects.mkdir()
for p,digest in protected.items():
 dest=objects/digest
 if not dest.exists():dest.write_bytes(Path(p).read_bytes())
 assert h(dest)==digest
(e/'input-bindings.json').write_text(json.dumps(protected,indent=2)+'\n')
scripts=e/'mechanical-scripts';scripts.mkdir()
for name_ in ['prepare-muse-packet.py','invoke-muse-packet.py','assess-muse-packet.py','promote-muse-packet.py','muse-packet-dependencies.mjs']:
 shutil.copy2(Path('/tmp')/name_,scripts/name_)
for p,digest in protected.items():assert h(Path(p))==digest,p
assert not os.path.lexists(target)
record={'target':str(target),'candidateSha256':h(stage),'before':'absent','status':'promotion-started','startedAt':time.time(),'acceptance':'pure content-addressed packet construction and synchronous verification only'}
rp=e/'promotion.json';rp.write_text(json.dumps(record,indent=2)+'\n')
with target.open('xb') as stream:stream.write(stage.read_bytes());stream.flush();os.fsync(stream.fileno())
target.chmod(0o644);assert h(target)==h(stage);record['status']='promoted';record['finishedAt']=time.time();rp.write_text(json.dumps(record,indent=2)+'\n')
observation={'status':'generated candidate independently checked, source reviewed and promoted as pure dependency','passed':result['passed'],'total':result['total'],'sourceSha256':h(target),'receivingCorrection':{'path':'private-receiving/infrastructure-correction.json','sha256':h(e/'private-receiving/infrastructure-correction.json')},'providerUsage':json.loads((r/'provider-usage.json').read_text()),'limits':review['limitations']+['Local isolation observed; provider-side isolation and retention remain trust assumptions.','No host storage/read path switched and no legacy files removed.']}
(e/'observations.json').write_text(json.dumps(observation,indent=2)+'\n')
dep={'path':str(target.relative_to('/home/emsenn/info')),'sha256':h(target),'promotionEvidence':'../2026-09-27-journal-packet-generation/promotion.json','promotionEvidenceSha256':h(rp),'exports':['journalPacket','resolveJournalPacket'],'hostIntegrationAccepted':False}
b=s/'evidence/2026-09-27-journal-operation-design/bindings.json';d=json.loads(b.read_text());d['acceptedPurePacketDependency']=dep;b.write_text(json.dumps(d,indent=2)+'\n')
m=s/'evidence/2026-09-27-context-admission-fabrication/source-bindings.json';mh=h(m);v=json.loads(m.read_text());v['acceptedPurePacketDependency']=dep;assert v['generationReady'] is False;m.write_text(json.dumps(v,indent=2)+'\n')
cf=s/'2026-09-27-muse-assist-context-admission-fabrication.md';ct=cf.read_text();assert mh in ct;ct=ct.replace(mh,h(m));needle='The source-view/host/journal specifications are not accepted implementations.';assert needle in ct;ct=ct.replace(needle,'The pure packet constructor/resolver is likewise generated and accepted under L-O19, using the existing artifact carrier; its source and evidence are bound alongside the semantic dependency. Historical packet correspondence and protected host integration remain open. '+needle);cf.write_text(ct)
o=s/'evidence/2026-09-27-context-admission-design/observations.json';d=json.loads(o.read_text());d['fabricationOrder']['sha256']=h(cf);o.write_text(json.dumps(d,indent=2)+'\n')
assert h(m) in cf.read_text();assert h(target)==review['sourceSha256'];assert json.loads(o.read_text())['fabricationOrder']['sha256']==h(cf)
print(json.dumps({'target':str(target),'sha256':h(target),'observationsPassed':result['passed'],'hostIntegrationAccepted':False,'providerUsage':observation['providerUsage']},indent=2))
