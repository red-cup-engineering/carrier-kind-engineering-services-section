/** Pure generic communication. Language fibers own representations and evidence;
 * SignCraft owns FOUR-valued claim admission; SignChain owns durable witnessing. */

import type { ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
export type SignClaimInput = Readonly<{ subject: string; predicate: string; object: string; charge: ChargeValueName }>;
export type SignClaim = Readonly<{ kind: "sign.claim"; subject: string; predicate: string; object: string; charge: ChargeValueName }>;
export type CommunicatingRefusal = Readonly<{ code: "invalid-message" | "invalid-face" | "invalid-channel" | "invalid-translation" | "invalid-utterance" | "invalid-cloud-event" | "invalid-action" | "claim-refused" | "chain-refused"; message: string }>;
export type CommunicatingResult<Value> = Readonly<{ ok: true; value: Value }> | Readonly<{ ok: false; refusal: CommunicatingRefusal }>;

export type CommunicatingMessage = Readonly<{ kind: "sign.message"; id: string; topic: string; content: string; author: string }>;
export type CommunicatingFace = Readonly<{ kind: "sign.face"; id: string; capacity: number }>;
export type CommunicationChannel = Readonly<{ kind: "sign.channel"; id: string; capacity: number }>;
export type IllocutionaryForce = "assertion" | "question" | "directive" | "commitment" | "declaration" | "expression";
export type IllocutionaryAct = Readonly<{ kind: "sign.illocution"; force: IllocutionaryForce; message: CommunicatingMessage }>;
export type Translation = Readonly<{ kind: "sign.translation"; source: CommunicatingMessage; target: CommunicatingMessage }>;
export type CommunicationUtterance = Readonly<{ kind: "sign.utterance"; token: string; claim: string }>;
export type CloudEvent = Readonly<{ specversion: "1.0"; id: string; source: string; type: "sign.utterance"; subject: string; data: Readonly<{ token: string; claim: string }> }>;
export type LegacyIllocutionaryForce = "assertive" | "directive" | "commissive" | "declarative" | "expressive";
export type CommunicationAction = Readonly<{ kind: "sign.communication-action"; action: string; actor: string; claim: string; force: IllocutionaryForce }>;

/** Ports keep this generic package independently buildable before the two
 * providers have exact registry versions. They deliberately mirror only their
 * public contracts, never source import paths. */
export type SignCraftPort = Readonly<{ admit(input: SignClaimInput): CommunicatingResult<SignClaim>; conflate(left: SignClaim, right: SignClaim): CommunicatingResult<SignClaim> }>;
export type SignChainPort = Readonly<{ append(input: Readonly<{ author: string; witness: string; claim: SignClaim }>): CommunicatingResult<unknown> }>;

export type WitnessedCommunication = Readonly<{ claim: SignClaim; witness: unknown | null }>;

const accepted = <Value,>(value: Value): CommunicatingResult<Value> => Object.freeze({ ok: true, value });
const refused = (code: CommunicatingRefusal["code"], message: string): CommunicatingResult<never> => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const nonempty = (value: string): boolean => typeof value === "string" && value.trim().length > 0;
const nonnegativeInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

export function createMessage(input: Omit<CommunicatingMessage, "kind">): CommunicatingResult<CommunicatingMessage> {
  if (!nonempty(input.id) || !nonempty(input.topic) || !nonempty(input.content) || !nonempty(input.author)) return refused("invalid-message", "id, topic, content, and author must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.message", ...input }));
}

export function createCommunicatingFace(input: Omit<CommunicatingFace, "kind">): CommunicatingResult<CommunicatingFace> {
  if (!nonempty(input.id) || !nonnegativeInteger(input.capacity)) return refused("invalid-face", "id must be nonempty and capacity must be a nonnegative safe integer");
  return accepted(Object.freeze({ kind: "sign.face", ...input }));
}

export function createCommunicationChannel(input: Omit<CommunicationChannel, "kind">): CommunicatingResult<CommunicationChannel> {
  if (!nonempty(input.id) || !nonnegativeInteger(input.capacity)) return refused("invalid-channel", "id must be nonempty and capacity must be a nonnegative safe integer");
  return accepted(Object.freeze({ kind: "sign.channel", ...input }));
}

export function canTransmit(face: CommunicatingFace, channel: CommunicationChannel, messageCount = 1): boolean {
  return nonnegativeInteger(messageCount) && messageCount <= face.capacity && messageCount <= channel.capacity;
}

export function communicate(face: CommunicatingFace, channel: CommunicationChannel, message: CommunicatingMessage): CommunicatingResult<CommunicatingMessage> {
  return canTransmit(face, channel) ? accepted(message) : refused("invalid-channel", "face and channel capacity must admit one message");
}

export function performIllocution(force: IllocutionaryForce, message: CommunicatingMessage): IllocutionaryAct {
  return Object.freeze({ kind: "sign.illocution", force, message });
}

export function translateMessage(message: CommunicatingMessage, translate: (value: string) => string): CommunicatingResult<Translation> {
  const content = translate(message.content);
  if (!nonempty(content)) return refused("invalid-translation", "translation must produce nonempty content");
  return accepted(Object.freeze({ kind: "sign.translation", source: message, target: Object.freeze({ ...message, content }) }));
}

