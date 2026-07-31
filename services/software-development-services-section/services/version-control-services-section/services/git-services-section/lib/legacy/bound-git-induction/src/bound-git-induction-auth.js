import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { discoverSignedAgentCard, agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { decodeProtectedHeader, flattenedVerify, importJWK, importPKCS8, FlattenedSign } from "jose";
import { createPublicClient, hashTypedData, http } from "viem";
import { normalizeAuthenticatedCardEvidence } from "./bound-git-induction-card-evidence.js";

const NI = /^ni:\/\/\/sha-256;([A-Za-z0-9_-]{43})$/u;
const GIT_ACTOR = "urn:ame:git-services-section";
const TYPES = Object.freeze({ GitCustomerGrant: Object.freeze([
  { name: "actorId", type: "bytes32" }, { name: "actorCardId", type: "bytes32" },
  { name: "actorCardSignatureId", type: "bytes32" }, { name: "customer", type: "address" },
  { name: "provider", type: "address" }, { name: "requestId", type: "bytes32" },
  { name: "offerId", type: "bytes32" }, { name: "contractId", type: "bytes32" },
  { name: "parentEffectId", type: "bytes32" }, { name: "nonce", type: "bytes32" },
  { name: "expiry", type: "uint64" }
]) });
const ERC1271_ABI = Object.freeze([Object.freeze({
  type: "function",
  name: "isValidSignature",
  stateMutability: "view",
  inputs: Object.freeze([
    Object.freeze({ name: "hash", type: "bytes32" }),
    Object.freeze({ name: "signature", type: "bytes" }),
  ]),
  outputs: Object.freeze([Object.freeze({ name: "magicValue", type: "bytes4" })]),
})]);
const ERC1271_MAGIC_VALUE = "0x1626ba7e";

function digest32(value) { const m=NI.exec(value); if(!m) throw new Error("invalid-ni"); return `0x${Buffer.from(m[1],"base64url").toString("hex")}`; }
function text32(value) { return `0x${createHash("sha256").update(value).digest("hex")}`; }
function address(caip) { const x=/^eip155:31337:(0x[0-9a-fA-F]{40})$/u.exec(caip); if(!x) throw new Error("invalid-account"); return x[1]; }

export function readFrozenRoutes(path) {
  const value=JSON.parse(readFileSync(path,"utf8"));
  if(value?.version!==1||!Array.isArray(value.routes)) throw new Error("actor-route-drift");
  let last=""; const routes=new Map();
  for(const route of value.routes){
    if(!route||Object.keys(route).sort().join()!=="account,actor,agentCardUrl"||typeof route.actor!=="string"||route.actor<=last||routes.has(route.actor)||!/^https?:\/\//u.test(route.agentCardUrl)||!(route.account===null||/^eip155:31337:0x[0-9a-fA-F]{40}$/u.test(route.account))) throw new Error("actor-route-drift");
    last=route.actor; routes.set(route.actor,Object.freeze({...route}));
  }
  return routes;
}

export async function verifyActorCarrier({ routes, actor, carrier, bytes, jws, prefix, fetch: fetchImpl=globalThis.fetch, discover=discoverSignedAgentCard }) {
  const route=routes.get(actor); if(!route) throw new Error("actor-route-drift");
  const card=await discover({agentUrl:route.agentCardUrl,fetch:fetchImpl,signal:new AbortController().signal});
  const evidence=agentCardSignatureEvidence(card);
  const fields={Actor:actor,CardId:evidence.card,CardSignatureId:evidence.signature,Kid:evidence.kid,Jwks:evidence.jwks};
  for(const [suffix,value] of Object.entries(fields)) if(carrier[`${prefix}${suffix}`]!==value) throw new Error("actor-route-drift");
  if(route.account!==null&&carrier[`${prefix}Account`]!==route.account) throw new Error("actor-route-drift");
  const header=decodeProtectedHeader(jws);
  if(Object.keys(header).sort().join()!=="alg,jku,kid,typ"||header.typ!=="JOSE"||header.kid!==evidence.kid||header.alg!==evidence.algorithm||header.jku!==evidence.jwks) throw new Error("actor-route-drift");
  const response=await fetchImpl(evidence.jwks,{headers:{Accept:"application/jwk-set+json, application/json"},signal:new AbortController().signal});
  if(!response.ok) throw new Error("jwks-unavailable"); const jwks=await response.json();
  const matches=(jwks.keys??[]).filter(k=>k.kid===header.kid&&k.alg===header.alg&&!Object.hasOwn(k,"d")); if(matches.length!==1) throw new Error("actor-route-drift");
  const verified=await flattenedVerify({...jws,payload:jws.payload??Buffer.from(bytes).toString("base64url")},await importJWK(matches[0],header.alg));
  if(!Buffer.from(verified.payload).equals(Buffer.from(bytes))) throw new Error("binding-mismatch");
  return normalizeAuthenticatedCardEvidence({ route, evidence });
}

export function customerGrantMessage(operation, providerAccount, expiry) {
  return Object.freeze({
    actorId:text32(operation.customerActor), actorCardId:digest32(operation.customerCardId), actorCardSignatureId:digest32(operation.customerCardSignatureId),
    customer:address(operation.customerAccount), provider:address(providerAccount), requestId:digest32(operation.customerGrantId===operation.requestId?operation.requestId:operation.requestId??operation.customerGrantId),
    offerId:digest32(operation.offerId), contractId:text32(operation.contractId), parentEffectId:digest32(operation.parentEffectId), nonce:`0x${Buffer.from(operation.nonce,"base64url").toString("hex")}`, expiry:BigInt(expiry)
  });
}

export async function verifyCustomerGrant({ operation, requestId, signature, expiry, providerAccount, rpcUrl, publicClient }) {
  if(operation.gitActor!==GIT_ACTOR) throw new Error("binding-mismatch");
  const client=publicClient??createPublicClient({transport:http(rpcUrl)}), customer=address(operation.customerAccount), provider=address(providerAccount);
  const domain={name:"emsenn Git Services Customer Grant",version:"1",chainId:31337,verifyingContract:provider};
  const message={...customerGrantMessage({...operation,requestId},providerAccount,expiry),requestId:digest32(requestId)};
  const code=await client.getCode({address:customer});
  const accountKind=code&&code!=="0x"?"erc1271":"eoa";
  let verified=false;
  if(accountKind==="eoa"){
    verified=await client.verifyTypedData({address:customer,domain,types:TYPES,primaryType:"GitCustomerGrant",message,signature,mode:"eoa"});
  }else{
    try{
      const hash=hashTypedData({domain,types:TYPES,primaryType:"GitCustomerGrant",message});
      verified=await client.readContract({address:customer,abi:ERC1271_ABI,functionName:"isValidSignature",args:[hash,signature]})===ERC1271_MAGIC_VALUE;
    }catch{
      verified=false;
    }
  }
  if(!verified) throw new Error("invalid-customer-grant");
  return Object.freeze({domain,message,accountKind});
}

export async function signCarrier({bytes,privateKeyPem,kid,jwks,algorithm="EdDSA"}) {
  const key=await importPKCS8(privateKeyPem,algorithm); return new FlattenedSign(bytes).setProtectedHeader({alg:algorithm,kid,jku:jwks,typ:"JOSE"}).sign(key);
}
