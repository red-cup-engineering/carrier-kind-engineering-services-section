import { canonicalBytes, sha256Hex } from "../../../lib/identity/index.mts";

import {
  admitCloudEventArrival,
  arrivalReceiptWithAdmission,
  ARRIVAL_ADMISSION_TERM,
  ARRIVAL_FEED,
  type CausalityPacket,
  type ArrivalReceipt,
} from "../../../rpc/index.mts";
import { type JsonRecord, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { arrivalUtteranceFromCloudEvent, cloudEventContract, type CloudEvent } from "../../../lib/codecs/cloudevents/index.mts";
import { eavtObject, toEavt, type EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";

import type { DataArtifactHandle } from "../../../lib/addressing/index.mts";
import { writeFileAtomic } from "../../../lib/filesystem/index.mts";
import { openJournal, type FilesystemJournal, type JournalFeed, type JournalHandle, type RootEventWriteOptions, journal } from "../../../journal/index.mts";
import { statementValue } from "../../../lib/records/persistence.mts";
import { utteredClaimIdentity } from "../../../lib/logic/predicating/predication.mts";

export interface ArrivalAppendOptions extends RootEventWriteOptions {
  readonly at?: string;
}

export interface ArrivalProjectionEntry {
  readonly kind: "metroplat.arrival.settlement-entry";
  readonly at?: string;
  readonly cloudEventIdentity?: string;
  readonly packetDigest?: string;
  readonly packetPath?: string;
  readonly packet?: CausalityPacket;
  readonly presentationCheck?: {
    readonly ok: boolean;
    readonly carrierBoundaryDigest: string;
    readonly presentationDigest: string;
  };
  readonly traceSettlement?: ArrivalReceipt["traceSettlement"];
  readonly utterance?: ArrivalReceipt["utterance"];
  readonly predication?: ReturnType<typeof utteredClaimIdentity>;
  readonly transport?: string;
  readonly endpoint?: JsonValue;
  readonly materialKind?: string;
  readonly settlement?: JsonRecord;
  readonly boundaryEvent?: ArrivalBoundaryEvent;
  readonly dispatchEvent?: ArrivalDispatchEvent;
  readonly obstructions: readonly string[];
}

export interface ArrivalBoundaryEvent {
  readonly kind: "metroplat.arrival.boundary-event";
  readonly materialKind: string;
  readonly transport?: string;
  readonly operation: "dispatch" | "read" | "write" | "http" | "mcp" | "hook" | "unknown";
  readonly method?: string;
  readonly path?: string;
  readonly routedPath?: string;
  readonly verb?: string;
  readonly token?: string;
  readonly bodyBytes?: number;
  readonly claimDigest?: string;
}

export interface ArrivalDispatchEvent {
  readonly kind: "metroplat.arrival.dispatch-event";
  readonly state: "admitted";
  readonly transport?: string;
  readonly program?: string;
  /** Subject whose admitted capability must authorize the queued operation. */
  readonly subject?: string;
  readonly verb?: string;
  readonly argv: readonly string[];
  readonly stdinBytes: number;
  readonly stdinSha256: string;
  readonly caller?: JsonValue;
}

/** @metroplatSubject arrival */
export interface ArrivalLogProjection {
  readonly kind: "metroplat.arrival.log-settlement";
  readonly root: string;
  readonly date: string;
  readonly rows: number;
  readonly processed: number;
  readonly validPackets: number;
  readonly obstructedPackets: number;
  readonly utterances: number;
  readonly predications: number;
  readonly settlements: number;
  readonly boundaryEvents: number;
  readonly dispatchEvents: number;
  readonly transports: readonly string[];
  readonly entries: readonly ArrivalProjectionEntry[];
}

export interface FilesystemArrivalOptions {
  readonly onArrival: (event: CloudEvent) => ArrivalReceipt;
}

function packetDigest(value: JsonValue): string {
  return sha256Hex(canonicalBytes(value));
}

function writePacket(store: FilesystemJournal, at: string, receipt: ArrivalReceipt): { readonly digest: string; readonly path: string; readonly relativePath: string; readonly bytes: number } {
  const packet = store.storePacket(at, canonicalBytes(receipt.packet as unknown as JsonValue));
  return Object.freeze({
    digest: packet.sha256,
    path: packet.path,
    relativePath: packet.relativePath,
    bytes: packet.bytes,
  });
}

function stringAt(value: unknown, ...keys: readonly string[]): string | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, unknown>>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

function recordAt(value: JsonValue, ...keys: readonly string[]): JsonValue | undefined {
  let current: JsonValue | undefined = value;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Readonly<Record<string, JsonValue>>)[key];
  }
  return current;
}

