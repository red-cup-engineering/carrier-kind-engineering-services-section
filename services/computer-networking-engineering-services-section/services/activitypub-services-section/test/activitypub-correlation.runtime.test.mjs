import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {put,writeHead,readHead,each,get} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {recordFile} from '@red-cup-engineering/semiotic-eavt-services-section/layout';
import {compareActivityPubReplyRows} from '@red-cup-engineering/activitypub-services-section/journal-custody';
import {AT,LATER,fixture,reply,arrival,receipt,query,receiptHead,inboxRow,replyRow,headPath,rowAt,requestWire,requestIdentity,activityHead,INBOX_TYPE,OUTBOX_TYPE,activityPubReplyHead,activityPubRequestHead} from './activitypub-correlation.fixture.mjs';

test('receipt-key CAS fixes the scalar ordinal and duplicate old receipts never promote',async t=>{
 const f=fixture(t),a=reply('first'),b=reply('second');
 const first=await f.custody(AT).inbox.retain(arrival(a)),aRow=inboxRow(f,a);
 assert.equal(aRow.record.replyOrder,0);
 await f.custody(AT).inbox.retain(arrival(b));const bRow=inboxRow(f,b);
 assert.equal(bRow.record.replyOrder,1);
 assert.deepEqual(await f.custody().inbox.replyFor(query()),b);
 assert.deepEqual(await f.custody(LATER).inbox.retain(arrival(a)),first);
 assert.deepEqual(inboxRow(f,a),aRow,'replayed receipt must retain the exact first record and ordinal');
 assert.deepEqual(await f.custody().inbox.replyFor(query()),b);
 assert.equal([...each(f.root,INBOX_TYPE)].length,2);
});

test('correlation rank is raw lexical at then scalar replyOrder then existing key',async t=>{
 const f=fixture(t),a=reply('raw-Z'),b=reply('raw-dot');
 await f.custody('2026-10-14T20:00:00Z').inbox.retain(arrival(a));
 await f.custody('2026-10-14T20:00:00.999Z').inbox.retain(arrival(b));
 assert.equal(Date.parse('2026-10-14T20:00:00Z')<Date.parse('2026-10-14T20:00:00.999Z'),true);
 assert.deepEqual(await f.custody().inbox.replyFor(query()),a,'raw lexical ordering must not be replaced by date normalization');
 const row=(at,replyOrder,key)=>({record:{at,replyOrder,key}}),lo='0'.repeat(64),hi='f'.repeat(64);
 assert.ok(compareActivityPubReplyRows(row(AT,0,hi),row(LATER,0,lo))<0);
 assert.ok(compareActivityPubReplyRows(row(AT,1,lo),row(AT,0,hi))>0);
 assert.ok(compareActivityPubReplyRows(row(AT,1,hi),row(AT,1,lo))>0);
});

test('replyOrder exhaustion refuses a new receipt without changing canonical heads',async t=>{
 const f=fixture(t),a=reply('maximum'),b=reply('overflow'),c=f.custody();await c.inbox.retain(arrival(a));
 const row=inboxRow(f,a),record={...row.record,replyOrder:Number.MAX_SAFE_INTEGER},address=put(f.root,INBOX_TYPE,record);
 writeHead(f.root,INBOX_TYPE,receiptHead(a),{frontier:[address]});writeHead(f.root,INBOX_TYPE,activityPubReplyHead(query()),{frontier:[address]});
 await assert.rejects(c.inbox.retain(arrival(b)),/order exhausted/);
 assert.equal(inboxRow(f,b),undefined);assert.equal(replyRow(f).address,address);
 assert.deepEqual(await c.inbox.retain(arrival(a)),receipt(a).receipt);
 assert.equal(inboxRow(f,a).address,address);
});

for(const corruption of ['missing-record','corrupt-record','multifrontier','wrong-correlation','invalid-order'])test('reply lookup refuses '+corruption,async t=>{
 const f=fixture(t),a=reply('valid'),other=reply('other',{requestId:semanticId('another-request')}),c=f.custody();
 await c.inbox.retain(arrival(a));await c.inbox.retain(arrival(other));
 const aRow=inboxRow(f,a),otherRow=inboxRow(f,other),head=activityPubReplyHead(query());
 if(corruption==='missing-record')writeHead(f.root,INBOX_TYPE,head,{frontier:[semanticId('missing-record')]});
 if(corruption==='corrupt-record')fs.writeFileSync(recordFile(f.root,INBOX_TYPE,aRow.address),JSON.stringify({id:aRow.address,record:{corrupt:true}})+'\n');
 if(corruption==='multifrontier')writeHead(f.root,INBOX_TYPE,head,{frontier:[aRow.address,otherRow.address]});
 if(corruption==='wrong-correlation')writeHead(f.root,INBOX_TYPE,head,{frontier:[otherRow.address]});
 if(corruption==='invalid-order'){const address=put(f.root,INBOX_TYPE,{...aRow.record,replyOrder:-1});writeHead(f.root,INBOX_TYPE,head,{frontier:[address]});}
 await assert.rejects(c.inbox.replyFor(query()));
});

