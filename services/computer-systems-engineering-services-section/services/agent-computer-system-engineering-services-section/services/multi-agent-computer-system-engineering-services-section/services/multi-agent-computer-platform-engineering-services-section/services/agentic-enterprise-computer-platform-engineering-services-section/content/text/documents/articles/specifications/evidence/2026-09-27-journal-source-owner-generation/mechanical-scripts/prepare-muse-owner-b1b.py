from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess,re
s=Path(Path('/tmp/muse-spec-path').read_text().strip());old=Path(Path('/tmp/muse-owner-run').read_text().strip());olda=Path(Path('/tmp/muse-owner-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((old/'candidate.json').read_text())['disposition']=='candidate'
assert json.loads((old/'public-source-review.json').read_text())['B1bMayProceed'] is True
order=s/'2026-09-27-journal-source-owner-fabrication.md'
for p,d in json.loads((old/'protected-inputs.json').read_text()).items():
 if p!=str(order):assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(order);(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
inv=json.loads((old/'inventory.json').read_text());inv['clauses']=[f'F-S{i:02d}' for i in range(1,18)];inv['sourceRoot']=str(old/'stage')
for path,item in inv['files'].items():
 assert item['state']=='present';item['sha256']=h(old/'stage'/path)
(r/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n')
shutil.copy2(old/'promotion-inventory.json',r/'promotion-inventory.json');shutil.copytree(old/'original',r/'original')
p=json.loads((old/'public-input.json').read_text());p['inventory']=inv;p['assayCommitment']={'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}
p['purpose']='Generate STAGE B1b under F-S15/F-S16. The supplied staged owner already contains readSourceFiles(operation), the single physical discovery path. Add private refreshSourceView(operation) and necessary imports/helpers to verify those exact physical sources, build all F-S15 semantic maps, reconstruct through the existing Code substrate and implement L-O25 reuse. Use readSourceFiles rather than adding another scanner. Preserve the existing host functions and exact createSourceScope seam. Do not generate scope methods, publication, barriers or F-S13 host corrections; B2 owns those. This is an unaccepted source candidate, not an acceptance claim. Return exact source-patchset edits against the supplied bytes.'
selection={
 '2026-09-27-journal-source-owner-fabrication.md':['F-S01','F-S04','F-S08','F-S09','F-S14','F-S15','F-S16'],
 '2026-09-27-muse-assist-journal-operation-lld.md':['L-O22','L-O23','L-O25','L-O26','L-O27'],
 '2026-09-27-muse-assist-journal-storage-lld.md':['L-S01','L-S02','L-S03','L-S05'],
 '2026-09-27-muse-assist-journal-feed-measurement-lld.md':['L-M03','L-M09'],
 '2026-09-27-source-patchset-fabrication.md':None}
contracts=[]
for n,ids in selection.items():
 f=s/n;t=f.read_text()
 if ids is None:chosen=t
 else:
  matches=list(re.finditer(r'(?m)^(?:\*\*|## )([FL]-[A-Z]\d+)\b',t));parts={m.group(1):t[m.start():matches[i+1].start() if i+1<len(matches) else len(t)] for i,m in enumerate(matches)}
  assert all(k in parts for k in ids);chosen='\n'.join(parts[k] for k in ids)
 contracts.append({'path':n,'fullFileSha256':h(f),'selectedClauses':ids,'selectedText':chosen})
p['contracts']=contracts
baseline=json.loads(Path('/tmp/muse-owner-generation-6ogu6dcv/public-input.json').read_text())
p['existingFeedAddressAPI']=baseline['existingFeedAddressAPI']
omit=['/src/filesystem.mjs','/journal/causal-graph.mjs','/journal/witness.mjs','/identity/text-document.mjs','/identity/site.mjs','/identity/primitive-articulation.mjs']
p['readOnlySourceInputs']=[x for x in baseline['readOnlySourceInputs'] if not any(x['path'].endswith(y) for y in omit)]
for x in p['readOnlySourceInputs']:assert h(Path(x['path']))==x['sha256']
p['approvedBareImports']=baseline['approvedBareImports']
p['transformationInputs']=[{'path':path,'sha256':item['sha256'],'text':(old/'stage'/path).read_text()} for path,item in inv['files'].items()]
p['publicSourceReview']=json.loads((old/'public-source-review.json').read_text())
(r/'public-input.json').write_text(json.dumps(p))
schema=json.loads((old/'output-schema.json').read_text());schema['properties']['changes']['items']['properties']['clauses']['items']['enum']=inv['clauses'];(r/'output-schema.json').write_text(json.dumps(schema))
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
protected=json.loads((old/'protected-inputs.json').read_text());protected[str(order)]=h(order)
for path,item in inv['files'].items():protected[str(old/'stage'/path)]=item['sha256']
(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'};x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);obs=json.loads(x.stdout);assert not obs['checkoutVisible'] and not obs['assayVisible'] and obs['workEmpty'] and obs['tmpEmpty'] and obs['schemaVisible'] and obs['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':obs,'profileSha256':h(r/'profile.json'),'beforeGeneration':True},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'previousPublicBytes':(old/'public-input.json').stat().st_size,'privateFixtureUnchanged':h(a/'assay.mjs')==h(olda/'assay.mjs'),'stage':'B1b verified reconstruction'}))
