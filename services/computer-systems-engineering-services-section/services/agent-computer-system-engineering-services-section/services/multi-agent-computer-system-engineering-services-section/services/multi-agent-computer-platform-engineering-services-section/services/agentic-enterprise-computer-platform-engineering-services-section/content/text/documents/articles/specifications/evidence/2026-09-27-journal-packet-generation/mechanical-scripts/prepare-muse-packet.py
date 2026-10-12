from pathlib import Path
import hashlib,json,tempfile,shutil,subprocess
s=Path(Path('/tmp/muse-spec-path').read_text().strip());deps=json.loads(Path('/tmp/muse-packet-dependencies.json').read_text());code=Path(deps['code']);target=Path(deps['entry']);assert not target.exists();h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=Path(tempfile.mkdtemp(prefix='muse-packet-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-packet-assay-'))
(a/'dependencies.json').write_text(json.dumps(deps));(a/'resolve.mjs').write_text("import fs from 'node:fs';\nconst {resolutions}=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));\nexport async function resolve(specifier,context,nextResolve){const found=resolutions[context.parentURL+'\\n'+specifier];return found?{url:found,shortCircuit:true}:nextResolve(specifier,context);}\n")
(a/'assay.mjs').write_text(r'''import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const deps=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
const m=await import(pathToFileURL(deps.entry));
const {addressArtifact}=await import(pathToFileURL(deps.code+'/src/semiotic-eavt/identity/index.mjs'));
const assert=(x,msg='unexpected observation')=>{if(!x)throw Error(msg)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const frozen=x=>x===null||typeof x!=='object'||Object.isFrozen(x)&&Object.values(x).every(frozen);
const checks=[];const check=(name,f)=>{try{f();checks.push({name,ok:true})}catch(e){checks.push({name,ok:false,error:e?.name+': '+e?.message})}};
const invalid=f=>{try{f()}catch(e){assert(e instanceof TypeError&&e.code==='journal-packet-invalid');assert(e.message.length<512);return}throw Error('expected invalid refusal')};
const P=m.journalPacket,R=m.resolveJournalPacket;
const digest=t=>createHash('sha256').update(t).digest('hex');
function expected(v){const art=addressArtifact(v);return {reference:{kind:'metroplat.journal.packet-reference',version:1,artifact:art.ref,mediaType:'application/json',sha256:digest(art.canonical.text),bytes:Buffer.byteLength(art.canonical.text)},artifact:{ref:art.ref,canonicalText:art.canonical.text}};}
check('only specified exports',()=>assert(same(Object.keys(m).sort(),['journalPacket','resolveJournalPacket'])));
for(const [name,value] of [['null',null],['false',false],['zero',0],['negative-zero',-0],['number',17.25],['empty string',''],['unicode','Pheží Ocháǧe 🌱'],['array',[1,false,null]],['object',{z:1,a:{brief:'prior request'}}]])check(name+' body survives artifact round trip',()=>{
 const got=P(value),exp=expected(value);assert(got.artifact.ref===exp.artifact.ref&&got.artifact.canonicalText===exp.artifact.canonicalText);assert(same(got.reference,exp.reference));assert(same(Object.keys(got).sort(),['artifact','reference']));let calls=0;
 const back=R(got.reference,ref=>{calls++;assert(ref===exp.reference.artifact);return exp.artifact;});assert(calls===1);assert(same(back,JSON.parse(exp.artifact.canonicalText)));assert(frozen(got)&&frozen(back));
});
check('independent immutable snapshot',()=>{const v={nested:[1]},p=P(v);v.nested.push(2);assert(p.artifact.canonicalText==='{"nested":[1]}'&&frozen(p));});
check('large composite JSON body retains the same round-trip capacity',()=>{const v=Array.from({length:1000},(_,i)=>String(i)+':'+ 'x'.repeat(390));const exp=expected(v);assert(Buffer.byteLength(exp.artifact.canonicalText)>262144);const p=P(v);const back=R(p.reference,()=>exp.artifact);assert(back.length===1000&&back[999]===v[999]);});
check('null prototype resolver record accepted',()=>{const exp=expected({a:1});const record=Object.assign(Object.create(null),exp.artifact);assert(R(exp.reference,()=>record).a===1);});
for(const [name,value]of [['undefined',undefined],['infinite',Infinity],['NaN',NaN],['bigint',1n],['function',()=>1]])check('constructor rejects '+name,()=>invalid(()=>P(value)));
check('accessor input refused without invocation',()=>{let invoked=0;const v={};Object.defineProperty(v,'secret',{enumerable:true,get(){invoked++;return 'secret'}});invalid(()=>P(v));assert(invoked===0);});
const exp=expected({kind:'prior-outcome',request:'actuation:fixture'});
for(const [name,modify]of [['extra field',v=>v.path='/private'],['old packet kind',v=>v.kind='metroplat.witness-packet-reference'],['boolean version',v=>v.version=true],['unsupported media',v=>v.mediaType='text/plain'],['bad artifact',v=>v.artifact='sha256:wrong'],['uppercase digest',v=>v.sha256='A'.repeat(64)],['negative bytes',v=>v.bytes=-1],['fractional bytes',v=>v.bytes=1.25]])check('invalid reference '+name+' causes no resolution',()=>{const ref={...exp.reference};modify(ref);let calls=0;invalid(()=>R(ref,()=>{calls++;return exp.artifact}));assert(calls===0);});
check('reference getter refused without resolution or invocation',()=>{let calls=0;const ref={...exp.reference};Object.defineProperty(ref,'artifact',{enumerable:true,get(){calls++;return exp.artifact.ref}});invalid(()=>R(ref,()=>{calls++;return exp.artifact}));assert(calls===0);});
check('nonfunction resolver refused',()=>invalid(()=>R(exp.reference,null)));
for(const value of [null,undefined])check('missing body '+String(value),()=>{try{R(exp.reference,()=>value)}catch(e){assert(e.code==='journal-packet-evidence-unavailable');return}throw Error('missing refusal')});
for(const [name,body]of [['noncanonical',{...exp.artifact,canonicalText:exp.artifact.canonicalText+'\n'}],['substituted text',{...exp.artifact,canonicalText:'{}'}],['substituted ref',{...exp.artifact,ref:expected({other:true}).artifact.ref}],['extra key',{...exp.artifact,path:'/private'}],['primitive',false],['array',[]],['promise',Promise.resolve(exp.artifact)]])check('resolver result rejects '+name,()=>invalid(()=>R(exp.reference,()=>body)));
check('own symbol field refused',()=>{const body={...exp.artifact,[Symbol('extra')]:true};invalid(()=>R(exp.reference,()=>body));});
check('exotic result prototype refused',()=>{const body=Object.assign(Object.create({inherited:true}),exp.artifact);invalid(()=>R(exp.reference,()=>body));});
for(const key of ['canonicalText','ref','then'])check('result accessor '+key+' never invoked',()=>{let calls=0;const body={...exp.artifact};Object.defineProperty(body,key,{enumerable:true,get(){calls++;return key==='canonicalText'?'secret':null}});invalid(()=>R(exp.reference,()=>body));assert(calls===0);});
check('content digest mismatch refused',()=>invalid(()=>R({...exp.reference,sha256:'0'.repeat(64)},()=>exp.artifact)));
check('content byte count mismatch refused',()=>invalid(()=>R({...exp.reference,bytes:exp.reference.bytes+1},()=>exp.artifact)));
const thrown=[undefined,null,false,0,'private-value',Symbol('private'),new Error('private'),new TypeError('private'),Object.assign(new TypeError('private'),{code:'journal-packet-invalid'})];
for(let i=0;i<thrown.length;i++)check('resolver thrown value identity '+i,()=>{let caught=false;try{R(exp.reference,()=>{throw thrown[i]})}catch(e){caught=true;assert(Object.is(e,thrown[i]));}assert(caught)});
check('input over JSON string bound refuses without truncation',()=>invalid(()=>P('x'.repeat(262145))));
check('invalid diagnostics do not echo private values',()=>{try{R({...exp.reference,sha256:'PRIVATE_PACKET_SECRET'},()=>exp.artifact)}catch(e){assert(e.code==='journal-packet-invalid'&&!e.message.includes('PRIVATE_PACKET_SECRET'));return}throw Error('missing refusal')});
check('pure declared dependency surface',()=>{const src=fs.readFileSync(deps.entry,'utf8');const allowed=new Set(['../identity/index.mjs','@red-cup-engineering/json-services-section','@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity']);const specs=[...src.matchAll(/(?:import|export)s+(?:[^;]*?s+froms*)?["']([^"']+)["']/g)].map(x=>x[1]);assert(specs.every(s=>allowed.has(s)));assert(!/imports*(|evals*(|news+Function|processs*./.test(src));});
const out={checks,passed:checks.filter(x=>x.ok).length,total:checks.length,limits:['Pure packet construction/resolution only; no persistence, scope authority, legacy migration or full assistant acceptance.']};console.log(JSON.stringify(out,null,2));process.exitCode=out.passed===out.total?0:1;
''')
order=s/'2026-09-27-journal-packet-fabrication.md';lld=s/'2026-09-27-muse-assist-journal-operation-lld.md';contract=s/'2026-09-27-muse-assist-fabrication-lld.md';patch=s/'2026-09-27-source-patchset-fabrication.md'
commit={'assaySha256':h(a/'assay.mjs'),'loaderSha256':h(a/'resolve.mjs'),'dependencyMapSha256':h(a/'dependencies.json'),'orderSha256':h(order),'committedBeforeGeneration':True};(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
clauses=['F-K0'+str(i) for i in range(1,5)];name='src/semiotic-eavt/journal/packet.mjs';inventory={'kind':'source-patchset-input','version':1,'sourceRoot':str(code),'files':{name:{'state':'absent'}},'clauses':clauses};(r/'inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
api=[code/'src/semiotic-eavt/identity/index.mjs']+[Path(x) for x in deps['files'] if x.endswith(('/json-services-section/scripts/canonical-json.mjs','/cryptographic-computer-data-engineering-services-section/scripts/integrity.mjs'))]
packet={'purpose':'Generate exactly the two pure packet functions from the order. No tools. This is an unmounted dependency, not stored/admitted evidence or a completed migration.','contracts':[{'path':p.name,'text':p.read_text(),'sha256':h(p)} for p in [order,contract,patch]],'predecessor':{'path':lld.name,'sourceSha256':h(lld),'selectedClause':'L-O19','text':lld.read_text().split('## L-O19')[1]},'inventory':inventory,'readOnlyApiEvidence':[{'path':str(p),'text':p.read_text(),'sha256':h(p)} for p in api],'apiFacts':{'json':'canonicalizeJson(value, JSON_RESOURCE_ENVELOPE) returns {value,text,byteLength}; value is deeply frozen and unsupported values/accessors are refused without invoking accessor. JSON envelope is imported, not duplicated.','artifact':'addressArtifact(value) and verifyArtifact(ref,text) return {ref,canonical:{value,text,byteLength}}. verifyArtifact accepts noncanonical equivalent text, so explicitly compare canonical.text to input.','sha':'sha256Hex(string) synchronously returns lowercase SHA-256 over UTF-8 text.'},'assayCommitment':{'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(packet))
obj=lambda props:{'type':'object','properties':props,'required':list(props),'additionalProperties':False}
output=obj({'kind':{'type':'string','enum':['source-patchset']},'version':{'type':'integer','enum':[1]},'disposition':{'type':'string','enum':['candidate','refused']},'reason':{'type':'string'},'changes':{'type':'array','items':obj({'operation':{'type':'string','enum':['create']},'path':{'type':'string','enum':[name]},'text':{'type':'string'},'clauses':{'type':'array','items':{'type':'string','enum':clauses}}})}})
(r/'output-schema.json').write_text(json.dumps(output))
old=Path(Path('/tmp/muse-semantic-codemod-run').read_text().strip());profile=json.loads((old/'profile.json').read_text());profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(r/'profile.json').write_text(json.dumps(profile))
protected=[*map(Path,deps['files']),*api,order,lld,contract,patch];(r/'protected-inputs.json').write_text(json.dumps({str(p):h(p) for p in dict.fromkeys(protected)},indent=2)+'\n')
base=['bwrap','--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--ro-bind','/usr','/usr','--symlink','usr/bin','/bin','--symlink','usr/lib','/lib','--symlink','usr/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/work','--chdir','/work','--ro-bind',str(Path(shutil.which('node')).resolve()),'/node','--ro-bind',str(a),'/assays']
for f in deps['files']:base+=['--ro-bind',f,f]
base+=['--ro-bind',str(r/'stage'/name),str(target)];(r/'assessment-profile.json').write_text(json.dumps(base))
# Observe the exact provider namespace before invocation. No private fixture or checkout is mounted.
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'}
x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);boundary=json.loads(x.stdout);assert not boundary['checkoutVisible'] and not boundary['assayVisible'] and boundary['workEmpty'] and boundary['tmpEmpty'] and boundary['schemaVisible'] and boundary['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':boundary,'profileSha256':h(r/'profile.json'),'beforeGeneration':True,'limitations':['Provider server isolation and retention remain a trust assumption.']},indent=2)+'\n')
Path('/tmp/muse-packet-run').write_text(str(r));Path('/tmp/muse-packet-assay').write_text(str(a))
print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'dependencyFiles':len(deps['files']),'boundaryObserved':True,'privateCommitmentSha256':h(a/'commitment.json')}))
