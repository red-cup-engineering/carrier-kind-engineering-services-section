#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeCarrier, encodeCarrier, fixtures, normalizeCarrierFamily, refusalFor, validateCarrierEquality, validatePrepareProofBinding, variantKeys } from "./bound-git-induction-wire.js";
import { claimNonce, nonceHistory, transitionNonce } from "./bound-git-induction-store.js";
import { invokeCarrierTask } from "./bound-git-induction-client.js";
import { createProductionContext } from "./bound-git-induction-production.js";

const identity=["gitActor","gitAccount","gitCardId","gitCardSignatureId","gitKid","gitJwks"],coordinator=["coordinatorActor","coordinatorAccount","coordinatorCardId","coordinatorCardSignatureId","coordinatorKid","coordinatorJwks"];
const variants={"prepare-bound-tree":"prepare-profile-operation","synchronize-live-index":"synchronize-profile-operation","publish-declared-ref":"publish-profile-operation","inspect-binding":"inspect-profile-operation","retire-private-index":"retire-profile-operation"};

export function formProfileOperation(publicOperation,coordinatorIdentity,binding={}){
  const p=normalizeCarrierFamily("PublicOperation",publicOperation),kind=variants[p.kind];if(!kind)throw new Error("operation-has-no-profile");
  const c=structuredClone(fixtures[`ProfileOperation/${kind}`]);
  const publicRequestId=semanticId(p),operationId=kind==="retire-profile-operation"?semanticId({type:"BoundGitProfileOperationIdentity",version:1,publicRequestId,kind}):semanticId({publicRequestId,kind});
  Object.assign(c,{kind,operationId,publicRequestId,parentEffectId:p.parentEffectId,repositoryId:p.repositoryId,taskId:p.taskId,sequence:p.sequence,expectedOldHead:p.expectedOldHead??binding.expectedOldHead,declaredRef:p.declaredRef??binding.declaredRef,privateIndexId:p.privateIndexId??semanticId({taskId:p.taskId,sequence:p.sequence,repositoryId:p.repositoryId}),expiresAt:p.expiresAt});
  for(const k of identity)c[k]=p[k];for(const k of coordinator)c[k]=coordinatorIdentity[k];
  if(kind==="prepare-profile-operation")for(const k of ["targetRoot","workOrderId","journalId","artifactId","assayId","originReadoutId","candidatePlateId","commitMetadata","receiverActor","receiverCardId","receiverCardSignatureId","receiverKid","receiverJwks","receiverRootId","evidenceRootId"])c[k]=p[k];
  if(["synchronize-profile-operation","publish-profile-operation"].includes(kind))for(const k of ["preparedReceiptId","intendedTreeId","preparedCommitId"])c[k]=p[k];
  if(kind==="retire-profile-operation")for(const k of ["allocationId","releaseResultBytes","releaseResultJws"])c[k]=binding[k];if(kind==="retire-profile-operation")c.retirementEvidenceId=p.retirementEvidenceId;
  return c;
}