test('duplicate receipt refuses a multi-frontier receipt head rather than selecting its first entry',async t=>{
 const f=fixture(t),a=reply('ambiguous-receipt'),c=f.custody();await c.inbox.retain(arrival(a));
 const row=inboxRow(f,a),other=put(f.root,INBOX_TYPE,{...row.record,at:LATER,replyOrder:1});
 writeHead(f.root,INBOX_TYPE,receiptHead(a),{frontier:[row.address,other]});
 await assert.rejects(c.inbox.retain(arrival(a)),/one head/);
});

const childFile=new URL('./activitypub-correlation.fault-child.mjs',import.meta.url);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function launch(f,name,options){
 const input=path.join(f.directory,name+'.json');fs.writeFileSync(input,JSON.stringify({stateDirectory:f.stateDirectory,now:AT,type:INBOX_TYPE,mode:'inbox',...options}));
 const child=spawn(process.execPath,[fileURLToPath(childFile),input],{cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',data=>{stdout+=data;});child.stderr.on('data',data=>{stderr+=data;});
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});
 return {child,done};
}
async function waitFor(file){const until=Date.now()+15000;while(!fs.existsSync(file)){if(Date.now()>until)throw new Error('fixture marker did not appear: '+file);await wait(5);}}
async function waitForDeadLock(file){
 if(!fs.existsSync(file+'.lock'))return;
 // Respect the actual store's 30-second stale-lock contract. Never remove,
 // modify, or age a crashed writer's lock; the next native writer takes it over.
 const staleAfter=fs.statSync(file+'.lock').mtimeMs+30020;
 await wait(Math.max(0,staleAfter-Date.now()));
 assert.ok(fs.existsSync(file+'.lock'),'the stale fixture lock remains until the real writer recovers it');
}

test('native inbox crash boundaries recover the exact first retained receipt and scalar ordinal',{concurrency:true},async t=>{
 await Promise.all(['body','record','receipt-head','correlation-head'].map(boundary=>t.test(boundary,async t=>{
  const f=fixture(t),a=reply('prior-'+boundary),b=reply('interrupted-'+boundary),c=f.custody();
  await c.inbox.retain(arrival(a));
  const file=boundary==='receipt-head'?headPath(f,INBOX_TYPE,receiptHead(b)):headPath(f,INBOX_TYPE,activityPubReplyHead(query()));
  const hit=path.join(f.directory,'hit.json');
  const result=await launch(f,'crash',{wire:b,fault:boundary.endsWith('head')?'head':boundary,file,hit}).done;
  assert.equal(result.signal,'SIGKILL',result.stderr+result.stdout);assert.ok(fs.existsSync(hit));
  const before=inboxRow(f,b);
  if(boundary==='receipt-head'||boundary==='correlation-head')assert.equal(before.record.replyOrder,1);
  else assert.equal(before,undefined,'body/record writes precede the first receipt-key CAS');
  assert.deepEqual(await c.inbox.replyFor(query()),boundary==='correlation-head'?b:a);
  await waitForDeadLock(file);
  const retained=await f.custody(LATER).inbox.retain(arrival(b));
  assert.deepEqual(retained,receipt(b).receipt);
  const after=inboxRow(f,b);assert.equal(after.record.replyOrder,1);
  if(before!==undefined)assert.deepEqual(after,before,'a bound receipt recovers the exact original record');
  assert.deepEqual(await f.custody().inbox.replyFor(query()),b);
  const row=replyRow(f);await f.custody('2027-01-01T00:00:00.000Z').inbox.retain(arrival(a));
  assert.deepEqual(replyRow(f),row,'an older duplicate cannot promote during recovery');
 }))); 
});

