import {extractSenActivity,projectSenActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {userSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {admitNormalizedSemanticContent} from '@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime';
import {termToJson} from '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec';
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
  async send({identifier,address,text,admit,requestKey,taskId,paymentPayload,reuse=false}){
   await admitSender(identifier);
   const {deliverActivity,resolveActivityPubRecipient}=await import('@red-cup-engineering/activitypub-services-section');
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
   if(taskId!==undefined&&(typeof taskId!=='string'||!taskId))throw new TypeError('actor work taskId must be nonempty text');
   if(paymentPayload!==undefined && (kind!=='metroplat.dispatch.arrival-material'||typeof taskId!=='string'||!taskId))throw new TypeError('a signed payment needs its original actor operation and taskId');
   if(paymentPayload!==undefined)requireJsonValue(paymentPayload,'actor signed payment');
   if(requestKey!==undefined&&(typeof requestKey!=='string'||!requestKey||Buffer.byteLength(requestKey)>4096))throw new TypeError('actor request reuse needs a bounded request key');
   const recipient=await resolveActivityPubRecipient(provider,address);
   await admit?.();
   await admitSender(identifier);
   const bytes=senActivityObjectBytes({objectKind:kind,value});
   const activity=projectSenActivity({type:'Create',origin:publicOrigin,identifier,recipient:recipient.actorId,
    objectBytes:bytes,a2aMessage:{...userSenMessage(bytes),...(taskId===undefined?{}:{taskId}),
      ...((paymentPayload===undefined&&requestKey===undefined)?{}:{metadata:{...(requestKey===undefined?{}:{'feltos.request.key':requestKey}),...(paymentPayload===undefined?{}:{'x402.payment.status':'payment-submitted','x402.payment.payload':paymentPayload})}})},a2aRole:'ROLE_USER',
    agentCard:new URL('/actors/'+encodeURIComponent(identifier)+'/agent-card.json',publicOrigin).href,eventTime:new Date().toISOString()});
   if(reuse && typeof provider.retainRequest !== 'function')throw new TypeError('reusable actor work requires durable request custody');
   if(reuse && typeof inbox?.replyFor !== 'function')throw new TypeError('reusable actor work requires correlated reply custody');
   const sent=reuse?(await provider.retainRequest(activity)).held:activity;
   const requestId=readActorMessage(sent,new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href,recipient.actorId).id;
   const reply=reuse?await inbox.replyFor({identifier,request:requestId,sender:recipient.actorId}):null;
   await admit?.();await admitSender(identifier);
   if(reply){
    const outcome=readActorMessage(reply,recipient.actorId,new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href);
    if(outcome.kind==='metroplat.dispatch.result' && outcome.value.request===requestId && outcome.value.result?.code===0)
     return {id:sent.id,request:requestId,recipient:recipient.actorId,result:outcome.value.result};
   }
   await deliverActivity(provider,{identifier,recipient:recipient.actorId,inbox:recipient.inboxId,activity:sent});
   return {id:sent.id,request:readActorMessage(sent,new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href,recipient.actorId).id,recipient:recipient.actorId};
  },
  async result({identifier,submission,includeReceipt=false}){
   if(typeof includeReceipt!=='boolean')throw new TypeError('includeReceipt must be a boolean');
   await admitSender(identifier);
   parseNiUri({uri:submission.request});
   if(typeof submission.recipient!=='string'||!/^https?:\/\//u.test(submission.recipient))throw new TypeError('actor result needs its exact HTTP(S) responder');
   if(typeof inbox?.replyFor!=='function')throw new TypeError('actor results need correlated private custody');
   const recipient=new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href;
   const reply=await inbox.replyFor({identifier,request:submission.request,sender:submission.recipient});
   await admitSender(identifier);
   if(!reply)return undefined;
   const outcome=readActorMessage(reply,submission.recipient,recipient);
   if(outcome.kind!=='metroplat.dispatch.result'||outcome.value.request!==submission.request)
    throw new TypeError('actor result does not match its addressed request');
   // Enterprise request loops consume the established processing-result shape.
   // A receiving client may also need the original admitted reply envelope's
   // content address. Retain that address, not a new hash of decoded stdout;
   // the private native inbox continues to hold the original native wire bytes.
   return includeReceipt?Object.freeze({request:submission.request,recipient:submission.recipient,
    reply:outcome.id,result:outcome.value.result}):outcome.value.result;
  },
  async read({identifier,cursor}){
   await admitSender(identifier);
   if(!inbox||typeof inbox.list!=='function')throw new TypeError('actor client needs its native private inbox');
   const page=await inbox.list({identifier,cursor,limit:20});
   await admitSender(identifier);
   const recipient=new URL('/actors/'+encodeURIComponent(identifier),publicOrigin).href;
   return {...page,items:page.items.map(activity=>{
    const sender=typeof activity.actor==='string'?activity.actor:activity.actor?.id;
    try{const entry=readActorMessage(activity,sender,recipient);return {id:entry.id,sender,agentCard:entry.projection.agentCard,kind:entry.kind,value:entry.value,taskId:entry.projection.a2aMessage.taskId,metadata:entry.projection.a2aMessage.metadata,text:actorMessageText(entry).slice(0,4096)};}
    catch{return {id:activity.id,sender,kind:activity.type,value:activity,text:`Activity ${activity.type}${activity.summary?': '+activity.summary:''}`};}
   })};
  },
 });
}
