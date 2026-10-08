import { parseNiUri } from '@red-cup-engineering/uri-services-section/ni-uri';
import { extractSenPart, parseA2aMessage } from '@red-cup-engineering/a2a-services-section/sen-part';
import { admitNormalizedSemanticContent } from '@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime';
import { termToJson } from '@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec';
/**
 * @packageDocumentation
 *
 * rpc — MetroPlat's canonical operation and execution system.
 *
 * Schema contracts provide the object half. This module adds the OPERATION half:
 * operations typed by domain/codomain objects, explicit immutable catalogs,
 * and composition as schema boundary compatibility. Derived program
 * contracts measure preservation separately from this constructor. The categorical role split is
 * objects->schemas, operations->running; the operation half imports the object half
 * (running already depends on schemas).
 *
 * Operation declarations are inert values. Applications explicitly assemble
 * them into an immutable `OperationCatalog`; importing a module never changes
 * the callable process surface.
 */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-data-service/integrity";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { settleCausalSet } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import {
  arrivalUtteranceFromCloudEvent,
  cloudEventContract,
  cloudEventIdentity,
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,

} from "@red-cup-engineering/json-services-section/cloudevent-identity";

export const ARRIVAL_FEED = "admit-arrival";
export const ARRIVAL_ADMISSION_TERM = tm.mark("metroplat.arrival.admit.v1");
export const ARRIVAL_PROCESS_FEED = "process-arrival";
export const ARRIVAL_PROCESS_TERM = tm.mark("metroplat.arrival.process.v1");

/** A declared dispatch request carried by an arrival. Its subject is a remote
 * claim, not a principal or an authorization decision. */

/** The receiver supplies this decision from its local principal, incumbency,
 * and capability evidence. A remote arrival never supplies it. */

const traceEvents = Object.freeze([
  "observed",
  "decoded",
  "cloudevent-admitted",
  "packet-presented",
  "utterance-projected",
  "recorded",
  "processed",
]);

const traceLinks = Object.freeze([
  Object.freeze({ from: "observed", to: "decoded" }),
  Object.freeze({ from: "decoded", to: "cloudevent-admitted" }),
  Object.freeze({ from: "cloudevent-admitted", to: "packet-presented" }),
  Object.freeze({ from: "packet-presented", to: "utterance-projected" }),
  Object.freeze({ from: "utterance-projected", to: "recorded" }),
  Object.freeze({ from: "recorded", to: "processed" }),
]);

export const arrivalTraceCausalSetCarrier = Object.freeze({
  kind: "lorentzian.causalSet",
  events: traceEvents,
  links: traceLinks,
});

function sha256Canonical(value) {
  return sha256Hex(canonicalJson(value));
}

