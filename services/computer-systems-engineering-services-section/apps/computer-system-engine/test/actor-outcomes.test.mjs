import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {schemaFrom} from '@red-cup-engineering/json-schema-services-section/contracts';
import {syncBuiltinESMExports} from 'node:module';
import {fixture,output,sender,issuer} from './actor-outcomes.fixture.mjs';
import {createActorOutcomeCustody,actorOutcomeHead} from '../src/rpc/actor-outcomes.mjs';
import {ARRIVAL_FEED} from '../src/rpc/arrival.mjs';
import {readHead,writeHead,each} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';

const stateResult=(base,change)=>Object.fromEntries(Object.entries({...base,...change}).filter(([key])=>change.state!=='executing'||!['code','stdout','stderr','stdoutBytes','stderrBytes','stdoutSha256','stderrSha256'].includes(key)));

test('genuine native outcome is terminal across late advisory, clock regression and fresh custody',async t=>{
 const f=await fixture(t);assert.equal(f.result.state,'processed',f.result.stderr);assert.equal(f.result.sequence,2);assert.equal(f.effects(),1);
 f.retain(f.wire(f.result));
 const {sequence:_sequence,...advisory}=f.result;
 f.retain(f.wire({...advisory,...output('indeterminate',undefined,'no execution lease')},'2026-10-16T03:00:00Z'));
 f.retain(f.wire(Object.fromEntries(Object.entries(stateResult(f.result,output('executing',1))).filter(([key])=>!['code','stdout','stderr','stdoutBytes','stderrBytes','stdoutSha256','stderrSha256'].includes(key))),'2026-10-14T03:00:00Z'));
 assert.deepEqual(f.read().result,f.result);
 assert.deepEqual(createActorOutcomeCustody(f.root).read({...f.coordinates,original:f.original}).result,f.result);
 assert.equal([...each(f.root,ARRIVAL_FEED)].length,3);assert.equal(f.effects(),1);
});

test('advisory before terminal and exact duplicate do not alter the committed terminal',async t=>{
 const f=await fixture(t),{sequence:_sequence,...advisory}=f.result;
 f.retain(f.wire({...advisory,...output('indeterminate',undefined,'unknown')}));
 assert.equal(f.read().result.sequence,undefined);
 const terminal=f.wire(f.result);f.retain(terminal);f.retain(terminal);
 f.retain(f.wire({...f.result,replayed:true}));
 assert.deepEqual(f.read().result,f.result);
 assert.equal(readHead(f.root,ARRIVAL_FEED,actorOutcomeHead(f.coordinates)).frontier.length,1);
});

test('same sequence or terminal contradictions leave two immutable proofs which no later arrival can heal',async t=>{
 for(const [left,right] of [
  [output('processed',2,'one'),output('processed',2,'two')],
  [output('processed',2,'one'),output('obstructed',1,'denied before effect')],
  [output('executing',1),output('obstructed',1,'denied before effect')],
 ]){
  const f=await fixture(t);f.retain(f.wire(stateResult(f.result,left)));
  assert.throws(()=>f.retain(f.wire(stateResult(f.result,right))),/conflicting immutable/);
  const frontier=readHead(f.root,ARRIVAL_FEED,actorOutcomeHead(f.coordinates)).frontier;assert.equal(frontier.length,2);
  assert.throws(f.read,/conflicting immutable/);
  assert.throws(()=>f.retain(f.wire(f.result)),/conflicting immutable/);
  assert.deepEqual(readHead(f.root,ARRIVAL_FEED,actorOutcomeHead(f.coordinates)).frontier,frontier);
  assert.equal([...each(f.root,ARRIVAL_FEED)].length,3);
  assert.throws(()=>createActorOutcomeCustody(f.root).read({...f.coordinates,original:f.original}),/conflicting immutable/);
 }
});

test('original request, invocation material, principal, hand and audience are revalidated',async t=>{
 for(const patch of [{requestMaterial:semanticId('other')},{packetDigest:'a'.repeat(64)},{cloudEventIdentity:'other#request'},
  {executor:'account:bob'},{hand:'session:bob'},{verb:'another'},{operation:semanticId('other')},{subjectBinding:semanticId('other')}]){
  const f=await fixture(t);f.retain(f.wire(f.result));assert.throws(()=>f.retain(f.wire({...f.result,...patch})),/original request material/);assert.deepEqual(f.read().result,f.result);
 }
 const f=await fixture(t),admission=f.admission(f.wire(f.result));
 assert.throws(()=>f.outcomes.retain({admission,authenticatedActor:issuer,recipient:issuer,request:f.coordinates.request,original:f.original}),/another actor/);
 assert.throws(()=>f.outcomes.retain({admission,authenticatedActor:sender,recipient:sender,request:f.coordinates.request,original:f.original}),/another actor/);
 assert.throws(()=>f.outcomes.retain({admission:{...admission,packetDigest:'wrong'},authenticatedActor:sender,recipient:issuer,request:f.coordinates.request,original:f.original}),/exact signature/);
 f.retain(f.wire(f.result));
 assert.throws(()=>f.outcomes.read({...f.coordinates,request:semanticId('other'),original:f.original}),/original retained request/);
});