function stringsAt(value: JsonValue | undefined, key: string): readonly string[] | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = (value as Readonly<Record<string, JsonValue>>)[key];
  if (!Array.isArray(candidate)) return undefined;
  const strings = candidate.filter((entry): entry is string => typeof entry === "string");
  return Object.freeze(strings);
}

function bytesOf(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Buffer.byteLength(value, "utf8");
}

function boundaryOperation(materialKind: string, endpoint: JsonValue | undefined): ArrivalBoundaryEvent["operation"] {
  if (materialKind === "metroplat.dispatch.arrival-material") return "dispatch";
  if (materialKind === "metroplat.mcp.arrival-material") return "mcp";
  if (materialKind === "metroplat.http.arrival-material") return "http";
  if (materialKind === "metroplat.hook.arrival-material") return "hook";
  const verb = endpoint !== undefined && endpoint !== null && typeof endpoint === "object" && !Array.isArray(endpoint)
    ? stringAt(endpoint, "verb")
    : undefined;
  if (verb === "read") return "read";
  if (verb === "write") return "write";
  return "unknown";
}

function arrivalBoundaryEvent(event: CloudEvent, endpoint: JsonValue | undefined): ArrivalBoundaryEvent | undefined {
  const material = recordAt(event.data, "material");
  if (material === undefined || material === null || typeof material !== "object" || Array.isArray(material)) return undefined;
  const materialKind = stringAt(material, "kind");
  if (materialKind === undefined) return undefined;
  const transport = recordAt(event.data, "transport");
  const operation = boundaryOperation(materialKind, endpoint);
  const body = stringAt(material, "body");
  const claim = recordAt(material, "claim");
  const method = stringAt(material, "method");
  const materialPath = stringAt(material, "path");
  const routedPath = stringAt(material, "routedPath");
  const endpointVerb = endpoint !== undefined && endpoint !== null && typeof endpoint === "object" && !Array.isArray(endpoint) ? stringAt(endpoint, "verb") : undefined;
  const token = stringAt(material, "token");
  const bodyBytes = bytesOf(body);
  return Object.freeze({
    kind: "metroplat.arrival.boundary-event" as const,
    materialKind,
    ...(typeof transport === "string" ? { transport } : {}),
    operation,
    ...(method === undefined ? {} : { method }),
    ...(materialPath === undefined ? {} : { path: materialPath }),
    ...(routedPath === undefined ? {} : { routedPath }),
    ...(endpointVerb === undefined ? {} : { verb: endpointVerb }),
    ...(token === undefined ? {} : { token }),
    ...(bodyBytes === undefined ? {} : { bodyBytes }),
    ...(claim === undefined ? {} : { claimDigest: packetDigest(claim) }),
  });
}

function arrivalDispatchEvent(event: CloudEvent): ArrivalDispatchEvent | undefined {
  const material = recordAt(event.data, "material");
  if (material === undefined || material === null || typeof material !== "object" || Array.isArray(material)) return undefined;
  if (stringAt(material, "kind") !== "metroplat.dispatch.arrival-material") return undefined;
  const argv = stringsAt(material, "argv") ?? Object.freeze([]);
  const stdin = stringAt(material, "stdin") ?? "";
  const caller = recordAt(material, "caller");
  const transport = stringAt(event.data, "transport");
  const program = stringAt(material, "program");
  const subject = stringAt(material, "subject");
  return Object.freeze({
    kind: "metroplat.arrival.dispatch-event" as const,
    state: "admitted" as const,
    ...(transport === undefined ? {} : { transport }),
    ...(program === undefined ? {} : { program }),
    ...(subject === undefined ? {} : { subject }),
    ...(argv[0] === undefined ? {} : { verb: argv[0] }),
    argv,
    stdinBytes: Buffer.byteLength(stdin, "utf8"),
    stdinSha256: sha256Hex(stdin),
    ...(caller === undefined ? {} : { caller }),
  });
}

function arrivalPacketReference(row: EAVT): { readonly path?: string; readonly sha256?: string; readonly identity?: string } {
  const { e, v } = eavtObject(row);
  const packetPath = stringAt(recordAt(v, "packet"), "path");
  const sha256 = stringAt(recordAt(v, "packet"), "sha256") ?? stringAt(e, "sha256");
  const identity = stringAt(recordAt(v, "cloudEvent"), "identity") ?? stringAt(e, "cloudEventIdentity");
  return Object.freeze({
    ...(packetPath === undefined ? {} : { path: packetPath }),
    ...(sha256 === undefined ? {} : { sha256 }),
    ...(identity === undefined ? {} : { identity }),
  });
}