function publicReceipt(p,c,r,extra={}){
  const u=structuredClone(fixtures[`PublicReceipt/${p.kind}`]);
  for(const k of ["taskId","sequence","idempotencyKey","customerActor","customerAccount","customerCardId","customerCardSignatureId","customerKid","customerJwks",...identity,"receiverActor","receiverCardId","receiverCardSignatureId","receiverKid","receiverJwks","offerId","customerGrantId","contractId","parentEffectId","repositoryId","receiverRootId","evidenceRootId","journalId","artifactId","priorResultId"])if(Object.hasOwn(p,k))u[k]=p[k];else delete u[k];
  Object.assign(u,{requestId:semanticId(p),profileOperationId:semanticId(c),profileReceiptId:semanticId(r),deviceReceiptId:r.deviceReceiptId,timestamp:new Date().toISOString()},extra);
  if(p.kind==="prepare-bound-tree")Object.assign(u,{artifactReadGrant:p.artifactReadGrant,manifestId:r.manifestId,candidatePlateId:r.candidatePlateId,candidateSubtreeId:r.candidateSubtreeId,targetProjectionId:r.targetProjectionId,fullTreeId:r.fullTreeId,nonTargetOldHeadProofId:r.nonTargetOldHeadProofId,intendedTreeId:r.intendedTreeId,preparedCommitId:r.preparedCommitId,privateIndexId:r.privateIndexId,allocationId:r.allocationId});
  if(p.kind==="synchronize-live-index")Object.assign(u,{phaseReadGrant:p.phaseReadGrant,phaseResultId:extra.phaseResultId,phase:"working-tree-published",liveIndexTreeId:r.liveIndexTreeId,worktreeProofId:r.worktreeProofId,nonTargetProofId:r.nonTargetProofId});
  if(p.kind==="publish-declared-ref")Object.assign(u,{phaseReadGrant:p.phaseReadGrant,phaseResultId:extra.phaseResultId,phase:"live-index-synchronized",oldRefId:r.oldRefId,newRefId:r.newRefId});
  if(p.kind==="inspect-binding")u.observedStateId=r.observedStateId;
  if(p.kind==="retire-private-index")Object.assign(u,{releaseResultId:extra.releaseResultId,retirementId:r.retirementId});
  try{return normalizeCarrierFamily("PublicReceipt",u)}catch(error){if(error.reason==="exact-key-mismatch"){const expected=variantKeys[`PublicReceipt/${p.kind}`].filter(k=>!(k==="priorResultId"&&u.sequence===0));throw Object.assign(new Error(`exact-key-mismatch missing=${expected.filter(k=>!Object.hasOwn(u,k))} extra=${Object.keys(u).filter(k=>!expected.includes(k))}`),{reason:error.reason})}throw error}
}