function nonempty(value, label) {
  if (value === undefined || value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function jsonRecord(value, label) {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function optionalString(record, key, label) {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}.${key} must be a non-empty string`);
  return value;
}

function rejectUnexpectedKeys(record, allowed, label) {
  const unexpected = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new TypeError(`${label} contains unsupported fields: ${unexpected.sort().join(", ")}`);
}

function rejectAuthoritySmuggling(value, label) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectAuthoritySmuggling(item, `${label}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (["authority", "capability", "incumbency", "principal", "role", "session"].includes(key.toLowerCase())) {
      throw new TypeError(`${label}.${key} is not admissible in an arrival claim`);
    }
    rejectAuthoritySmuggling(nested, `${label}.${key}`);
  }
}

/** Decode the one dispatch-material grammar accepted at an arrival boundary.
 * This does not bind a principal; it only preserves a remote subject claim as
 * typed evidence for a later receiver-local decision. */
export function arrivalDispatchClaimFromCloudEvent(event) {
  if (event.data === null || typeof event.data !== "object" || Array.isArray(event.data)) return undefined;
  const data = event.data;
  let material = data["material"];
  if (material === undefined && data.profile === "org.harmonious-union.activitypub.cloudevent.a2a-sen.v1" && data.transport === "A2A") {
    // A reply is evidence for its waiting caller, never another execution request.
    if (data.message?.role !== "ROLE_USER") return undefined;
    if (JSON.stringify(data.message).length > 512 * 1024) throw new TypeError("arrival message exceeds its admitted carrier");
    const part = extractSenPart(parseA2aMessage(data.message).parts);
    if (part.bytes.length > 256 * 1024) throw new TypeError("arrival request exceeds its admitted carrier");
    const admitted = admitNormalizedSemanticContent(part.bytes, part.ni);
    if (admitted.envelope.objectKind !== "metroplat.dispatch.arrival-material") return undefined;
    material = termToJson(admitted.envelope.settledBody);
  }
  if (material === undefined) return undefined;
  const record = jsonRecord(material, "arrival dispatch material");
  if (record["kind"] !== "metroplat.dispatch.arrival-material") return undefined;
  rejectUnexpectedKeys(record, ["kind", "argv", "stdin", "subject", "program", "operation", "caller"], "arrival dispatch material");
  const argvValue = record["argv"];
  if (!Array.isArray(argvValue) || argvValue.length === 0 || !argvValue.every((entry) => typeof entry === "string" && entry.trim() !== "")) {
    throw new TypeError("arrival dispatch material.argv must be a non-empty string array");
  }
  const stdinValue = record["stdin"];
  if (stdinValue !== undefined && typeof stdinValue !== "string") throw new TypeError("arrival dispatch material.stdin must be a string");
  const callerValue = record["caller"];
  const caller = callerValue === undefined ? undefined : jsonRecord(callerValue, "arrival dispatch material.caller");
  if (caller !== undefined) rejectAuthoritySmuggling(caller, "arrival dispatch material.caller");
  const claimedSubject = optionalString(record, "subject", "arrival dispatch material");
  const program = optionalString(record, "program", "arrival dispatch material");
  const operation = optionalString(record, "operation", "arrival dispatch material");
  if(operation!==undefined)parseNiUri({uri:operation});
  return Object.freeze({
    kind: "metroplat.arrival.dispatch-claim",
    argv: Object.freeze([...argvValue]),
    stdin: stdinValue ?? "",
    ...(claimedSubject === undefined ? {} : { claimedSubject }),
    ...(program === undefined ? {} : { program }),
    ...(operation === undefined ? {} : { operation }),
    ...(caller === undefined ? {} : { caller: Object.freeze({ ...caller }) }),
  });
}

function eventTypeSegment(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/gu, ".").replace(/^\.+|\.+$/gu, "") || "transport";
}

function defaultEndpoint(transport) {
  return Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference",
    transport,
  });
}

function generatedEndpointOfEvent(event) {
  const data = event.data;
  if (data === null || typeof data !== "object" || Array.isArray(data)) return undefined;
  const endpoint = (data)["endpoint"];
  if (endpoint === null || typeof endpoint !== "object" || Array.isArray(endpoint)) return undefined;
  const record = endpoint;
  if (record["kind"] !== "metroplat.generated-endpoint-readout-reference") return undefined;
  const transport = record["transport"];
  if (typeof transport !== "string" || transport.trim().length === 0) return undefined;
  return Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference",
    transport,
    ...(typeof record["path"] === "string" ? { path: record["path"] } : {}),
    ...(typeof record["method"] === "string" ? { method: record["method"] } : {}),
    ...(typeof record["verb"] === "string" ? { verb: record["verb"] } : {}),
  });
}

function defaultCloudEventId(source, type, time, data) {
  return semanticId({ source, type, time, data });
}

export function cloudEventFromTransportObservation(observation) {
  const source = `urn:metroplat:transport:${eventTypeSegment(observation.transport)}`;
  const type = `org.emsenn.metroplat.arrival.${eventTypeSegment(observation.transport)}.observed`;
  const data = requireJsonValue(observation, "arrival transport observation");
  return cloudEventContract.assert(Object.freeze({
    specversion: CLOUDEVENTS_SPECVERSION,
    id: defaultCloudEventId(source, type, observation.observedAt, data),
    source,
    type,
    time: nonempty(observation.observedAt, "arrival observedAt"),
    datacontenttype: CLOUDEVENTS_DATA_CONTENT_TYPE,
    data,
  }), "arrival transport CloudEvent");
}

export function transportCloudEvent(
  transport,
  material,
  observedAt,
  endpoint = defaultEndpoint(transport),
) {
  return cloudEventFromTransportObservation(Object.freeze({
    kind: "metroplat.arrival.transport-observation",
    transport,
    observedAt,
    material,
    endpoint,
  }));
}

