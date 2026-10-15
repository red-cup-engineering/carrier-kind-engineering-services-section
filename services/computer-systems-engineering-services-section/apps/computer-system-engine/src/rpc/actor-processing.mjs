import {resolve} from 'node:path';
import {extractSenActivity,projectSenActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {agentSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {sha256Hex} from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import {processLeaseCoordinator} from './coordination.mjs';
import {ARRIVAL_PROCESS_FEED,arrivalDispatchClaimFromCloudEvent,admitCloudEventArrival} from './arrival.mjs';
import {extend,readHead,threadName,walk} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {createOperationCatalog} from './operation.mjs';
import {dispatchWire} from './wire-dispatch.mjs';
import {journalRpcWitness} from './journal-witness.mjs';
export function processingEntryValue(
  entry,
  state,
  obstructions,
  result,
) {
  const stdout = result?.stdout ?? "";
  const stderr = result?.stderr ?? "";
  return Object.freeze({
    // Frozen legacy wire discriminant; this value is a processing record.
    kind: "metroplat.arrival.processing-witness",
    ...(entry.cloudEventIdentity === undefined ? {} : { cloudEventIdentity: entry.cloudEventIdentity }),
    ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
    state,
    ...(entry.requester===undefined?{}:{requester:entry.requester}),
    ...(entry.executor===undefined?{}:{executor:entry.executor}),
    ...(entry.service===undefined?{}:{service:entry.service}),
    ...(entry.subjectBinding===undefined?{}:{subjectBinding:entry.subjectBinding,hand:entry.hand}),
    ...(entry.dispatchEvent?.verb === undefined ? {} : { verb: entry.dispatchEvent.verb }),
    ...(result === undefined ? {} : {
      code: result.code,
      stdout,
      stdoutBytes: Buffer.byteLength(stdout, "utf8"),
      stdoutSha256: sha256Hex(stdout),
      stderr,
      stderrBytes: Buffer.byteLength(stderr, "utf8"),
      stderrSha256: sha256Hex(stderr),
    }),
    obstructions,
  });
}

/** The record a processing transition is: its value, and the time it was written. */
export function arrivalProcessingRecord(value, at) {
  return Object.freeze({ ...value, at });
}

export function processingEntryFromValue(value) {
  const obstructionsValue = value["obstructions"];
  const obstructions = Array.isArray(obstructionsValue)
    ? obstructionsValue.filter((item) => typeof item === "string")
    : [];
  const state = value["state"];
  return Object.freeze({
    kind: "metroplat.arrival.processing-entry",
    ...(typeof value["cloudEventIdentity"] === "string" ? { cloudEventIdentity: value["cloudEventIdentity"] } : {}),
    ...(typeof value["packetDigest"] === "string" ? { packetDigest: value["packetDigest"] } : {}),
    state: ["processed", "skipped", "obstructed", "executing", "indeterminate", "payment-required", "payment-pending", "payment-settled"].includes(state) ? state : "obstructed",
    ...(Number.isSafeInteger(value.sequence)&&value.sequence>0 ? {sequence:value.sequence} : {}),
    ...(typeof value.taskId === "string" ? {taskId:value.taskId} : {}),
    ...(typeof value.requestMaterial === "string" ? {requestMaterial:value.requestMaterial} : {}),
    ...(typeof value.operation === "string" ? {operation:value.operation} : {}),
    ...(value.payment === undefined ? {} : {payment:value.payment}),
    ...(typeof value["verb"] === "string" ? { verb: value["verb"] } : {}),
    ...(typeof value["code"] === "number" ? { code: value["code"] } : {}),
    ...(typeof value.stdout === "string" ? { stdout:value.stdout } : {}),
    ...(typeof value.stderr === "string" ? { stderr:value.stderr } : {}),
    ...(typeof value["stdoutBytes"] === "number" ? { stdoutBytes: value["stdoutBytes"] } : {}),
    ...(typeof value["stdoutSha256"] === "string" ? { stdoutSha256: value["stdoutSha256"] } : {}),
    ...(typeof value["stderrBytes"] === "number" ? { stderrBytes: value["stderrBytes"] } : {}),
    ...(typeof value["stderrSha256"] === "string" ? { stderrSha256: value["stderrSha256"] } : {}),
    ...(typeof value.requester==='string'?{requester:value.requester}:{}),
    ...(typeof value.executor==='string'?{executor:value.executor}:{}),
    ...(value.service===undefined?{}:{service:value.service}),
    ...(typeof value.subjectBinding==='string'?{subjectBinding:value.subjectBinding,hand:value.hand}:{}),
    obstructions: Object.freeze(obstructions),
  });
}

/** The thread of one request: named by the address of the request's identity. */
export function requestProcessingThread(eventIdentity){
 return threadName(semanticId({kind:"actor-request",eventIdentity}));
}
/** The most transitions one request's thread is read through. */
const TRANSITION_LIMIT=512;
/** Read one task from its thread of transitions. */
export function actorRequestProcessing(root,eventIdentity,{strict=false,bound}={}) {
 strict ||= bound!==undefined;
 const head=readHead(root,ARRIVAL_PROCESS_FEED,requestProcessingThread(eventIdentity));
 if(head===undefined)return undefined;
 if(strict&&(head.closed===true||head.frontier.length!==1))throw new TypeError('actor request state requires one open exact frontier');
 let found, expectedSequence, authority, transitions=0;
 const address=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
 const bindingFields=v=>({subjectBinding:v.subjectBinding,packetDigest:v.packetDigest,requestMaterial:v.requestMaterial,
  requester:v.requester,executor:v.executor,hand:v.hand,...(Object.hasOwn(v,'service')?{service:v.service}:{})});
 if(strict&&(typeof head.frontier[0]!=='string'||!address.test(head.frontier[0])))throw new TypeError('actor request state needs one native transition address');
 for(const step of walk(root,ARRIVAL_PROCESS_FEED,head.frontier,{limit:TRANSITION_LIMIT})){
  if(step.truncated===true)throw new TypeError("actor task outcome requires a bounded continuation");
  if(step.record===undefined){if(strict)throw new TypeError('actor request state names missing custody; outcome is indeterminate');continue;}
  const v=step.record;
  if(strict&&v.cloudEventIdentity!==eventIdentity)throw new TypeError('actor request state belongs to another request');
  if(strict){
   // Bound unpaid requests have one exact native chain, never a permissive
   // historical projection or a maximum sequence chosen from competing paths.
   if(v.kind!=='metroplat.arrival.processing-witness'||!['executing','processed','obstructed'].includes(v.state)
    ||!Number.isSafeInteger(v.sequence)||v.sequence<1||v.sequence>2
    ||typeof v.subjectBinding!=='string'||!address.test(v.subjectBinding)
    ||typeof v.requestMaterial!=='string'||!address.test(v.requestMaterial)
    ||typeof v.packetDigest!=='string'||!v.packetDigest
    ||typeof v.requester!=='string'||!v.requester||typeof v.executor!=='string'||!v.executor
    ||typeof v.hand!=='string'||!v.hand||!Array.isArray(v.obstructions)||v.obstructions.some(reason=>typeof reason!=='string')
    ||!Array.isArray(v.causes)||v.causes.length!==v.sequence-1||v.causes.some(cause=>typeof cause!=='string'||!address.test(cause))
    ||(v.sequence===1&&v.state==='processed')||(v.state==='executing'&&v.sequence!==1)
    ||(expectedSequence!==undefined&&(v.sequence!==expectedSequence||v.state!=='executing')))
    throw new TypeError('actor request state lacks exact bound transition custody');
   if(v.state==='executing'){
    if(['code','stdout','stderr','stdoutBytes','stderrBytes','stdoutSha256','stderrSha256'].some(key=>Object.hasOwn(v,key))||v.obstructions.length!==0)
     throw new TypeError('actor request state has a terminal result before execution');
   }else if(!Number.isSafeInteger(v.code)||v.code<0||(v.state==='processed')!==(v.code===0)
    ||typeof v.stdout!=='string'||typeof v.stderr!=='string'
    ||v.stdoutBytes!==Buffer.byteLength(v.stdout,'utf8')||v.stderrBytes!==Buffer.byteLength(v.stderr,'utf8')
    ||v.stdoutSha256!==sha256Hex(v.stdout)||v.stderrSha256!==sha256Hex(v.stderr))
    throw new TypeError('actor request state lacks its exact terminal result');
   const selected=canonicalJson(bindingFields(v));
   if(authority!==undefined&&authority!==selected)throw new TypeError('actor request state changes its admitted principal, hand or service');
   authority=selected;expectedSequence=v.sequence-1;transitions++;
   if(bound!==undefined&&(v.subjectBinding!==bound.subjectBinding||v.packetDigest!==bound.packetDigest||v.requestMaterial!==bound.requestMaterial))
    throw new TypeError('actor request cannot substitute its admitted subject binding or exact call');
  }
  if(v.cloudEventIdentity===eventIdentity){
   const current=processingEntryFromValue(v);
   // Unbound historical and payment requests retain their established reader.
   if(current.sequence!==undefined){
    if(found?.sequence===current.sequence&&canonicalJson(found)!==canonicalJson(current))throw new TypeError('actor task store has conflicting transition evidence');
    if(found?.sequence===undefined||current.sequence>found.sequence)found=current;
   }else if(found?.sequence===undefined&&(found===undefined||current.state==='processed'))found=current;
  }
 }
 if(strict&&(transitions<1||expectedSequence!==0))throw new TypeError('actor request state has an incomplete transition chain');
 return found;
}

/** Native A2A metadata carries protocol objects, never local acceptance claims. */
export function actorPaymentMetadata(result) {
 if(result.payment===undefined)return {};
 const p=result.payment;
 return {"x402.payment.status":p.status,
  ...(p.required===undefined?{}:{"x402.payment.required":p.required}),
  ...(p.receipts===undefined?{}:{"x402.payment.receipts":p.receipts}),
  ...(p.error===undefined?{}:{"x402.payment.error":p.error})};
}

/** A signature-admitted request uses governed dispatch. An owner-supplied native
 * payment port admits execution only after authority and input type admission.
 * Task/payment state is kept in the existing addressed processing journal. */
const projectingRequests = new Set();
export async function processAdmittedActorRequest(options){
 const {event,admission,authenticatedActor,binding,projectReply}=options;
 if(projectReply===undefined)return processActorRequest(options);
 const receipt=admitCloudEventArrival(event);
 if(receipt.ok!==true||admission?.cloudEventIdentity!==receipt.cloudEventIdentity||event.source!==authenticatedActor)
  throw new TypeError("actor execution needs the exact signature-admitted arrival");
 const key=JSON.stringify([resolve(binding.dataRoot),receipt.cloudEventIdentity]);
 if(projectingRequests.has(key))throw new TypeError("actor request is already being processed on this host");
 projectingRequests.add(key);
 try{return await processActorRequest(options);}finally{projectingRequests.delete(key);}
}
async function processActorRequest({event,admission,authenticatedActor,operations,binding,authorize,program="infograph",recipient,payment,execution,projectReply,senderAgentCard}){
 const receipt=admitCloudEventArrival(event);
 if(receipt.ok!==true||admission?.cloudEventIdentity!==receipt.cloudEventIdentity||event.source!==authenticatedActor)
  throw new TypeError("actor execution needs the exact signature-admitted arrival");
 const claim=arrivalDispatchClaimFromCloudEvent(event);
 if(!claim||claim.claimedSubject!==undefined&&claim.claimedSubject!==authenticatedActor)throw new TypeError("actor request cannot substitute a principal");
 const message=event.data?.message,metadata=message?.metadata??{};
 const payload=metadata["x402.payment.payload"];
 const submittedTask=message?.taskId||undefined;
 let sourceIdentity=receipt.cloudEventIdentity,sourceTime=event.time;
 const paymentContinuation=payload!==undefined||metadata["x402.payment.status"]==="payment-submitted";
 if(submittedTask!==undefined&&paymentContinuation){
  const split=submittedTask.indexOf('|');
  sourceTime=submittedTask.slice(0,split);sourceIdentity=submittedTask.slice(split+1);
  if(split<0||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(sourceTime)||
    sourceIdentity.length===0||sourceIdentity.length>4096||!Number.isFinite(Date.parse(sourceTime)))throw new TypeError("actor payment needs its original taskId");
 }
 const taskId=sourceTime+'|'+sourceIdentity;
 const requestMaterial=semanticId({claim,authenticatedActor,recipient:recipient??null,program});
 const subjectBinding=metadata['metroplat.subject-binding'];
 const readProcessing=()=>actorRequestProcessing(binding.dataRoot,sourceIdentity,subjectBinding===undefined?{}:{bound:{subjectBinding:subjectBinding?.id,packetDigest:receipt.packetDigest,requestMaterial}});
 let held=readProcessing();
 if(subjectBinding!==undefined&&(subjectBinding===null||typeof subjectBinding!=='object'||Array.isArray(subjectBinding)))throw new TypeError('actor subject binding must be an owner statement');
 if(held?.subjectBinding!==undefined){
  if(subjectBinding?.id!==held.subjectBinding||held.packetDigest!==receipt.packetDigest||held.requestMaterial!==requestMaterial)throw new TypeError('actor request cannot substitute its admitted subject binding or exact call');
  // An interrupted world act is observed, not automatically executed again.
  return Object.freeze({...held,replayed:true});
 }
 if(submittedTask!==undefined&&paymentContinuation&&(!held||held.taskId!==taskId||held.requestMaterial!==requestMaterial))throw new TypeError("actor task cannot substitute actor, recipient, input or operation");
 if(held?.payment && held.state!=="payment-required")return Object.freeze({...held,replayed:true});
 if(held?.state==='processed')return Object.freeze({...held,replayed:true});
 if(payload!==undefined&&(submittedTask===undefined||metadata["x402.payment.status"]!=="payment-submitted"))throw new TypeError("signed payment needs the original task and payment-submitted metadata");
 if((payload!==undefined||held?.payment)&&payment===undefined)throw new TypeError("the owner no longer offers this payment admission");
 const receiver=execution===undefined?{subject:authenticatedActor,authorize}:await execution({claim,requester:authenticatedActor,recipient,subjectBinding});
 if(typeof receiver.subject!=="string"||typeof receiver.authorize!=="function")throw new TypeError("actor service execution needs the receiver's admitted principal and authorization");
 if(subjectBinding!==undefined&&(typeof subjectBinding.id!=='string'||receiver.subjectBinding!==subjectBinding.id||receiver.once!==true
   ||typeof receiver.hand!=='string'||!receiver.hand||receiver.hand.length>4096||projectReply===undefined||payment!==undefined))
  throw new TypeError('actor subject binding requires exact owner recognition, hand and once-only native result custody');
 if(subjectBinding===undefined&&(receiver.subjectBinding!==undefined||receiver.hand!==undefined||receiver.once===true))throw new TypeError('actor receiver cannot invent a subject-binding statement');
 let currentPayment=held?.payment;
 let operationRef=held?.operation;
 let racedTask,startedHere=false;
 const sameBoundRequest=latest=>{
  if(latest!==undefined&&subjectBinding!==undefined&&(latest.subjectBinding!==subjectBinding.id||latest.packetDigest!==receipt.packetDigest||latest.requestMaterial!==requestMaterial))
   throw new TypeError('actor request cannot substitute its admitted subject binding or exact call');
  return latest;
 };
 const entry={cloudEventIdentity:sourceIdentity,packetDigest:receipt.packetDigest,dispatchEvent:{verb:claim.argv[0]},requester:authenticatedActor,executor:receiver.subject,...(receiver.service===undefined?{}:{service:receiver.service}),...(receiver.subjectBinding===undefined?{}:{subjectBinding:receiver.subjectBinding,hand:receiver.hand})};
 const prepare=(state,result,obstructions=[],privateFields={})=>{
  const previous=readProcessing();
  const sequence=(previous?.sequence??0)+1;
  if(!Number.isSafeInteger(sequence))throw new TypeError('actor task needs a bounded transition continuation');
  const value={...processingEntryValue(entry,state,obstructions,result),sequence,
   ...(receiver.once===true?{requestMaterial}:{}),
   ...(payment===undefined&&currentPayment===undefined?{}:{taskId,requestMaterial,
    ...(operationRef===undefined?{}:{operation:operationRef}),...(currentPayment===undefined?{}:{payment:currentPayment})}),...privateFields};
  return value;
 };
 let preparedResult;
 const projectResult=projectReply===undefined?undefined:result=>{
  const proposed=processingEntryFromValue(prepare("processed",result));
  if(preparedResult!==undefined){
   if(canonicalJson(proposed)!==canonicalJson(preparedResult))throw new TypeError("actor processing metadata changed after response preflight");
   return;
  }
  const projected=projectReply(proposed);
  if(projected?.then!==undefined||canonicalJson(projected)!==canonicalJson(proposed))throw new TypeError("actor reply projector must preserve the exact synchronous processing result");
  if(canonicalJson(processingEntryFromValue(prepare("processed",result)))!==canonicalJson(proposed))throw new TypeError("actor processing metadata changed during response preflight");
  preparedResult=projected;
 };
 const append=(state,result,obstructions=[],privateFields={})=>{
  const value=prepare(state,result,obstructions,privateFields);
  if(state==="processed"&&preparedResult!==undefined&&canonicalJson(processingEntryFromValue(value))!==canonicalJson(preparedResult))throw new TypeError("actor processing metadata changed after response preflight");
  const at=binding.now();
  extend(binding.dataRoot,ARRIVAL_PROCESS_FEED,requestProcessingThread(sourceIdentity),arrivalProcessingRecord(value,at));
  return state==="processed"&&preparedResult!==undefined?preparedResult:processingEntryFromValue(value);
 };
 const beforePaymentExecute=payment===undefined?undefined:async (invocation,operation)=>{
  // The money effect is coordinated even when the useful compute is pure.
  const lease=processLeaseCoordinator(binding.dataRoot)(invocation,operation,binding.now());
  if(!lease.ok)throw new TypeError(lease.reasons.join('; '));
  const latest=readProcessing();
  if(latest?.payment&&latest.state!=="payment-required"){racedTask=latest;throw new TypeError("actor payment attempt is already held; no repayment retry");}
  held=latest??held;
  if(held?.operation!==undefined&&held.operation!==operation.ref)throw new TypeError("the quoted operation revision was replaced");
  operationRef=operation.ref;
  if(!held?.payment){
   const quote=await payment.quote({taskId,invocation,operation});
   if(!quote?.required||quote.required.x402Version!==2||quote.required.accepts?.length!==1||quote.offer===undefined)throw new TypeError("owner payment admission needs one native x402 v2 quote");
   // Recheck after asynchronous quote formation; another arrival may have claimed it.
   const concurrent=readProcessing();
   if(concurrent?.payment){racedTask=concurrent;throw new TypeError("actor task quote is already held");}
   currentPayment={status:"payment-required",required:quote.required,offer:quote.offer,
    expiresAt:new Date(Date.parse(binding.now())+quote.required.accepts[0].maxTimeoutSeconds*1000).toISOString(),receipts:[]};
   append("payment-required",undefined,[]);
  }else currentPayment=held.payment;
  if(payload===undefined)throw new TypeError("native x402 payment is required");
  if(Date.parse(binding.now())>Date.parse(currentPayment.expiresAt))throw new TypeError("the owner quote expired; no payment attempted");
  const requirements=currentPayment.required.accepts[0];
  if(payload.x402Version!==2||canonicalJson(payload.accepted)!==canonicalJson(requirements))throw new TypeError("signed payment does not match the exact held quote");
  currentPayment={...currentPayment,status:"payment-submitted"};
  append("payment-pending",undefined,[],{signedPayment:payload});
  let verified;
  try{verified=await payment.verify(payload,requirements);}catch(error){
   currentPayment={...currentPayment,status:"payment-failed",error:"verification-unobserved"};
   throw error;
  }
  currentPayment={...currentPayment,verification:verified};
  if(verified.isValid!==true||verified.skipHandler===true){
   currentPayment={...currentPayment,status:"payment-failed",error:verified.invalidReason??"verification-refused"};
   throw new TypeError(currentPayment.error);
  }
  currentPayment={...currentPayment,status:"payment-verified",verification:verified,settlementOutcome:"pending"};
  append("payment-pending",undefined,[],{signedPayment:payload});
  let settlement;
  try{settlement=await payment.settle(payload,requirements);}catch(error){
   currentPayment={...currentPayment,settlementOutcome:"unknown",error:"settlement-unobserved"};
   throw error;
  }
  const matches=settlement.success===true&&settlement.network===requirements.network&&/^0x[0-9a-fA-F]{64}$/u.test(settlement.transaction??'')&&
   (settlement.asset===undefined||settlement.asset.toLowerCase()===requirements.asset.toLowerCase())&&
   (settlement.amount===undefined||settlement.amount===requirements.amount)&&
   (settlement.payTo===undefined||settlement.payTo.toLowerCase()===requirements.payTo.toLowerCase())&&
   (settlement.payer===undefined||payload.payload?.authorization?.from===undefined||settlement.payer.toLowerCase()===payload.payload.authorization.from.toLowerCase());
  currentPayment={...currentPayment,receipts:[...currentPayment.receipts,settlement],
   status:matches?"payment-completed":"payment-failed",settlementMatchesRequirements:matches,
   settlementOutcome:"reported",independentlyVerifiedTransfer:false,requesterAccepted:null};
  // Retain the reported charge before executing; a refused result cannot erase it.
  append("payment-settled",undefined,[]);
  if(!matches)throw new TypeError(settlement.errorReason??"settlement report does not match the held requirements");
 };
 const beforeExecute=receiver.once!==true?beforePaymentExecute:async(invocation,operation)=>{
  const lease=processLeaseCoordinator(binding.dataRoot)(invocation,operation,binding.now());
  if(!lease.ok){racedTask=sameBoundRequest(readProcessing());throw new TypeError(lease.reasons.join('; '));}
  const latest=sameBoundRequest(readProcessing());
  if(latest?.subjectBinding!==undefined){racedTask=latest;throw new TypeError('actor request already started; observe its original result');}
  // This is the existing addressed request state, before its first effect.
  append('executing',undefined,[]);startedHere=true;
 };
 const catalog=createOperationCatalog(operations);
 const result=await dispatchWire(catalog,claim.argv,claim.stdin,{
  operation:claim.operation,subject:receiver.subject,request:sourceIdentity,program,now:binding.now,
  caller:{transport:"activitypub",requester:authenticatedActor,...(receiver.hand===undefined?{}:{hand:receiver.hand}),...(receiver.service===undefined?{}:{service:receiver.service}),...(senderAgentCard===undefined?{}:{agentCard:senderAgentCard}),...(recipient===undefined?{}:{recipient}),cloudEventIdentity:receipt.cloudEventIdentity,subjectBindingEvidence:[admission.cloudEventIdentity,...(receiver.subjectBinding===undefined?[]:[receiver.subjectBinding])]},
  coordinate:processLeaseCoordinator(binding.dataRoot),witness:journalRpcWitness(binding.dataRoot),beforeExecute,projectResult,
 },receiver.authorize);
 // A competing process may hold the lease before its first started append.
 // The loser never authors an obstructed/terminal transition over that act.
 if(receiver.once===true&&!startedHere){
  racedTask=sameBoundRequest(readProcessing())??racedTask;
  if(racedTask===undefined){
   // An actual dispatcher refusal before execution is a known outcome. Claim
   // the same process lease and reread before making it terminal, so a losing
   // process can never overwrite a concurrently started request.
   const refusal=result.receipt;
   const preEffect=result.preExecutionRefusal!==undefined||refusal?.ok===false&&['admission','input','resolution','authorization'].includes(refusal.phase);
   // This lease protects the native request head even when no RPC invocation
   // or operation was admitted. Do not invent a resolved operation for denial.
   const lease=preEffect?processLeaseCoordinator(binding.dataRoot)({id:sourceIdentity},{ref:refusal?.operation},binding.now()):undefined;
   if(lease?.ok===true){
    racedTask=sameBoundRequest(readProcessing());
    if(racedTask===undefined)return append('obstructed',result,[result.stderr.trim()]);
   }else {
    const {sequence:_prospective,...advisory}=processingEntryFromValue(prepare('indeterminate',{
     code:75,stdout:'',stderr:'request did not acquire execution custody; no terminal outcome is held; observe the original request, do not repeat the act'}));
    return Object.freeze(advisory);
   }
  }
 }
 if(racedTask!==undefined)return Object.freeze({...racedTask,...(racedTask.subjectBinding===undefined&&racedTask.state==='executing'?{state:'indeterminate',code:75,stdout:'',stderr:'actor request started; terminal result is not held; do not retry the act'}:{}),replayed:true});
 const state=currentPayment?.status==='payment-required'?"payment-required":result.code===0?"processed":"obstructed";
 try{return append(state,result,result.code===0?[]:[result.stderr.trim()]);}
 catch(error){
  if(state!=="processed"||preparedResult===undefined)throw error;
  const reason="preflighted actor processing result could not be committed: "+error.message;
  return append("obstructed",{code:1,stdout:"",stderr:reason},[reason]);
 }
}

/** One admitted request's existing native RPC reply. No send or authority occurs here.
 * The returned result snapshot is the key for the exact preflighted wire, so the
 * host cannot quietly re-encode it with a later time or changed metadata. */
export function createActorResultProjection({origin,identifier,recipient,request,requestNi,agentCard,eventTime}) {
 if(requestNi!==undefined&&!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(requestNi))throw new TypeError('bound result requires its exact native request identity');
 const replies=new WeakMap();
 const freeze=value=>{
  if(value!==null&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
 };
 return Object.freeze({
  project(result){
   if(result?.subjectBinding!==undefined&&requestNi===undefined)throw new TypeError('bound result requires its original retained request identity');
   const held=freeze(JSON.parse(canonicalJson(result)));
   const bytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,...(requestNi===undefined?{}:{requestNi}),result:held}});
   const activity=projectSenActivity({type:'Accept',origin,identifier,recipient,objectBytes:bytes,
    a2aMessage:{...agentSenMessage(bytes),...(held.taskId===undefined?{}:{taskId:held.taskId}),metadata:actorPaymentMetadata(held)},agentCard,eventTime});
   extractSenActivity(activity,{expectedActor:new URL('/actors/'+encodeURIComponent(identifier),origin).href,
    expectedRecipient:recipient,expectedAgentCard:agentCard});
   replies.set(held,activity);
   return held;
  },
  activity(result){
   const activity=replies.get(result);
   if(activity===undefined)throw new TypeError('actor result has no exact preflighted native reply');
   return activity;
  },
 });
}

