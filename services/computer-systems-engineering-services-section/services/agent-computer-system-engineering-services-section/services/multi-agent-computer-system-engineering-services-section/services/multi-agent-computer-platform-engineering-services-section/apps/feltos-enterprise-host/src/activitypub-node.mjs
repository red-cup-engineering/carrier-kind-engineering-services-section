import {sha256Hex} from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import {seatedEnterprises} from '@red-cup-engineering/feltos/work/enterprise-loop';
import { arrivalDispatchClaimFromCloudEvent } from '@red-cup-engineering/computer-system-engine/rpc/arrival';
import path from "node:path";

import { extractSenActivity, extractSignCellEvidenceActivity, SEN_MEDIA_TYPE, SIGNCELL_EVIDENCE_MEDIA_TYPE } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";

export const enterpriseActorIdentifier=record=>'enterprise-'+(/^[a-z0-9][a-z0-9._-]*$/u.test(record.id)?record.id:sha256Hex(record.id));
/** Use the character's current authored public handle, including human characters. */
export function characterActorIdentifier(record,host){
 if(record?.host!==host)return undefined;
 const handle=record.activityPub?.identifier??(record.kind==='harness'?record.harness:undefined);
 if(handle===undefined)return undefined;
 if(typeof handle!=='string'||!/^[a-z0-9][a-z0-9._-]*$/u.test(handle.trim()))throw new TypeError(`character ${record.name} has an invalid ActivityPub handle`);
 return handle.trim();
}
/** Characters with authored handles and enterprises seated here are the public actors, as the agency
 *  (its authored records and any governing acts on them) seats them. */
export async function activityPubActorsAtHost({ agencyRoot, host, keysDirectory, instanceActor,allowEmpty=false }) {
  const {agencyAt}=await import("@red-cup-engineering/organizing/agency/held");
  const actors = [];
  const seen = new Set();
  for (const character of agencyAt(agencyRoot).characters.values()) {
    const identifier = characterActorIdentifier(character,host);
    if(identifier===undefined)continue;
    if (seen.has(identifier)) throw new TypeError(`host ${host} seats more than one ${identifier} public character`);
    seen.add(identifier);
    actors.push(Object.freeze({
      identifier,
      actorName: character.name,
      summary: character.description ?? character.name,
      character,
      keyPath: path.join(keysDirectory, `${identifier}.json`),
    }));
  }
  for(const enterprise of seatedEnterprises(agencyAt(agencyRoot),host)){
    const identifier=enterpriseActorIdentifier(enterprise);
    if(seen.has(identifier))throw new TypeError('enterprise actor collides with another current actor');
    seen.add(identifier);
    actors.push(Object.freeze({identifier,actorName:enterprise.name,summary:enterprise.faces??enterprise.name,enterprise,keyPath:path.join(keysDirectory,identifier+'.json')}));
  }
  if (instanceActor !== undefined) {
    const identifier = instanceActor.identifier;
    if (typeof identifier !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(identifier)) throw new TypeError("instance actor has an invalid ActivityPub handle");
    if (seen.has(identifier)) throw new TypeError(`host ${host} already seats ${identifier}`);
    actors.push(Object.freeze({
      identifier,
      actorName: instanceActor.actorName,
      summary: instanceActor.summary,
      keyPath: path.join(keysDirectory, `${identifier}.json`),
    }));
  }
  if (actors.length === 0&&!allowEmpty) throw new TypeError(`host ${host} has no seated public actors`);
  return Object.freeze(actors.sort((left, right) => left.identifier.localeCompare(right.identifier)));
}

