from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess,re
s=Path(Path('/tmp/muse-spec-path').read_text().strip());old=Path(Path('/tmp/muse-owner-run').read_text().strip());olda=Path(Path('/tmp/muse-owner-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((old/'candidate.json').read_text())['disposition']=='candidate'
order=s/'2026-09-27-journal-source-owner-fabrication.md'
for p,d in json.loads((old/'protected-inputs.json').read_text()).items():
 if p!=str(order):assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(order);(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
inv=json.loads((old/'inventory.json').read_text());inv['clauses']=[f'F-S{i:02d}' for i in range(1,24)];inv['sourceRoot']=str(old/'stage')
for path,item in inv['files'].items():
 assert item['state']=='present';item['sha256']=h(Path(inv['sourceRoot'])/path)
(r/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n')
shutil.copy2(old/'promotion-inventory.json',r/'promotion-inventory.json');shutil.copytree(old/'original',r/'original')
p=json.loads((old/'public-input.json').read_text());p['inventory']=inv;p['assayCommitment']={'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}
p['purpose']='Correct the two supplied public source-review findings in B2c composition. Retained publication must use the shared parent helper actual family field at both checks; both publication functions must recheck held root/family/version bindings after final refresh and before cleanup/acknowledgment, including recovered unique occupancy. Keep final checks inside the primary-failure capture, preserving first thrown value and outer publication uncertainty. Preserve all other reviewed behavior; no receiving or promotion. Use one edit per file with unique exact selectors copied from these excerpts; where the same short text appears in both functions, include unique surrounding context or use a whole-function replacement. No repeated-path edits or nonunique selectors.'
selection={'2026-09-27-journal-source-owner-fabrication.md': ['F-S01', 'F-S06', 'F-S08', 'F-S09', 'F-S11', 'F-S13', 'F-S19'], '2026-09-27-source-patchset-fabrication.md': None}
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
chosen={'closeSourceFamilyParents', 'checkSourceDirectory', 'publishUniqueInScope', 'publishRetainedInScope', 'openSourceOwner', 'sourceFamilyParents'}
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
p['topLevelNameOccurrences']={name:len(re.findall(r'\b'+re.escape(name)+r'\b',sourceText)) for name in declarations}
p['transformationInputs']=[{'path':sourcePath,'sha256':h(source),'representation':'exact excerpts from the bound full source file; omitted source must remain unchanged','excerpts':excerpts,'topLevelDeclarationNames':declarations}]
p['publicSourceReview']=json.loads((old/'public-source-review.json').read_text());assert p['publicSourceReview']['completeReceivingMayProceed'] is False
p.pop('previousRefusal',None)

(r/'public-input.json').write_text(json.dumps(p))
schema=json.loads((old/'output-schema.json').read_text());schema['properties']['changes']['items']['properties']['clauses']['items']['enum']=inv['clauses'];(r/'output-schema.json').write_text(json.dumps(schema))
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
protected=json.loads((old/'protected-inputs.json').read_text());protected[str(order)]=h(order)
for path,item in inv['files'].items():protected[str(Path(inv['sourceRoot'])/path)]=item['sha256']
(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'};x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);obs=json.loads(x.stdout);assert not obs['checkoutVisible'] and not obs['assayVisible'] and obs['workEmpty'] and obs['tmpEmpty'] and obs['schemaVisible'] and obs['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':obs,'profileSha256':h(r/'profile.json'),'beforeGeneration':True},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'previousPublicBytes':(old/'public-input.json').stat().st_size,'privateFixtureUnchanged':h(a/'assay.mjs')==h(olda/'assay.mjs'),'stage':'B2c final composition correction'}))
