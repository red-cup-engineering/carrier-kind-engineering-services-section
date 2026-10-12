import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
const d=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
const load=p=>import(pathToFileURL(p));
const json=await load(d.jsonEntry);
const {canonicalJson}=json;
const {addressArtifact}=await load(d.code+'/src/semiotic-eavt/identity/index.mjs');
const {addressUniqueJournalCommand,uniqueJournalRecord,journalWitness}=await load(d.code+'/src/semiotic-eavt/journal/event.mjs');
const {tm}=await load(d.senEntry);
const syncLog=[];
let failSync=false;
const realSync=fs.fsyncSync;
fs.fsyncSync=function(fd){
  const target=fs.readlinkSync('/proc/self/fd/'+fd);syncLog.push(target);
  if(failSync){const e=new Error('private injected fsync failure');e.code='EIO';throw e;}
  return realSync(fd);
};
syncBuiltinESMExports();
const ownerModule=await load(d.system+'/src/journal/filesystem/source-owner.mjs');
const {initializeJournal,openSourceOwner}=ownerModule;
const {journalUnavailable,isJournalUnavailable}=await load(d.system+'/src/journal/diagnostics.mjs');
const profile={maxLineBytes:4194304,maxBatchBytes:16777216,maxSourceFiles:4096,maxScanBytes:67108864,maxClosureWitnesses:4096,maxClosureArtifacts:16384,maxClosureBytes:33554432,maxClosureDepth:4096};
const config=(journal='assessor-fixture',limits={})=>({kind:'metroplat.journal.host',version:1,journal,hostProfile:'linux-local-flock-v1',limits:{...profile,...limits}});
const root=()=>fs.mkdtempSync('/fixtures/owner-');
const provision=(c=config())=>{const r=root();initializeJournal(r,c);return r;};
const refusal=(fn,reason)=>assert.throws(fn,e=>isJournalUnavailable(e)&&e.reason===reason);
const command=(requestId='request-a',value='Arrange an agenda')=>({kind:'metroplat.journal.unique-command',version:1,domain:'interaction',key:{context:'context-a',principal:'principal-a',requestId},subject:'principal-a',value:{text:value},causes:[],artifactRefs:[]});
const record=(c=command(),journal='assessor-fixture')=>uniqueJournalRecord(c,{journal,seat:'principal-a',admittedAt:'2026-09-27T12:00:00.000Z',artifacts:[]});
const witness=(name,causes=[])=>journalWitness({kind:'metroplat.journal.observation',seat:'principal-a',claim:tm.mark('assessor-claim'),address:tm.mark(name),time:'2026-09-27T12:00:00.000Z',causes,payload:{name}});
const retained=(w,feed='2026/09/27/work.jsonl')=>({kind:'metroplat.journal.retained-witness',version:1,feed,statement:w});
const snapshot=r=>{const result=[];const pending=[r];while(pending.length){const p=pending.pop();for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())pending.push(f);else result.push([path.relative(r,f),createHash('sha256').update(fs.readFileSync(f)).digest('hex')]);}}return result.sort((a,b)=>a[0].localeCompare(b[0]));};
const checks=[];
const test=(name,fn)=>{try{fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:{name:e.name,message:e.message,reason:e.reason}});}};
test('diagnostic brand and private details',()=>{
 const e=journalUnavailable('source-corrupt',{secret:'do-not-disclose'});
 assert.equal(e.message,'journal unavailable: source-corrupt');assert.equal(e.code,'JOURNAL_UNAVAILABLE');assert(isJournalUnavailable(e));assert(!isJournalUnavailable({...e}));assert(!JSON.stringify(e).includes('do-not-disclose'));assert.equal(e.cause,undefined);assert.throws(()=>journalUnavailable('invented',{}),TypeError);
});
test('explicit initialization and identical retry',()=>{
 const r=root();assert.deepEqual(initializeJournal(r,config()),{disposition:'created',journal:'assessor-fixture'});const inode=fs.statSync(r+'/maintenance.lock').ino;
 assert.deepEqual(initializeJournal(r,config()),{disposition:'existing',journal:'assessor-fixture'});assert.equal(fs.statSync(r+'/maintenance.lock').ino,inode);assert.equal(fs.readFileSync(r+'/host.json','utf8'),canonicalJson(config())+'\n');refusal(()=>initializeJournal(r,config('different')),'storage-unavailable');
});
test('invalid configuration has no filesystem effect',()=>{const r=root();const c=config();c.limits.maxLineBytes=0;assert.throws(()=>initializeJournal(r,c),e=>e instanceof TypeError&&e.message==='journal-host-invalid');assert.deepEqual(fs.readdirSync(r),[]);});
test('runtime open never provisions missing host',()=>{const r=root();refusal(()=>openSourceOwner(r),'storage-unavailable');assert(!fs.existsSync(r+'/host.json'));});
test('symlink root refuses',()=>{const r=provision();const p=root()+'/alias';fs.symlinkSync(r,p);refusal(()=>openSourceOwner(p),'storage-unavailable');});
test('scope expires, rejects thenables and excludes reentry',()=>{const r=provision();const o=openSourceOwner(r);let captured;o.withOperation(s=>{captured=s;assert.deepEqual(s.sourceUsage(),{sourceFiles:0,sourceBytes:0});refusal(()=>openSourceOwner(r).withOperation(()=>{}),'maintenance-busy');});assert.throws(()=>captured.sourceUsage());assert.throws(()=>o.withOperation(()=>({then(){}})));});
test('callback errors preserve identity and release gate',()=>{const o=openSourceOwner(provision());const marker=new Error('callback sentinel');assert.throws(()=>o.withOperation(()=>{throw marker;}),e=>e===marker);assert.equal(o.withOperation(()=>23),23);});
test('unique command survives reopen and resolves original payload',()=>{
 const r=provision();const c=command();const a=addressUniqueJournalCommand(c,'assessor-fixture');let ref;
 openSourceOwner(r).withOperation(s=>{const p=s.publishUnique(record(c));assert.equal(p.disposition,'created');ref=p.entry.reference;s.requireDurable({events:[],artifacts:[],uniqueSlot:{journal:'assessor-fixture',slotDigest:a.slotDigest}});});
 const before=snapshot(r);const entry=openSourceOwner(r).withOperation(s=>{const e=s.uniqueRecord(a.slotDigest);assert.deepEqual(JSON.parse(s.artifact(e.reference.payload).canonicalText),c);assert.equal(s.witness(e.reference.event).state,'admitted');return e;});assert.deepEqual(entry.reference,ref);assert.deepEqual(snapshot(r),before);assert.equal(before.filter(([p])=>p.startsWith('retained/')).length,0);
});
test('occupied conflicting proposal preserves original source',()=>{
 const r=provision();const o=openSourceOwner(r);let original;o.withOperation(s=>{original=s.publishUnique(record()).entry;});const before=snapshot(r);o.withOperation(s=>{const p=s.publishUnique(record(command('request-a','Different proposal')));assert.equal(p.disposition,'existing');assert.deepEqual(p.entry,original);assert.equal(JSON.parse(s.artifact(p.entry.reference.payload).canonicalText).value.text,'Arrange an agenda');});assert.deepEqual(snapshot(r),before);
});
test('ordinary missing dependency later admits without restart',()=>{
 const o=openSourceOwner(provision());const a=witness('parent');const b=witness('child',[a.id]);o.withOperation(s=>{s.publishRetained([retained(b)]);assert.equal(s.witness(b.id).state,'quarantined');refusal(()=>s.events({kind:'territory'}),'evidence-unavailable');});
 o.withOperation(s=>{const p=s.publishRetained([retained(a)]);assert(p.admittedEvents.includes(b.id));assert.deepEqual(s.events({kind:'territory'}).map(w=>w.id),[a.id,b.id]);});
});
test('membership-only append preserves event delta distinction',()=>{const o=openSourceOwner(provision());const w=witness('membership');o.withOperation(s=>s.publishRetained([retained(w,'standalone/a')]));o.withOperation(s=>{const p=s.publishRetained([retained(w,'standalone/b')]);assert.deepEqual(p.retainedEvents,[]);assert.deepEqual(p.admittedEvents,[]);assert.deepEqual(s.feeds({kind:'territory'}),['standalone/a','standalone/b']);});});
test('feed status uses exact normalized representation bytes',()=>{const o=openSourceOwner(provision());const w=witness('status');o.withOperation(s=>{s.publishRetained([retained(w)]);assert.deepEqual(s.sourceStatus('2026/09/27/work.jsonl'),{exists:true,retainedEvents:1,admittedEvents:1,pendingEvents:0,blockedEvents:0,representationBytes:Buffer.byteLength(canonicalJson(w)+'\n'),representationEncoding:'metroplat.journal.admitted-witness-jsonl.v1'});});});
test('historical block takes effect on warm refresh',()=>{const o=openSourceOwner(provision());const w=witness('blocked');o.withOperation(s=>s.publishRetained([retained(w)]));o.withOperation(s=>{s.publishRetained([{kind:'metroplat.journal.retained-obstruction',version:1,event:w.id,obstruction:false}]);assert.equal(s.witness(w.id).state,'blocked');assert(s.witness(w.id).obstructions.some(x=>x===false));assert.equal(s.sourceStatus('2026/09/27/work.jsonl').blockedEvents,1);});});
test('as-of crosses feeds but returns requested membership',()=>{const o=openSourceOwner(provision());const a=witness('asof-parent');const b=witness('asof-child',[a.id]);o.withOperation(s=>{s.publishRetained([retained(a,'standalone/parent'),retained(b,'standalone/child')]);assert.deepEqual(s.events({kind:'as-of',feed:'standalone/child',frontier:[b.id]}).map(w=>w.id),[b.id]);assert.deepEqual(s.events({kind:'as-of',feed:'standalone/child',frontier:[]}),[]);assert.throws(()=>s.events({kind:'as-of',feed:'standalone/child',frontier:[b.id,b.id]}));});});
test('ordinary copies cannot establish unique occupancy',()=>{const o=openSourceOwner(provision());const c=command();const rec=record(c);const a=addressUniqueJournalCommand(c,'assessor-fixture');const body=addressArtifact(c);o.withOperation(s=>{s.publishRetained([retained(rec.witness),{kind:'metroplat.journal.retained-artifact',version:1,ref:body.ref,canonicalText:body.canonical.text}]);assert.equal(s.uniqueRecord(a.slotDigest),null);refusal(()=>s.requireDurable({events:[],artifacts:[],uniqueSlot:{journal:'assessor-fixture',slotDigest:a.slotDigest}}),'evidence-unavailable');});});
test('existing closure barrier creates no source and synchronizes required custody',()=>{const r=provision();const o=openSourceOwner(r);const w=witness('barrier');let digest;o.withOperation(s=>{digest=s.publishRetained([retained(w)]).digest;});const before=snapshot(r);syncLog.length=0;o.withOperation(s=>s.requireDurable({events:[w.id],artifacts:[],uniqueSlot:null}));assert.deepEqual(snapshot(r),before);assert(syncLog.includes(r+'/retained/v1/'+digest+'.jsonl'));assert(syncLog.includes(r));});
test('barrier avoids duplicate common artifacts in unrelated history',()=>{const r=provision();const o=openSourceOwner(r);const a=witness('selected');const b=witness('unrelated');let da,db;o.withOperation(s=>{da=s.publishRetained([retained(a)]).digest;db=s.publishRetained([retained(b)]).digest;});syncLog.length=0;o.withOperation(s=>s.requireDurable({events:[a.id],artifacts:[],uniqueSlot:null}));assert(syncLog.includes(r+'/retained/v1/'+da+'.jsonl'));assert(!syncLog.includes(r+'/retained/v1/'+db+'.jsonl'));});
test('warm view notices removed source',()=>{const r=provision();const o=openSourceOwner(r);const w=witness('removed');let digest;o.withOperation(s=>{digest=s.publishRetained([retained(w)]).digest;});fs.unlinkSync(r+'/retained/v1/'+digest+'.jsonl');o.withOperation(s=>{assert.equal(s.witness(w.id).statement,null);assert.deepEqual(s.events({kind:'territory'}),[]);});});
test('malformed recognized source refuses complete scan',()=>{const r=provision();fs.mkdirSync(r+'/retained/v1',{recursive:true});const bytes='{}\n';const digest=createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(r+'/retained/v1/'+digest+'.jsonl',bytes);refusal(()=>openSourceOwner(r).withOperation(s=>s.sourceUsage()),'source-corrupt');});
test('changed bound host refuses existing owner',()=>{const r=provision();const o=openSourceOwner(r);fs.writeFileSync(r+'/host.json',canonicalJson(config('changed'))+'\n');refusal(()=>o.withOperation(()=>{}),'storage-unavailable');});
test('source count capacity refuses before new publication',()=>{const r=provision(config('assessor-fixture',{maxSourceFiles:1}));const o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([retained(witness('capacity-a'))]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained([retained(witness('capacity-b'))])),'resource-limit');assert.deepEqual(snapshot(r),before);});
test('existing source sync failure is unavailable and source preserved',()=>{const r=provision();const o=openSourceOwner(r);const w=witness('sync-failure');o.withOperation(s=>s.publishRetained([retained(w)]));const before=snapshot(r);failSync=true;try{refusal(()=>o.withOperation(s=>s.requireDurable({events:[w.id],artifacts:[],uniqueSlot:null})),'storage-unavailable');}finally{failSync=false;}assert.deepEqual(snapshot(r),before);});
test('kernel gate excludes a separate process',()=>{const r=provision();const o=openSourceOwner(r);o.withOperation(()=>{const source=`import {openSourceOwner} from ${JSON.stringify(pathToFileURL(d.system+'/src/journal/filesystem/source-owner.mjs').href)}; try {openSourceOwner(${JSON.stringify(r)}).withOperation(()=>{});process.exit(7)}catch(e){process.exit(e.reason==='maintenance-busy'?0:8)}`;const p=spawnSync('/node',['--experimental-loader','/assays/resolve.mjs','--input-type=module','-e',source],{encoding:'utf8',timeout:10000});assert.equal(p.status,0,p.stderr);});});
console.log(JSON.stringify({kind:'journal-owner-independent-receiving',checks,passed:checks.filter(x=>x.passed).length,total:checks.length,limitations:['Local filesystem fixtures only; no production root or power-loss durability claim.','Owner dependency observations only; facade migration, domain authorization and muse-assist workflow are not exercised.']}));
process.exitCode=checks.every(x=>x.passed)?0:1;
