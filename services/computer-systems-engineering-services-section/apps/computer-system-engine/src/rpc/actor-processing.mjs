import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {sha256Hex} from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import {processLeaseCoordinator} from './coordination.mjs';
import {ARRIVAL_PROCESS_FEED,ARRIVAL_PROCESS_TERM,arrivalDispatchClaimFromCloudEvent,admitCloudEventArrival} from './arrival.mjs';
import {openJournal,journal} from '../journal/journal.mjs';
import {createOperationCatalog} from './operation.mjs';
import {dispatchWire} from './wire-dispatch.mjs';
import {journalRpcWitness} from './journal-witness.mjs';
import {eavtRecord,toEavt} from '@red-cup-engineering/eavt-services-section/row';
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

export function arrivalProcessingRows(entries, at) {
  return Object.freeze(entries.map(({ entry, value }) => toEavt({
    e: Object.freeze({
      kind: "metroplat.arrival.processing",
      cloudEventIdentity: entry.cloudEventIdentity,
      packetDigest: entry.packetDigest,
    }),
    a: ARRIVAL_PROCESS_TERM,
    v: value,
    t: at,
  })));
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
    state: ["processed", "skipped", "obstructed", "payment-required", "payment-pending", "payment-settled"].includes(state) ? state : "obstructed",
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
    obstructions: Object.freeze(obstructions),
  });
}