export async function executePublicOperation(source,context){
  const p=normalizeCarrierFamily("PublicOperation",source),requestId=semanticId(p);
  const authentication=await context.authenticate(p);await context.verifyGrant(p,requestId);
  const claimed=claimNonce({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce,requestId,request:p,requestBytes:context.publicOperationEvidence?.bytes,requestJws:context.publicOperationEvidence?.jws,requestCardEvidence:authentication});if(claimed.replay&&claimed.record.result) return normalizeCarrierFamily(claimed.record.result.type==="BoundGitInductionRefusal"?"PublicRefusal":"PublicReceipt",claimed.record.result);
  let evidence;
  try{
    let prepareChain;
    if(p.kind==="retire-private-index"){
      prepareChain=await context.loadPrepareChain(p);
      const preparePublic=normalizeCarrierFamily("PublicOperation",prepareChain.publicOperation),prepareProfile=normalizeCarrierFamily("ProfileOperation",prepareChain.profileOperation),preparePublicReceipt=normalizeCarrierFamily("PublicReceipt",prepareChain.publicReceipt),prepareProfileReceipt=normalizeCarrierFamily("ProfileReceipt",prepareChain.profileReceipt);
      if(preparePublic.kind!=="prepare-bound-tree"||prepareProfile.kind!=="prepare-profile-operation"||preparePublicReceipt.kind!=="prepare-bound-tree"||prepareProfileReceipt.kind!=="prepare-profile-operation"||preparePublic.repositoryId!==p.repositoryId||preparePublic.taskId!==p.taskId||preparePublicReceipt.privateIndexId!==p.privateIndexId||prepareProfileReceipt.privateIndexId!==p.privateIndexId||preparePublicReceipt.allocationId!==prepareProfileReceipt.allocationId)throw Object.assign(new Error("binding-mismatch"),{reason:"pre-effect"});
      validateCarrierEquality({publicOperation:preparePublic,profileOperation:prepareProfile,publicReceipt:preparePublicReceipt,profileReceipt:prepareProfileReceipt,descriptorObjectFormat:context.objectFormat});
      const releaseGrant=normalizeCarrierFamily("EvidenceGrant",p.releaseReadGrant);
      const releaseBindings={
        issuerActor:p.receiverActor,
        recipientActor:p.gitActor,
        allocationId:preparePublicReceipt.allocationId,
        privateIndexId:p.privateIndexId,
        journalId:preparePublicReceipt.journalId,
        objectId:p.retirementEvidenceId,
        sha256:p.retirementEvidenceId,
        evidenceRootId:p.evidenceRootId,
        taskId:p.taskId,
      };
      if(Object.entries(releaseBindings).some(([key,value])=>releaseGrant[key]!==value))throw Object.assign(new Error("binding-mismatch"),{reason:"pre-effect"});
      prepareChain={publicOperation:preparePublic,profileOperation:prepareProfile,publicReceipt:preparePublicReceipt,profileReceipt:prepareProfileReceipt};
    }
    const readsEvidence=["prepare-bound-tree","synchronize-live-index","publish-declared-ref","retire-private-index"].includes(p.kind);
    if(readsEvidence){
      if(claimed.replay&&claimed.record.evidenceResultBytes){evidence={request:claimed.record.evidenceRequest,result:decodeCarrier("EvidenceResult",Buffer.from(claimed.record.evidenceResultBytes.data??claimed.record.evidenceResultBytes)),resultBytes:Buffer.from(claimed.record.evidenceResultBytes.data??claimed.record.evidenceResultBytes),resultJws:claimed.record.evidenceResultJws,resultCardEvidence:claimed.record.evidenceResultCardEvidence}}
      else evidence=await context.readEvidence(p);
      validateCarrierEquality({grant:p.artifactReadGrant??p.phaseReadGrant??p.releaseReadGrant,request:evidence.request,result:evidence.result})
    }
    const binding=p.kind==="retire-private-index"?{expectedOldHead:prepareChain.publicOperation.expectedOldHead,declaredRef:prepareChain.publicOperation.declaredRef,allocationId:prepareChain.publicReceipt.allocationId,releaseResultBytes:evidence.resultBytes??encodeCarrier("EvidenceResult",evidence.result),releaseResultJws:evidence.resultJws}:context.binding;
    const c=formProfileOperation(p,context.coordinatorIdentity,binding);if(c.kind==="prepare-profile-operation")c.artifactBytes=evidence.result.bytes;else if(["synchronize-profile-operation","publish-profile-operation"].includes(c.kind))c.phaseBytes=evidence.result.bytes;
    const normalizedProfile=normalizeCarrierFamily("ProfileOperation",c);validateCarrierEquality({publicOperation:p,profileOperation:normalizedProfile,descriptorObjectFormat:context.objectFormat});
    const childOperationId=semanticId(normalizedProfile),priorState=claimed.record;
    const releaseResultId=p.kind==="retire-private-index"?semanticId(evidence.result):undefined;
    if(!(claimed.replay&&["child-requested","observation-interrupted"].includes(priorState.state)))transitionNonce({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce,requestId,state:"child-requested",childOperationId,evidenceRequest:evidence?.request,evidenceResultBytes:evidence?.resultBytes??(evidence?encodeCarrier("EvidenceResult",evidence.result):undefined),evidenceResultJws:evidence?.resultJws,evidenceResultCardEvidence:evidence?.resultCardEvidence,releaseResultId,allocationId:prepareChain?.publicReceipt.allocationId});
    let invocation;
    const childEvents={
      persist:async({taskId,inputNi,profileOperationBytes,profileOperationJws,profileOperationCardEvidence})=>transitionNonce({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce,requestId,state:"child-requested",childOperationId,childTaskId:taskId,inputNi,profileOperationBytes,profileOperationJws,profileOperationCardEvidence}),
      observe:async({state,taskId})=>{if(state==="observation-interrupted")transitionNonce({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce,requestId,state:"observation-interrupted",childOperationId,childTaskId:taskId})}
    };
    if(claimed.replay&&["child-requested","observation-interrupted"].includes(priorState.state)&&priorState.childTaskId&&typeof context.resumeProfile==="function")invocation=await context.resumeProfile(normalizedProfile,{taskId:priorState.childTaskId,inputNi:priorState.inputNi,...childEvents});
    else invocation=await context.invokeProfile(normalizedProfile,childEvents);
    const rawReceipt=invocation?.receipt??invocation,r=normalizeCarrierFamily("ProfileReceipt",rawReceipt);validateCarrierEquality({publicOperation:p,profileOperation:normalizedProfile,profileReceipt:r,descriptorObjectFormat:context.objectFormat});
    const current=nonceHistory({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce}).at(-1);if(current.state!=="child-observed")transitionNonce({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce,requestId,state:"child-observed",childOperationId,profileReceiptBytes:invocation?.receiptBytes,profileReceiptJws:invocation?.receiptJws,profileReceiptCardEvidence:invocation?.receiptCardEvidence,releaseResultId,allocationId:r.allocationId??prepareChain?.publicReceipt.allocationId});
    const prior=["synchronize-live-index","publish-declared-ref"].includes(p.kind)?await context.loadReceipt(p.preparedReceiptId):p.kind==="inspect-binding"?await context.bindingReceipt():undefined;
    const extra=p.kind==="prepare-bound-tree"?{artifactResultId:semanticId(evidence.result)}:["synchronize-live-index","publish-declared-ref"].includes(p.kind)?{phaseResultId:semanticId(evidence.result),artifactId:prior.artifactId}:p.kind==="inspect-binding"?{artifactId:prior.artifactId,journalId:prior.journalId}:p.kind==="retire-private-index"?{artifactId:prepareChain.publicReceipt.artifactId,journalId:prepareChain.publicReceipt.journalId,releaseResultId}:{},u=publicReceipt(p,normalizedProfile,r,extra);
    if(p.kind==="prepare-bound-tree"){
      const proof=invocation?.proof??(typeof context.readPrepareProof==="function"?await context.readPrepareProof(normalizedProfile,r):undefined);if(!proof)throw new Error("prepare-proof-unavailable");
      validatePrepareProofBinding({publicOperation:p,profileOperation:normalizedProfile,profileReceipt:r,publicReceipt:u,artifactRequest:evidence.request,artifactResult:evidence.result,objectFormat:context.objectFormat,...proof})
    }
    transitionNonce({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce,requestId,state:"completed",resultId:semanticId(u),result:u,childOperationId});return u;
  }catch(error){
    const current=nonceHistory({root:context.nonceRoot,customer:p.customerAccount,nonce:p.nonce}).at(-1);
    if(current?.state==="observation-interrupted")throw Object.assign(error,{storedRefusal:typedPublicRefusal(p,"unresolved")});
    return durablePublicRefusal(p,requestId,context,error)
  }
}