test('missing, malformed and forked outcome heads refuse; normal reads never enumerate arrivals',async t=>{
 const f=await fixture(t);f.retain(f.wire(f.result));
 const name=actorOutcomeHead(f.coordinates),head=readHead(f.root,ARRIVAL_FEED,name);
 for(const frontier of [[],[semanticId('missing')],[...head.frontier,semanticId('missing')],[...head.frontier,semanticId('second'),semanticId('third')]]){
  writeHead(f.root,ARRIVAL_FEED,name,{frontier});assert.throws(f.read,/missing|malformed/);
 }
 writeHead(f.root,ARRIVAL_FEED,name,head);
 let opens=0;const old=fs.openSync,oldRead=fs.readdirSync,oldOpenDir=fs.opendirSync;
 fs.openSync=(...args)=>{opens++;return old(...args);};
 fs.readdirSync=fs.opendirSync=()=>assert.fail('observation must not enumerate arrivals');syncBuiltinESMExports();
 try{f.read();assert.ok(opens<=3,'one head and one addressed record read, opens='+opens);}finally{fs.openSync=old;fs.readdirSync=oldRead;fs.opendirSync=oldOpenDir;syncBuiltinESMExports();}
});


test('two processes joining the same prior head converge or retain permanent contradictory proof',async t=>{
 for(const conflict of [false,true]){
  const f=await fixture(t),{sequence:_sequence,...advisory}=f.result;
  f.retain(f.wire({...advisory,...output('indeterminate',undefined,'no lease')}));
  const results=[{...f.result,...output('processed',2,'one')},conflict?{...f.result,...output('processed',2,'two')}:stateResult(f.result,output('executing',1))];
  const children=results.map((result,index)=>{
   const name='join-'+index,file=f.root+'/'+name+'.json';
   fs.writeFileSync(file,JSON.stringify({root:f.root,entry:{admission:f.admission(f.wire(result)),authenticatedActor:sender,recipient:issuer,request:f.coordinates.request,original:f.original}}));
   const child=spawn(process.execPath,[fileURLToPath(new URL('./actor-outcomes.concurrent-child.mjs',import.meta.url)),file,name],{stdio:['ignore','pipe','pipe']});
   t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});let stderr='';child.stderr.on('data',b=>stderr+=b);
   return {name,done:new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(stderr)));})};
  });
  const until=Date.now()+15000;while(!children.every(c=>fs.existsSync(f.root+'/'+c.name+'.ready'))){assert.ok(Date.now()<until,'join readiness');await new Promise(r=>setTimeout(r,10));}
  fs.writeFileSync(f.root+'/join.go','join');await Promise.all(children.map(c=>c.done));
  if(conflict){assert.throws(f.read,/conflicting immutable/);assert.equal(readHead(f.root,ARRIVAL_FEED,actorOutcomeHead(f.coordinates)).frontier.length,2);}
  else{assert.equal(f.read().result.state,'processed');assert.equal(f.read().result.stdout,'one');}
 }
});


test('bound response migration requires exact requestNi and original custody before any head change',async t=>{
 const f=await fixture(t),schema=schemaFrom(JSON.parse(fs.readFileSync(new URL('../specifications/actor-bound-outcome.schema.json',import.meta.url),'utf8')));
 const body={request:f.coordinates.request,requestNi:f.requestNi,result:f.result};schema.assert(body);
 f.retain(f.bodyWire(body));const name=actorOutcomeHead(f.coordinates),head=readHead(f.root,ARRIVAL_FEED,name);
 for(const value of [{request:body.request,result:body.result},{...body,requestNi:semanticId('wrong identity')},{...body,requestNi:'invalid'},{...body,extra:true}]){
  assert.throws(()=>f.retain(f.bodyWire(value)),/identity|exactly|native/);
  assert.deepEqual(readHead(f.root,ARRIVAL_FEED,name),head);assert.deepEqual(f.read().result,f.result);
 }
 assert.throws(()=>schema.assert({request:body.request,result:body.result}));
 const admission=f.admission(f.bodyWire(body));
 assert.throws(()=>f.outcomes.retain({admission,authenticatedActor:sender,recipient:issuer,request:body.request}),/held native request identity/);
 assert.deepEqual(readHead(f.root,ARRIVAL_FEED,name),head);
});


test('malformed obstruction evidence cannot establish or poison an outcome head',async t=>{
 for(const held of [false,true])for(const patch of [{obstructions:undefined},{obstructions:'denied'},{obstructions:[3]},{state:'executing',sequence:1,obstructions:['impossible before execution']}]){
  const f=await fixture(t);if(held)f.retain(f.wire(f.result));
  assert.throws(()=>f.retain(f.wire(Object.fromEntries(Object.entries(stateResult(f.result,patch)).filter(([,value])=>value!==undefined)))),/exact obstruction state/);
  if(held)assert.deepEqual(f.read().result,f.result);
  else assert.equal(readHead(f.root,ARRIVAL_FEED,actorOutcomeHead(f.coordinates)),undefined);
  f.retain(f.wire(f.result));assert.deepEqual(f.read().result,f.result);
 }
});
