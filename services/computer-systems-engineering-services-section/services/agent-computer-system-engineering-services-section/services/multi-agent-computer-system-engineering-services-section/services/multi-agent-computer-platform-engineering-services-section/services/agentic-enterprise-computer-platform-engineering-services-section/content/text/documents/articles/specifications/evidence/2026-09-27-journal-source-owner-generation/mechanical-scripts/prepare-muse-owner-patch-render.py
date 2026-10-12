from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess
s=Path(Path('/tmp/muse-spec-path').read_text());old=Path(Path('/tmp/muse-owner-run').read_text());olda=Path(Path('/tmp/muse-owner-assay').read_text());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((old/'staging.json').read_text())['exitCode']!=0 and not (old/'stage').exists()
for p,d in json.loads((old/'protected-inputs.json').read_text()).items():assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json','commitment.json']:shutil.copy2(olda/n,a/n)
for n in ['inventory.json','promotion-inventory.json','protected-inputs.json','output-schema.json']:shutil.copy2(old/n,r/n)
shutil.copytree(old/'original',r/'original')
inv=json.loads((r/'inventory.json').read_text());candidate=json.loads((old/'candidate.json').read_text());assert len(candidate['changes'])==1
change=candidate['changes'][0];original=(Path(inv['sourceRoot'])/change['path']).read_text();working=original;instructions=[]
for i,v in enumerate(change['replacements']):
 before=v['before']
 if working.count(before)!=1:
  assert i==2 and before.startswith('function refreshSourceView(')
  before=working[working.index('function refreshSourceView('):working.index('\nfunction createSourceScope(')].rstrip()
 assert working.count(before)==1
 instructions.append({'before':before,'after':v['after']});working=working.replace(before,v['after'],1)
# Bind the generated after texts. Their behavior is not changed by rendering.
(r/'render-commitment.json').write_text(json.dumps({'priorCandidateSha256':h(old/'candidate.json'),'path':change['path'],'inputSha256':change['inputSha256'],'afterSha256':[hashlib.sha256(v['after'].encode()).hexdigest() for v in instructions],'expectedOutputSha256':hashlib.sha256(working.encode()).hexdigest()},indent=2)+'\n')
p={'purpose':'Reissue the supplied source-patchset in valid F-P02 representation. The previous candidate failed F-P03 because one before string did not occur in its bound input. Every exact before string below was extracted from the admitted input and occurs exactly once sequentially. Every after string is unchanged text from the prior isolated generator. Return these exact replacements in order, without changing any after text, adding behavior, changing dependencies, or claiming acceptance. Return a complete source-patchset candidate with the same path/inputSha256/clauses. This rendering call is not a new design or behavioral revision. The independent materializer will require the fixed expected output digest.','inventory':inv,'assayCommitment':{'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True},'contract':{'path':'2026-09-27-source-patchset-fabrication.md','sha256':h(s/'2026-09-27-source-patchset-fabrication.md'),'text':(s/'2026-09-27-source-patchset-fabrication.md').read_text()},'change':{'operation':'edit','path':change['path'],'inputSha256':change['inputSha256'],'clauses':change['clauses'],'replacements':instructions},'priorCandidateSha256':h(old/'candidate.json'),'renderCommitmentSha256':h(r/'render-commitment.json')}
(r/'public-input.json').write_text(json.dumps(p))
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'};x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);obs=json.loads(x.stdout);assert not obs['checkoutVisible'] and not obs['assayVisible'] and obs['workEmpty'] and obs['tmpEmpty'] and obs['schemaVisible'] and obs['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':obs,'profileSha256':h(r/'profile.json'),'beforeGeneration':True},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'stage':'B1b literal patch rendering','behavioralAfterTextsUnchanged':True}))