function typedPublicRefusal(operation,reason){const refusal=structuredClone(refusalFor({family:"PublicOperation",value:operation,reason}));if(reason==="unresolved")refusal.state="unresolved";return normalizeCarrierFamily("PublicRefusal",refusal)}
function durablePublicRefusal(operation,requestId,context,error){
  const reason=error.reason==="unresolved"||error.message==="unresolved"?"unresolved":"pre-effect",refusal=typedPublicRefusal(operation,reason),prior=nonceHistory({root:context.nonceRoot,customer:operation.customerAccount,nonce:operation.nonce}).at(-1),state=reason==="unresolved"?"unresolved":"refused";
  if(["consumed","child-requested","child-observed"].includes(prior?.state))transitionNonce({root:context.nonceRoot,customer:operation.customerAccount,nonce:operation.nonce,requestId,state,resultId:semanticId(refusal),result:refusal,refusalId:semanticId(refusal),childOperationId:prior.childOperationId});
  return refusal
}

export async function handlePublicCarrier(bytes,context){try{const result=await executePublicOperation(decodeCarrier("PublicOperation",bytes),context),family=result.type==="BoundGitInductionRefusal"?"PublicRefusal":"PublicReceipt";return encodeCarrier(family,result)}catch(error){try{return encodeCarrier("PublicRefusal",error.storedRefusal??typedPublicRefusal(decodeCarrier("PublicOperation",bytes),error.reason==="unresolved"?"unresolved":"pre-effect"))}catch{return encodeCarrier("WireRefusal",refusalFor({}))}}}