function checkedPacket(value: JsonValue): CausalityPacket {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("arrival packet must be a JSON object");
  const record = value as Readonly<Record<string, JsonValue>>;
  if (record["kind"] !== "metroplat.causality-packet") throw new TypeError("arrival packet kind must be metroplat.causality-packet");
  const presentation = cloudEventContract.assert(record["presentation"], "arrival packet presentation") as CloudEvent;
  const packet = value as unknown as CausalityPacket;
  if (canonicalBytes(packet.carrier.boundaryPresentation as unknown as JsonValue) !== canonicalBytes(presentation as unknown as JsonValue)) {
    throw new TypeError("arrival packet presentation must equal carrier boundary presentation");
  }
  return packet;
}

function projectArrivalRow(log: JournalHandle, row: EAVT): ArrivalProjectionEntry {
  const { t } = eavtObject(row);
  const ref = arrivalPacketReference(row);
  const obstructions: string[] = [];
  let packet: CausalityPacket | undefined;
  let receipt: ArrivalReceipt | undefined;
  if (ref.path === undefined) {
    obstructions.push("arrival row does not carry packet.path");
  } else {
    try {
      const packetValue = journal.readPacket(log, ref.path);
      const digest = packetDigest(packetValue);
      if (ref.sha256 !== undefined && ref.sha256 !== digest) obstructions.push("arrival row packet sha256 does not match packet content");
      packet = checkedPacket(packetValue);
      receipt = admitCloudEventArrival(packet.presentation, {
        generatedEndpoint: packet.carrier.generatedEndpoint,
        ...(packet.carrier.artifactAddress === undefined ? {} : { artifactAddress: packet.carrier.artifactAddress }),
      });
      if (receipt.packet.presentsCarrier.carrierBoundaryDigest !== packet.presentsCarrier.carrierBoundaryDigest) {
        obstructions.push("arrival packet presentation digest differs from the recomputed digest");
      }
    } catch (error) {
      obstructions.push(error instanceof Error ? error.message : String(error));
    }
  }
  const event = packet?.presentation;
  const utterance = event === undefined ? undefined : arrivalUtteranceFromCloudEvent(event);
  const predication = utterance === undefined ? undefined : utteredClaimIdentity(
    statementValue(utterance.token.mark.value, "arrival utterance token"),
    statementValue(utterance.claim.mark.value, "arrival utterance claim"),
  );
  const eventData = event?.data;
  const transport = eventData !== undefined && eventData !== null && typeof eventData === "object" && !Array.isArray(eventData)
    ? stringAt(eventData, "transport")
    : undefined;
  const endpoint = event === undefined ? undefined : recordAt(event.data, "endpoint");
  const materialKind = event === undefined ? undefined : stringAt(recordAt(event.data, "material"), "kind");
  const boundaryEvent = event === undefined ? undefined : arrivalBoundaryEvent(event, endpoint);
  const dispatchEvent = event === undefined ? undefined : arrivalDispatchEvent(event);
  return Object.freeze({
    kind: "metroplat.arrival.settlement-entry" as const,
    ...(typeof t === "string" ? { at: t } : {}),
    ...(ref.identity === undefined ? {} : { cloudEventIdentity: ref.identity }),
    ...(ref.sha256 === undefined ? {} : { packetDigest: ref.sha256 }),
    ...(ref.path === undefined ? {} : { packetPath: ref.path }),
    ...(packet === undefined ? {} : { packet }),
    ...(packet === undefined ? {} : { presentationCheck: Object.freeze({
      ok: packet.presentsCarrier.ok,
      carrierBoundaryDigest: packet.presentsCarrier.carrierBoundaryDigest,
      presentationDigest: packet.presentsCarrier.presentationDigest,
    }) }),
    ...(receipt === undefined ? {} : { traceSettlement: receipt.traceSettlement }),
    ...(utterance === undefined ? {} : { utterance }),
    ...(predication === undefined ? {} : { predication }),
    ...(transport === undefined ? {} : { transport }),
    ...(endpoint === undefined ? {} : { endpoint }),
    ...(materialKind === undefined ? {} : { materialKind }),
    ...(packet === undefined ? {} : { settlement: packet.carrier.settlementReadout }),
    ...(boundaryEvent === undefined ? {} : { boundaryEvent }),
    ...(dispatchEvent === undefined ? {} : { dispatchEvent }),
    obstructions: Object.freeze([...obstructions, ...(receipt?.obstructions ?? [])]),
  });
}

function isArrivalAdmissionRow(row: EAVT): boolean {
  return canonicalBytes(eavtObject(row).a) === canonicalBytes(ARRIVAL_ADMISSION_TERM as unknown as JsonValue);
}

