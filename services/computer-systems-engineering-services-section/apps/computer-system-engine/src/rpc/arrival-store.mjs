import { join } from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

import { admitCloudEventArrival, arrivalDispatchClaimFromCloudEvent, arrivalReceiptWithAdmission, ARRIVAL_FEED } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { arrivalUtteranceFromCloudEvent, cloudEventContract } from "@red-cup-engineering/json-services-section/cloudevent-identity";

import { extend, append, readHead, walk, get } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { immutableContentKey } from "@red-cup-engineering/immutable-content-custody-service";
import { createFileStoreSync } from "@red-cup-engineering/immutable-content-custody-service/file-store";
import { makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { statementValue } from "@red-cup-engineering/eavt-services-section/statement";
import { address, utteranceCell } from "@red-cup-engineering/signcell/cell";

/** An uttered claim's reflexive SignCell and its address. */
const utteredCell = (token, claim) => { const told = utteranceCell(token, claim); return Object.freeze({ cell: told, address: address(told) }); };


/** @metroplatSubject arrival */

function packetDigest(value) {
  return sha256Hex(canonicalJson(value));
}

function stringAt(value, ...keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

function recordAt(value, ...keys) {
  let current = value;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current)[key];
  }
  return current;
}

function bytesOf(value) {
  return value === undefined ? undefined : Buffer.byteLength(value, "utf8");
}

function boundaryOperation(materialKind, endpoint) {
  if (materialKind === "metroplat.dispatch.arrival-material") return "dispatch";
  if (materialKind === "metroplat.mcp.arrival-material" || materialKind === "metroplat.mcp.projected-arrival-material") return "mcp";
  if (materialKind === "metroplat.http.arrival-material") return "http";
  if (materialKind === "metroplat.hook.arrival-material") return "hook";
  const verb = endpoint !== undefined && endpoint !== null && typeof endpoint === "object" && !Array.isArray(endpoint)
    ? stringAt(endpoint, "verb")
    : undefined;
  if (verb === "read") return "read";
  if (verb === "write") return "write";
  return "unknown";
}

