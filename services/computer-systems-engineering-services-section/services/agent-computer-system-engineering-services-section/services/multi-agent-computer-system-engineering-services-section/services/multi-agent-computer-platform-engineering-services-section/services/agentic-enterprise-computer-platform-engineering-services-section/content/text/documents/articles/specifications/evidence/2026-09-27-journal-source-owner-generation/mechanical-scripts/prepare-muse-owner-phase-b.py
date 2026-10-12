from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess
s=Path(Path('/tmp/muse-spec-path').read_text().strip());old=Path(Path('/tmp/muse-owner-run').read_text().strip());olda=Path(Path('/tmp/muse-owner-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert (old/'public-source-review.json').exists(), 'public source review required before stage B'
assert json.loads((old/'public-source-review.json').read_text())['phaseBMayProceed'] is True
root=old/'stage';assert (root/'src/journal/filesystem/source-owner.mjs').is_file()
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
order=s/'2026-09-27-journal-source-owner-fabrication.md';op=s/'2026-09-27-muse-assist-journal-operation-lld.md'
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(order);commit['stage']='B; complete composed receiver';(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
baseInv=json.loads((old/'inventory.json').read_text());(r/'promotion-inventory.json').write_text(json.dumps(baseInv,indent=2)+'\n')
inv={'kind':'source-patchset-input','version':1,'sourceRoot':str(root),'files':{n:{'state':'present','sha256':h(root/n)} for n in baseInv['files']},'clauses':[f'F-S{i:02d}' for i in range(1,14)]};(r/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n');shutil.copytree(root,r/'original')
initial=json.loads((s/'evidence/2026-09-27-journal-source-owner-generation/attempt01/public-input.json').read_text())
def section(text,start,end=None):
 a=text.index(start);b=text.find(end,a+len(start)) if end else -1;return text[a:b if b>=0 else len(text)]
t=op.read_text(); opSections='\n\n'.join(section(t,f'## L-O{i:02d}',f'## L-O{i+1:02d}') for i in [1,2,3,4,5,14,22,23,24,25,26,27,28])
measure=s/'2026-09-27-muse-assist-journal-feed-measurement-lld.md';t=measure.read_text();measureSections=section(t,'**L-M01','**L-M04')+'\n'+section(t,'**L-M09','**L-M10')
selected=[(order,order.read_text()),(op,opSections),(measure,measureSections)]
for n in ['2026-09-27-muse-assist-journal-storage-lld.md','2026-09-27-muse-assist-journal-host-binding-lld.md','2026-09-27-muse-assist-journal-admission-lld.md','2026-09-27-muse-assist-fabrication-lld.md','2026-09-27-source-patchset-fabrication.md']:
 p=s/n;selected.append((p,p.read_text()))
sourceInputs=[{'path':x['path'],'sha256':h(Path(x['path'])),'text':Path(x['path']).read_text()} for x in initial['readOnlySourceInputs'] if not x['path'].endswith('/package.json')]
packet={'purpose':'Generate STAGE B under F-S11: replace createSourceScope seam with complete retained/unique source discovery, scope API, publication, warm reuse and required evidence barrier. Finish all owner behavior and remove every placeholder. Preserve/refine host behavior as required by full F-S contract and F-S12 public review. Use exact edits against provided Stage-A files. No tools; independent receiving remains separate. Return source-patchset JSON.','contracts':[{'path':p.name,'fullFileSha256':h(p),'selectedText':t} for p,t in selected],'inventory':inv,'transformationInputs':[{'path':n,'sha256':h(root/n),'text':(root/n).read_text()} for n in inv['files']],'readOnlySourceInputs':sourceInputs,'approvedBareImports':initial['approvedBareImports'],'assayCommitment':{'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(packet))
schema=json.loads((old/'output-schema.json').read_text());edit=schema['properties']['changes']['items']['anyOf'][1];edit['properties']['path']['enum']=list(inv['files']);edit['properties']['clauses']['items']['enum']=inv['clauses'];schema['properties']['changes']['items']=edit;(r/'output-schema.json').write_text(json.dumps(schema))
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
protected=json.loads((old/'protected-inputs.json').read_text());protected[str(order)]=h(order); protected.update({str(root/n):h(root/n) for n in inv['files']});(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'};x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);obs=json.loads(x.stdout);assert not obs['checkoutVisible'] and not obs['assayVisible'] and obs['workEmpty'] and obs['tmpEmpty'] and obs['schemaVisible'] and obs['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':obs,'profileSha256':h(r/'profile.json'),'beforeGeneration':True},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'privateFixtureUnchanged':h(a/'assay.mjs')==h(olda/'assay.mjs'),'stage':'B'}))
