import { Activity } from "@fedify/vocab";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { makeNiUri as sha256Ni } from "@red-cup-engineering/uri-services-section/ni-uri";
import {
  agentSenMessage,
  extractSenPart,
  parseA2aMessage
} from "@red-cup-engineering/a2a-services-section/sen-part";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import {
  admitNormalizedSemanticContent,
} from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { admitJsonDocument, identifyJsonDocument } from "./sen-json-document.mjs";
import { ACTIVITYSTREAMS_CONTEXT, ACTIVITYSTREAMS_PUBLIC } from "./activitystreams.mjs";

export const SEN_MEDIA_TYPE = "application/sen+cbor";
export const SIGNSTUFF_EVIDENCE_MEDIA_TYPE = "application/vnd.semioverse.signstuff+cbor";
export const CLOUDEVENTS_MEDIA_TYPE = "application/cloudevents+json";
export const A2A_MEDIA_TYPE = "application/a2a+json";
export const AGENTIC_ACTIVITY_PROFILE = "org.harmonious-union.activitypub.cloudevent.a2a-sen.v1";
const MAXIMUM_INLINE_SEN_BYTES = 256 * 1024;
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
const TYPES = new Set(["Accept", "Announce", "Create", "Offer", "Reject", "Update"]);
const CLOUD_EVENT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:red-cup-engineering:activitypub:cloud-event-a2a-sen:v1",
  type: "object",
  required: ["id", "specversion", "source", "type", "time", "subject", "datacontenttype", "data"],
  properties: {
    id: { type: "string", minLength: 1 }, specversion: { const: "1.0" }, source: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 }, time: { type: "string", minLength: 1 }, subject: { type: "string", minLength: 1 },
    datacontenttype: { const: A2A_MEDIA_TYPE },
    data: { type: "object", required: ["profile", "transport", "message"], properties: { profile: { const: AGENTIC_ACTIVITY_PROFILE }, transport: { const: "A2A" }, message: { type: "object" } }, additionalProperties: false },
  },
  additionalProperties: false,
});

function validateCloudEvent(value) {
  const verdict = validateSchemaInstance({ instance: value, schema: CLOUD_EVENT_SCHEMA });
  if (!verdict.ok) throw new TypeError(`ActivityPub SEN object has an invalid CloudEvents JSON boundary: ${verdict.errors[0]?.pointer || "/"} ${verdict.errors[0]?.message || "invalid"}`);
  return value;
}

function exactUrl(value, label, { https = true } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError(`${label} must be an absolute URL`); }
  if (https && url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new TypeError(`${label} must use HTTPS outside loopback development`);
  return url.href;
}
function actorUrl(origin, identifier) {
  if (typeof identifier !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(identifier)) throw new TypeError("ActivityPub identifier is invalid");
  return new URL(`/actors/${identifier}`, exactUrl(origin, "ActivityPub origin")).href;
}
function one(value) { return Array.isArray(value) ? value : [value]; }
function sameRecipient(left, right) { return left === right || ([left, right].every((value) => [ACTIVITYSTREAMS_PUBLIC, "as:Public"].includes(value))); }
function immutable(value) {
  if (value === null || typeof value !== "object" || ArrayBuffer.isView(value) || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}
function dataUri(bytes) { return `data:${SEN_MEDIA_TYPE};base64,${Buffer.from(bytes).toString("base64")}`; }
function dataBytes(value) {
  const match = /^data:application\/sen\+cbor;base64,([A-Za-z0-9+/]*={0,2})$/u.exec(value ?? "");
  if (!match) throw new TypeError("ActivityPub SEN link must contain one canonical base64 data URI");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > MAXIMUM_INLINE_SEN_BYTES || bytes.toString("base64") !== match[1]) throw new TypeError("ActivityPub SEN link is oversized or noncanonical");
  return bytes;
}