/** Retain verified ActivityPub evidence in node arrivals and addressed character inboxes. */
export function createActivityPubNodeArrivalHandler({ dataRoot, rootName, origin, actors, resolveActor, agencyRoot, host = rootName, executeRequest, reply } = {}) {
  if (typeof rootName !== "string" || rootName.trim() === "") throw new TypeError("ActivityPub arrival needs an admitted instance identity");
  const byIdentifier = new Map((actors??[]).map((actor) => [actor.identifier, actor]));
  const actorAt=resolveActor??(async identifier=>byIdentifier.get(identifier));
  return async (arrival) => {
    if (arrival.jsonLd?.type === "Reject" && arrival.jsonLd.object?.object?.mediaType === SIGNCELL_EVIDENCE_MEDIA_TYPE) {
      const recipientActor = await actorAt(arrival.recipient);
      if (recipientActor === undefined || recipientActor.character !== undefined) throw new TypeError("a refusal of service evidence needs an instance recipient");
      const verifiedSender = arrival.sender?.actorId;
      if (typeof verifiedSender !== "string" || arrival.activity?.actorId?.href !== verifiedSender) throw new TypeError("a refusal of service evidence must come from its signed sender");
      const {preparePeerWorkRefusal}=await import("./federated-work.mjs");
      const admitRefusal = preparePeerWorkRefusal({
        refused: arrival.jsonLd.object, rejectId: arrival.jsonLd.id, reason: arrival.jsonLd.summary,
        senderActorId: verifiedSender, ownActor: new URL(`/actors/${encodeURIComponent(recipientActor.identifier)}`, origin).href,
        origin, agencyRoot, binding: defaultFilesystemBinding(dataRoot),
      });
      return Object.freeze({ refusal: admitRefusal() });
    }
    const mediaType = arrival.jsonLd?.object?.mediaType;
    if (mediaType !== SEN_MEDIA_TYPE && mediaType !== SIGNCELL_EVIDENCE_MEDIA_TYPE) return undefined;
    const recipientActor = await actorAt(arrival.recipient);
    if (recipientActor === undefined) throw new TypeError("ActivityPub arrival names no actor on this node");
    const recipient = new URL(`/actors/${encodeURIComponent(recipientActor.identifier)}`, origin).href;
    const senderActorId = arrival.sender?.actorId ?? arrival.activity?.actorId?.href ?? arrival.activity?.actorIds?.[0]?.href;
    if (typeof senderActorId !== "string") throw new TypeError("ActivityPub SEN arrival requires a resolved signed sender actor");
    if (mediaType === SIGNCELL_EVIDENCE_MEDIA_TYPE) {
      if (recipientActor.character !== undefined) throw new TypeError("SignStuff service evidence needs an instance recipient");
      const verifiedSender = arrival.sender?.actorId;
      if (typeof verifiedSender !== "string") throw new TypeError("SignStuff service evidence requires a resolved signed sender actor");
      if (arrival.activity?.actorId?.href !== verifiedSender) throw new TypeError("SignStuff service evidence actor must match its signed sender");
      const evidence = extractSignCellEvidenceActivity({ ...arrival.jsonLd, actor: verifiedSender }, {
        expectedActor: verifiedSender, expectedRecipient: recipient,
      });
      const {preparePeerWork}=await import("./federated-work.mjs");
      const admitWork = preparePeerWork({
        projection: evidence, senderActorId: verifiedSender, origin, agencyRoot, host,
        binding: defaultFilesystemBinding(dataRoot),
      });
      const admittedArrival = appendArrivalAtRoot(dataRoot, evidence.cloudEvent, {
        rootName,
        caller: Object.freeze({ transport: "activitypub", actor: verifiedSender, recipient: rootName }),
      });
      if (admitWork === undefined) return admittedArrival;
      return Object.freeze({ arrival: admittedArrival, work: admitWork() });
    }
    // Fedify's compact JSON-LD may expand actor to an object; the signature-resolved
    // actor is the authoritative scalar expected by the canonical wire extractor.
    const projection = extractSenActivity({ ...arrival.jsonLd, actor: senderActorId }, { expectedActor: senderActorId, expectedRecipient: recipient });
    const admission = appendArrivalAtRoot(dataRoot, projection.cloudEvent, {
      rootName,
      caller: Object.freeze({ transport: "activitypub", actor: senderActorId, recipient: recipientActor.character?.id ?? rootName }),
    });
    const semantic = admitNormalizedSemanticContent(projection.objectBytes, projection.objectNi);
    const value = termToJson(semantic.envelope.settledBody);
    const request=arrivalDispatchClaimFromCloudEvent(projection.cloudEvent);
    if(request!==undefined){
      const authenticatedActor=arrival.sender?.actorId;
      if(typeof authenticatedActor!=="string"||arrival.activity?.actorId?.href!==authenticatedActor)throw new TypeError("actor execution requires the signature-resolved sender");
      if(request.claimedSubject!==undefined&&request.claimedSubject!==authenticatedActor)throw new TypeError("actor request cannot substitute another principal");
      if(typeof executeRequest!=="function")throw new TypeError("actor request has no installed execution port");
      const result=await executeRequest({event:projection.cloudEvent,authenticatedActor,admission,recipient,recipientActor});
      if(typeof reply!=="function")throw new TypeError("actor execution has no reply port");
      const delivery=await reply({identifier:recipientActor.identifier,recipient:authenticatedActor,inbox:arrival.sender.inboxId,
        request:projection.envelopeNi,result,at:projection.cloudEvent.time});
      return Object.freeze({arrival:admission,result,delivery});
    }
    if (recipientActor.character === undefined) return admission;
    const {admitCharacterInboxMessage}=await import("@red-cup-engineering/metroplat/offices");
    admitCharacterInboxMessage({
      dataRoot,
      character: recipientActor.character.id,
      id: projection.envelopeNi,
      sender: senderActorId,
      objectKind: semantic.envelope.objectKind,
      value,
      message: projection.a2aMessage,
      at: projection.cloudEvent.time,
    });
    return admission;
  };
}

/** The seated enterprise owns its optional native payment terms. No node-wide
 * default prices, synthetic currencies or payment-derived operation grants. */
