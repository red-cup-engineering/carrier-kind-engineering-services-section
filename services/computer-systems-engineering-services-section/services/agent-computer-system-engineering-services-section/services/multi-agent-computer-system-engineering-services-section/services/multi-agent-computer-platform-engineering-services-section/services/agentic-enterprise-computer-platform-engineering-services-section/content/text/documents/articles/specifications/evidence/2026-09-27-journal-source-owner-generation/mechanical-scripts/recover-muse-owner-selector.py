from pathlib import Path
import json,hashlib,shutil,tempfile,subprocess
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();hs=lambda s:hashlib.sha256(s.encode()).hexdigest()
s=Path(Path('/tmp/muse-spec-path').read_text());o=s/'2026-09-27-journal-source-owner-fabrication.md';old=Path('/tmp/muse-owner-generation-fj2a80s8');olda=Path('/tmp/muse-owner-assay-aji2v4dj');render=Path('/tmp/muse-owner-generation-723833i8');assert json.loads((render/'invocation.json').read_text())['exitCode']==-15
assert not (old/'stage').exists() and json.loads((old/'staging.json').read_text())['exitCode']!=0
protected=json.loads((old/'protected-inputs.json').read_text())
for p,d in protected.items():
 if p!=str(o):assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-recovery-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(o);(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
for n in ['inventory.json','promotion-inventory.json','output-schema.json']:shutil.copy2(old/n,r/n)
shutil.copytree(old/'original',r/'original')
inv=json.loads((r/'inventory.json').read_text());c=json.loads((old/'candidate.json').read_text());assert len(c['changes'])==1 and c['disposition']=='candidate';change=c['changes'][0];assert change['path']=='src/journal/filesystem/source-owner.mjs';source=Path(inv['sourceRoot'])/change['path'];assert h(source)==change['inputSha256'];text=source.read_text();afterDigests=[hs(v['after']) for v in change['replacements']];selector=None
for i,v in enumerate(change['replacements']):
 if i==2:
  assert text.count(v['before'])==0
  left='function refreshSourceView(operation) {';right='\nfunction createSourceScope(operation) {'
  assert text.count(left)==1 and text.count(right)==1
  span=text[text.index(left):text.index(right)].rstrip();assert text.count(span)==1
  selector={'replacementIndex':i,'incorrectSelectorSha256':hs(v['before']),'correctSelectorSha256':hs(span)};v['before']=span
 assert text.count(v['before'])==1
 text=text.replace(v['before'],v['after'],1)
assert afterDigests==[hs(v['after']) for v in change['replacements']]
expected=hs(text);assert expected==json.loads((render/'render-commitment.json').read_text())['expectedOutputSha256']
receipt={'kind':'source-selector-recovery','status':'bound-before-staging','originalCandidateSha256':h(old/'candidate.json'),'originalGenerationOrderSha256':protected[str(o)],'recoveryOrderSha256':h(o),'scriptSha256':h(Path(__file__)),'originalSourceSha256':h(source),'afterSha256':afterDigests,'selector':selector,'expectedOutputSha256':expected,'assayCommitmentSha256':h(a/'commitment.json'),'privateReceivingRun':False}
(r/'recovery-commitment.json').write_text(json.dumps(receipt,indent=2)+'\n');(r/'candidate.json').write_text(json.dumps(c,indent=2)+'\n')
protected[str(o)]=h(o);(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
# Preserve namespace templates as templates only; no model invocation occurs in this recovery.
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
p=json.loads((old/'public-input.json').read_text());p['purpose']='Historical behavioral generation inputs; selector metadata recovered under F-S18. Not a new model invocation.';(r/'public-input.json').write_text(json.dumps(p))
x=subprocess.run(['python3','/tmp/materialize-muse-source-patchset.py',str(r/'inventory.json'),str(r/'candidate.json'),str(r/'stage')],capture_output=True,text=True);(r/'staging.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2)+'\n');assert x.returncode==0,x.stderr
assert h(r/'stage'/change['path'])==expected
for f in (r/'stage').rglob('*.mjs'):
 x=subprocess.run(['/home/emsenn/.local/bin/node','--check',str(f)],capture_output=True,text=True);assert x.returncode==0,x.stderr
for p,d in protected.items():assert h(Path(p))==d,p
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'sourceOwnerSha256':expected,'syntaxChecked':True,'generatedAfterBytesUnchanged':True,'privateReceivingRun':False,'promoted':False}))