function presentationCheck(carrier, presentation) {
  const carrierBoundaryDigest = semanticId(carrier.boundaryPresentation);
  const presentationDigest = semanticId(presentation);
  const reasons = carrierBoundaryDigest === presentationDigest ? [] : ["packet presentation must canonically equal carrier boundary presentation"];
  return Object.freeze({
    kind: "metroplat.causality-packet.presentation-witness",
    ok: reasons.length === 0,
    carrierBoundaryDigest,
    presentationDigest,
    reasons: Object.freeze(reasons),
  });
}

export function causalityPacketFromCloudEvent(event, options = {}) {
  const admitted = cloudEventContract.assert(event, "arrival CloudEvent");
  const eventIdentity = cloudEventIdentity(admitted);
  const traceSettlement = settleCausalSet(arrivalTraceCausalSetCarrier);
  const generatedEndpoint = options.generatedEndpoint ?? generatedEndpointOfEvent(admitted) ?? defaultEndpoint("unknown");
  const carrier = Object.freeze({
    kind: "metroplat.causal-carrier-readout",
    generatedEndpoint,
    causalSupport: arrivalTraceCausalSetCarrier,
    observableSiteSupport: Object.freeze({
      protocol: "cloudevents",
      identity: eventIdentity,
      source: admitted.source,
      type: admitted.type,
      time: admitted.time,
    }),
    settlementReadout: Object.freeze({
      four: "potential",
      trace: traceSettlement.kind,
      stage: "arrival-admitted",
    }),
    ...(options.artifactAddress === undefined ? {} : { artifactAddress: options.artifactAddress }),
    boundaryPresentation: admitted,
  });
  const packet = Object.freeze({
    kind: "metroplat.causality-packet",
    carrier,
    presentation: admitted,
    presentsCarrier: presentationCheck(carrier, admitted),
  });
  return packet;
}

export function admitCloudEventArrival(event, options = {}) {
  const obstructions = [];
  let admitted;
  try {
    admitted = cloudEventContract.assert(event, "arrival CloudEvent");
  } catch (error) {
    obstructions.push(error instanceof Error ? error.message : String(error));
    const data = requireJsonValue(event, "obstructed arrival CloudEvent material");
    const source = "urn:system:arrival:obstruction";
    const type = "org.emsenn.system.arrival.obstruction";
    const time = "0000-00-00T00:00:00.000Z";
    admitted = cloudEventContract.assert(Object.freeze({
      specversion: CLOUDEVENTS_SPECVERSION,
      id: defaultCloudEventId(source, type, time, data),
      source,
      type,
      time,
      datacontenttype: CLOUDEVENTS_DATA_CONTENT_TYPE,
      data,
    }), "obstructed arrival CloudEvent");
  }
  try {
    arrivalDispatchClaimFromCloudEvent(admitted);
  } catch (error) {
    obstructions.push(error instanceof Error ? error.message : String(error));
  }
  const packet = causalityPacketFromCloudEvent(admitted, options);
  if (!packet.presentsCarrier.ok) obstructions.push(...packet.presentsCarrier.reasons);
  const traceSettlement = settleCausalSet(packet.carrier.causalSupport);
  if (traceSettlement.kind !== "lorentzian.causalSettle:witness") obstructions.push(`arrival trace obstruction: ${traceSettlement.reason}`);
  const utterance = arrivalUtteranceFromCloudEvent(admitted);
  const digest = sha256Canonical(packet);
  return Object.freeze({
    kind: "system.arrival.receipt",
    ok: obstructions.length === 0,
    packetDigest: digest,
    cloudEventIdentity: cloudEventIdentity(admitted),
    event: admitted,
    trace: packet.carrier.causalSupport,
    traceSettlement,
    utterance,
    packet,
    obstructions: Object.freeze(obstructions),
  });
}

export function arrivalReceiptWithAdmission(receipt, admission, packetPath) {
  return Object.freeze({
    ...receipt,
    packetPath,
    admission,
  });
}

export function arrivalReceiptHandle(receipt) {
  return Object.freeze({
    kind: "system.arrival.receipt-handle",
    ok: receipt.ok,
    cloudEventIdentity: receipt.cloudEventIdentity,
    packetDigest: receipt.packetDigest,
    ...(receipt.packetPath === undefined ? {} : { packetPath: receipt.packetPath }),
    ...(receipt.admission?.artifact?.path === undefined ? {} : { logPath: receipt.admission.artifact.path }),
    obstructions: receipt.obstructions,
  });
}