function exactA2aMessage(objectBytes, supplied, expectedRole = "ROLE_AGENT") {
  const payload = Buffer.from(objectBytes ?? []);
  const payloadNi = sha256Ni(payload);
  const message = supplied ?? agentSenMessage(payload, "operation.sen.cbor", payloadNi);
  if (message?.role !== expectedRole) throw new TypeError(`ActivityPub SEN projection requires one A2A ${expectedRole} message`);
  let part;
  try {
    part = extractSenPart(parseA2aMessage(message).parts);
  } catch (error) {
    throw new TypeError(`ActivityPub SEN projection requires one exact A2A SEN part: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Buffer.from(part.bytes).equals(payload) || part.ni !== payloadNi) {
    throw new TypeError("A2A SEN part does not carry the projected SEN object");
  }
  return immutable(structuredClone(message));
}

function cloudEventBytes({ type, actor, recipient, objectBytes, a2aMessage, eventTime, a2aRole }) {
  const message = exactA2aMessage(objectBytes, a2aMessage, a2aRole);
  const data = {
    profile: AGENTIC_ACTIVITY_PROFILE,
    transport: "A2A",
    message,
  };
  const body = {
    specversion: "1.0",
    source: actor,
    type: `org.harmonious-union.activitypub.${type.toLowerCase()}.v1`,
    time: eventTime ?? "1970-01-01T00:00:00.000Z",
    subject: recipient,
    datacontenttype: A2A_MEDIA_TYPE,
    data,
  };
  const event = validateCloudEvent({ id: identifyJsonDocument(body).ni, ...body });
  return identifyJsonDocument(event).bytes;
}

function unwrapCloudEvent(bytes, expectedType, expectedActor, expectedRecipient) {
  const event = validateCloudEvent(admitJsonDocument(bytes, "ActivityPub CloudEvents/A2A membrane envelope").value);
  if (event?.specversion !== "1.0" || event.source !== expectedActor || event.subject !== expectedRecipient || event.type !== `org.harmonious-union.activitypub.${expectedType.toLowerCase()}.v1` || event.datacontenttype !== A2A_MEDIA_TYPE || event.data?.profile !== AGENTIC_ACTIVITY_PROFILE || event.data?.transport !== "A2A") {
    throw new TypeError("ActivityPub SEN object has the wrong canonical CloudEvents/A2A envelope");
  }
  if (!["ROLE_USER", "ROLE_AGENT"].includes(event.data.message?.role)) {
    throw new TypeError("CloudEvents data is not one A2A ROLE_USER or ROLE_AGENT message");
  }
  const { id: eventId, ...eventBody } = event;
  if (eventId !== identifyJsonDocument(eventBody).ni) {
    throw new TypeError("CloudEvents id does not name its canonical SEN body");
  }
  if (typeof event.time !== "string" || !Number.isFinite(Date.parse(event.time))) {
    throw new TypeError("CloudEvents time must be an RFC 3339 timestamp");
  }
  let part;
  try {
    part = extractSenPart(parseA2aMessage(event.data.message).parts);
  } catch (error) {
    throw new TypeError(`CloudEvents A2A message does not carry one exact SEN part: ${error instanceof Error ? error.message : String(error)}`);
  }
  const objectBytes = Buffer.from(part.bytes);
  try { admitNormalizedSemanticContent(objectBytes, part.ni); }
  catch { throw new TypeError("CloudEvents/A2A payload must contain admitted semantic SEN content"); }
  return Object.freeze({
    objectBytes,
    objectNi: part.ni,
    a2aMessage: immutable(structuredClone(event.data.message)),
    cloudEvent: immutable(structuredClone(event)),
  });
}

/**
 * Produce the canonical SEN bytes this module's own projection admits.
 *
 * `projectSenActivity` admits its `objectBytes` through
 * `admitNormalizedSemanticContent`, which accepts exactly one encoding: the
 * v2 normalized-content envelope, whose bytes reproduce their own canonical
 * commitment. This is the producer for that admission, exported beside it so
 * a caller never has to guess which SEN encoding the boundary will take.
 * Other SEN byte forms -- an `ascribe` term encoded through the SEN CBOR
 * codec, for one -- are refused here for every value, not merely for some.
 *
 * @param {{objectKind: string, value: unknown}} input The receiver's demanded
 *   semantic object kind, and the JSON-compatible value to say.
 * @returns {Uint8Array} Canonical bytes `projectSenActivity` admits.
 * @throws {TypeError} When objectKind is not a nonempty string, or the value
 *   does not cross the admitted JSON-to-SEN boundary.
 */
export function senActivityObjectBytes({ objectKind, value } = {}) {
  if (typeof objectKind !== "string" || objectKind === "") {
    throw new TypeError("ActivityPub SEN object bytes require one nonempty semantic object kind");
  }
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
}

export function projectSenActivity({ type, origin, identifier, recipient, objectBytes, agentCard, a2aMessage, eventTime, a2aRole = "ROLE_AGENT" }) {
  if (!TYPES.has(type)) throw new TypeError("ActivityPub SEN projection requires a standard supported Activity type");
  const bytes = Buffer.from(objectBytes ?? []);
  if (bytes.length < 1 || bytes.length > MAXIMUM_INLINE_SEN_BYTES) throw new TypeError("ActivityPub SEN projection requires bounded nonempty canonical bytes");
  try {
    admitNormalizedSemanticContent(bytes);
  } catch {
    throw new TypeError("ActivityPub SEN projection requires canonical SEN bytes");
  }
  const actor = actorUrl(origin, identifier);
  const to = recipient === ACTIVITYSTREAMS_PUBLIC ? recipient : exactUrl(recipient, "ActivityPub recipient");
  const card = exactUrl(agentCard, "A2A Agent Card");
  if (!["ROLE_USER", "ROLE_AGENT"].includes(a2aRole)) throw new TypeError("ActivityPub SEN projection requires A2A ROLE_USER or ROLE_AGENT");
  const envelopeBytes = cloudEventBytes({ type, actor, recipient: to, objectBytes: bytes, a2aMessage, eventTime, a2aRole });
  const ni = sha256Ni(envelopeBytes);
  const projectionDigest = identifyJsonDocument({ type, actor, to, envelopeNi: ni, agentCard: card }).ni.slice("ni:///sha-256;".length);
  const id = new URL(`/activities/sen-${projectionDigest}`, exactUrl(origin, "ActivityPub origin")).href;
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT, id, type, actor, to,
    object: Object.freeze({ type: "Document", mediaType: SEN_MEDIA_TYPE, name: ni, url: Object.freeze({ type: "Link", mediaType: SEN_MEDIA_TYPE, href: dataUri(envelopeBytes) }) }),
    attachment: Object.freeze({ type: "Link", mediaType: "application/json", name: "A2A Agent Card", href: card }),
  });
}

export function extractSenActivity(activity, { expectedActor, expectedRecipient, expectedAgentCard } = {}) {
  if (!activity || !TYPES.has(activity.type) || activity.actor !== exactUrl(expectedActor, "expected ActivityPub actor") || !one(activity.to).some((value) => sameRecipient(value, expectedRecipient))) throw new TypeError("exact addressed ActivityPub SEN projection is required");
  if (activity.object?.type !== "Document" || activity.object.mediaType !== SEN_MEDIA_TYPE || !NI.test(activity.object.name ?? "") || activity.object.url?.type !== "Link" || activity.object.url.mediaType !== SEN_MEDIA_TYPE) throw new TypeError("ActivityPub object must be one RFC 6920 named SEN Document with a standard Link");
  const bytes = dataBytes(activity.object.url.href), ni = sha256Ni(bytes);
  if (ni !== activity.object.name) throw new TypeError("ActivityPub SEN bytes do not match their ni identity");
  const attachments = Array.isArray(activity.attachment) ? activity.attachment : [activity.attachment];
  const cards = attachments.filter((item) => item?.type === "Link" && item.mediaType === "application/json" && item.name === "A2A Agent Card" && typeof item.href === "string");
  if (cards.length !== 1) throw new TypeError("ActivityPub SEN projection must name exactly one A2A Agent Card");
  const agentCard = exactUrl(cards[0].href, "A2A Agent Card");
  if (expectedAgentCard !== undefined && agentCard !== exactUrl(expectedAgentCard, "expected A2A Agent Card")) throw new TypeError("ActivityPub SEN projection named a foreign A2A Agent Card");
  const opened = unwrapCloudEvent(bytes, activity.type, activity.actor, expectedRecipient === ACTIVITYSTREAMS_PUBLIC ? ACTIVITYSTREAMS_PUBLIC : exactUrl(expectedRecipient, "expected ActivityPub recipient"));
  return Object.freeze({ type: activity.type, objectNi: opened.objectNi, envelopeNi: ni, objectBytes: opened.objectBytes, a2aMessage: opened.a2aMessage, cloudEvent: opened.cloudEvent, agentCard });
}

export async function materializeSenActivity(input) { return Activity.fromJsonLd(projectSenActivity(input)); }

/** A service actor can send SignStuff evidence without claiming an A2A Agent Card. */
export function projectSignStuffEvidenceActivity({ origin, identifier, recipient, objectBytes, eventTime }) {
  const actor = actorUrl(origin, identifier);
  const to = exactUrl(recipient, "ActivityPub recipient");
  const bytes = Buffer.from(objectBytes ?? []);
  if (bytes.length < 1 || bytes.length > MAXIMUM_INLINE_SEN_BYTES) throw new TypeError("SignStuff evidence must be bounded canonical SEN bytes");
  admitNormalizedSemanticContent(bytes);
  if (typeof eventTime !== "string" || !Number.isFinite(Date.parse(eventTime))) throw new TypeError("SignStuff evidence needs an observed time");
  const objectNi = sha256Ni(bytes);
  const digest = identifyJsonDocument({ actor, to, objectNi }).ni.slice("ni:///sha-256;".length);
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: new URL(`/activities/evidence-${digest}`, exactUrl(origin, "ActivityPub origin")).href,
    type: "Create", actor, to, published: eventTime,
    object: Object.freeze({
      type: "Document", mediaType: SIGNSTUFF_EVIDENCE_MEDIA_TYPE, name: objectNi,
      url: Object.freeze({ type: "Link", mediaType: SIGNSTUFF_EVIDENCE_MEDIA_TYPE,
        href: `data:${SIGNSTUFF_EVIDENCE_MEDIA_TYPE};base64,${bytes.toString("base64")}` }),
    }),
  });
}

/** Admit one addressed, content-addressed service evidence activity. */
export function extractSignStuffEvidenceActivity(activity, { expectedActor, expectedRecipient } = {}) {
  const actor = exactUrl(expectedActor, "expected ActivityPub actor");
  const recipient = exactUrl(expectedRecipient, "expected ActivityPub recipient");
  if (activity?.type !== "Create" || activity.actor !== actor || !one(activity.to).includes(recipient)
    || activity.object?.type !== "Document" || activity.object.mediaType !== SIGNSTUFF_EVIDENCE_MEDIA_TYPE
    || !NI.test(activity.object.name ?? "") || activity.object.url?.type !== "Link"
    || activity.object.url.mediaType !== SIGNSTUFF_EVIDENCE_MEDIA_TYPE) {
    throw new TypeError("exact addressed SignStuff evidence activity is required");
  }
  const match = /^data:application\/vnd\.semioverse\.signstuff\+cbor;base64,([A-Za-z0-9+/]*={0,2})$/u.exec(activity.object.url.href ?? "");
  if (!match) throw new TypeError("SignStuff evidence link must contain canonical inline SEN bytes");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 1 || bytes.length > MAXIMUM_INLINE_SEN_BYTES || bytes.toString("base64") !== match[1]
    || sha256Ni(bytes) !== activity.object.name) throw new TypeError("SignStuff evidence bytes do not match their ni identity");
  const semantic = admitNormalizedSemanticContent(bytes, activity.object.name);
  const value = termToJson(semantic.envelope.settledBody);
  const time = activity.published;
  if (typeof time !== "string" || !Number.isFinite(Date.parse(time))) throw new TypeError("SignStuff evidence has no observed time");
  const body = {
    specversion: "1.0", source: actor, subject: recipient,
    type: "org.semioverse.activitypub.signstuff-evidence.create.v1", time,
    datacontenttype: "application/json",
    data: { profile: "org.semioverse.activitypub.signstuff-evidence.v1",
      objectKind: semantic.envelope.objectKind, objectNi: activity.object.name, value },
  };
  return Object.freeze({ objectKind: semantic.envelope.objectKind, objectNi: activity.object.name,
    value, cloudEvent: Object.freeze({ id: identifyJsonDocument(body).ni, ...body }) });
}