function arrivalBoundaryEvent(event, endpoint) {
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
    kind: "metroplat.arrival.boundary-event",
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

function arrivalDispatchEvent(event) {
  let claim;
  try { claim = arrivalDispatchClaimFromCloudEvent(event); }
  catch { return undefined; }
  if (claim === undefined) return undefined;
  const transport = stringAt(event.data, "transport");
  return Object.freeze({
    kind: "metroplat.arrival.dispatch-event",
    state: "admitted",
    ...(transport === undefined ? {} : { transport }),
    ...(claim.program === undefined ? {} : { program: claim.program }),
    ...(claim.operation === undefined ? {} : { operation: claim.operation }),
    ...(claim.claimedSubject === undefined ? {} : { claimedSubject: claim.claimedSubject }),
    ...(claim.argv[0] === undefined ? {} : { verb: claim.argv[0] }),
    argv: claim.argv,
    stdinBytes: Buffer.byteLength(claim.stdin, "utf8"),
    stdinSha256: sha256Hex(claim.stdin),
    ...(claim.caller === undefined ? {} : { caller: claim.caller }),
  });
}

function arrivalPacketReference(record) {
  return Object.freeze({
    ...(typeof record.packetDigest === "string" ? { sha256: record.packetDigest } : {}),
    ...(typeof record.cloudEventIdentity === "string" ? { identity: record.cloudEventIdentity } : {}),
  });
}

function checkedPacket(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("arrival packet must be a JSON object");
  const record = value;
  if (record["kind"] !== "metroplat.causality-packet") throw new TypeError("arrival packet kind must be metroplat.causality-packet");
  const presentation = cloudEventContract.assert(record["presentation"], "arrival packet presentation");
  const packet = value;
  if (canonicalJson(packet.carrier.boundaryPresentation) !== canonicalJson(presentation)) {
    throw new TypeError("arrival packet presentation must equal carrier boundary presentation");
  }
  return packet;
}

function projectArrivalRecord(root, record, options) {
  const ref = arrivalPacketReference(record);
  const obstructions = [];
  let packet;
  let receipt;
  if (record.packet === undefined && record.packetNi === undefined) {
    obstructions.push("arrival record does not carry its packet");
  } else {
    try {
      const packetValue = readPacket(root, record, options);
      const digest = packetDigest(packetValue);
      if (ref.sha256 !== undefined && ref.sha256 !== digest) obstructions.push("arrival record packet sha256 does not match packet content");
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
  const predication = utterance === undefined ? undefined : utteredCell(
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
    kind: "metroplat.arrival.settlement-entry",
    ...(typeof record.rootName === "string" ? { rootName: record.rootName } : {}),
    ...(typeof record.at === "string" ? { at: record.at } : {}),
    ...(ref.identity === undefined ? {} : { cloudEventIdentity: ref.identity }),
    ...(ref.sha256 === undefined ? {} : { packetDigest: ref.sha256 }),
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

/** A record of at most this many bytes of canonical JSON holds its packet inline; a larger packet is bytes in content custody. */
const INLINE_PACKET_BYTES_MAX = 48 * 1024;

/** The content custody that holds the packets too large for a record: a directory beside the settlement's `data`. */
const custodyOf = (root, options = {}) => createFileStoreSync(options.custodyRoot ?? join(root, "custody"));

/** How an arrival record holds its packet: inline, or by the `ni:` address of its bytes in content custody. */
function packetHolding(root, packet, options) {
  const text = canonicalJson(packet);
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length <= INLINE_PACKET_BYTES_MAX) return Object.freeze({ packet });
  const ni = makeNiUri(bytes);
  custodyOf(root, options).putIfAbsent(immutableContentKey(ni), { body: bytes, mediaType: "application/json" });
  return Object.freeze({ packetNi: ni, packetBytes: bytes.length });
}

function readPacket(root, record, options) {
  if (record.packet !== undefined) return record.packet;
  const held = custodyOf(root, options).get(immutableContentKey(record.packetNi));
  if (held === null) throw new TypeError("arrival packet bytes are not held in content custody");
  if (!verifyNiUri(held.body, record.packetNi)) throw new TypeError("arrival packet bytes do not match their ni address");
  return JSON.parse(Buffer.from(held.body).toString("utf8"));
}

/** The record an arrival is: what the world must remember of it, once, at the address its content computes. */
export function arrivalRecord(receipt, at, rootName, holding) {
  const event = receipt.event;
  return Object.freeze({
    at,
    ...(rootName === undefined ? {} : { rootName }),
    ok: receipt.ok,
    packetDigest: receipt.packetDigest,
    cloudEventIdentity: receipt.cloudEventIdentity,
    cloudEvent: Object.freeze({ source: event.source, id: event.id, type: event.type, time: event.time }),
    traceSettlement: receipt.traceSettlement.kind,
    obstructions: receipt.obstructions,
    ...holding,
  });
}

/**
 * Admit one arrival: the record follows no cause (the same event at the same time is the same
 * record, written once), joins the day's head so peers converge on the day by `pull`, and one log
 * line names it by address for the readers that follow arrivals by time.
 */
export function appendArrivalAtRoot(root, event, options = {}) {
  const at = options.at ?? event.time;
  const receipt = admitCloudEventArrival(event);
  const record = arrivalRecord(receipt, at, options.rootName, packetHolding(root, receipt.packet, options));
  const day = at.slice(0, 10);
  const held = readHead(root, ARRIVAL_FEED, day)?.frontier ?? [];
  const arrived = extend(root, ARRIVAL_FEED, day, record, { causes: [] });
  if (!held.includes(arrived)) {
    append(root, ARRIVAL_FEED, { at, of: arrived, from: String(receipt.event.source).slice(0, 256), kind: String(receipt.event.type).slice(0, 256) });
  }
  const admission = Object.freeze({ type: ARRIVAL_FEED, thread: day, address: arrived });
  return Object.freeze({ ...arrivalReceiptWithAdmission(receipt, admission), ...(options.rootName === undefined ? {} : { rootName: options.rootName }) });
}

/** Exact owner-custody read, without enumerating the day's arrivals. */
export function readArrivalAtRoot(root,address,options={}) {
 const record=get(root,ARRIVAL_FEED,address);
 if(record===undefined)throw new TypeError('addressed arrival record is missing');
 const entry=projectArrivalRecord(root,record,options);
 if(record.ok!==true||entry.obstructions.length!==0||entry.packet===undefined)
  throw new TypeError('addressed arrival has invalid causality custody');
 const receipt=admitCloudEventArrival(entry.packet.presentation);
 if(receipt.ok!==true||receipt.cloudEventIdentity!==record.cloudEventIdentity||receipt.packetDigest!==record.packetDigest)
  throw new TypeError('addressed arrival differs from its admitted packet');
 return Object.freeze({record,receipt,event:entry.packet.presentation});
}

/** The most arrivals one day's reading follows. */
const DAY_LIMIT = 4096;

/** Read a day's arrivals: the records of the day's head, in order of their time. */
export function readArrivalProjection(root, date, options = {}) {
  const head = readHead(root, ARRIVAL_FEED, date);
  const records = [];
  let truncated = false;
  for (const step of walk(root, ARRIVAL_FEED, head?.frontier ?? [], { limit: options.limit ?? DAY_LIMIT })) {
    if (step.truncated === true) truncated = true;
    else if (step.record !== undefined) records.push(step);
  }
  records.sort((left, right) => (left.record.at < right.record.at ? -1 : left.record.at > right.record.at ? 1 : left.address < right.address ? -1 : 1));
  const entries = records.map(({ record }) => projectArrivalRecord(root, record, options));
  const transports = Object.freeze([...new Set(entries.flatMap((entry) => entry.transport === undefined ? [] : [entry.transport]))].sort());
  return Object.freeze({
    kind: "metroplat.arrival.day-settlement",
    root,
    date,
    rows: records.length,
    truncated,
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

export function filesystemArrivalOptions(
  dataRoot,
  namespace = "@red-cup-engineering/metroplat",
  options = {},
) {
  return Object.freeze({
    onArrival: (event) => appendArrivalAtRoot(dataRoot, event, {
      ...options,
      at: event.time,
      rootName: namespace,
    }),
  });
}
