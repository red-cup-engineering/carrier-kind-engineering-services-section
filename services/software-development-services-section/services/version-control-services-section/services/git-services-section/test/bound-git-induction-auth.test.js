import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, exportPKCS8, FlattenedSign, flattenedVerify } from "jose";
import { createAgentCardSigningConfiguration, agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeCarrier, encodeCarrier, fixtures } from "../src/bound-git-induction-wire.js";
import { signCarrier, verifyActorCarrier, verifyCustomerGrant } from "../src/bound-git-induction-auth.js";
import { createProductionContext, decodeProfileOutcome, profileRefusalError } from "../src/bound-git-induction-production.js";

test("frozen card route and exact carrier JWS verify",async()=>{
  const {privateKey,publicKey}=await generateKeyPair("EdDSA",{extractable:true}),publicJwk=await exportJWK(publicKey),baseUrl="https://customer.example.invalid",kid="fixture-key",configuration=createAgentCardSigningConfiguration({baseUrl,kid,privateKey,publicJwk});
  const card={name:"customer",description:"fixture",version:"1",protocolVersion:"1.0",preferredTransport:"JSONRPC",url:`${baseUrl}/a2a`,supportedInterfaces:[{url:`${baseUrl}/a2a`,protocolBinding:"JSONRPC",protocolVersion:"1.0"}],capabilities:{streaming:false,pushNotifications:false,stateTransitionHistory:false,extensions:[]},defaultInputModes:["application/rmn+cbor"],defaultOutputModes:["application/rmn+cbor"],skills:[]};
  const signed=await configuration.agentCardSignatureGenerator(card),evidence=agentCardSignatureEvidence(signed),operation=structuredClone(fixtures["PublicOperation/inspect-binding"]);Object.assign(operation,{customerActor:"urn:ame:customer",customerCardId:evidence.card,customerCardSignatureId:evidence.signature,customerKid:evidence.kid,customerJwks:evidence.jwks});const bytes=encodeCarrier("PublicOperation",operation),jws=await new FlattenedSign(bytes).setProtectedHeader({alg:"EdDSA",kid,jku:evidence.jwks,typ:"JOSE"}).sign(privateKey),routes=new Map([[operation.customerActor,{actor:operation.customerActor,agentCardUrl:`${baseUrl}/.well-known/agent-card.json`,account:operation.customerAccount}]]),fetch=async()=>({ok:true,json:async()=>configuration.agentCardJwks});
  const result=await verifyActorCarrier({routes,actor:operation.customerActor,carrier:operation,bytes,jws,prefix:"customer",fetch,discover:async()=>signed});assert.equal(result.evidence.card,evidence.card);
  assert.ok((await signCarrier({bytes,privateKeyPem:await exportPKCS8(privateKey),kid,jwks:evidence.jwks})).signature);
});

test("EIP-712 EOA and ERC-1271 routes use the fixed domain and message",async()=>{
  const operation=structuredClone(fixtures["PublicOperation/inspect-binding"]),requestId=operation.customerGrantId;let code="0x",eoaCalls=0,contractCalls=0;const client={getCode:async()=>code,verifyTypedData:async value=>{eoaCalls++;assert.equal(value.domain.name,"emsenn Git Services Customer Grant");assert.equal(value.primaryType,"GitCustomerGrant");assert.equal(value.mode,"eoa");return true},readContract:async value=>{contractCalls++;assert.equal(value.functionName,"isValidSignature");assert.equal(value.args[0].length,66);assert.equal(value.args[1],"0x01");return "0x1626ba7e"}};
  assert.equal((await verifyCustomerGrant({operation,requestId,signature:"0x01",expiry:1,providerAccount:operation.gitAccount,publicClient:client})).accountKind,"eoa");code="0x1234";assert.equal((await verifyCustomerGrant({operation,requestId,signature:"0x01",expiry:1,providerAccount:operation.gitAccount,publicClient:client})).accountKind,"erc1271");assert.equal(eoaCalls,1);assert.equal(contractCalls,1);
});