export async function handleSignedPublicCarrier(bytes,context){
  const output=await handlePublicCarrier(bytes,context);let operation;try{operation=decodeCarrier("PublicOperation",bytes)}catch{if(typeof context.signResult!=="function")throw new Error("signing-custody-unavailable");return Object.freeze({bytes:output,jws:await context.signResult(output)})}const requestId=semanticId(operation);
  const prior=nonceHistory({root:context.nonceRoot,customer:operation.customerAccount,nonce:operation.nonce}).at(-1);
  if(prior?.publicResultBytes&&prior.publicResultJws){
    const stored=Buffer.from(prior.publicResultBytes.data??prior.publicResultBytes);
    if(!stored.equals(Buffer.from(output)))throw new Error("stored-result-mismatch");
    return Object.freeze({bytes:stored,jws:prior.publicResultJws});
  }
  if(typeof context.signResult!=="function")throw new Error("signing-custody-unavailable");
  const jws=await context.signResult(output);if(!prior)return Object.freeze({bytes:output,jws});let family="PublicReceipt",result;try{result=decodeCarrier(family,output)}catch{family="PublicRefusal";result=decodeCarrier(family,output)}
  const normalized=normalizeCarrierFamily(family,result),state=family==="PublicReceipt"?"completed":normalized.state==="unresolved"?"unresolved":"refused";
  const publicResultCardEvidence=Object.freeze({actor:normalized.gitActor,card:normalized.gitCardId,signature:normalized.gitCardSignatureId,kid:normalized.gitKid,jwks:normalized.gitJwks});
  transitionNonce({root:context.nonceRoot,customer:operation.customerAccount,nonce:operation.nonce,requestId,state,resultId:semanticId(normalized),result:normalized,refusalId:family==="PublicRefusal"?semanticId(normalized):undefined,publicResultBytes:Buffer.from(output),publicResultJws:jws,publicResultCardEvidence});
  return Object.freeze({bytes:output,jws})
}

export async function handleProductionPublicCarrier(bytes,configuration){
  return handleSignedPublicCarrier(bytes,createProductionContext({...configuration,operationBytes:Buffer.from(bytes)}))
}

function option(name){const at=process.argv.indexOf(name);return at<0?undefined:process.argv[at+1]}
if(import.meta.url===`file://${process.argv[1]}`){const operation=readFileSync(option("--operation-file")),grantFile=option("--grant-file"),agent=option("--agent");if(!agent||!grantFile)throw new Error("contracted grant and Agent Card required");const grant=JSON.parse(readFileSync(grantFile,"utf8")),keys=Object.keys(grant??{}).sort().join();if(!grant||!["customerGrantExpiry,customerGrantSignature,operationJws","customerGrantExpiry,customerGrantSignature,evidenceReadGrantJws,operationJws"].includes(keys)||typeof grant.customerGrantSignature!=="string"||!Number.isSafeInteger(grant.customerGrantExpiry)||typeof grant.operationJws!=="object"||(Object.hasOwn(grant,"evidenceReadGrantJws")&&typeof grant.evidenceReadGrantJws!=="object"))throw new Error("contracted grant file is malformed");const result=await invokeCarrierTask({agentUrl:agent,bytes:operation,metadata:{boundGitAuthorization:grant},requireSignature:true});process.stdout.write(Buffer.from(result.result?.parts?.[0]?.content?.value??[]))}
