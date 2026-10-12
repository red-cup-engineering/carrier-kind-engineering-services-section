from pathlib import Path
import json,hashlib,tempfile,subprocess
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
s=Path(Path('/tmp/muse-spec-path').read_text()); deps=json.loads(Path('/tmp/muse-wire-dependencies.json').read_text()); entry=Path(deps['entry']); code=Path(deps['code'])
a=Path(tempfile.mkdtemp(prefix='muse-wire-assay-')); run=Path(tempfile.mkdtemp(prefix='muse-wire-generation-')); old=Path('/tmp/muse-generation-eicd4it7')
(a/'dependencies.json').write_text(json.dumps(deps))
(a/'resolve.mjs').write_text('''import fs from 'node:fs';\nconst {resolutions}=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));\nexport async function resolve(specifier,context,nextResolve){const found=resolutions[context.parentURL+'\\n'+specifier];return found?{url:found,shortCircuit:true}:nextResolve(specifier,context);}\n''')
(a/'assay.mjs').write_text(r'''import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const dep=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
const load=p=>import(pathToFileURL(p));
const m=await load(dep.entry);
const {addressArtifact}=await load(dep.code+'/src/semiotic-eavt/identity/index.mjs');
const bySpec=spec=>dep.resolutions[pathToFileURL(dep.entry).href+'\n'+spec];
const {tm}=await import(bySpec('@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation'));
const {eavtKey}=await import(bySpec('@red-cup-engineering/eavt-services-section/row'));
const {canonicalJson}=await import(bySpec('@red-cup-engineering/json-services-section'));
const clone=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const checks=[];
const check=(name,fn)=>{try{const value=fn();checks.push({name,ok:value===true});}catch(e){checks.push({name,ok:false,error:e.name+': '+e.message});}};
const invalid=fn=>{try{fn();return false}catch(e){return e instanceof TypeError&&e.code==='unique-journal-invalid'&&e.message.length<=1024;}};
const frozen=x=>x===null||typeof x!=='object'||(Object.isFrozen(x)&&Object.values(x).every(frozen));
const journal='journal-fixture';
const command=()=>({kind:'metroplat.journal.unique-command',version:1,domain:'interaction',key:{context:'context-fixture',principal:'person-fixture',requestId:'req-fixture'},subject:'person-fixture',value:{message:'controlled input'},causes:[],artifactRefs:[]});
const options=(time='2026-09-27T12:00:00.000Z',artifacts=[])=>({journal,seat:'person-fixture',admittedAt:time,artifacts});
const slot=c=>createHash('sha256').update(canonicalJson(['metroplat.journal.unique-slot',1,journal,c.domain,c.key])).digest('hex');
const observation=c=>{const time=options().admittedAt;const payload=[c.subject,'metroplat.journal.unique-admission',c,time];return {kind:'metroplat.journal.observation',seat:'person-fixture',claim:tm.mark('metroplat.journal.unique-admission'),address:tm.mark(eavtKey(payload)),time,causes:c.causes,payload,referencedArtifacts:c.artifactRefs};};
const ordinary=m.journalWitness(observation(command()));
check('ordinary witness source order is ordinal',()=>same(ordinary.sources.map(x=>x.ref),ordinary.sources.map(x=>x.ref).sort()));
check('historical permuted source arrays preserve identity',()=>{const w=clone(ordinary);w.sources.reverse();const p=m.parseJournalWitness(w);return p.id===ordinary.id&&same(p.core,ordinary.core)&&same(p.observation,ordinary.observation)&&same(p.sources,ordinary.sources)});
for(const [name,mutate] of [
 ['duplicate',w=>w.sources[1]=w.sources[0]],['missing',w=>w.sources.pop()],['surplus',w=>w.sources.push(w.sources[0])],['altered body',w=>w.sources[0].canonicalText+=' '],['unknown entry field',w=>w.sources[0].extra=true]
])check('ordinary source set rejects '+name,()=>{const w=clone(ordinary);mutate(w);try{m.parseJournalWitness(w);return false}catch{return true}});
const ready=['addressUniqueJournalCommand','uniqueJournalRecord','parseUniqueJournalRecord'].every(k=>typeof m[k]==='function');
check('new exports available',()=>ready);
if(ready){
 const {addressUniqueJournalCommand:A,uniqueJournalRecord:B,parseUniqueJournalRecord:P}=m;
 const c=command(), ad=A(c,journal), rec=B(c,options()), read=P(rec,journal,slot(c));
 check('identity agrees with independent artifact and tuple laws',()=>ad.commandRef===addressArtifact(c).ref&&ad.slotDigest===slot(c)&&same(ad.command,c)&&same(Object.keys(ad).sort(),['command','commandRef','slotDigest']));
 check('record reconstructs typed witness and exact reference',()=>rec.kind==='metroplat.journal.unique-record'&&rec.version===1&&rec.witness.id===ordinary.id&&same(rec.witness,ordinary)&&same(read.reference,{journal,subject:c.subject,event:ordinary.id,payload:addressArtifact(c).ref})&&same(read.record,rec)&&read.slotDigest===slot(c));
 check('empty observation list and boundary core are distinct',()=>Object.hasOwn(rec.witness.observation,'referencedArtifacts')&&rec.witness.observation.referencedArtifacts.length===0&&rec.witness.core.referencedArtifacts.length===1);
 check('all returned containers frozen',()=>[ad,rec,read].every(frozen));
 check('input mutation cannot change returned values',()=>{const original=command(), o=options();const v=A(original,journal),r=B(original,o),prior=canonicalJson({v,r});original.value.message='changed';original.key.requestId='changed';o.artifacts.push({ref:'bad',canonicalText:'bad'});return canonicalJson({v,r})===prior});
 check('dates do not alter command or slot identity',()=>{const r=B(c,options('2026-09-28T12:00:00.000Z'));return r.commandRef===rec.commandRef&&r.witness.id!==rec.witness.id&&P(r,journal,slot(c)).slotDigest===slot(c)});
 check('changed command retains slot but changes content identity',()=>{const v=command();v.value.message='different';const x=A(v,journal);return x.slotDigest===ad.slotDigest&&x.commandRef!==ad.commandRef});
 check('journal identity separates slots',()=>A(c,'other-journal').slotDigest!==ad.slotDigest);
 const cause=ordinary.id;
 const effect={...command(),domain:'effect-successor',key:{journal,effectId:'effect-fixture',predecessor:null}};
 check('initial and successor effect domains address correctly',()=>{const x=A(effect,journal),next={...effect,key:{...effect.key,predecessor:cause},causes:[cause]};return x.slotDigest===slot(effect)&&x.slotDigest!==ad.slotDigest&&A(next,journal).slotDigest!==x.slotDigest});
 const artifact=addressArtifact({fixture:'source-body'});const art={ref:artifact.ref,canonicalText:artifact.canonical.text};
 const withArt={...command(),artifactRefs:[art.ref]};
 check('external body exact verification and retention',()=>{const r=B(withArt,options(undefined,[art]));return same(r.artifacts,[art])&&same(P(r,journal,slot(withArt)).command,withArt)});
 const site=ordinary.sources.find(x=>x.ref===ordinary.core.site);
 check('witness-owned source subtracted from external bodies',()=>{const v={...command(),artifactRefs:[site.ref]};return B(v,options()).artifacts.length===0&&invalid(()=>B(v,options(undefined,[site])))});
 for(const [name,mutate] of [
 ['unknown command field',x=>x.extra=1],['unknown key field',x=>x.key.extra=1],['unsupported version',x=>x.version=2],['unsupported domain',x=>x.domain='unknown'],['empty identifier',x=>x.key.requestId=''],['too many scalars',x=>x.subject='x'.repeat(513)],['unpaired surrogate',x=>x.subject='\ud800'],['nonfinite value',x=>x.value=Infinity],['undefined value',x=>x.value=undefined],['malformed reference',x=>x.causes=['bad']],['duplicate references',x=>x.causes=[cause,cause]],['unsorted references',x=>x.causes=[cause,art.ref].sort().reverse()]
 ])check('command refuses '+name,()=>{const v=command();mutate(v);return invalid(()=>A(v,journal))});
 check('unicode scalar bound admits astral characters',()=>{const v=command();v.subject='😀'.repeat(512);return A(v,journal).command.subject===v.subject});
 check('unicode normalization remains a distinction',()=>{const a=command(),b=command();a.key.requestId='é';b.key.requestId='e\u0301';return A(a,journal).slotDigest!==A(b,journal).slotDigest});
 check('effect predecessor must occur in causes',()=>invalid(()=>A({...effect,key:{...effect.key,predecessor:cause}},journal)));
 check('effect journal must match service identity',()=>invalid(()=>A(effect,'wrong-journal')));
 check('accessor does not run',()=>{let calls=0;const v=command();Object.defineProperty(v,'value',{enumerable:true,get(){calls++;return {}}});return invalid(()=>A(v,journal))&&calls===0});
 check('input array hole refused',()=>{const v=command();v.value=Array(2);return invalid(()=>A(v,journal))});
 check('aggregate command bound enforced',()=>{const v=command();v.value=Array(8).fill('x'.repeat(200000));return invalid(()=>A(v,journal))});
 check('whole envelope bound enforced',()=>{const v=command();v.value={text:'x'.repeat(260000)};A(v,journal);return invalid(()=>B(v,options()))});
 for(const [name,modify] of [
 ['unknown options',o=>o.extra=1],['wrong principal',o=>o.seat='other-person'],['noncanonical time',o=>o.admittedAt='2026-09-27T12:00:00Z'],['normalized invalid date',o=>o.admittedAt='2026-02-30T12:00:00.000Z'],['surplus artifact',o=>o.artifacts=[art]]
 ])check('builder refuses '+name,()=>{const o=options();modify(o);return invalid(()=>B(c,o))});
 check('missing external body refused',()=>invalid(()=>B(withArt,options())));
 check('noncanonical external text refused',()=>invalid(()=>B(withArt,options(undefined,[{...art,canonicalText:art.canonicalText+' '}]))));
 check('changed external bytes refused without disclosure',()=>{const secret='PRIVATE-BODY-MUST-NOT-ECHO';try{B(withArt,options(undefined,[{...art,canonicalText:JSON.stringify(secret)}]));return false}catch(e){return e.code==='unique-journal-invalid'&&!e.message.includes(secret)}});
 check('duplicate external body refused',()=>invalid(()=>B(withArt,options(undefined,[art,art]))));
 for(const [name,modify] of [
 ['unknown envelope field',r=>r.extra=1],['wrong content identity',r=>r.commandRef=art.ref],['wrong core',r=>r.witness.core.causes=[cause]],['wrong claim',r=>r.witness.observation.claim=tm.mark('different')],['wrong address',r=>r.witness.observation.address=tm.mark('different')],['wrong time',r=>r.witness.observation.time='2026-09-28T12:00:00.000Z'],['unknown witness field',r=>r.witness.extra=1],['unknown observation field',r=>r.witness.observation.extra=1],['omitted empty refs',r=>delete r.witness.observation.referencedArtifacts],['permuted new record sources',r=>r.witness.sources.reverse()],['changed source body',r=>r.witness.sources[0].canonicalText='{}']
 ])check('record refuses '+name,()=>{const r=clone(rec);modify(r);return invalid(()=>P(r,journal,slot(c)))});
 check('wrong journal and slot refused',()=>invalid(()=>P(rec,'wrong-journal',slot(c)))&&invalid(()=>P(rec,journal,'0'.repeat(64)))&&invalid(()=>P(rec,journal,slot(c).toUpperCase()))&&invalid(()=>P(rec,journal)));
}
const result={checks,passed:checks.filter(c=>c.ok).length,total:checks.length,limits:['Pure record construction and verification only; no storage, authority, dispatch, or real assistant workflow.','Dependency bytes are read-only, namespace has no network or operational credentials.']};console.log(JSON.stringify(result,null,2));process.exitCode=result.passed===result.total?0:1;
''')
order=s/'2026-09-27-journal-unique-wire-fabrication.md'; contract=s/'2026-09-27-muse-assist-fabrication-lld.md'; lld=s/'2026-09-27-muse-assist-journal-admission-lld.md'
(a/'commitment.json').write_text(json.dumps({'assaySha256':sha(a/'assay.mjs'),'loaderSha256':sha(a/'resolve.mjs'),'orderSha256':sha(order),'committedBeforeGeneration':True},indent=2))
name='code/src/semiotic-eavt/journal/event.mjs'
public_paths=[code/'src/semiotic-eavt/identity/index.mjs',Path(next(p for p in deps['files'] if p.endswith('/eavt-services-section/src/row.mjs')))]
packet={'purpose':'Apply the closed pure-wire codemod order. Only the named event module is writable. Independent private assays are withheld. No tools, shell, new files or unrelated changes.','workOrder':{'text':order.read_text(),'sha256':sha(order)},'realizationContract':{'text':contract.read_text(),'sha256':sha(contract)},'domainContract':{'text':lld.read_text(),'sha256':sha(lld)},'inputs':{name:{'text':entry.read_text(),'sha256':sha(entry)}},'readOnlyApiEvidence':[{'path':str(p),'text':p.read_text(),'sha256':sha(p)} for p in public_paths],'apiFacts':{'canonicalizeJson':'canonicalizeJson(value, JSON_RESOURCE_ENVELOPE) returns a deeply frozen snapshot as .value, canonical UTF-8 JSON .text and .byteLength; validation rejects accessors, nonordinary prototypes, sparse arrays, lone surrogates, undefined and nonfinite numbers; TypeError.code and .path explain refusal. canonicalJson alone defaults unbounded.','jsonResourceEnvelope':{'maxSourceBytes':1048576,'maxCanonicalBytes':1048576,'maxDepth':64,'maxNodes':100000,'maxObjectMembers':4096,'maxArrayLength':65536,'maxStringBytes':262144,'maxKeyBytes':1024},'tm':'Named export tm from @red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation exposes mark(string); existing event constructor checks its type.'},'assayCommitment':{'manifestSha256':sha(a/'commitment.json'),'committedBeforeGeneration':True}}
(run/'public-input.json').write_text(json.dumps(packet))
schema=json.loads((old/'output-schema.json').read_text());schema['properties']['edits']['items']['properties']['path']['enum']=[name];(run/'output-schema.json').write_text(json.dumps(schema))
profile=json.loads((old/'profile.json').read_text()); profile=[str(run/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(run/'profile.json').write_text(json.dumps(profile))
(run/'source-paths.json').write_text(json.dumps({name:str(entry)}))
protected=list(dict.fromkeys([*map(Path,deps['files']),order,contract,lld,*public_paths]))
(run/'protected-inputs.json').write_text(json.dumps({str(p):sha(p) for p in protected},indent=2))
base=['bwrap','--unshare-all','--die-with-parent','--new-session','--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/work','--chdir','/work','--ro-bind','/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node','/node','--ro-bind',str(a),'/assays']
for f in deps['files']:base+=['--ro-bind',f,f]
(run/'assessment-profile.json').write_text(json.dumps(base))
Path('/tmp/muse-wire-generation-run').write_text(str(run));Path('/tmp/muse-wire-assay').write_text(str(a))
cmd=base+['/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/assays/assay.mjs']
x=subprocess.run(cmd,capture_output=True,text=True,timeout=60);(run/'baseline.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2));print(run);print('baseline',x.returncode,x.stderr[:1000]);
if x.stdout:
 report=json.loads(x.stdout);print('observations',report['passed'],report['total']);print([c['name'] for c in report['checks'] if not c['ok']])
