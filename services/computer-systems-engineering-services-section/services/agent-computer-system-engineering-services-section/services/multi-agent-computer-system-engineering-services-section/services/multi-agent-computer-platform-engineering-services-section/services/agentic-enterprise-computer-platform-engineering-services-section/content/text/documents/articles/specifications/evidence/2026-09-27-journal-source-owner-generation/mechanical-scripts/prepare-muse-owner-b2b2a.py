from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess,re
s=Path(Path('/tmp/muse-spec-path').read_text().strip());old=Path(Path('/tmp/muse-owner-run').read_text().strip());olda=Path(Path('/tmp/muse-owner-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((old/'candidate.json').read_text())['disposition']=='refused'
order=s/'2026-09-27-journal-source-owner-fabrication.md'
for p,d in json.loads((old/'protected-inputs.json').read_text()).items():
 if p!=str(order):assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(order);(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
inv=json.loads((old/'inventory.json').read_text());inv['clauses']=[f'F-S{i:02d}' for i in range(1,23)];(r/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n')
shutil.copy2(old/'promotion-inventory.json',r/'promotion-inventory.json');shutil.copytree(old/'original',r/'original')
p=json.loads((old/'public-input.json').read_text());p['inventory']=inv;p['assayCommitment']={'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}
p['purpose']='Generate only B2b2a under F-S22: a reusable private existing-file/ancestor synchronization barrier and requireDurableInScope composition with the supplied requiredSourceClosure. Implement the complete specified bound-descriptor existing-source effect and private scope-bound receipt. Preserve all host/gate/scanner/cleanup functions, physical discovery, reconstruction, reads, semantic closure and both publication seams; the remaining host repair belongs to B2b2b. transformationInputs contains content-bound exact source excerpts instead of full-file text; the full file digest and writable inventory still bind the materializer. Use the exact unique requireDurableInScope stub as the replacement target for new private helpers plus its implementation, and only change imports if genuinely needed. Check the provided top-level names to avoid collisions. No new dependencies, full receiver, promotion or complete-owner claim. Return an unaccepted exact source-patchset JSON candidate.'
selection={'2026-09-27-journal-source-owner-fabrication.md': ['F-S01', 'F-S07', 'F-S08', 'F-S09', 'F-S15', 'F-S20', 'F-S22'], '2026-09-27-muse-assist-journal-operation-lld.md': ['L-O04', 'L-O28'], '2026-09-27-muse-assist-journal-storage-lld.md': ['L-S07'], '2026-09-27-source-patchset-fabrication.md': None}
contracts=[]
for n,ids in selection.items():
 f=s/n;t=f.read_text()
 if ids is None:chosen=t
 else:
  matches=list(re.finditer(r'(?m)^(?:\*\*|## )([FL]-[A-Z]\d+)\b',t));parts={m.group(1):t[m.start():matches[i+1].start() if i+1<len(matches) else len(t)] for i,m in enumerate(matches)}
  assert all(k in parts for k in ids);chosen='\n'.join(parts[k] for k in ids)
 contracts.append({'path':n,'fullFileSha256':h(f),'selectedClauses':ids,'selectedText':chosen})
p['contracts']=contracts
p.pop('existingFeedAddressAPI',None)
p['readOnlySourceInputs']=[]
sourcePath='src/journal/filesystem/source-owner.mjs'
source=Path(inv['sourceRoot'])/sourcePath
sourceBytes=source.read_bytes();sourceText=sourceBytes.decode('utf-8')
assert h(source)==inv['files'][sourcePath]['sha256']
functions=list(re.finditer(r'(?m)^(?:export )?function ([A-Za-z_$][A-Za-z0-9_$]*)\(',sourceText))
chosen={'unavailable','ioFailure','sameIdentity','sourceIo','sourceIdentity','sourceEntryStat','sourceDirectory','checkSourceDirectory','sourceOrdinal','requiredSourceClosure','requireDurableInScope'}
excerpts=[]
def addExcerpt(label,start,end):
 text=sourceText[start:end].rstrip()
 offset=len(sourceText[:start].encode('utf-8'))
 assert sourceBytes[offset:offset+len(text.encode('utf-8'))]==text.encode('utf-8')
 assert sourceText.count(text)==1
 excerpts.append({'label':label,'byteOffset':offset,'text':text,'sha256':hashlib.sha256(text.encode('utf-8')).hexdigest()})
addExcerpt('imports and module constants',0,functions[0].start())
for i,match in enumerate(functions):
 if match.group(1) in chosen:
  addExcerpt(match.group(1),match.start(),functions[i+1].start() if i+1<len(functions) else len(sourceText))
assert {x['label'] for x in excerpts}==chosen|{'imports and module constants'}
declarations=re.findall(r'(?m)^(?:export )?(?:function|const|let|class) ([A-Za-z_$][A-Za-z0-9_$]*)',sourceText)
p['transformationInputs']=[{'path':sourcePath,'sha256':h(source),'representation':'exact excerpts from the bound full source file; omitted source must remain unchanged','excerpts':excerpts,'topLevelDeclarationNames':declarations}]
p['publicSourceReview']={'stage':'B2b1','status':'semantic closure reviewed; B2b2a may compose it with existing-source synchronization','findings':[]}

(r/'public-input.json').write_text(json.dumps(p))
schema=json.loads((old/'output-schema.json').read_text());schema['properties']['changes']['items']['properties']['clauses']['items']['enum']=inv['clauses'];(r/'output-schema.json').write_text(json.dumps(schema))
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
protected=json.loads((old/'protected-inputs.json').read_text());protected[str(order)]=h(order);(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'};x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);obs=json.loads(x.stdout);assert not obs['checkoutVisible'] and not obs['assayVisible'] and obs['workEmpty'] and obs['tmpEmpty'] and obs['schemaVisible'] and obs['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':obs,'profileSha256':h(r/'profile.json'),'beforeGeneration':True},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'previousPublicBytes':(old/'public-input.json').stat().st_size,'privateFixtureUnchanged':h(a/'assay.mjs')==h(olda/'assay.mjs'),'stage':'B2b2a existing-source synchronization'}))