function hasArrivalAdmissionRows(logPath: JournalHandle): boolean {
  let found = false;
  journal.scan(logPath, undefined, (_accum, row) => {
    if (isArrivalAdmissionRow(row)) found = true;
    return undefined;
  });
  return found;
}

export function arrivalStatementRows(receipt: ArrivalReceipt, packet: { readonly relativePath: string; readonly bytes: number }, at: string): readonly EAVT[] {
  const event = receipt.event;
  const value: JsonRecord = Object.freeze({
    // Frozen legacy wire discriminant; this value is the recorded source admission.
    kind: "metroplat.arrival.source-witness",
    ok: receipt.ok,
    packet: Object.freeze({
      mediaType: "application/json",
      sha256: receipt.packetDigest,
      bytes: packet.bytes,
      href: `blob:sha256:${receipt.packetDigest}`,
      path: packet.relativePath,
    }),
    cloudEvent: Object.freeze({
      identity: receipt.cloudEventIdentity,
      source: event.source,
      id: event.id,
      type: event.type,
      time: event.time,
    }),
    traceSettlement: receipt.traceSettlement.kind,
    obstructions: receipt.obstructions,
  });
  return Object.freeze([
    toEavt({
      e: Object.freeze({
        kind: "metroplat.arrival.packet",
        sha256: receipt.packetDigest,
        cloudEventIdentity: receipt.cloudEventIdentity,
      }) as unknown as JsonValue,
      a: ARRIVAL_ADMISSION_TERM as unknown as JsonValue,
      v: value,
      t: at,
    }),
  ]);
}

export function appendArrivalAtRoot(root: string, event: CloudEvent, options: ArrivalAppendOptions = {}): ArrivalReceipt {
  const at = options.at ?? event.time ?? new Date().toISOString();
  const store = openJournal(root);
  const receipt = admitCloudEventArrival(event);
  const packet = writePacket(store, at, receipt);
  const admission = store.appendRows(ARRIVAL_FEED, arrivalStatementRows(receipt, packet, at), {
    ...options,
    at,
    rootName: options.rootName ?? "@red-cup-engineering/metroplat",
    subject: options.subject ?? "arrival",
    caller: options.caller ?? Object.freeze({
      transport: "arrival-admission",
      cloudEventIdentity: receipt.cloudEventIdentity,
    }),
  });
  return arrivalReceiptWithAdmission(receipt, admission, packet.relativePath);
}

export function readArrivalLogProjection(logPath: JournalHandle): ArrivalLogProjection {
  const description = journal.describe(logPath);
  const entries: ArrivalProjectionEntry[] = [];
  const folded = journal.scan(logPath, undefined, (_accum, row) => {
    entries.push(projectArrivalRow(logPath, row));
    return undefined;
  });
  const transports = Object.freeze([...new Set(entries.flatMap((entry) => entry.transport === undefined ? [] : [entry.transport]))].sort());
  return Object.freeze({
    kind: "metroplat.arrival.log-settlement" as const,
    root: description.root,
    date: description.date,
    rows: folded.rows,
    processed: entries.length,
    validPackets: entries.filter((entry) => entry.obstructions.length === 0).length,
    obstructedPackets: entries.filter((entry) => entry.obstructions.length > 0).length,
    utterances: entries.filter((entry) => entry.utterance !== undefined).length,
    predications: entries.filter((entry) => entry.predication !== undefined).length,
    settlements: entries.filter((entry) => entry.settlement !== undefined).length,
    boundaryEvents: entries.filter((entry) => entry.boundaryEvent !== undefined).length,
    dispatchEvents: entries.filter((entry) => entry.dispatchEvent !== undefined).length,
    transports,
    entries: Object.freeze(entries),
  });
}

export function arrivalLogPathForDate(root: string, date: string): JournalFeed {
  return journal.feed(root, ARRIVAL_FEED, `${date}T00:00:00.000Z`, { subject: "arrival" });
}

export function projectArrivalLogPathState(logArtifact: DataArtifactHandle): ArrivalLogProjection | undefined {
  if (!hasArrivalAdmissionRows(logArtifact)) return undefined;
  const projection = readArrivalLogProjection(logArtifact);
  writeFileAtomic(journal.projectPath(logArtifact, "state", "json"), `${canonicalBytes(projection as unknown as JsonValue)}\n`);
  return projection;
}

export function filesystemArrivalOptions(
  dataRoot: string,
  namespace = "@red-cup-engineering/metroplat",
  options: ArrivalAppendOptions = {},
): FilesystemArrivalOptions {
  return Object.freeze({
    onArrival: (event: CloudEvent): ArrivalReceipt => appendArrivalAtRoot(dataRoot, event, {
      ...options,
      at: event.time,
      rootName: namespace,
    }),
  });
}
