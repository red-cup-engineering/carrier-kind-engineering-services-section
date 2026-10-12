import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createActivityPubSqliteCustody} from '../src/sqlite-custody.mjs';
import {userSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {projectSenActivity,senActivityObjectBytes,extractSenActivity} from '../src/sen-activity.mjs';
const frame=(revision='first',time='2026-10-07T00:00:00.000Z',identifier='engineer',recipient='https://receiver.example/actors/developer')=>{
 const objectBytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.arrival-material',value:{kind:'metroplat.dispatch.arrival-material',argv:['aoe-develop-software'],stdin:JSON.stringify({work:'engineering#requirement',revision})}});
 return projectSenActivity({type:'Create',origin:'https://requester.example',identifier,recipient,agentCard:'https://requester.example/actors/'+identifier+'/agent-card.json',eventTime:time,objectBytes,a2aMessage:userSenMessage(objectBytes),a2aRole:'ROLE_USER'});
};
test('actor work retains one observed request across concurrent custody, restart and changed obligations',async()=>{
 const root=mkdtempSync(join(tmpdir(),'actor-request-custody-'));const connections=[];const open=()=>{const db=new DatabaseSync(join(root,'activities.db'));connections.push(db);return createActivityPubSqliteCustody({database:db});};
 try{
  const first=open(),second=open(),original=frame(),later=frame('first','2026-10-08T00:00:00.000Z');
  const held=await Promise.all([first.outbox.retainRequest(original),second.outbox.retainRequest(later)]);
  assert.equal(first.outbox.count(),1);assert.equal(held.filter(r=>r.appended).length,1);
  assert.deepEqual(held[0].held,held[1].held);assert.equal(extractSenActivity(held[0].held,{expectedActor:"https://requester.example/actors/engineer",expectedRecipient:"https://receiver.example/actors/developer"}).cloudEvent.time,'2026-10-07T00:00:00.000Z');
  for(const db of connections)db.close();connections.length=0;
  const restarted=open();assert.deepEqual((await restarted.outbox.retainRequest(later)).held,held[0].held);
  assert.equal((await restarted.outbox.retainRequest(frame('changed'))).appended,true);
  assert.equal((await restarted.outbox.retainRequest(frame('first',undefined,'another'))).appended,true);
  assert.equal((await restarted.outbox.retainRequest(frame('first',undefined,'engineer','https://other.example/actors/developer'))).appended,true);
  assert.equal(restarted.outbox.count(),4);
  const request=extractSenActivity(original,{expectedActor:"https://requester.example/actors/engineer",expectedRecipient:"https://receiver.example/actors/developer"}).envelopeNi,reply=projectSenActivity({type:'Create',origin:'https://receiver.example',identifier:'developer',recipient:'https://requester.example/actors/engineer',agentCard:'https://receiver.example/actors/developer/agent-card.json',eventTime:'2026-10-08T01:00:00.000Z',objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,result:{code:0,stdout:'accepted'}}})});
  await restarted.inbox.retain({recipient:'engineer',jsonLd:reply});
  assert.deepEqual(await restarted.inbox.replyFor({identifier:'engineer',request,sender:'https://receiver.example/actors/developer'}),reply);
  assert.equal(await restarted.inbox.replyFor({identifier:'another',request,sender:'https://receiver.example/actors/developer'}),null);
  assert.equal(await restarted.inbox.replyFor({identifier:'engineer',request,sender:'https://other.example/actors/developer'}),null);
  const accept=projectSenActivity({type:'Accept',origin:'https://receiver.example',identifier:'developer',recipient:'https://requester.example/actors/engineer',agentCard:'https://receiver.example/actors/developer/agent-card.json',eventTime:'2026-10-08T02:00:00.000Z',objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,result:{code:0,stdout:'accepted'}}})});
  const compactReply={...accept,actor:{id:accept.actor,type:'Service'}};
  await restarted.inbox.retain({recipient:'engineer',jsonLd:compactReply});
  assert.deepEqual(await restarted.inbox.replyFor({identifier:'engineer',request,sender:'https://receiver.example/actors/developer'}),compactReply);
  // The previous index existed but missed Fedify's expanded actor. Recover it on reopening.
  connections[0].exec('UPDATE activitypub_verified_arrivals SET reply_request=NULL,reply_sender=NULL');
  const recovered=open();assert.deepEqual(await recovered.inbox.replyFor({identifier:'engineer',request,sender:'https://receiver.example/actors/developer'}),compactReply);
  // Simulate a pre-upgrade carrier containing actual held events and a reply.
  // Schema upgrade must backfill lookup without rewriting their bytes or receipts.
  const legacy=connections[0];
  const receipt=legacy.prepare('SELECT receipt_json FROM activitypub_verified_arrivals').get().receipt_json;
  legacy.exec('DROP INDEX activitypub_verified_arrivals_reply; ALTER TABLE activitypub_verified_arrivals DROP COLUMN reply_request; ALTER TABLE activitypub_verified_arrivals DROP COLUMN reply_sender; DROP INDEX activitypub_outgoing_activities_request; ALTER TABLE activitypub_outgoing_activities DROP COLUMN request_ni');
  for(const db of connections)db.close();connections.length=0;
  const migrated=open();assert.equal(migrated.outbox.count(),4);
  assert.equal(connections[0].prepare('SELECT receipt_json FROM activitypub_verified_arrivals').get().receipt_json,receipt);
  assert.deepEqual(await migrated.inbox.replyFor({identifier:'engineer',request,sender:'https://receiver.example/actors/developer'}),compactReply);
 }finally{for(const db of connections)db.close();rmSync(root,{recursive:true,force:true});}
});

