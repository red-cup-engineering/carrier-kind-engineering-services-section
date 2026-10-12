import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
const d=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
const load=p=>import(pathToFileURL(p));
const {canonicalJson}=await load(d.jsonEntry);
const {addressArtifact}=await load(d.code+'/src/semiotic-eavt/identity/index.mjs');
const {uniqueJournalRecord,journalWitness}=await load(d.code+'/src/semiotic-eavt/journal/event.mjs');
const {tm}=await load(d.senEntry);
const syncLog=[],faults=[];
let syncTarget=null, closeTarget=null, syncReady=()=>true;
const realSync=fs.fsyncSync,realClose=fs.closeSync;
fs.fsyncSync=function(fd){const target=fs.readlinkSync('/proc/self/fd/'+fd);syncLog.push(target);if(target===syncTarget&&syncReady()){syncTarget=null;faults.push({operation:'fsync',target});throw Object.assign(new Error('supplement injected sync error'),{code:'EIO'});}return realSync(fd);};
fs.closeSync=function(fd){const target=fs.readlinkSync('/proc/self/fd/'+fd);const result=realClose(fd);if(target===closeTarget){closeTarget=null;faults.push({operation:'close-after-release',target});throw Object.assign(new Error('supplement injected close error'),{code:'EIO'});}return result;};
syncBuiltinESMExports();
const {initializeJournal,openSourceOwner}=await load(d.system+'/src/journal/filesystem/source-owner.mjs');
const {isJournalUnavailable}=await load(d.system+'/src/journal/diagnostics.mjs');
const limits={maxLineBytes:4194304,maxBatchBytes:16777216,maxSourceFiles:4096,maxScanBytes:67108864,maxClosureWitnesses:4096,maxClosureArtifacts:16384,maxClosureBytes:33554432,maxClosureDepth:4096};
const config=extra=>({kind:'metroplat.journal.host',version:1,journal:'supplement-fixture',hostProfile:'linux-local-flock-v1',limits:{...limits,...extra}});
const root=()=>fs.mkdtempSync('/fixtures/supplement-');
const provision=(extra={})=>{const r=root();initializeJournal(r,config(extra));return r;};
const refusal=(fn,reason)=>assert.throws(fn,e=>isJournalUnavailable(e)&&e.reason===reason);
const command={kind:'metroplat.journal.unique-command',version:1,domain:'interaction',key:{context:'context-a',principal:'principal-a',requestId:'request-a'},subject:'principal-a',value:{text:'Prepare my meeting briefing'},causes:[],artifactRefs:[]};
const record=()=>uniqueJournalRecord(command,{journal:'supplement-fixture',seat:'principal-a',admittedAt:'2026-09-27T12:00:00.000Z',artifacts:[]});
const witness=(name,causes=[])=>journalWitness({kind:'metroplat.journal.observation',seat:'principal-a',claim:tm.mark('supplement-claim'),address:tm.mark(name),time:'2026-09-27T12:00:00.000Z',causes,payload:{name}});
const retained=w=>({kind:'metroplat.journal.retained-witness',version:1,feed:'2026/09/27/work.jsonl',statement:w});
const artifact=value=>{const a=addressArtifact(value);return {kind:'metroplat.journal.retained-artifact',version:1,ref:a.ref,canonicalText:a.canonical.text};};
const lineBytes=x=>Buffer.byteLength(canonicalJson(x).text+'\n');
const snapshot=r=>{const result=[];const pending=[r];while(pending.length){const p=pending.pop();for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())pending.push(f);else result.push([path.relative(r,f),createHash('sha256').update(fs.readFileSync(f)).digest('hex')]);}}return result.sort((a,b)=>a[0].localeCompare(b[0]));};
const checks=[];
async function test(name,fn){const start=faults.length;try{const observation=await fn();checks.push({name,passed:true,observation,faults:faults.slice(start)});}catch(e){checks.push({name,passed:false,error:{name:e?.name,message:e?.message,reason:e?.reason},faults:faults.slice(start)});}finally{syncTarget=null;closeTarget=null;syncReady=()=>true;}}
await test('root replacement permanently invalidates old owner',()=>{
 const r=provision(),o=openSourceOwner(r),moved=r+'-original';fs.renameSync(r,moved);fs.mkdirSync(r);let called=false;
 refusal(()=>o.withOperation(()=>{called=true;}),'storage-unavailable');assert.equal(called,false);fs.rmdirSync(r);fs.renameSync(moved,r);
 refusal(()=>o.withOperation(()=>{called=true;}),'storage-unavailable');assert.equal(called,false);assert.equal(openSourceOwner(r).withOperation(()=>42),42);
});
await test('lock replacement permanently invalidates old owner',()=>{
 const r=provision(),o=openSourceOwner(r),lock=r+'/maintenance.lock',saved=r+'-saved-lock';fs.renameSync(lock,saved);fs.writeFileSync(lock,'');let called=false;
 refusal(()=>o.withOperation(()=>{called=true;}),'storage-unavailable');assert.equal(called,false);fs.unlinkSync(lock);fs.renameSync(saved,lock);
 refusal(()=>o.withOperation(()=>{called=true;}),'storage-unavailable');assert.equal(called,false);assert.equal(openSourceOwner(r).withOperation(()=>42),42);
});
await test('callback throw undefined survives release and simultaneous close failure',()=>{
 const r=provision(),o=openSourceOwner(r);for(const inject of [false,true]){let caught=false;try{o.withOperation(()=>{if(inject)closeTarget=r+'/maintenance.lock';throw undefined;});}catch(e){caught=true;assert.equal(e,undefined);}assert.equal(caught,true);assert.equal(o.withOperation(()=>42),42);}
});
await test('cleanup-only failure refuses otherwise successful operation',()=>{
 const r=provision(),o=openSourceOwner(r);refusal(()=>o.withOperation(()=>{closeTarget=r+'/maintenance.lock';return 42;}),'storage-unavailable');assert.equal(o.withOperation(()=>43),43);
});
await test('retained publication followed by lock close failure preserves visible bytes',()=>{
 const r=provision(),o=openSourceOwner(r),w=witness('retained-close');let digest;
 refusal(()=>o.withOperation(s=>{digest=s.publishRetained([retained(w)]).digest;closeTarget=r+'/maintenance.lock';}),'publication-uncertain');assert(fs.existsSync(r+'/retained/v1/'+digest+'.jsonl'));
 const before=snapshot(r);openSourceOwner(r).withOperation(s=>{assert.equal(s.witness(w.id).state,'admitted');assert.equal(s.publishRetained([retained(w)]).disposition,'existing');});assert.deepEqual(snapshot(r),before);
});
await test('unique publication followed by lock close failure recovers original command',()=>{
 const r=provision(),o=openSourceOwner(r);let original;
 refusal(()=>o.withOperation(s=>{original=s.publishUnique(record()).entry;closeTarget=r+'/maintenance.lock';}),'publication-uncertain');
 const before=snapshot(r);openSourceOwner(r).withOperation(s=>{const retry=s.publishUnique(record());assert.equal(retry.disposition,'existing');assert.deepEqual(retry.entry,original);assert.deepEqual(retry.entry.command,command);});assert.deepEqual(snapshot(r),before);
});
for(const family of ['retained','unique-admissions'])await test(family+' publication directory-sync failure retains visible source',()=>{
 const r=provision(),o=openSourceOwner(r),w=witness('sync-visible');syncTarget=r+'/'+family+'/v1';syncReady=()=>fs.readdirSync(r+'/'+family+'/v1').some(n=>/^[a-f0-9]{64}\.(jsonl|json)$/.test(n));
 refusal(()=>o.withOperation(s=>family==='retained'?s.publishRetained([retained(w)]):s.publishUnique(record())),'publication-uncertain');assert.equal(syncTarget,null);assert.equal(fs.readdirSync(r+'/'+family+'/v1').length,1);
 const before=snapshot(r);openSourceOwner(r).withOperation(s=>{const retry=family==='retained'?s.publishRetained([retained(w)]):s.publishUnique(record());assert.equal(retry.disposition,'existing');});assert.deepEqual(snapshot(r),before);
});
await test('initialization directory-sync failure preserves host for identical retry',()=>{
 const r=root();syncTarget=r;syncReady=()=>fs.existsSync(r+'/host.json');refusal(()=>initializeJournal(r,config()),'publication-uncertain');assert.equal(syncTarget,null);assert.equal(fs.readFileSync(r+'/host.json','utf8'),canonicalJson(config()).text+'\n');const before=snapshot(r),inode=fs.statSync(r+'/maintenance.lock').ino;
 assert.equal(initializeJournal(r,config()).disposition,'existing');assert.deepEqual(snapshot(r),before);assert.equal(fs.statSync(r+'/maintenance.lock').ino,inode);
});
await test('existing initialization synchronizes host lock and every ancestor',()=>{
 const r=provision(),before=snapshot(r);syncLog.length=0;assert.equal(initializeJournal(r,config()).disposition,'existing');assert.deepEqual(snapshot(r),before);
 for(const p of [r+'/host.json',r+'/maintenance.lock'])assert(syncLog.includes(p),p);
 let p=r;while(true){assert(syncLog.includes(p),p);if(p==='/')break;p=path.dirname(p);}return {synchronized:syncLog.slice()};
});
await test('actual tmpfs host is refused without provisioning',()=>{
 const r=fs.mkdtempSync('/tmp/unsupported-'),type=fs.statfsSync(r).type;assert.equal(type,0x01021994);refusal(()=>initializeJournal(r,config()),'storage-unsupported');assert.deepEqual(fs.readdirSync(r),[]);return {filesystemType:type};
});
await test('line capacity refuses before creating custody',()=>{
 const entry=artifact('line-bound');const r=provision({maxLineBytes:lineBytes(entry)-1}),o=openSourceOwner(r),before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained([entry])),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('batch capacity refuses before creating custody',()=>{
 const entries=[artifact('batch-a'),artifact('batch-b')],n=Math.max(...entries.map(lineBytes));const r=provision({maxLineBytes:n,maxBatchBytes:n}),o=openSourceOwner(r),before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained(entries)),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('aggregate source capacity refuses next publication without alteration',()=>{
 const one=artifact('a'.repeat(1000)),two=artifact('b'.repeat(1000)),n=lineBytes(one);const r=provision({maxLineBytes:n,maxBatchBytes:n,maxScanBytes:n+64}),o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([one]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained([two])),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('staging names consume discovery capacity but no source body capacity',()=>{
 const names=Array.from({length:8},(_,i)=>i.toString(16).padStart(64,'0')+'.jsonl.123.00000000-0000-0000-0000-000000000000.tmp');
 const paths=['host.json','maintenance.lock','retained','retained/v1',...names.map(x=>'retained/v1/'+x)];const budget=paths.reduce((n,p)=>n+Buffer.byteLength(p)+1,0);
 const r=provision({maxLineBytes:budget,maxBatchBytes:budget,maxScanBytes:budget});fs.mkdirSync(r+'/retained/v1',{recursive:true});for(const n of names)fs.writeFileSync(r+'/retained/v1/'+n,'x'.repeat(budget+1));const o=openSourceOwner(r);o.withOperation(s=>assert.deepEqual(s.sourceUsage(),{sourceFiles:0,sourceBytes:0}));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained([artifact('discovery')])),'resource-limit');assert.deepEqual(snapshot(r),before);return {discoveryBudget:budget};
});
await test('closure witness count refuses acknowledgment without source mutation',()=>{
 const a=witness('count-parent'),b=witness('count-child',[a.id]),r=provision({maxClosureWitnesses:1}),o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([retained(a),retained(b)]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.requireDurable({events:[b.id],artifacts:[],uniqueSlot:null})),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('closure artifact count refuses acknowledgment without source mutation',()=>{
 const a=artifact('artifact-a'),b=artifact('artifact-b'),r=provision({maxClosureArtifacts:1}),o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([a,b]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.requireDurable({events:[],artifacts:[a.ref,b.ref],uniqueSlot:null})),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('closure bytes refuse acknowledgment without source mutation',()=>{
 const a=artifact('byte-bound'),r=provision({maxClosureBytes:1}),o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([a]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.requireDurable({events:[],artifacts:[a.ref],uniqueSlot:null})),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('closure causal depth refuses acknowledgment without source mutation',()=>{
 const a=witness('depth-a'),b=witness('depth-b',[a.id]),c=witness('depth-c',[b.id]),r=provision({maxClosureDepth:1}),o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([retained(a),retained(b),retained(c)]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.requireDurable({events:[c.id],artifacts:[],uniqueSlot:null})),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('kernel gate releases when holder process is killed',async()=>{
 const r=provision();const source=`import fs from 'node:fs';import {openSourceOwner} from ${JSON.stringify(pathToFileURL(d.system+'/src/journal/filesystem/source-owner.mjs').href)};openSourceOwner(${JSON.stringify(r)}).withOperation(()=>{fs.writeSync(1,'locked\\n');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,15000);});`;
 const child=spawn('/node',['--no-warnings','--experimental-loader','/assays/resolve.mjs','--input-type=module','-e',source],{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const ended=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('holder did not report lock: '+stderr)),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',()=>{clearTimeout(timer);reject(new Error('holder exited before readiness: '+stderr));});let output='';child.stdout.on('data',b=>{output+=b;if(output.includes('locked\n')){clearTimeout(timer);resolve();}});});
 refusal(()=>openSourceOwner(r),'maintenance-busy');assert.equal(child.kill('SIGKILL'),true);const exit=await ended;assert.equal(exit.signal,'SIGKILL');assert.equal(openSourceOwner(r).withOperation(()=>42),42);return {holderExit:exit,recovered:true};
 }finally{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await ended;}}
});
process.stdout.write(JSON.stringify({kind:'journal-owner-post-generation-supplement',checks,passed:checks.filter(c=>c.passed).length,total:checks.length})+'\n');
process.exitCode=checks.every(c=>c.passed)?0:1;