test("signed coordinator unresolved refusal remains typed across the public boundary",()=>{
  const operation=structuredClone(fixtures["ProfileOperation/publish-profile-operation"]);
  const refusal=structuredClone(fixtures["ProfileRefusal/publish-profile-operation"]);
  Object.assign(refusal,{operationId:operation.operationId,publicRequestId:operation.publicRequestId,state:"unresolved",reason:"unresolved"});
  const outcome=decodeProfileOutcome(encodeCarrier("ProfileRefusal",refusal),operation);
  assert.equal(outcome.family,"ProfileRefusal");
  const jws={protected:"fixture",signature:"fixture"},error=profileRefusalError(outcome.carrier,jws);
  assert.equal(error.reason,"unresolved");
  assert.deepEqual(error.signedProfileRefusal.jws,jws);
});

test("production evidence requests bind all three purposes to the exact Git card",async()=>{
  const root=mkdtempSync(join(tmpdir(),"bound-git-evidence-signing-"));
  const {privateKey,publicKey}=await generateKeyPair("EdDSA",{extractable:true});
  const publicJwk=await exportJWK(publicKey),kid="git-evidence-key",jwks="https://git.assay.invalid/.well-known/jwks.json";
  const routesFile=join(root,"routes.json");writeFileSync(routesFile,JSON.stringify({version:1,routes:[]}));
  const privateKeyPem=await exportPKCS8(privateKey);
  async function capture(operation){
    let submitted;
    const context=createProductionContext({
      operationBytes:encodeCarrier("PublicOperation",operation),
      authorization:{operationJws:{},customerGrantSignature:"0x01",customerGrantExpiry:9999999999,evidenceReadGrantJws:{protected:"grant",signature:"grant"}},
      routesFile,providerAccount:operation.gitAccount,rpcUrl:"http://127.0.0.1:1",
      nonceRoot:root,coordinatorIdentity:{},coordinatorAgentUrl:"http://coordinator.invalid",
      receiverAgentUrl:"http://receiver.invalid",objectFormat:"sha1",binding:{},
      privateKeyPem,signingKid:operation.gitKid,signingJwks:operation.gitJwks,
      loadReceipt:()=>{},bindingReceipt:()=>{},loadPrepareChain:()=>{},
      invokeTask:async value=>{submitted=value;throw new Error("captured")},
    });
    await assert.rejects(context.readEvidence(operation),/captured/u);
    const request=decodeCarrier("EvidenceRequest",submitted.bytes);
    const verified=await flattenedVerify(submitted.metadata.evidenceReadAuthorization.inputJws,publicKey);
    assert.deepEqual(Buffer.from(verified.payload),Buffer.from(submitted.bytes));
    return {request,submitted};
  }
  const variants=[
    ["prepare-bound-tree","artifactReadGrant"],
    ["synchronize-live-index","phaseReadGrant"],
    ["retire-private-index","releaseReadGrant"],
  ];
  for(const [kind,grantKey] of variants){
    const operation=structuredClone(fixtures[`PublicOperation/${kind}`]);
    Object.assign(operation,{gitCardId:"ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",gitCardSignatureId:"ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",gitKid:kid,gitJwks:jwks});
    operation[grantKey].issuerActor=operation.receiverActor;
    operation[grantKey].recipientActor=operation.gitActor;
    const {request,submitted}=await capture(operation);
    assert.deepEqual(submitted.metadata.evidenceReadGrant,operation[grantKey]);
    assert.deepEqual(submitted.metadata.evidenceReadGrantJws,{protected:"grant",signature:"grant"});
    assert.equal(request.receiverActor,operation.receiverActor);
    for(const suffix of ["CardId","CardSignatureId","Kid","Jwks"])assert.equal(request[`provider${suffix}`],operation[`git${suffix}`]);
  }
  const baseline=structuredClone(fixtures["PublicOperation/prepare-bound-tree"]);
  Object.assign(baseline,{gitCardId:"ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",gitCardSignatureId:"ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",gitKid:kid,gitJwks:jwks});
  baseline.artifactReadGrant.issuerActor=baseline.receiverActor;
  baseline.artifactReadGrant.recipientActor=baseline.gitActor;
  for(const [field,value] of [
    ["gitCardId","ni:///sha-256;DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"],
    ["gitCardSignatureId","ni:///sha-256;EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"],
    ["gitKid","changed-git-kid"],
    ["gitJwks","https://changed-git.assay.invalid/.well-known/jwks.json"],
  ]){
    const changed=structuredClone(baseline);changed[field]=value;
    const {request}=await capture(changed),suffix=field.slice(3);
    assert.equal(request[`provider${suffix}`],value);
    assert.notEqual(request[`provider${suffix}`],baseline[field]);
  }
});
