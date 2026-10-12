from pathlib import Path
import hashlib,json,tempfile,shutil,subprocess
s=Path(Path('/tmp/muse-spec-path').read_text().strip());codec=Path(Path('/tmp/muse-json-codec-path').read_text().strip());root=codec.parent.parent;raw=codec.parent/'is-json-value.mjs';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert h(codec)=='21c4b0fb8d1ce06e7e95f0b4e40bde25613b4392a80bb40a36749f7375d4b1b3'
subprocess.run(['/home/emsenn/.local/bin/node','--check','/tmp/muse-container-assay.mjs'],check=True)
r=Path(tempfile.mkdtemp(prefix='muse-container-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-container-assay-'));old=Path(Path('/tmp/muse-blocking-run').read_text().strip());olda=Path(Path('/tmp/muse-blocking-assay').read_text().strip())
deps=json.loads(Path('/tmp/muse-blocking-dependencies.json').read_text());deps.update(codec=str(codec),raw=str(raw));deps['files']=list(dict.fromkeys(deps['files']+[str(codec),str(raw),str(root/'schemas/is-json-value.json')]));(a/'dependencies.json').write_text(json.dumps(deps));shutil.copy2(olda/'resolve.mjs',a/'resolve.mjs');shutil.copy2('/tmp/muse-container-assay.mjs',a/'assay.mjs')
for p in [codec,raw,root/'schemas/is-json-value.json']:
 dest=r/'original'/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
order=s/'2026-09-27-journal-retained-container-fabrication.md';lld=s/'2026-09-27-muse-assist-journal-operation-lld.md';contract=s/'2026-09-27-muse-assist-fabrication-lld.md';patch=s/'2026-09-27-source-patchset-fabrication.md'
commit={'assaySha256':h(a/'assay.mjs'),'loaderSha256':h(a/'resolve.mjs'),'dependencyMapSha256':h(a/'dependencies.json'),'orderSha256':h(order),'committedBeforeGeneration':True,'receivingSyntaxCheckedBeforeCommitment':True};(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
clauses=[f'F-C{i:02d}' for i in range(1,6)];inventory={'kind':'source-patchset-input','version':1,'sourceRoot':str(root),'files':{str(p.relative_to(root)):{'state':'present','sha256':h(p)} for p in [codec,raw]},'clauses':clauses};(r/'inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
packet={'purpose':'Generate the exact two-file codemod under the supplied order. Use explicit traversal frames, preserving all existing ordinary public semantics as specified. No tools; return only the closed source-patchset JSON.','contracts':[{'path':p.name,'sha256':h(p),'text':p.read_text()} for p in [order,contract,patch]],'predecessor':{'path':lld.name,'sha256':h(lld),'selectedClause':'L-O23','text':'## L-O23'+lld.read_text().split('## L-O23',1)[1]},'inventory':inventory,'sourceInputs':[{'path':str(p.relative_to(root)),'sha256':h(p),'text':p.read_text()} for p in [codec,raw]],'assayCommitment':{'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(packet))
obj=lambda props:{'type':'object','properties':props,'required':list(props),'additionalProperties':False}
output=obj({'kind':{'type':'string','enum':['source-patchset']},'version':{'type':'integer','enum':[1]},'disposition':{'type':'string','enum':['candidate','refused']},'reason':{'type':'string'},'changes':{'type':'array','items':obj({'operation':{'type':'string','enum':['edit']},'path':{'type':'string','enum':list(inventory['files'])},'inputSha256':{'type':'string'},'replacements':{'type':'array','items':obj({'before':{'type':'string'},'after':{'type':'string'}})},'clauses':{'type':'array','items':{'type':'string','enum':clauses}}})}})
(r/'output-schema.json').write_text(json.dumps(output));profile=json.loads((old/'profile.json').read_text());profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(r/'profile.json').write_text(json.dumps(profile))
protected=[*map(Path,deps['files']),order,lld,contract,patch];(r/'protected-inputs.json').write_text(json.dumps({str(p):h(p) for p in dict.fromkeys(protected)},indent=2)+'\n')
base=['bwrap','--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--ro-bind','/usr','/usr','--symlink','usr/bin','/bin','--symlink','usr/lib','/lib','--symlink','usr/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/work','--chdir','/work','--ro-bind',str(Path(shutil.which('node')).resolve()),'/node','--ro-bind',str(a),'/assays','--ro-bind',str(r/'original'),'/original']
for f in deps['files']:
 if f not in [str(codec),str(raw)]:base+=['--ro-bind',f,f]
for p in [codec,raw]:base+=['--ro-bind',str(r/'stage'/p.relative_to(root)),str(p)]
(r/'assessment-profile.json').write_text(json.dumps(base))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);boundary=json.loads(x.stdout);assert not boundary['checkoutVisible'] and not boundary['assayVisible'] and boundary['workEmpty'] and boundary['tmpEmpty'] and boundary['schemaVisible'] and boundary['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':boundary,'profileSha256':h(r/'profile.json'),'beforeGeneration':True,'limitations':['Provider server isolation and retention remain a trust assumption.']},indent=2)+'\n')
Path('/tmp/muse-container-run').write_text(str(r));Path('/tmp/muse-container-assay').write_text(str(a))
for phase in ['invoke','assess']:
 t=Path('/tmp/'+phase+'-muse-blocking.py').read_text().replace('muse-blocking','muse-container');Path('/tmp/'+phase+'-muse-container.py').write_text(t)
print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'dependencyFiles':len(deps['files']),'boundaryObserved':True,'privateCommitmentSha256':h(a/'commitment.json')}))
