import assert from 'node:assert/strict';
import test from 'node:test';
import {createActorClient,readActorMessage} from '../src/rpc/actor-client.mjs';
import {projectSenActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {agentSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';

const origin='https://caller.example',identifier='c',recipient=origin+'/actors/'+identifier;
const providerOrigin='https://provider.example',responder=providerOrigin+'/actors/p';
const request='ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const otherRequest='ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBI';
const submission={request,recipient:responder};
function reply(result,{requestId=request,actorOrigin=providerOrigin,actorIdentifier='p',addressed=recipient}={}){
 const bytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request:requestId,result}});
 return projectSenActivity({type:'Accept',origin:actorOrigin,identifier:actorIdentifier,recipient:addressed,
  objectBytes:bytes,a2aMessage:agentSenMessage(bytes),agentCard:actorOrigin+'/card',eventTime:'2026-10-13T00:00:00Z'});
}
function fixture(activity,{admitSender=()=>{}}={}){
 const queries=[];
 const client=createActorClient({provider:{},origin,admitSender,inbox:{
  async replyFor(query){queries.push(query);return activity;},
  async list(){assert.fail('one correlated receipt must not scan the inbox');},
 }});
 return {client,queries};
}

test('reply reading returns one complete original addressed receipt',async()=>{
 const result={code:0,state:'processed',stdout:JSON.stringify({opaque:'x'.repeat(7000)})+'\n',stderr:'',obstructions:[]};
 const activity=reply(result),before=JSON.stringify(activity),{client,queries}=fixture(activity);
 const receipt=await client.result({identifier,submission});
 assert.equal(receipt.request,request);assert.equal(receipt.recipient,responder);
 assert.equal(receipt.reply,readActorMessage(activity,responder,recipient).id);
 assert.deepEqual(receipt.result,result);assert.equal(receipt.result.stdout.length,result.stdout.length);
 assert.equal(Object.isFrozen(receipt),true);
 assert.equal(JSON.stringify(activity),before,'the native activity presentation is neither re-addressed nor mutated');
 assert.deepEqual(queries,[{identifier,request,sender:responder}]);
});

test('an absent reply stays absent and an admitted failed result remains explicit evidence',async()=>{
 const absent=fixture(null);
 assert.equal(await absent.client.result({identifier,submission}),undefined);
 const failed={code:1,state:'obstructed',stdout:'',stderr:'qualified refusal',obstructions:['qualified refusal']};
 const received=await fixture(reply(failed)).client.result({identifier,submission});
 assert.deepEqual(received.result,failed);
 assert.equal(received.result.code,1);
});

test('receipt lookup refuses a wrong request, responder or addressed recipient instead of accepting foreign evidence',async()=>{
 const result={code:0,state:'processed',stdout:'{}\n',stderr:''};
 for(const activity of [
  reply(result,{requestId:otherRequest}),
  reply(result,{actorOrigin:'https://foreign.example'}),
  reply(result,{addressed:'https://foreign.example/actors/c'}),
 ])await assert.rejects(fixture(activity).client.result({identifier,submission}),TypeError);
});

test('current sender admission precedes private lookup and is checked again before exposing the receipt',async()=>{
 let admissions=0;
 const activity=reply({code:0,state:'processed',stdout:'{}\n',stderr:''});
 const owned=fixture(activity,{admitSender:current=>{
  assert.equal(current,identifier);admissions++;
  if(admissions===2)throw new TypeError('caller actor was withdrawn');
 }});
 await assert.rejects(owned.client.result({identifier,submission}),/withdrawn/u);
 assert.equal(owned.queries.length,1);assert.equal(admissions,2);
 const invalid=fixture(activity);
 await assert.rejects(invalid.client.result({identifier,submission:{...submission,request:'invalid'}}),TypeError);
 assert.equal(invalid.queries.length,0);
});
