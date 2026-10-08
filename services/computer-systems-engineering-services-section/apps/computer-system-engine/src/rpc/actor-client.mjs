import {deliverActivity,resolveActivityPubRecipient} from '@red-cup-engineering/activitypub-services-section';
import {extractSenActivity,projectSenActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {userSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {admitNormalizedSemanticContent} from '@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime';
import {termToJson} from '@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec';
import {requireJsonValue} from '@red-cup-engineering/json-services-section';
import {parseNiUri} from '@red-cup-engineering/uri-services-section/ni-uri';

export function readActorMessage(activity,actor,recipient){
 const projection=extractSenActivity({...activity,actor},{expectedActor:actor,expectedRecipient:recipient});
 const semantic=admitNormalizedSemanticContent(projection.objectBytes,projection.objectNi);
 return {projection,id:projection.envelopeNi,kind:semantic.envelope.objectKind,value:termToJson(semantic.envelope.settledBody)};
}
export const actorMessageText=entry=>entry.kind==='feltos.actor.message'?entry.value.text:
 entry.kind==='metroplat.dispatch.result'?JSON.stringify(entry.value.result):JSON.stringify(entry.value);

/** The native signed transport and inbox carrier serve human and organizational actors alike.
 * The host supplies current sender admission; neither a method address nor a UI grants a key. */
export function createActorClient({provider,inbox,origin,admitSender}){
 if(!provider||typeof admitSender!=='function')throw new TypeError('actor client needs a provider and current sender admission');
 const publicOrigin=new URL(origin).origin;
 return Object.freeze({
  async send({identifier,address,text,admit,taskId,paymentPayload}){
   await admitSender(identifier);
   if(typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>16384)throw new TypeError('message must be nonempty and at most 16384 bytes');
   let kind='feltos.actor.message',value={text};
   if(text.trimStart().startsWith('{')){
    const request=JSON.parse(text);
    if(!request||Array.isArray(request)||Object.keys(request).some(key=>!['verb','operation','input','taskId','paymentPayload'].includes(key))
     ||typeof request.verb!=='string'||!/^[a-z][a-z0-9-]*$/u.test(request.verb)||!Object.hasOwn(request,'input'))throw new TypeError('an operation request is {verb,operation?,input,taskId?,paymentPayload?}');
    requireJsonValue(request.input,'actor operation input');
    if(request.taskId!==undefined){if(taskId!==undefined&&taskId!==request.taskId)throw new TypeError('conflicting actor taskId');taskId=request.taskId;}
    if(request.paymentPayload!==undefined){if(paymentPayload!==undefined)throw new TypeError('supply the signed payment once');paymentPayload=request.paymentPayload;}
    if(request.operation!==undefined)parseNiUri({uri:request.operation});
    kind='metroplat.dispatch.arrival-material';value={kind,argv:[request.verb],stdin:JSON.stringify(request.input),...(request.operation===undefined?{}:{operation:request.operation})};
   }
   if(paymentPayload!==undefined && (kind!=='metroplat.dispatch.arrival-material'||typeof taskId!=='string'||!taskId))throw new TypeError('a signed payment needs its original actor operation and taskId');
   if(paymentPayload!==undefined)requireJsonValue(paymentPayload,'actor signed payment');
   const recipient=await resolveActivityPubRecipient(provider,address);
   await admit?.();
   await admitSender(identifier);
   const bytes=senActivityObjectBytes({objectKind:kind,value});
   const activity=projectSenActivity({type:'Create',origin:publicOrigin,identifier,recipient:recipient.recipient,
    objectBytes:bytes,a2aMessage:{...userSenMessage(bytes),...(taskId===undefined?{}:{taskId}),
      ...(paymentPayload===undefined?{}:{metadata:{'x402.payment.status':'payment-submitted','x402.payment.payload':paymentPayload}})},a2aRole:'ROLE_USER',
    agentCard:new URL('/actors/'+encodeURIComponent(identifier)+'/agent-card.json',publicOrigin).href,eventTime:new Date().toISOString()});
   await deliverActivity(provider,{identifier,recipient:recipient.recipient,inbox:recipient.inbox,activity});
   return {id:activity.id,request:readActorMessage(activity,new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href,recipient.recipient).id,recipient:recipient.recipient};
  },
  async read({identifier,cursor}){
   await admitSender(identifier);
   if(!inbox||typeof inbox.list!=='function')throw new TypeError('actor client needs its native private inbox');
   const page=await inbox.list({identifier,cursor,limit:20});
   await admitSender(identifier);
   const recipient=new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href;
   return {...page,items:page.items.map(activity=>{
    const sender=typeof activity.actor==='string'?activity.actor:activity.actor?.id;
    try{const entry=readActorMessage(activity,sender,recipient);return {id:entry.id,sender,kind:entry.kind,value:entry.value,taskId:entry.projection.a2aMessage.taskId,metadata:entry.projection.a2aMessage.metadata,text:actorMessageText(entry).slice(0,4096)};}
    catch{return {id:activity.id,sender,kind:activity.type,value:activity,text:`Activity ${activity.type}${activity.summary?': '+activity.summary:''}`};}
   })};
  },
 });
}
