/** Pure generic communication. Language fibers own representations and evidence;
 * SignCraft owns FOUR-valued claim admission; SignChain owns durable witnessing. */

/** Ports keep this generic package independently buildable before the two
 * providers have exact registry versions. They deliberately mirror only their
 * public contracts, never source import paths. */

const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const nonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

export function createMessage(input) {
  if (!nonempty(input.id) || !nonempty(input.topic) || !nonempty(input.content) || !nonempty(input.author)) return refused("invalid-message", "id, topic, content, and author must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.message", ...input }));
}

export function createCommunicatingFace(input) {
  if (!nonempty(input.id) || !nonnegativeInteger(input.capacity)) return refused("invalid-face", "id must be nonempty and capacity must be a nonnegative safe integer");
  return accepted(Object.freeze({ kind: "sign.face", ...input }));
}

export function createCommunicationChannel(input) {
  if (!nonempty(input.id) || !nonnegativeInteger(input.capacity)) return refused("invalid-channel", "id must be nonempty and capacity must be a nonnegative safe integer");
  return accepted(Object.freeze({ kind: "sign.channel", ...input }));
}

export function canTransmit(face, channel, messageCount = 1) {
  return nonnegativeInteger(messageCount) && messageCount <= face.capacity && messageCount <= channel.capacity;
}

export function communicate(face, channel, message) {
  return canTransmit(face, channel) ? accepted(message) : refused("invalid-channel", "face and channel capacity must admit one message");
}

export function performIllocution(force, message) {
  return Object.freeze({ kind: "sign.illocution", force, message });
}

export function translateMessage(message, translate) {
  const content = translate(message.content);
  if (!nonempty(content)) return refused("invalid-translation", "translation must produce nonempty content");
  return accepted(Object.freeze({ kind: "sign.translation", source: message, target: Object.freeze({ ...message, content }) }));
}

/** A representation-neutral utterance boundary. Language fibers may decode text into
 * this carrier, but this package never reads their representations or evidence. */
export function createUtterance(input) {
  if (!nonempty(input.token) || !nonempty(input.claim)) return refused("invalid-utterance", "token and claim must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.utterance", ...input }));
}

/** Canonical structured CloudEvent projection of one admitted utterance. */
export function cloudEventFromUtterance(utterance, id, source) {
  if (!nonempty(id) || !nonempty(source)) return refused("invalid-cloud-event", "id and source must be nonempty strings");
  return accepted(Object.freeze({ specversion: "1.0", id, source, type: "sign.utterance", subject: utterance.token, data: Object.freeze({ token: utterance.token, claim: utterance.claim }) }));
}

export function utteranceFromCloudEvent(event) {
  if (event.specversion !== "1.0" || event.type !== "sign.utterance" || event.subject !== event.data.token) return refused("invalid-cloud-event", "CloudEvent must be a canonical sign.utterance event");
  return createUtterance(event.data);
}

/** Closed migration, never an untyped legacy alias. */
export const legacyIllocutionaryForceMap = Object.freeze({
  assertive: "assertion", directive: "directive", commissive: "commitment", declarative: "declaration", expressive: "expression",
});

export function migrateIllocutionaryForce(force) { return legacyIllocutionaryForceMap[force]; }

/** The generic replacement for an application-local action-plus-two-marks protocol. */
export function admitCommunicationAction(input) {
  if (!nonempty(input.action) || !nonempty(input.actor) || !nonempty(input.claim)) return refused("invalid-action", "action, actor, and claim must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.communication-action", ...input }));
}

/** FOUR-aware admission and conflation are delegated to SignCraft's port; this
 * provider owns only the utterance-to-predication boundary. */
export function conflateUtteranceClaims(craft, left, right, predicate, leftCharge, rightCharge) {
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
  craft,
  chain,
  input,
  witness,
) {
  const admitted = craft.admit(input);
  if (!admitted.ok) return refused("claim-refused", admitted.refusal.message);
  if (chain === null) return accepted(Object.freeze({ claim: admitted.value, witness: null }));
  const appended = chain.append({ ...witness, claim: admitted.value });
  if (!appended.ok) return refused("chain-refused", appended.refusal.message);
  return accepted(Object.freeze({ claim: admitted.value, witness: appended.value }));
}

/** Public migration classification, not a compatibility export. The language
 * rows are intentionally unavailable from this package. */
export const legacyCommunicationContractMap = Object.freeze({
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
