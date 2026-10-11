import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {operation,createOperationCatalog} from '../src/rpc/operation.mjs';
import {dispatchWire} from '../src/rpc/wire-dispatch.mjs';
import {authorizationFromStanding} from '../src/rpc/dispatch.mjs';
import {journalRpcWitness} from '../src/rpc/journal-witness.mjs';
import {createActorResultProjection} from '../src/rpc/actor-processing.mjs';
import {readActorMessage} from '../src/rpc/actor-client.mjs';
import {extractSenActivity,projectSenActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {agentSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
const at='2026-10-11T00:00:00Z',origin='https://provider.example',actor=origin+'/actors/p',recipient='https://peer.example/actors/c',agentCard=origin+'/card';
const request='ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'native-result-projection-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 return {root,projector:createActorResultProjection({origin,identifier:'p',recipient,agentCard,request,eventTime:at})};
}
async function invoke(t,run,{format='json',projectResult}={}){
 const f=fixture(t);const op=operation({verb:'fixture-native-result',run});
 const result=await dispatchWire(createOperationCatalog([op]),[op.verb,'--output-format='+format],'{}',{
  subject:recipient,now:()=>at,witness:journalRpcWitness(f.root),projectResult},authorizationFromStanding(new Map([[op.ref,'held']])));
 return result;
}
test('full native reply admission retains exact immutable wire with unchanged ordinary bytes',t=>{
 const f=fixture(t);const result={code:0,stdout:'{"ok":true}\n',stderr:'',state:'processed',obstructions:[]};
 const held=f.projector.project(result),wire=f.projector.activity(held);
 const bytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,result}});
 const admitted=extractSenActivity(wire,{expectedActor:actor,expectedRecipient:recipient,expectedAgentCard:agentCard});
 // The owner's A2A constructor chooses a fresh messageId; compare the old
 // representation with that same actual message, rather than inventing determinism.
 const old=projectSenActivity({type:'Accept',origin,identifier:'p',recipient,objectBytes:bytes,a2aMessage:admitted.a2aMessage,agentCard,eventTime:at});
 assert.deepEqual(wire,old);assert.equal(f.projector.activity(held),wire);assert.throws(()=>{held.code=1;},TypeError);
 assert.throws(()=>f.projector.activity({...held}),/no exact preflighted/);
 const received=readActorMessage(wire,actor,recipient);assert.equal(received.value.request,request);assert.deepEqual(received.value.result,result);
 assert.throws(()=>readActorMessage(wire,actor,'https://foreign.example/actors/c'),/exact addressed/);
});
test('the genuine provider freezes every wire node and preserves exact bytes after mutation attempts',t=>{
 const f=fixture(t),result={code:0,stdout:'{"ok":true}\n',stderr:'',state:'processed',obstructions:[]};
 const held=f.projector.project(result),wire=f.projector.activity(held),before=JSON.stringify(wire);
 const admitted=extractSenActivity(wire,{expectedActor:actor,expectedRecipient:recipient,expectedAgentCard:agentCard});
 function check(value,path='activity'){
  if(value===null||typeof value!=='object')return;
  assert.equal(Object.isFrozen(value),true,path);
  assert.throws(()=>{value.extra='altered';},TypeError,path+' extra property');
  for(const [key,child] of Object.entries(value)){
   assert.throws(()=>{value[key]='altered';},TypeError,path+'.'+key);
   assert.throws(()=>{delete value[key];},TypeError,path+'.'+key+' deletion');
   check(child,path+'.'+key);
  }
 }
 check(wire);
 assert.equal(f.projector.activity(held),wire);
 assert.equal(JSON.stringify(f.projector.activity(held)),before);
 const after=extractSenActivity(f.projector.activity(held),{expectedActor:actor,expectedRecipient:recipient,expectedAgentCard:agentCard});
 assert.equal(after.envelopeNi,admitted.envelopeNi);
 assert.deepEqual(readActorMessage(wire,actor,recipient).value.result,result);
});
test('the complete outer envelope is refused, rather than just checking inner bytes',t=>{
 const f=fixture(t);assert.throws(()=>f.projector.project({code:0,stdout:'x'.repeat(200000),stderr:'',state:'processed',obstructions:[]}),/oversized/);
});
test('selected output codec is the exact preflighted output before handler effects',async t=>{
 for(const format of ['json','string']){
  const seen=[];let effects=0;
  const result=await invoke(t,(_input,_args,context)=>{const value=context.projectResult({ok:true});assert.equal(seen.length,1);effects++;return value;},{format,projectResult:value=>seen.push(value)});
  assert.equal(result.code,0,result.stderr);assert.equal(effects,1);assert.equal(seen.length,2);
  assert.equal(result.stdout,seen[0].stdout);assert.equal(result.stdout,'{"ok":true}'+(format==='json'?'\n':''));
 }
});
test('host preflight refusal and unsupported output codec prevent handler completion',async t=>{
 for(const options of [{projectResult:()=>{throw new Error('fixture refused full reply');}},{projectResult:async()=>{}},{format:'eavt',projectResult:()=>assert.fail('bad codec reached host')}]){
  let effects=0;const result=await invoke(t,(_i,_a,context)=>{const held=context.projectResult({ok:true});effects++;return held;},options);
  assert.equal(result.code,1);assert.equal(effects,0);
 }
});
test('changing projected output obstructs before successful outcome witnessing',async t=>{
 const result=await invoke(t,(_i,_a,context)=>{context.projectResult({ok:true});return {ok:false};},{projectResult:()=>{}});
 assert.equal(result.code,1);assert.match(result.stderr,/changed its preflighted result/);
});
test('ordinary handlers retain output with or without the optional process port',async t=>{
 for(const projectResult of [undefined,()=>assert.fail('ordinary operation requested no projection')]){
  const result=await invoke(t,()=>({ordinary:true}),{projectResult});assert.equal(result.code,0,result.stderr);assert.equal(result.stdout,'{"ordinary":true}\n');
 }
});
test('empty valid values remain valid but undefined is refused before host projection',async t=>{
 for(const value of [{},[],'',null]){
  const result=await invoke(t,(_i,_a,context)=>context.projectResult(value),{projectResult:()=>{}});assert.equal(result.code,0,result.stderr);
 }
 const result=await invoke(t,(_i,_a,context)=>context.projectResult(undefined),{projectResult:()=>assert.fail('undefined reached host')});assert.equal(result.code,1);
});