export async function enterpriseActorPayment(actor, recipient, cache = new Map()) {
 const terms=actor.enterprise?.x402;
 if(terms===undefined)return undefined;
 if(typeof actor.enterprise.id!=='string'||terms===null||typeof terms!=='object'||Array.isArray(terms))throw new TypeError('enterprise x402 terms need an actual owner');
 const {canonicalJson}=await import('@red-cup-engineering/json-services-section');
 const fingerprint=canonicalJson({owner:actor.enterprise.id,entity:actor.enterprise.entity??null,terms});
 const held=cache.get(recipient);
 if(held?.fingerprint===fingerprint)return held.payment;
 const {HTTPFacilitatorClient,x402ResourceServer}=await import('@x402/core/server');
 const {ExactEvmScheme}=await import('@x402/evm/exact/server');
 const amount=terms.price?.amountAtomic;
 const asset=terms.price?.asset?.match(/^(eip155:[1-9][0-9]*)\/erc20:(0x[0-9a-f]{40})$/u)??null;
 if(!asset||!terms.price||Object.keys(terms.price).sort().join(',')!=='amountAtomic,asset'||!/^[1-9][0-9]{0,77}$/u.test(amount??'')||BigInt(amount)>((1n<<256n)-1n)||!/^0x[0-9a-fA-F]{40}$/u.test(terms.payTo??'')||
  typeof terms.assetExtra?.name!=='string'||!terms.assetExtra.name||typeof terms.assetExtra.version!=='string'||!terms.assetExtra.version||
  !/^https?:\/\//u.test(terms.facilitatorUrl??'')||
  !Number.isInteger(terms.maxTimeoutSeconds??300)||(terms.maxTimeoutSeconds??300)<1||(terms.maxTimeoutSeconds??300)>3600)throw new TypeError('enterprise x402 needs exact asset-bound terms, payout, signing domain and facilitator');
 const network=asset[1],token=asset[2];
 const server=new x402ResourceServer(new HTTPFacilitatorClient({url:terms.facilitatorUrl})).register(network,new ExactEvmScheme());
 let opening;
 const ready=async()=>{
  if(opening===undefined)opening=server.initialize().catch(error=>{opening=undefined;throw error;});
  await opening;
 };
 const owner={enterprise:actor.enterprise.id,entity:actor.enterprise.entity??null,termsSha256:sha256Hex(fingerprint)};
 const payment=Object.freeze({
  async quote({taskId,invocation,operation}) {
   await ready();
   // This is the seated owner's actor tariff, outside the payment protocol. Its
   // canonical input workload is quoted once and bound to the held native task.
   let pricing={amountAtomic:amount,basis:'fixed'};
   const tariff=terms.requestPricing;
   if(tariff!==undefined){
    const atomic=value=>typeof value==='string'&&/^[1-9][0-9]{0,77}$/u.test(value)&&BigInt(value)<=((1n<<256n)-1n);
    if(tariff.mode!=='canonical-json-byte-bands'||!Number.isSafeInteger(tariff.includedBytes)||tariff.includedBytes<1||
     !Number.isSafeInteger(tariff.additionalUnitBytes)||tariff.additionalUnitBytes<1||!atomic(tariff.additionalUnitAtomic)||
     !atomic(tariff.maximumAtomic)||BigInt(tariff.maximumAtomic)<BigInt(amount))throw new TypeError('enterprise actor tariff needs bounded native canonical-input byte bands');
    const canonicalInputBytes=Buffer.byteLength(canonicalJson(invocation.input),'utf8');
    const additionalUnits=Math.max(0,Math.ceil((canonicalInputBytes-tariff.includedBytes)/tariff.additionalUnitBytes));
    const calculated=BigInt(amount)+BigInt(additionalUnits)*BigInt(tariff.additionalUnitAtomic),ceiling=BigInt(tariff.maximumAtomic);
    pricing={basis:tariff.mode,canonicalInputBytes,additionalUnits,amountAtomic:(calculated>ceiling?ceiling:calculated).toString(),
     minimumAtomic:amount,maximumAtomic:ceiling.toString(),capped:calculated>ceiling};
   }
   const requirements=await server.buildPaymentRequirements({scheme:'exact',network,payTo:terms.payTo,
    price:{amount:pricing.amountAtomic,asset:token,extra:terms.assetExtra},maxTimeoutSeconds:terms.maxTimeoutSeconds??300});
   const required=JSON.parse(JSON.stringify(await server.createPaymentRequiredResponse(requirements,{url:recipient+'/inbox',mimeType:SEN_MEDIA_TYPE,description:operation.summary??operation.verb})));
   return {required,offer:{owner,operation:operation.ref,taskId,pricing}};
  },
  verify:async(payload,requirements)=>{await ready();return JSON.parse(JSON.stringify(await server.verifyPayment(payload,requirements)));},
  settle:async(payload,requirements)=>{await ready();return JSON.parse(JSON.stringify(await server.settlePayment(payload,requirements)));},
 });
 cache.set(recipient,{fingerprint,payment});
 return payment;
}