function requestProcessingPath(root,eventIdentity,eventTime){
 return journal.feed(root,ARRIVAL_PROCESS_FEED,eventTime,{subject:semanticId({kind:"actor-request",eventIdentity})});
}
/** Read one task from its original addressed journal partition. */
export function actorRequestProcessing(root,eventIdentity,eventTime) {
 const source=requestProcessingPath(root,eventIdentity,eventTime);
 if(journal.sourceStatus(source).bytes>512*1024)throw new TypeError("actor task outcome requires a bounded continuation");
 let found;
 journal.scan(source,undefined,(_accum,row)=>{
  const {a,v}=eavtRecord(row);
  if(canonicalJson(a)===canonicalJson(ARRIVAL_PROCESS_TERM)&&v.cloudEventIdentity===eventIdentity){
   const current=processingEntryFromValue(v);
   // Content-addressed journal files are not traversal-ordered state. A task's
   // synchronous transitions carry their own order; legacy successful work stays held.
   if(current.sequence!==undefined){
    if(found?.sequence===current.sequence&&canonicalJson(found)!==canonicalJson(current))throw new TypeError('actor task journal has conflicting transition evidence');
    if(found?.sequence===undefined||current.sequence>found.sequence)found=current;
   }else if(found?.sequence===undefined&&(found===undefined||current.state==='processed'))found=current;
  }
  return undefined;
 });
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
export async function processAdmittedActorRequest({event,admission,authenticatedActor,operations,binding,authorize,program="infograph",recipient,payment}){
 const receipt=admitCloudEventArrival(event);
 if(receipt.ok!==true||admission?.cloudEventIdentity!==receipt.cloudEventIdentity||event.source!==authenticatedActor)
  throw new TypeError("actor execution needs the exact signature-admitted arrival");
 const claim=arrivalDispatchClaimFromCloudEvent(event);
 if(!claim||claim.claimedSubject!==undefined&&claim.claimedSubject!==authenticatedActor)throw new TypeError("actor request cannot substitute a principal");
 const message=event.data?.message,metadata=message?.metadata??{};
 const payload=metadata["x402.payment.payload"];
 const submittedTask=message?.taskId||undefined;
 let sourceIdentity=receipt.cloudEventIdentity,sourceTime=event.time;
 if(submittedTask!==undefined){
  const split=submittedTask.indexOf('|');
  sourceTime=submittedTask.slice(0,split);sourceIdentity=submittedTask.slice(split+1);
  if(split<0||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(sourceTime)||
    sourceIdentity.length===0||sourceIdentity.length>4096||!Number.isFinite(Date.parse(sourceTime)))throw new TypeError("actor payment needs its original taskId");
 }
 const taskId=sourceTime+'|'+sourceIdentity;
 const requestMaterial=semanticId({claim,authenticatedActor,recipient:recipient??null,program});
 let held=actorRequestProcessing(binding.dataRoot,sourceIdentity,sourceTime);
 if(submittedTask!==undefined&&(!held||held.taskId!==taskId||held.requestMaterial!==requestMaterial))throw new TypeError("actor task cannot substitute actor, recipient, input or operation");
 if(held?.payment && held.state!=="payment-required")return Object.freeze({...held,replayed:true});
 if(held?.state==='processed')return Object.freeze({...held,replayed:true});
 if(payload!==undefined&&(submittedTask===undefined||metadata["x402.payment.status"]!=="payment-submitted"))throw new TypeError("signed payment needs the original task and payment-submitted metadata");
 if((payload!==undefined||held?.payment)&&payment===undefined)throw new TypeError("the owner no longer offers this payment admission");
 let currentPayment=held?.payment;
 let operationRef=held?.operation;
 let racedTask;
 const entry={cloudEventIdentity:sourceIdentity,packetDigest:receipt.packetDigest,dispatchEvent:{verb:claim.argv[0]}};
 const append=(state,result,obstructions=[],privateFields={})=>{
  const previous=actorRequestProcessing(binding.dataRoot,sourceIdentity,sourceTime);
  const sequence=(previous?.sequence??0)+1;
  if(!Number.isSafeInteger(sequence))throw new TypeError('actor task needs a bounded transition continuation');
  const value={...processingEntryValue(entry,state,obstructions,result),sequence,
   ...(payment===undefined&&currentPayment===undefined?{}:{taskId,requestMaterial,
    ...(operationRef===undefined?{}:{operation:operationRef}),...(currentPayment===undefined?{}:{payment:currentPayment})}),...privateFields};
  const at=binding.now();
  openJournal(binding.dataRoot).appendRows(ARRIVAL_PROCESS_FEED,arrivalProcessingRows([{entry,value}],at),{
   ...binding,at:sourceTime,subject:semanticId({kind:"actor-request",eventIdentity:sourceIdentity}),
   caller:{transport:"actor-inbox",cloudEventIdentity:receipt.cloudEventIdentity},
  });
  return processingEntryFromValue(value);
 };
 const beforeExecute=payment===undefined?undefined:async (invocation,operation)=>{
  // The money effect is coordinated even when the useful compute is pure.
  const lease=processLeaseCoordinator(binding.dataRoot)(invocation,operation,binding.now());
  if(!lease.ok)throw new TypeError(lease.reasons.join('; '));
  const latest=actorRequestProcessing(binding.dataRoot,sourceIdentity,sourceTime);
  if(latest?.payment&&latest.state!=="payment-required"){racedTask=latest;throw new TypeError("actor payment attempt is already held; no repayment retry");}
  held=latest??held;
  if(held?.operation!==undefined&&held.operation!==operation.ref)throw new TypeError("the quoted operation revision was replaced");
  operationRef=operation.ref;
  if(!held?.payment){
   const quote=await payment.quote({taskId,invocation,operation});
   if(!quote?.required||quote.required.x402Version!==2||quote.required.accepts?.length!==1||quote.offer===undefined)throw new TypeError("owner payment admission needs one native x402 v2 quote");
   // Recheck after asynchronous quote formation; another arrival may have claimed it.
   const concurrent=actorRequestProcessing(binding.dataRoot,sourceIdentity,sourceTime);
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
 const catalog=createOperationCatalog(operations);
 const result=await dispatchWire(catalog,claim.argv,claim.stdin,{
  operation:claim.operation,subject:authenticatedActor,request:sourceIdentity,program,now:binding.now,
  caller:{transport:"activitypub",...(recipient===undefined?{}:{recipient}),cloudEventIdentity:receipt.cloudEventIdentity,subjectBindingEvidence:[admission.cloudEventIdentity]},
  coordinate:processLeaseCoordinator(binding.dataRoot),witness:journalRpcWitness(binding.dataRoot),beforeExecute,
 },authorize);
 if(racedTask!==undefined)return Object.freeze({...racedTask,replayed:true});
 return append(currentPayment?.status==='payment-required'?"payment-required":result.code===0?"processed":"obstructed",result,
  result.code===0?[]:[result.stderr.trim()]);
}
