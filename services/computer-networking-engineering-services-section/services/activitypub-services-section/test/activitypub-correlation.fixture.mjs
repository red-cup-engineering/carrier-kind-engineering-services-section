import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {semanticAddress,semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {projectSenActivity,senActivityObjectBytes,extractSenActivity} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {createActivityPubJournalCustody,INBOX_TYPE,OUTBOX_TYPE,activityPubReplyHead,activityPubRequestHead} from '@red-cup-engineering/activitypub-services-section/journal-custody';
import {get,readHead,threadName} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {headFile} from '@red-cup-engineering/semiotic-eavt-services-section/layout';
export const AT='2026-10-14T20:00:00.000Z',LATER='2026-10-14T20:01:00.000Z';
export const sender='https://executor.example/actors/world',recipient='https://gateway.example/actors/world';
export const request=semanticId({kind:'runtime-correlation-fixture',request:1});
export const query=(requestId=request)=>({identifier:'world',request:requestId,sender});
export function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'activitypub-correlation-runtime-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const stateDirectory=path.join(directory,'actors');
 return {directory,stateDirectory,root:path.join(stateDirectory,'journal'),custody:now=>createActivityPubJournalCustody({stateDirectory,now:()=>now??AT})};
}
export function reply(label,{requestId=request,eventTime=AT}={}){
 return projectSenActivity({type:'Accept',origin:'https://executor.example',identifier:'world',recipient,
  objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request:requestId,result:{state:'processed',code:0,stdout:label,stderr:''}}}),
  agentCard:sender+'/agent-card.json',eventTime});
}
export const arrival=wire=>({recipient:'world',jsonLd:wire});
export function receipt(wire){
 const receipt={type:'ActivityPubVerifiedArrivalReceipt',version:1,bodySha256:createHash('sha256').update(canonicalJson(wire)).digest('hex'),recipient:'world'};
 return {receipt,key:createHash('sha256').update(canonicalJson(receipt)).digest('hex')};
}
export const receiptHead=wire=>threadName(semanticAddress({type:INBOX_TYPE,name:receipt(wire).key}).id);
export const activityHead=wire=>threadName(semanticAddress({type:OUTBOX_TYPE,name:wire.id}).id);
export const rowAt=(f,type,name)=>{const head=readHead(f.root,type,name);return head===undefined?undefined:{address:head.frontier[0],record:get(f.root,type,head.frontier[0]),head};};
export const inboxRow=(f,wire)=>rowAt(f,INBOX_TYPE,receiptHead(wire));
export const replyRow=(f,requestId=request)=>rowAt(f,INBOX_TYPE,activityPubReplyHead(query(requestId)));
export const headPath=(f,type,name)=>headFile(f.root,type,name);
export function requestWire(eventTime=AT){
 return projectSenActivity({type:'Create',origin:'https://gateway.example',identifier:'world',recipient:sender,objectBytes:senActivityObjectBytes({objectKind:'fixture-native-work-request',value:{question:'One logical request, several real transmission wires'}}),agentCard:recipient+'/agent-card.json',eventTime});
}
export function requestIdentity(wire){
 const projection=extractSenActivity(wire,{expectedActor:recipient,expectedRecipient:sender});
 const {messageId,...message}=projection.a2aMessage;
 return semanticAddress({actor:recipient,recipient:sender,type:wire.type,objectNi:projection.objectNi,agentCard:projection.agentCard,message}).id;
}
export {INBOX_TYPE,OUTBOX_TYPE,activityPubReplyHead,activityPubRequestHead};
