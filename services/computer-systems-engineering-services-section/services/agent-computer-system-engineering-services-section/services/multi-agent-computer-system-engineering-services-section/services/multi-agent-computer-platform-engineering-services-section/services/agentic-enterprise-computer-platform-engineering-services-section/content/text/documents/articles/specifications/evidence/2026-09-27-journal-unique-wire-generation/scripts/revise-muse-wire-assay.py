from pathlib import Path
import tempfile,json,shutil,hashlib,subprocess
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=Path(Path('/tmp/muse-wire-generation-run').read_text());a0=Path(Path('/tmp/muse-wire-assay').read_text());a=Path(tempfile.mkdtemp(prefix='muse-wire-assay-'));shutil.copytree(a0,a,dirs_exist_ok=True)
t=(a/'assay.mjs').read_text();before="check('whole envelope bound enforced',()=>{const v=command();v.value={text:'x'.repeat(260000)};A(v,journal);return invalid(()=>B(v,options()))});";after="check('near-limit whole envelope admitted',()=>{const v=command();v.value={text:'x'.repeat(260000)};return P(B(v,options()),journal,slot(v)).command.value.text===v.value.text});\n check('whole envelope bound enforced',()=>{const v=command();v.value={text:'x'.repeat(261000)};A(v,journal);return invalid(()=>B(v,options()))});";assert t.count(before)==1;(a/'assay.mjs').write_text(t.replace(before,after))
commit=json.loads((a/'commitment.json').read_text());commit['assaySha256']=sha(a/'assay.mjs');commit['revision']={'predecessorDirectory':str(a0),'predecessorCommitmentSha256':sha(a0/'commitment.json'),'basis':'Independent existing-law reconstruction measured old retained record at 1044823 bytes, below 1048576; corrected negative fixture is 1048823 bytes and within component limits. Add original fixture as positive boundary observation. No product source changed.','diagnosticSha256':sha(old/'independent-envelope-diagnostic.json')};(a/'commitment.json').write_text(json.dumps(commit,indent=2))
r=Path(tempfile.mkdtemp(prefix='muse-wire-generation-'))
for name in ['protected-inputs.json','source-paths.json','output-schema.json','resolution-environment.json']:
 shutil.copy2(old/name,r/name)
profile=[x.replace(str(old),str(r)) for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
assessment=[x.replace(str(a0),str(a)) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
p=json.loads((old/'public-input.json').read_text());print('old commitment keys',list(p['assayCommitment']))
p['assayCommitment']['manifestSha256']=sha(a/'commitment.json')
# Only opaque commitment identifiers go to the source provider; no revised inventory or diagnostics.
for key in p['assayCommitment']:
 if isinstance(p['assayCommitment'][key],str):p['assayCommitment'][key]=p['assayCommitment'][key].replace(str(a0),str(a))
p['publicSourceReview']={'previousCandidate':json.loads((old/'candidate.json').read_text()),'findings':['Re-derive an unaccepted candidate against the unchanged governing order and original inputs. The prior candidate is public source material, not an acceptance result. Preserve the exact existing eavt export and do not impose undocumented return-wrapper aggregate limits.'],'scope':'No private assessment content, fixtures or results supplied.'}
(r/'public-input.json').write_text(json.dumps(p,indent=2));(r/'public-feedback.json').write_text(json.dumps({'previousRun':str(old),'basis':'Fresh candidate derivation with revised opaque independent assay commitment; unchanged product order and inputs.'},indent=2))
x=subprocess.run(profile+['/bin/sh','-c','test ! -e /home/emsenn/info && test ! -e /assays && test -r /input/output-schema.json && printf boundary-ok'],capture_output=True,text=True);assert x.returncode==0;(r/'boundary-probe.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr,'profileSha256':sha(r/'profile.json')}))
Path('/tmp/muse-wire-generation-run').write_text(str(r));Path('/tmp/muse-wire-assay').write_text(str(a));print(r);print(a)