test('native request head is first authority and interrupted activity-key repair preserves its exact wire',{concurrency:true},async t=>{
 await Promise.all(['body','record','request-head','activity-head'].map(boundary=>t.test(boundary,async t=>{
  const f=fixture(t),a=requestWire(AT),b=requestWire(LATER),requestNi=requestIdentity(a);
  assert.equal(requestIdentity(b),requestNi);assert.notEqual(a.id,b.id);
  const name=activityPubRequestHead(requestNi),file=boundary==='activity-head'?headPath(f,OUTBOX_TYPE,activityHead(a)):headPath(f,OUTBOX_TYPE,name);
  const hit=path.join(f.directory,'hit.json');
  const result=await launch(f,'request-crash',{mode:'request',type:OUTBOX_TYPE,wire:a,fault:boundary.endsWith('head')?'head':boundary,file,hit}).done;
  assert.equal(result.signal,'SIGKILL',result.stderr+result.stdout);assert.ok(fs.existsSync(hit));
  const before=rowAt(f,OUTBOX_TYPE,name),fixed=boundary==='request-head'||boundary==='activity-head';
  assert.equal(before!==undefined,fixed);
  if(boundary==='request-head')assert.equal(rowAt(f,OUTBOX_TYPE,activityHead(a)),undefined,'request authority precedes its activity-key repair');
  await waitForDeadLock(file);
  const retained=await f.custody(LATER).outbox.retainRequest(b),expected=fixed?a:b;
  assert.deepEqual(retained.held,expected);
  assert.equal(retained.appended,!fixed);
  const requestRow=rowAt(f,OUTBOX_TYPE,name),named=rowAt(f,OUTBOX_TYPE,activityHead(expected));
  assert.equal(named.address,requestRow.address,'the activity key must name the canonical native request receipt');
  if(fixed){assert.deepEqual(requestRow,before);assert.equal(rowAt(f,OUTBOX_TYPE,activityHead(b)),undefined);}
  assert.deepEqual((await f.custody().outbox.retainRequest(a)).held,expected);
 }))); 
});

async function concurrent(f,configs,file){
 const release=path.join(f.directory,'release'),runs=configs.map((config,index)=>{
  const ready=path.join(f.directory,'ready-'+index);
  return {ready,...launch(f,'concurrent-'+index,{...config,barrier:{file,ready,release}})};
 });
 try{
  await Promise.all(runs.map(run=>waitFor(run.ready)));
  fs.writeFileSync(release,'release\n');
  return await Promise.all(runs.map(async run=>{const done=await run.done;assert.equal(done.code,0,done.stderr+done.stdout);const result=JSON.parse(done.stdout);assert.equal(result.ok,true);assert.equal(result.barrierUsed,true);return result.value;}));
 }finally{for(const run of runs)if(run.child.exitCode===null&&run.child.signalCode===null)run.child.kill('SIGKILL');}
}

test('two native producers competing at request-head CAS return the same exact first wire',async t=>{
 const f=fixture(t),a=requestWire(AT),b=requestWire(LATER),requestNi=requestIdentity(a);
 const values=await concurrent(f,[{mode:'request',type:OUTBOX_TYPE,wire:a,now:AT},{mode:'request',type:OUTBOX_TYPE,wire:b,now:LATER}],headPath(f,OUTBOX_TYPE,activityPubRequestHead(requestNi))+'.lock');
 assert.deepEqual(values[0].held,values[1].held);assert.equal(values[0].contentNi,values[1].contentNi);
 assert.deepEqual(values.map(value=>value.appended).sort(),[false,true]);
 const fixed=rowAt(f,OUTBOX_TYPE,activityPubRequestHead(requestNi));
 assert.equal(rowAt(f,OUTBOX_TYPE,activityHead(values[0].held)).address,fixed.address);
 assert.deepEqual((await f.custody().outbox.retainRequest(a)).held,values[0].held);
 assert.deepEqual((await f.custody().outbox.retainRequest(b)).held,values[0].held);
});

test('two concurrent copies of one receipt fix one row at receipt-key CAS and duplicates cannot retime it',async t=>{
 const f=fixture(t),wire=reply('one-cas-receipt');
 const values=await concurrent(f,[{wire,now:AT},{wire,now:LATER}],headPath(f,INBOX_TYPE,receiptHead(wire))+'.lock');
 assert.deepEqual(values[0],values[1]);
 const fixed=inboxRow(f,wire);assert.equal(fixed.record.replyOrder,0);assert.ok([AT,LATER].includes(fixed.record.at));
 assert.equal(replyRow(f).address,fixed.address);
 await f.custody('2027-01-01T00:00:00.000Z').inbox.retain(arrival(wire));
 assert.deepEqual(inboxRow(f,wire),fixed);assert.equal(replyRow(f).address,fixed.address);
});

