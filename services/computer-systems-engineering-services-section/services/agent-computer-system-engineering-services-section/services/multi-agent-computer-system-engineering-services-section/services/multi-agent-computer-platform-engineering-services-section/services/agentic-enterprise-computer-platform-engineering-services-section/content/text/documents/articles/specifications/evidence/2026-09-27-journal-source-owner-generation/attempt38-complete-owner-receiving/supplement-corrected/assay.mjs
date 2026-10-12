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
const lineBytes=x=>Buffer.byteLength(canonicalJson(x)+'\n');
const snapshot=r=>{const result=[];const pending=[r];while(pending.length){const p=pending.pop();for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())pending.push(f);else result.push([path.relative(r,f),createHash('sha256').update(fs.readFileSync(f)).digest('hex')]);}}return result.sort((a,b)=>a[0].localeCompare(b[0]));};
const checks=[];
async function test(name,fn){const start=faults.length;try{const observation=await fn();checks.push({name,passed:true,observation,faults:faults.slice(start)});}catch(e){checks.push({name,passed:false,error:{name:e?.name,message:e?.message,reason:e?.reason},faults:faults.slice(start)});}finally{syncTarget=null;closeTarget=null;syncReady=()=>true;}}
await test('initialization directory-sync failure preserves host for identical retry',()=>{
 const r=root();syncTarget=r;syncReady=()=>fs.existsSync(r+'/host.json');refusal(()=>initializeJournal(r,config()),'publication-uncertain');assert.equal(syncTarget,null);assert.equal(fs.readFileSync(r+'/host.json','utf8'),canonicalJson(config())+'\n');const before=snapshot(r),inode=fs.statSync(r+'/maintenance.lock').ino;
 assert.equal(initializeJournal(r,config()).disposition,'existing');assert.deepEqual(snapshot(r),before);assert.equal(fs.statSync(r+'/maintenance.lock').ino,inode);
});
await test('line capacity refuses before creating custody',()=>{
 const entry=artifact('line-bound');assert(lineBytes(entry)>100);const positive=provision({maxLineBytes:lineBytes(entry)});assert.equal(openSourceOwner(positive).withOperation(s=>s.publishRetained([entry])).disposition,'created');const r=provision({maxLineBytes:lineBytes(entry)-1}),o=openSourceOwner(r),before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained([entry])),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('batch capacity refuses before creating custody',()=>{
 const entries=[artifact('batch-a'),artifact('batch-b')],n=Math.max(...entries.map(lineBytes));assert(n>100);const positive=provision({maxLineBytes:n,maxBatchBytes:n});assert.equal(openSourceOwner(positive).withOperation(s=>s.publishRetained([entries[0]])).disposition,'created');const r=provision({maxLineBytes:n,maxBatchBytes:n}),o=openSourceOwner(r),before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained(entries)),'resource-limit');assert.deepEqual(snapshot(r),before);
});
await test('aggregate source capacity refuses next publication without alteration',()=>{
 const one=artifact('a'.repeat(1000)),two=artifact('b'.repeat(1000)),n=lineBytes(one);assert(n>1000);const r=provision({maxLineBytes:n,maxBatchBytes:n,maxScanBytes:n+64}),o=openSourceOwner(r);o.withOperation(s=>s.publishRetained([one]));const before=snapshot(r);refusal(()=>o.withOperation(s=>s.publishRetained([two])),'resource-limit');assert.deepEqual(snapshot(r),before);
});
process.stdout.write(JSON.stringify({kind:'journal-owner-post-generation-supplement',checks,passed:checks.filter(c=>c.passed).length,total:checks.length})+'\n');
process.exitCode=checks.every(c=>c.passed)?0:1;