/** A representation-neutral utterance boundary. Language fibers may decode text into
 * this carrier, but this package never reads their representations or evidence. */
export function createUtterance(input: Omit<CommunicationUtterance, "kind">): CommunicatingResult<CommunicationUtterance> {
  if (!nonempty(input.token) || !nonempty(input.claim)) return refused("invalid-utterance", "token and claim must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.utterance", ...input }));
}

/** Canonical structured CloudEvent projection of one admitted utterance. */
export function cloudEventFromUtterance(utterance: CommunicationUtterance, id: string, source: string): CommunicatingResult<CloudEvent> {
  if (!nonempty(id) || !nonempty(source)) return refused("invalid-cloud-event", "id and source must be nonempty strings");
  return accepted(Object.freeze({ specversion: "1.0", id, source, type: "sign.utterance", subject: utterance.token, data: Object.freeze({ token: utterance.token, claim: utterance.claim }) }));
}

export function utteranceFromCloudEvent(event: CloudEvent): CommunicatingResult<CommunicationUtterance> {
  if (event.specversion !== "1.0" || event.type !== "sign.utterance" || event.subject !== event.data.token) return refused("invalid-cloud-event", "CloudEvent must be a canonical sign.utterance event");
  return createUtterance(event.data);
}

/** Closed migration, never an untyped legacy alias. */
export const legacyIllocutionaryForceMap: Readonly<Record<LegacyIllocutionaryForce, IllocutionaryForce>> = Object.freeze({
  assertive: "assertion", directive: "directive", commissive: "commitment", declarative: "declaration", expressive: "expression",
});

export function migrateIllocutionaryForce(force: LegacyIllocutionaryForce): IllocutionaryForce { return legacyIllocutionaryForceMap[force]; }

/** The generic replacement for an application-local action-plus-two-marks protocol. */
export function admitCommunicationAction(input: Omit<CommunicationAction, "kind">): CommunicatingResult<CommunicationAction> {
  if (!nonempty(input.action) || !nonempty(input.actor) || !nonempty(input.claim)) return refused("invalid-action", "action, actor, and claim must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.communication-action", ...input }));
}

/** FOUR-aware admission and conflation are delegated to SignCraft's port; this
 * provider owns only the utterance-to-predication boundary. */
export function conflateUtteranceClaims(craft: SignCraftPort, left: CommunicationUtterance, right: CommunicationUtterance, predicate: string, leftCharge: ChargeValueName, rightCharge: ChargeValueName): CommunicatingResult<SignClaim> {
  if (!nonempty(predicate)) return refused("claim-refused", "predicate must be a nonempty string");
  const leftClaim = craft.admit({ subject: left.token, predicate, object: left.claim, charge: leftCharge });
  const rightClaim = craft.admit({ subject: right.token, predicate, object: right.claim, charge: rightCharge });
  if (!leftClaim.ok || !rightClaim.ok) return refused("claim-refused", "SignCraft refused an utterance claim");
  return craft.conflate(leftClaim.value, rightClaim.value);
}

/** Compose the lower providers only for a predication that needs FOUR-valued
 * admission and optional durable witness evidence. Generic messages themselves
 * are not silently converted into claims. */
export function witnessClaim(
  craft: SignCraftPort,
  chain: SignChainPort | null,
  input: SignClaimInput,
  witness: Readonly<{ author: string; witness: string }>,
): CommunicatingResult<WitnessedCommunication> {
  const admitted = craft.admit(input);
  if (!admitted.ok) return refused("claim-refused", admitted.refusal.message);
  if (chain === null) return accepted(Object.freeze({ claim: admitted.value, witness: null }));
  const appended = chain.append({ ...witness, claim: admitted.value });
  if (!appended.ok) return refused("chain-refused", appended.refusal.message);
  return accepted(Object.freeze({ claim: admitted.value, witness: appended.value }));
}

export type LegacyCommunicationContract =
  | "meme" | "communicate" | "communicatingFace" | "channelInformationOf" | "translateAction"
  | "illocute" | "cloudEvent" | "didcomm" | "read" | "settle" | "load" | "articulate"
  | "parseCommunication" | "grammarProfile" | "languageManifest";
export type CommunicationOwner = "sign-communication" | "computer-data-engine/semantic-claim" | "sign-chain" | "language-fiber";
export type LegacyCommunicationContractMap = Readonly<Record<LegacyCommunicationContract, CommunicationOwner>>;

/** Public migration classification, not a compatibility export. The language
 * rows are intentionally unavailable from this package. */
export const legacyCommunicationContractMap: LegacyCommunicationContractMap = Object.freeze({
  meme: "computer-data-engine/semantic-claim",
  communicate: "sign-communication",
  communicatingFace: "sign-communication",
  channelInformationOf: "sign-communication",
  translateAction: "sign-communication",
  illocute: "sign-communication",
  cloudEvent: "sign-communication",
  didcomm: "sign-communication",
  read: "language-fiber",
  settle: "language-fiber",
  load: "language-fiber",
  articulate: "language-fiber",
  parseCommunication: "language-fiber",
  grammarProfile: "language-fiber",
  languageManifest: "language-fiber",
});
