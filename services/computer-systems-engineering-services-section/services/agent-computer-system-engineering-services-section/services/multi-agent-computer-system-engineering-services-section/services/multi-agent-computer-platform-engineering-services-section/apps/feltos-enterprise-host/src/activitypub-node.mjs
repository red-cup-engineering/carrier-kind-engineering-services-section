import path from "node:path";

import { extractSenActivity, extractSignCellEvidenceActivity, SEN_MEDIA_TYPE, SIGNCELL_EVIDENCE_MEDIA_TYPE } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { agencyAt } from "@red-cup-engineering/organizing/agency/held";
import { admitCharacterInboxMessage } from "@red-cup-engineering/metroplat/offices";
import { preparePeerWork, preparePeerWorkRefusal } from "./federated-work.mjs";

/** Characters seated on one host with an authored public handle are the actors of that node, as the agency
 *  (its authored records and any governing acts on them) seats them. */
export function activityPubActorsAtHost({ agencyRoot, host, keysDirectory, instanceActor }) {
  const actors = [];
  const seen = new Set();
  for (const character of agencyAt(agencyRoot).characters.values()) {
    if (character?.host !== host) continue;
    const handle = character.activityPub?.identifier ?? (character.kind === "harness" ? character.harness : undefined);
    if (handle === undefined) continue;
    if (typeof handle !== "string") throw new TypeError(`character ${character.name} has an invalid ActivityPub handle`);
    const identifier = handle.trim();
    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(identifier)) throw new TypeError(`character ${character.name} has an invalid ActivityPub handle`);
    if (seen.has(identifier)) throw new TypeError(`host ${host} seats more than one ${identifier} public character`);
    seen.add(identifier);
    actors.push(Object.freeze({
      identifier,
      actorName: character.name,
      summary: character.description,
      character,
      keyPath: path.join(keysDirectory, `${identifier}.json`),
    }));
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
  if (actors.length === 0) throw new TypeError(`host ${host} has no seated public characters`);
  return Object.freeze(actors.sort((left, right) => left.identifier.localeCompare(right.identifier)));
}

/** Retain verified ActivityPub evidence in node arrivals and addressed character inboxes. */
export function createActivityPubNodeArrivalHandler({ dataRoot, rootName, origin, actors, workPeerActor, agencyRoot, host = rootName } = {}) {
  if (typeof rootName !== "string" || rootName.trim() === "") throw new TypeError("ActivityPub arrival needs an admitted instance identity");
  const byIdentifier = new Map(actors.map((actor) => [actor.identifier, actor]));
  return async (arrival) => {
    if (arrival.jsonLd?.type === "Reject" && arrival.jsonLd.object?.object?.mediaType === SIGNCELL_EVIDENCE_MEDIA_TYPE) {
      const recipientActor = byIdentifier.get(arrival.recipient);
      if (recipientActor === undefined || recipientActor.character !== undefined) throw new TypeError("a refusal of service evidence needs an instance recipient");
      const verifiedSender = arrival.sender?.actorId;
      if (typeof verifiedSender !== "string" || arrival.activity?.actorId?.href !== verifiedSender) throw new TypeError("a refusal of service evidence must come from its signed sender");
      const admitRefusal = preparePeerWorkRefusal({
        refused: arrival.jsonLd.object, rejectId: arrival.jsonLd.id, reason: arrival.jsonLd.summary,
        senderActorId: verifiedSender, ownActor: new URL(`/actors/${encodeURIComponent(recipientActor.identifier)}`, origin).href,
        peerActor: workPeerActor, agencyRoot, binding: defaultFilesystemBinding(dataRoot),
      });
      return Object.freeze({ refusal: admitRefusal() });
    }
    const mediaType = arrival.jsonLd?.object?.mediaType;
    if (mediaType !== SEN_MEDIA_TYPE && mediaType !== SIGNCELL_EVIDENCE_MEDIA_TYPE) return undefined;
    const recipientActor = byIdentifier.get(arrival.recipient);
    if (recipientActor === undefined) throw new TypeError("ActivityPub arrival names no actor on this node");
    const recipient = new URL(`/actors/${encodeURIComponent(recipientActor.identifier)}`, origin).href;
    const senderActorId = arrival.sender?.actorId ?? arrival.activity?.actorId?.href ?? arrival.activity?.actorIds?.[0]?.href;
    if (typeof senderActorId !== "string") throw new TypeError("ActivityPub SEN arrival requires a resolved signed sender actor");
    if (mediaType === SIGNCELL_EVIDENCE_MEDIA_TYPE) {
      if (recipientActor.character !== undefined) throw new TypeError("SignCell, SignChain, SignGraph and SignCraft service evidence needs an instance recipient");
      const verifiedSender = arrival.sender?.actorId;
      if (typeof verifiedSender !== "string") throw new TypeError("SignCell, SignChain, SignGraph and SignCraft service evidence requires a resolved signed sender actor");
      if (arrival.activity?.actorId?.href !== verifiedSender) throw new TypeError("SignCell, SignChain, SignGraph and SignCraft service evidence actor must match its signed sender");
      const evidence = extractSignCellEvidenceActivity({ ...arrival.jsonLd, actor: verifiedSender }, {
        expectedActor: verifiedSender, expectedRecipient: recipient,
      });
      const admitWork = preparePeerWork({
        projection: evidence, senderActorId: verifiedSender, peerActor: workPeerActor, agencyRoot, host,
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
    if (recipientActor.character === undefined) return admission;
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
