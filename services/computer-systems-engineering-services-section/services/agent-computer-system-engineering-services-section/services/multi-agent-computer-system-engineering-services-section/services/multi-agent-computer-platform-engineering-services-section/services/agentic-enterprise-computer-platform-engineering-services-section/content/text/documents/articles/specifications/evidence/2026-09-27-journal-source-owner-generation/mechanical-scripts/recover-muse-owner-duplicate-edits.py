from pathlib import Path
import json,hashlib,shutil,tempfile,subprocess
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();hs=lambda s:hashlib.sha256(s.encode()).hexdigest()
s=Path(Path('/tmp/muse-spec-path').read_text().strip());o=s/'2026-09-27-journal-source-owner-fabrication.md';old=Path('/tmp/muse-owner-generation-sv7zluxs');olda=Path('/tmp/muse-owner-assay-516a8tej')
assert not (old/'stage').exists() and json.loads((old/'staging.json').read_text())['exitCode']!=0
protected=json.loads((old/'protected-inputs.json').read_text())
for p,d in protected.items():
 if p!=str(o):assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-recovery-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(o);(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
for n in ['inventory.json','promotion-inventory.json','output-schema.json']:shutil.copy2(old/n,r/n)
shutil.copytree(old/'original',r/'original')
inv=json.loads((r/'inventory.json').read_text());c=json.loads((old/'candidate.json').read_text());assert len(c['changes'])==2 and c['disposition']=='candidate'
first,second=c['changes'];assert first['operation']==second['operation']=='edit';assert first['path']==second['path']=='src/journal/filesystem/source-owner.mjs';assert first['inputSha256']==second['inputSha256'];assert first['clauses']==second['clauses']
source=Path(inv['sourceRoot'])/first['path'];assert h(source)==first['inputSha256'];text=source.read_text()
replacements=first['replacements']+second['replacements'];assert len(replacements)==2
spans=[];composed=text
for replacement in replacements:
 before=replacement['before'];assert text.count(before)==1
 start=text.index(before);end=start+len(before);assert all(end<=lo or start>=hi for lo,hi in spans);spans.append((start,end))
 assert composed.count(before)==1;composed=composed.replace(before,replacement['after'],1)
afterDigests=[hs(v['after']) for v in replacements]
selector={'originalBeforeSha256':[hs(v['before']) for v in replacements],'replacementAfterSha256':afterDigests,'disjointOriginalSpans':spans,'operation':'coalesce duplicate edit records preserving ordered replacements'}
expected=hs(composed)
change=dict(first);change['replacements']=replacements;c['changes']=[change]
receipt={'kind':'source-edit-coalescing-recovery','status':'bound-before-staging','originalCandidateSha256':h(old/'candidate.json'),'originalGenerationOrderSha256':protected[str(o)],'recoveryOrderSha256':h(o),'scriptSha256':h(Path(__file__)),'originalSourceSha256':h(source),'afterSha256':afterDigests,'selector':selector,'expectedOutputSha256':expected,'assayCommitmentSha256':h(a/'commitment.json'),'privateReceivingRun':False}
(r/'recovery-commitment.json').write_text(json.dumps(receipt,indent=2)+'\n');(r/'candidate.json').write_text(json.dumps(c,indent=2)+'\n')
protected[str(o)]=h(o);(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
# Preserve namespace templates as templates only; no model invocation occurs in this recovery.
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
p=json.loads((old/'public-input.json').read_text());p['purpose']='Historical behavioral generation inputs; duplicate-file edit packaging recovered under F-S23. Not a new model invocation.';(r/'public-input.json').write_text(json.dumps(p))
x=subprocess.run(['python3','/tmp/materialize-muse-source-patchset.py',str(r/'inventory.json'),str(r/'candidate.json'),str(r/'stage')],capture_output=True,text=True);(r/'staging.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2)+'\n');assert x.returncode==0,x.stderr
assert h(r/'stage'/change['path'])==expected
for f in (r/'stage').rglob('*.mjs'):
 x=subprocess.run(['/home/emsenn/.local/bin/node','--check',str(f)],capture_output=True,text=True);assert x.returncode==0,x.stderr
for p,d in protected.items():assert h(Path(p))==d,p
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'sourceOwnerSha256':expected,'syntaxChecked':True,'generatedAfterBytesUnchanged':True,'privateReceivingRun':False,'promoted':False}))
