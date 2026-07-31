import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, fsyncSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { normalizeAuthenticatedCardEvidence } from "./bound-git-induction-card-evidence.js";

function filename(root,customer,nonce){const account=createHash("sha256").update(customer).digest("base64url"),key=createHash("sha256").update(`${customer}\0${nonce}`).digest("base64url");return join(root,account,`${key}.jsonl`)}
function history(path){try{return readFileSync(path,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse)}catch(error){if(error.code==="ENOENT")return[];throw error}}
function append(path,value,flags="a") {const parent=dirname(path);mkdirSync(parent,{recursive:true,mode:0o700});const fd=openSync(path,flags,0o600);try{writeFileSync(fd,`${JSON.stringify(value)}\n`,"utf8");fsyncSync(fd)}finally{closeSync(fd)}const directory=openSync(parent,"r");try{fsyncSync(directory)}finally{closeSync(directory)}}

export function claimNonce({root,customer,nonce,requestId,request,requestBytes,requestJws,requestCardEvidence}){
  const path=filename(root,customer,nonce),prior=history(path).at(-1);if(prior){if(prior.requestId!==requestId)throw new Error("grant-replay");return Object.freeze({replay:true,record:prior})}
  const record={version:1,customer,nonce,requestId,state:"consumed",priorTransitionId:semanticId({customer,nonce,state:"unconsumed"})};for(const [key,value] of Object.entries({request,requestBytes,requestJws,requestCardEvidence}))if(value!==undefined)record[key]=key==="requestCardEvidence"?normalizeAuthenticatedCardEvidence(value):value;record.transitionId=semanticId(record);
  try{append(path,record,"wx")}catch(error){if(error.code!=="EEXIST")throw error;return claimNonce({root,customer,nonce,requestId,request,requestBytes,requestJws,requestCardEvidence})}return Object.freeze({replay:false,record:Object.freeze(record)})
}

export function transitionNonce({root,customer,nonce,requestId,state,resultId,result,refusalId,childOperationId,childTaskId,inputNi,profileOperationBytes,profileOperationJws,profileOperationCardEvidence,profileReceiptBytes,profileReceiptJws,profileReceiptCardEvidence,evidenceRequest,evidenceResultBytes,evidenceResultJws,evidenceResultCardEvidence,releaseResultId,allocationId,publicResultBytes,publicResultJws,publicResultCardEvidence}){
  const path=filename(root,customer,nonce),prior=history(path).at(-1);if(!prior||prior.requestId!==requestId)throw new Error("grant-replay");
  const edges={consumed:["child-requested","completed","refused"],"child-requested":["child-requested","child-observed","observation-interrupted","unresolved","refused"],"observation-interrupted":["observation-interrupted","child-observed","unresolved"],"child-observed":["completed","refused","unresolved"],completed:["completed"],refused:["refused"],unresolved:["unresolved"]};if(!edges[prior.state]?.includes(state))throw new Error("invalid-transition");
  const next={...prior,state,priorTransitionId:prior.transitionId};delete next.transitionId;for(const [key,value] of Object.entries({resultId,result,refusalId,childOperationId,childTaskId,inputNi,profileOperationBytes,profileOperationJws,profileOperationCardEvidence,profileReceiptBytes,profileReceiptJws,profileReceiptCardEvidence,evidenceRequest,evidenceResultBytes,evidenceResultJws,evidenceResultCardEvidence,releaseResultId,allocationId,publicResultBytes,publicResultJws,publicResultCardEvidence}))if(value!==undefined)next[key]=["profileReceiptCardEvidence","evidenceResultCardEvidence"].includes(key)?normalizeAuthenticatedCardEvidence(value):value;next.transitionId=semanticId(next);append(path,next);return Object.freeze(next)
}

export function nonceHistory({root,customer,nonce}){return Object.freeze(history(filename(root,customer,nonce)).map(Object.freeze))}
