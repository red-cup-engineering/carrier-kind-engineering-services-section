from pathlib import Path
import hashlib,json,tempfile,shutil,subprocess
s=Path(Path('/tmp/muse-spec-path').read_text().strip());system=Path(Path('/tmp/muse-system-path').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
op=s/'2026-09-27-muse-assist-journal-operation-lld.md';assert h(op)=='43db994366d1772f0e510e4c105d26feff91426da2d7d53366aa688ea196911f'
order=s/'2026-09-27-journal-source-owner-fabrication.md';assert not order.exists();order.write_text(Path('/tmp/muse-owner-fabrication.md').read_text().replace('L-H01/H-H05','L-H01/L-H05'))
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'));fixtures=Path(tempfile.mkdtemp(prefix='muse-owner-fixtures-'))
d=json.loads(Path('/tmp/muse-owner-dependencies.json').read_text());(a/'dependencies.json').write_text(json.dumps(d,indent=2)+'\n');shutil.copy2('/tmp/muse-owner-assay.mjs',a/'assay.mjs')
loader="""import fs from 'node:fs';
const {resolutions,bareResolutions}=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
export async function resolve(specifier,context,nextResolve){const found=resolutions[context.parentURL+'\\n'+specifier]??bareResolutions[specifier];return found?{url:found,shortCircuit:true}:nextResolve(specifier,context);}
"""
(a/'resolve.mjs').write_text(loader)
subprocess.run(['/home/emsenn/.local/bin/node','--check',str(a/'assay.mjs')],check=True)
clauses=[f'F-S{i:02d}' for i in range(1,11)]
files={'package.json':{'state':'present','sha256':h(system/'package.json')},'src/journal/filesystem/source-owner.mjs':{'state':'absent'},'src/journal/diagnostics.mjs':{'state':'absent'}}
for n,v in files.items():
 assert ((system/n).is_file() and h(system/n)==v['sha256']) if v['state']=='present' else not (system/n).exists()
inv={'kind':'source-patchset-input','version':1,'sourceRoot':str(system),'files':files,'clauses':clauses};(r/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n')
commit={'assaySha256':h(a/'assay.mjs'),'loaderSha256':h(a/'resolve.mjs'),'dependencyMapSha256':h(a/'dependencies.json'),'orderSha256':h(order),'committedBeforeGeneration':True,'receivingSyntaxCheckedBeforeCommitment':True};(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
names=['2026-09-27-muse-assist-fabrication-lld.md','2026-09-27-source-patchset-fabrication.md','2026-09-27-muse-assist-journal-storage-lld.md','2026-09-27-muse-assist-journal-host-binding-lld.md','2026-09-27-muse-assist-journal-feed-measurement-lld.md','2026-09-27-muse-assist-journal-admission-lld.md']
code=Path(d['code']);pub=[Path(x) for x in d['publicInputs'] if not x.endswith('/notation.mjs')]+list((code/'src/semiotic-eavt/identity').glob('*.mjs'))+[Path(Path('/tmp/muse-json-codec-path').read_text().strip()),system/'package.json']
pub=list(dict.fromkeys(pub));specs=[order,op,*[s/n for n in names]]
packet={'purpose':'Generate the complete source-owner dependency under F-S01–F-S10. Return a source-patchset JSON candidate with full created modules and exact package edit. You have no execution or acceptance responsibility; operator receiving is separate. No tools. The output is unaccepted source, not a claim of operating assistant completion.','contracts':[{'path':p.name,'sha256':h(p),'text':p.read_text()} for p in specs],'inventory':inv,'readOnlySourceInputs':[{'path':str(p),'sha256':h(p),'text':p.read_text()} for p in pub],'approvedBareImports':d['bareResolutions'],'assayCommitment':{'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(packet))
obj=lambda props:{'type':'object','properties':props,'required':list(props),'additionalProperties':False}
cls={'type':'array','items':{'type':'string','enum':clauses}}
create=obj({'operation':{'type':'string','enum':['create']},'path':{'type':'string','enum':[k for k,v in files.items() if v['state']=='absent']},'text':{'type':'string'},'clauses':cls})
edit=obj({'operation':{'type':'string','enum':['edit']},'path':{'type':'string','enum':['package.json']},'inputSha256':{'type':'string'},'replacements':{'type':'array','items':obj({'before':{'type':'string'},'after':{'type':'string'}})},'clauses':cls})
output=obj({'kind':{'type':'string','enum':['source-patchset']},'version':{'type':'integer','enum':[1]},'disposition':{'type':'string','enum':['candidate','refused']},'reason':{'type':'string'},'changes':{'type':'array','items':{'anyOf':[create,edit]}}})
(r/'output-schema.json').write_text(json.dumps(output))
old=Path(Path('/tmp/muse-container-run').read_text().strip());profile=json.loads((old/'profile.json').read_text());profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(r/'profile.json').write_text(json.dumps(profile))
protected=list(dict.fromkeys([*map(Path,d['files']),*pub,*specs]));(r/'protected-inputs.json').write_text(json.dumps({str(p):h(p) for p in protected},indent=2)+'\n')
original=r/'original';original.mkdir();shutil.copy2(system/'package.json',original/'package.json')
base=['bwrap','--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--ro-bind','/usr','/usr','--symlink','usr/bin','/bin','--symlink','usr/lib','/lib','--symlink','usr/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/work','--chdir','/work','--ro-bind',str(Path('/home/emsenn/.local/bin/node').resolve()),'/node','--ro-bind',str(a),'/assays','--bind',str(fixtures),'/fixtures']
for f in d['files']:base+=['--ro-bind',f,f]
for f in files:base+=['--ro-bind',str(r/'stage'/f),str(system/f)]
(r/'assessment-profile.json').write_text(json.dumps(base))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);boundary=json.loads(x.stdout);assert not boundary['checkoutVisible'] and not boundary['assayVisible'] and boundary['workEmpty'] and boundary['tmpEmpty'] and boundary['schemaVisible'] and boundary['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':boundary,'profileSha256':h(r/'profile.json'),'beforeGeneration':True,'limitations':['Provider server isolation and retention remain a trust assumption.']},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a))
t=Path('/tmp/invoke-muse-container.py').read_text().replace('muse-container','muse-owner');t=t.replace("assert all(h(Path(inv['sourceRoot'])/p)==item['sha256'] for p,item in inv['files'].items())", "assert all((h(Path(inv['sourceRoot'])/p)==item['sha256']) if item['state']=='present' else not (Path(inv['sourceRoot'])/p).exists() for p,item in inv['files'].items())")
Path('/tmp/invoke-muse-owner.py').write_text(t)
print(json.dumps({'run':str(r),'assay':str(a),'fixtures':str(fixtures),'publicBytes':(r/'public-input.json').stat().st_size,'protectedFiles':len(protected),'boundaryObserved':True,'privateCommitmentSha256':h(a/'commitment.json')}))
