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
import { requireJsonValue, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { canonicalBytes, sha256Hex } from "../lib/identity/index.mts";
import type { UtteranceObject } from "../lib/records/utterance/index.mts";
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";
import { settleCausalSet, type CausalSetCarrier, type CausalSettlementJudgment } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal";
import {
  arrivalUtteranceFromCloudEvent,
  cloudEventContract,
  cloudEventIdentity,
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  type CloudEvent,
} from "../lib/codecs/cloudevents/index.mts";

export const ARRIVAL_FEED = "admit-arrival" as const;
export const ARRIVAL_ADMISSION_TERM: Tm = tm.mark("metroplat.arrival.admit.v1");
export const ARRIVAL_PROCESS_FEED = "process-arrival" as const;
export const ARRIVAL_PROCESS_TERM: Tm = tm.mark("metroplat.arrival.process.v1");

export type ArrivalTransport =
  | "cli"
  | "http"
  | "mcp-stdio"
  | "mcp-http"
  | "agent-hook"
  | (string & {});

export interface GeneratedEndpointReadoutReference {
  readonly kind: "metroplat.generated-endpoint-readout-reference";
  readonly transport: ArrivalTransport;
  readonly path?: string;
  readonly method?: string;
  readonly verb?: string;
  readonly schemaNodeReadout?: JsonRecord;
}

export interface ArrivalStatementWriteResult {
  readonly artifact?: {
    readonly path?: string;
  };
  /** Content-addressed source statements admitted for this arrival. */
  readonly statements?: readonly {
    readonly id: string;
  }[];
}

export interface ArrivalTransportObservation {
  readonly kind: "metroplat.arrival.transport-observation";
  readonly transport: ArrivalTransport;
  readonly observedAt: string;
  readonly material: JsonValue;
  readonly endpoint: GeneratedEndpointReadoutReference;
}

export interface PacketPresentationCheck {
  /** Frozen legacy wire discriminant; this source value is a digest check. */
  readonly kind: "metroplat.causality-packet.presentation-witness";
  readonly ok: boolean;
  readonly carrierBoundaryDigest: string;
  readonly presentationDigest: string;
  readonly reasons: readonly string[];
}

export interface CausalCarrierReadout {
  readonly kind: "metroplat.causal-carrier-readout";
  readonly generatedEndpoint: GeneratedEndpointReadoutReference | JsonRecord;
  readonly causalSupport: CausalSetCarrier;
  readonly observableSiteSupport: JsonRecord;
  readonly settlementReadout: JsonRecord;
  readonly artifactAddress?: string;
  readonly boundaryPresentation: CloudEvent;
}

export interface CausalityPacket {
  readonly kind: "metroplat.causality-packet";
  readonly carrier: CausalCarrierReadout;
  readonly presentation: CloudEvent;
  readonly presentsCarrier: PacketPresentationCheck;
}

export interface ArrivalReceipt {
  readonly kind: "metroplat.arrival.receipt";
  readonly ok: boolean;
  readonly packetDigest: string;
  readonly packetPath?: string;
  readonly cloudEventIdentity: string;
  readonly event: CloudEvent;
  readonly trace: CausalSetCarrier;
  readonly traceSettlement: CausalSettlementJudgment;
  readonly utterance: UtteranceObject;
  readonly packet: CausalityPacket;
  readonly admission?: ArrivalStatementWriteResult;
  readonly obstructions: readonly string[];
}

export interface ArrivalReceiptHandle {
  readonly kind: "metroplat.arrival.receipt-handle";
  readonly ok: boolean;
  readonly cloudEventIdentity: string;
  readonly packetDigest: string;
  readonly packetPath?: string;
  readonly logPath?: string;
  readonly obstructions: readonly string[];
}

export interface ArrivalAdmissionOptions {
  readonly generatedEndpoint?: GeneratedEndpointReadoutReference | JsonRecord;
  readonly artifactAddress?: string;
}

/** A declared dispatch request carried by an arrival. Its subject is a remote
 * claim, not a principal or an authorization decision. */
export interface ArrivalDispatchClaim {
  readonly kind: "metroplat.arrival.dispatch-claim";
  readonly argv: readonly string[];
  readonly stdin: string;
  readonly claimedSubject?: string;
  readonly program?: string;
  readonly caller?: JsonRecord;
}

export interface ArrivalLocalPrincipalBindingRequest {
  readonly kind: "metroplat.arrival.local-principal-binding-request";
  readonly cloudEventIdentity: string;
  readonly packetDigest?: string;
  /** The CloudEvent source is transport provenance only. */
  readonly source: string;
  readonly claim: ArrivalDispatchClaim;
}

export type ArrivalLocalPrincipalBinding =
  | Readonly<{
    readonly kind: "metroplat.arrival.local-principal-binding";
    readonly state: "bound";
    readonly subject: string;
    readonly evidence: readonly string[];
    readonly reasons: readonly string[];
  }>
  | Readonly<{
    readonly kind: "metroplat.arrival.local-principal-binding";
    readonly state: "refused";
    readonly evidence: readonly string[];
    readonly reasons: readonly string[];
  }>;

/** The receiver supplies this decision from its local principal, incumbency,
 * and capability evidence. A remote arrival never supplies it. */
export type ArrivalLocalPrincipalBinder = (
  request: ArrivalLocalPrincipalBindingRequest,
) => ArrivalLocalPrincipalBinding;

export type ArrivalAdmissionHook = (event: CloudEvent) => ArrivalReceipt;

const traceEvents = Object.freeze([
  "observed",
  "decoded",
  "cloudevent-admitted",
  "packet-presented",
  "utterance-projected",
  "recorded",
  "processed",
] as const);

const traceLinks = Object.freeze([
  Object.freeze({ from: "observed", to: "decoded" }),
  Object.freeze({ from: "decoded", to: "cloudevent-admitted" }),
  Object.freeze({ from: "cloudevent-admitted", to: "packet-presented" }),
  Object.freeze({ from: "packet-presented", to: "utterance-projected" }),
  Object.freeze({ from: "utterance-projected", to: "recorded" }),
  Object.freeze({ from: "recorded", to: "processed" }),
]);

export const arrivalTraceCausalSetCarrier: CausalSetCarrier = Object.freeze({
  kind: "lorentzian.causalSet" as const,
  events: traceEvents,
  links: traceLinks,
});

function sha256Canonical(value: JsonValue): string {
  return sha256Hex(canonicalBytes(value));
}

function nonempty(value: string | undefined, label: string): string {
  if (value === undefined || value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function jsonRecord(value: JsonValue | undefined, label: string): JsonRecord {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value as JsonRecord;
}

function optionalString(record: JsonRecord, key: string, label: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}.${key} must be a non-empty string`);
  return value;
}

function rejectUnexpectedKeys(record: JsonRecord, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new TypeError(`${label} contains unsupported fields: ${unexpected.sort().join(", ")}`);
}

function rejectAuthoritySmuggling(value: JsonValue, label: string): void {
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
export function arrivalDispatchClaimFromCloudEvent(event: CloudEvent): ArrivalDispatchClaim | undefined {
  if (event.data === null || typeof event.data !== "object" || Array.isArray(event.data)) return undefined;
  const data = event.data as JsonRecord;
  const material = data["material"];
  if (material === undefined) return undefined;
  const record = jsonRecord(material, "arrival dispatch material");
  if (record["kind"] !== "metroplat.dispatch.arrival-material") return undefined;
  rejectUnexpectedKeys(record, ["kind", "argv", "stdin", "subject", "program", "caller"], "arrival dispatch material");
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
  return Object.freeze({
    kind: "metroplat.arrival.dispatch-claim" as const,
    argv: Object.freeze([...argvValue]),
    stdin: stdinValue ?? "",
    ...(claimedSubject === undefined ? {} : { claimedSubject }),
    ...(program === undefined ? {} : { program }),
    ...(caller === undefined ? {} : { caller: Object.freeze({ ...caller }) }),
  });
}

function eventTypeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/gu, ".").replace(/^\.+|\.+$/gu, "") || "transport";
}

function defaultEndpoint(transport: ArrivalTransport): GeneratedEndpointReadoutReference {
  return Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference" as const,
    transport,
  });
}

function generatedEndpointOfEvent(event: CloudEvent): GeneratedEndpointReadoutReference | undefined {
  const data = event.data;
  if (data === null || typeof data !== "object" || Array.isArray(data)) return undefined;
  const endpoint = (data as Readonly<Record<string, JsonValue>>)["endpoint"];
  if (endpoint === null || typeof endpoint !== "object" || Array.isArray(endpoint)) return undefined;
  const record = endpoint as Readonly<Record<string, JsonValue>>;
  if (record["kind"] !== "metroplat.generated-endpoint-readout-reference") return undefined;
  const transport = record["transport"];
  if (typeof transport !== "string" || transport.trim().length === 0) return undefined;
  return Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference" as const,
    transport,
    ...(typeof record["path"] === "string" ? { path: record["path"] } : {}),
    ...(typeof record["method"] === "string" ? { method: record["method"] } : {}),
    ...(typeof record["verb"] === "string" ? { verb: record["verb"] } : {}),
  });
}

function defaultCloudEventId(source: string, type: string, time: string, data: JsonValue): string {
  return `urn:sha256:${sha256Canonical({ source, type, time, data } as JsonValue)}`;
}

export function cloudEventFromTransportObservation(observation: ArrivalTransportObservation): CloudEvent {
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
  }), "arrival transport CloudEvent") as CloudEvent;
}

export function transportCloudEvent(
  transport: ArrivalTransport,
  material: JsonValue,
  observedAt: string,
  endpoint: GeneratedEndpointReadoutReference = defaultEndpoint(transport),
): CloudEvent {
  return cloudEventFromTransportObservation(Object.freeze({
    kind: "metroplat.arrival.transport-observation" as const,
    transport,
    observedAt,
    material,
    endpoint,
  }));
}

function presentationCheck(carrier: CausalCarrierReadout, presentation: CloudEvent): PacketPresentationCheck {
  const carrierBoundaryDigest = sha256Canonical(carrier.boundaryPresentation as unknown as JsonValue);
  const presentationDigest = sha256Canonical(presentation as unknown as JsonValue);
  const reasons = carrierBoundaryDigest === presentationDigest ? [] : ["packet presentation must canonically equal carrier boundary presentation"];
  return Object.freeze({
    kind: "metroplat.causality-packet.presentation-witness" as const,
    ok: reasons.length === 0,
    carrierBoundaryDigest,
    presentationDigest,
    reasons: Object.freeze(reasons),
  });
}

export function causalityPacketFromCloudEvent(event: CloudEvent, options: ArrivalAdmissionOptions = {}): CausalityPacket {
  const admitted = cloudEventContract.assert(event, "arrival CloudEvent") as CloudEvent;
  const eventIdentity = cloudEventIdentity(admitted);
  const traceSettlement = settleCausalSet(arrivalTraceCausalSetCarrier);
  const generatedEndpoint = options.generatedEndpoint ?? generatedEndpointOfEvent(admitted) ?? defaultEndpoint("unknown");
  const carrier: CausalCarrierReadout = Object.freeze({
    kind: "metroplat.causal-carrier-readout" as const,
    generatedEndpoint,
    causalSupport: arrivalTraceCausalSetCarrier,
    observableSiteSupport: Object.freeze({
      protocol: "cloudevents",
      identity: eventIdentity,
      source: admitted.source,
      type: admitted.type,
      time: admitted.time,
    }) as JsonRecord,
    settlementReadout: Object.freeze({
      four: "potential",
      trace: traceSettlement.kind,
      stage: "arrival-admitted",
    }) as JsonRecord,
    ...(options.artifactAddress === undefined ? {} : { artifactAddress: options.artifactAddress }),
    boundaryPresentation: admitted,
  });
  const packet = Object.freeze({
    kind: "metroplat.causality-packet" as const,
    carrier,
    presentation: admitted,
    presentsCarrier: presentationCheck(carrier, admitted),
  });
  return packet;
}

export function admitCloudEventArrival(event: unknown, options: ArrivalAdmissionOptions = {}): ArrivalReceipt {
  const obstructions: string[] = [];
  let admitted: CloudEvent;
  try {
    admitted = cloudEventContract.assert(event, "arrival CloudEvent") as CloudEvent;
  } catch (error) {
    obstructions.push(error instanceof Error ? error.message : String(error));
    const data = requireJsonValue(event, "obstructed arrival CloudEvent material");
    const source = "urn:metroplat:arrival:obstruction";
    const type = "org.emsenn.metroplat.arrival.obstruction";
    const time = "0000-00-00T00:00:00.000Z";
    admitted = cloudEventContract.assert(Object.freeze({
      specversion: CLOUDEVENTS_SPECVERSION,
      id: defaultCloudEventId(source, type, time, data),
      source,
      type,
      time,
      datacontenttype: CLOUDEVENTS_DATA_CONTENT_TYPE,
      data,
    }), "obstructed arrival CloudEvent") as CloudEvent;
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
  const digest = sha256Canonical(packet as unknown as JsonValue);
  return Object.freeze({
    kind: "metroplat.arrival.receipt" as const,
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

export function arrivalReceiptWithAdmission(receipt: ArrivalReceipt, admission: ArrivalStatementWriteResult, packetPath: string): ArrivalReceipt {
  return Object.freeze({
    ...receipt,
    packetPath,
    admission,
  });
}

export function arrivalReceiptHandle(receipt: ArrivalReceipt): ArrivalReceiptHandle {
  return Object.freeze({
    kind: "metroplat.arrival.receipt-handle" as const,
    ok: receipt.ok,
    cloudEventIdentity: receipt.cloudEventIdentity,
    packetDigest: receipt.packetDigest,
    ...(receipt.packetPath === undefined ? {} : { packetPath: receipt.packetPath }),
    ...(receipt.admission?.artifact?.path === undefined ? {} : { logPath: receipt.admission.artifact.path }),
    obstructions: receipt.obstructions,
  });
}
