from pathlib import Path
import hashlib,json,tempfile,shutil,subprocess
s=Path(Path('/tmp/muse-spec-path').read_text().strip())
deps=json.loads(Path('/tmp/muse-blocking-dependencies.json').read_text())
code=Path(deps['code']);target=Path(deps['entry']);h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert h(target)=='bbeaf4c9a918f0e16787b461c46aefe46458aa31d47fbacfe8d8586d3151b84c'
subprocess.run(['/home/emsenn/.local/bin/node','--check','/tmp/muse-blocking-assay.mjs'],check=True)
prior=Path(Path('/tmp/muse-blocking-prior-run').read_text().strip());candidate_source=prior/'stage/src/semiotic-eavt/journal/substrate.mjs'
r=Path(tempfile.mkdtemp(prefix='muse-blocking-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-blocking-assay-'))
old=Path(Path('/tmp/muse-packet-run').read_text().strip())
old_a=Path(Path('/tmp/muse-packet-assay').read_text().strip())
(a/'dependencies.json').write_text(json.dumps(deps));shutil.copy2(old_a/'resolve.mjs',a/'resolve.mjs');shutil.copy2('/tmp/muse-blocking-assay.mjs',a/'assay.mjs')
base_order=s/'2026-09-27-journal-blocking-reconstruction-fabrication.md';order=s/'2026-09-27-journal-blocking-ordering-codemod.md';lld=s/'2026-09-27-muse-assist-journal-operation-lld.md';contract=s/'2026-09-27-muse-assist-fabrication-lld.md';patch=s/'2026-09-27-source-patchset-fabrication.md'
commit={'assaySha256':h(a/'assay.mjs'),'loaderSha256':h(a/'resolve.mjs'),'dependencyMapSha256':h(a/'dependencies.json'),'orderSha256':h(order),'committedBeforeGeneration':True,'receivingSyntaxCheckedBeforeCommitment':True};(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
clauses=['F-R05'];name='src/semiotic-eavt/journal/substrate.mjs'
inventory={'kind':'source-patchset-input','version':1,'sourceRoot':str(prior/'stage'),'files':{name:{'state':'present','sha256':h(candidate_source)}},'clauses':clauses};(r/'inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
api=[candidate_source,code/'src/semiotic-eavt/journal/judgment.mjs',code/'src/semiotic-eavt/identity/index.mjs']+[Path(x) for x in deps['files'] if x.endswith('/json-services-section/scripts/canonical-json.mjs')]
packet={'purpose':'Codemod the existing causal substrate to preserve retained historical decisions according to the order. No tools. This remains a pure dependency; no host integration or runtime acceptance is implied. Return the exact source-patchset object.','contracts':[{'path':p.name,'text':p.read_text(),'sha256':h(p)} for p in [order,base_order,contract,patch]],'predecessor':{'path':lld.name,'sourceSha256':h(lld),'selectedClause':'L-O22','text':'## L-O22'+lld.read_text().split('## L-O22',1)[1]},'inventory':inventory,'readOnlyApiEvidence':[{'path':str(p),'text':p.read_text(),'sha256':h(p)} for p in api],'apiFacts':{'json':'canonicalizeJson(value, JSON_RESOURCE_ENVELOPE) returns {value,text,byteLength}; value is deeply frozen. It rejects unsupported values/accessors without invoking accessors. The resource envelope is imported, not duplicated. Validate the collection descriptors first, then snapshot each entry independently, not the entire array.','artifact':'isArtifactRef(value) is exported by ../identity/index.mjs and returns boolean. Existing verifyArtifact(ref,text) returns {ref,canonical:{value,text,byteLength}}.','obstructions':'causalObstruction returns {kind,code,path,message,relatedRefs}; use the exact fixed codes/messages from the contract.'},'assayCommitment':{'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(packet))
obj=lambda props:{'type':'object','properties':props,'required':list(props),'additionalProperties':False}
output=obj({'kind':{'type':'string','enum':['source-patchset']},'version':{'type':'integer','enum':[1]},'disposition':{'type':'string','enum':['candidate','refused']},'reason':{'type':'string'},'changes':{'type':'array','items':obj({'operation':{'type':'string','enum':['edit']},'path':{'type':'string','enum':[name]},'inputSha256':{'type':'string','enum':[h(candidate_source)]},'replacements':{'type':'array','items':obj({'before':{'type':'string'},'after':{'type':'string'}})},'clauses':{'type':'array','items':{'type':'string','enum':clauses}}})}})
(r/'output-schema.json').write_text(json.dumps(output))
profile=json.loads((old/'profile.json').read_text());profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(r/'profile.json').write_text(json.dumps(profile))
protected=[*map(Path,deps['files']),*api,order,base_order,lld,contract,patch];(r/'protected-inputs.json').write_text(json.dumps({str(p):h(p) for p in dict.fromkeys(protected)},indent=2)+'\n')
base=['bwrap','--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--ro-bind','/usr','/usr','--symlink','usr/bin','/bin','--symlink','usr/lib','/lib','--symlink','usr/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/work','--chdir','/work','--ro-bind',str(Path(shutil.which('node')).resolve()),'/node','--ro-bind',str(a),'/assays']
for f in deps['files']:
 if f!=str(target):base+=['--ro-bind',f,f]
base+=['--ro-bind',str(r/'stage'/name),str(target)];(r/'assessment-profile.json').write_text(json.dumps(base))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);boundary=json.loads(x.stdout);assert not boundary['checkoutVisible'] and not boundary['assayVisible'] and boundary['workEmpty'] and boundary['tmpEmpty'] and boundary['schemaVisible'] and boundary['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':boundary,'profileSha256':h(r/'profile.json'),'beforeGeneration':True,'limitations':['Provider server isolation and retention remain a trust assumption.']},indent=2)+'\n')
(r/'prior-attempt.json').write_text(json.dumps({'path':str(prior),'originalTarget':str(target),'originalSha256':h(target),'candidateSourceSha256':h(candidate_source)},indent=2)+'\n')
Path('/tmp/muse-blocking-run').write_text(str(r));Path('/tmp/muse-blocking-assay').write_text(str(a))
print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'dependencyFiles':len(deps['files']),'boundaryObserved':True,'privateCommitmentSha256':h(a/'commitment.json')}))