test('different replies racing at correlation-head CAS choose scalar/key maximum without rewriting receipt order',async t=>{
 const f=fixture(t),a=reply('cas-tie-a'),b=reply('cas-tie-b');
 await concurrent(f,[{wire:a,now:AT},{wire:b,now:AT}],headPath(f,INBOX_TYPE,activityPubReplyHead(query()))+'.lock');
 const aRow=inboxRow(f,a),bRow=inboxRow(f,b);
 assert.equal(aRow.record.replyOrder,0);assert.equal(bRow.record.replyOrder,0);
 const expected=aRow.record.key>bRow.record.key?a:b;
 assert.deepEqual(await f.custody().inbox.replyFor(query()),expected);
 await f.custody(LATER).inbox.retain(arrival(a));await f.custody(LATER).inbox.retain(arrival(b));
 assert.deepEqual(inboxRow(f,a),aRow);assert.deepEqual(inboxRow(f,b),bRow);
 assert.deepEqual(await f.custody().inbox.replyFor(query()),expected);
});

for(const corruption of ['missing-record','multifrontier','forged-request'])test('native request reuse refuses '+corruption,async t=>{
 const f=fixture(t),a=requestWire(AT),c=f.custody(),requestNi=requestIdentity(a),name=activityPubRequestHead(requestNi);
 await c.outbox.retainRequest(a);const row=rowAt(f,OUTBOX_TYPE,name);
 if(corruption==='missing-record')writeHead(f.root,OUTBOX_TYPE,name,{frontier:[semanticId('absent-native-request-record')]});
 if(corruption==='multifrontier'){
  const alternative=put(f.root,OUTBOX_TYPE,{...row.record,at:LATER});
  writeHead(f.root,OUTBOX_TYPE,name,{frontier:[row.address,alternative]});
 }
 if(corruption==='forged-request'){
  const foreign=semanticId('forged-request-identity');
  const address=put(f.root,OUTBOX_TYPE,{...row.record,requestNi:foreign});
  writeHead(f.root,OUTBOX_TYPE,activityPubRequestHead(foreign),{frontier:[address]});
  // A caller cannot select a new request identity merely by changing the expected value.
  await assert.rejects(c.outbox.retainRequest(a,{expectedRequestNi:foreign}),/identity differs/);
  writeHead(f.root,OUTBOX_TYPE,name,{frontier:[address]});
 }
 await assert.rejects(c.outbox.retainRequest(a));
});

test('an interrupted immutable-body publication cannot acknowledge an unreadable retained receipt',async t=>{
 const f=fixture(t),wire=reply('interrupted-body-sidecar'),hit=path.join(f.directory,'body-publish-hit');
 const result=await launch(f,'body-publish-crash',{wire,fault:'body-publish',hit}).done;
 assert.equal(result.signal,'SIGKILL',result.stderr+result.stdout);assert.ok(fs.existsSync(hit));
 assert.equal(inboxRow(f,wire),undefined);
 const c=f.custody(),held=await c.inbox.retain(arrival(wire));
 assert.deepEqual((await c.inbox.get(held)).activity,wire,'an acknowledged retained body must be readable');
 assert.deepEqual(await c.inbox.replyFor(query()),wire);
});

test('retain refuses a prior correlation head bound to another valid reply before acknowledgment',async t=>{
 for(const duplicate of [false,true]){
  const f=fixture(t),good=reply('correct original'),foreign=reply('foreign',{requestId:semanticId('foreign request')});
  if(duplicate)await f.custody(AT).inbox.retain(arrival(good));
  await f.custody(LATER).inbox.retain(arrival(foreign));
  const foreignRow=inboxRow(f,foreign),name=activityPubReplyHead(query());
  writeHead(f.root,INBOX_TYPE,name,{frontier:[foreignRow.address]});
  const before=[...each(f.root,INBOX_TYPE)],head=readHead(f.root,INBOX_TYPE,name),keyed=readHead(f.root,INBOX_TYPE,receiptHead(good));
  await assert.rejects(f.custody(AT).inbox.retain(arrival(good)),/correlated reply differs/);
  assert.deepEqual([...each(f.root,INBOX_TYPE)],before);assert.deepEqual(readHead(f.root,INBOX_TYPE,name),head);
  assert.deepEqual(readHead(f.root,INBOX_TYPE,receiptHead(good)),keyed);
 }
});
