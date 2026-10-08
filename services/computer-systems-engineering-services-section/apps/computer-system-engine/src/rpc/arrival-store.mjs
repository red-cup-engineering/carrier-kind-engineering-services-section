import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-data-service/integrity";

import { admitCloudEventArrival, arrivalDispatchClaimFromCloudEvent, arrivalReceiptWithAdmission, ARRIVAL_ADMISSION_TERM, ARRIVAL_FEED } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { } from "@red-cup-engineering/json-services-section";
import { arrivalUtteranceFromCloudEvent, cloudEventContract } from "@red-cup-engineering/json-services-section/cloudevent-identity";

import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";
import { openJournal, journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { journalAppendAddress } from "@red-cup-engineering/computer-system-engine/journal/filesystem/operations";
import { statementValue } from "@red-cup-engineering/eavt/statement";
import { address, utteranceCell } from "@red-cup-engineering/signcell/cell";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt/row";

/** An uttered claim's reflexive SignCell and its address. */
const utteredCell = (token, claim) => { const told = utteranceCell(token, claim); return Object.freeze({ cell: told, address: address(told) }); };


/** @metroplatSubject arrival */

function packetDigest(value) {
  return sha256Hex(canonicalJson(value));
}

function writePacket(store, at, receipt) {
  const packet = store.storePacket(at, canonicalJson(receipt.packet));
  return Object.freeze({
    digest: packet.sha256,
    path: packet.path,
    relativePath: packet.relativePath,
    bytes: packet.bytes,
  });
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
    ...(claim.claimedSubject === undefined ? {} : { claimedSubject: claim.claimedSubject }),
    ...(claim.argv[0] === undefined ? {} : { verb: claim.argv[0] }),
    argv: claim.argv,
    stdinBytes: Buffer.byteLength(claim.stdin, "utf8"),
    stdinSha256: sha256Hex(claim.stdin),
    ...(claim.caller === undefined ? {} : { caller: claim.caller }),
  });
}

function arrivalPacketReference(row) {
  const { e, v } = eavtRecord(row);
  const packetPath = stringAt(recordAt(v, "packet"), "path");
  const sha256 = stringAt(recordAt(v, "packet"), "sha256") ?? stringAt(e, "sha256");
  const identity = stringAt(recordAt(v, "cloudEvent"), "identity") ?? stringAt(e, "cloudEventIdentity");
  return Object.freeze({
    ...(packetPath === undefined ? {} : { path: packetPath }),
    ...(sha256 === undefined ? {} : { sha256 }),
    ...(identity === undefined ? {} : { identity }),
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

function projectArrivalRow(log, row, options) {
  const { t, v } = eavtRecord(row);
  const ref = arrivalPacketReference(row);
  const obstructions = [];
  let packet;
  let receipt;
  if (ref.path === undefined) {
    obstructions.push("arrival row does not carry packet.path");
  } else {
    try {
      const packetValue = journal.readPacket(log, ref.path, options);
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
    ...(typeof v?.rootName === "string" ? { rootName: v.rootName } : {}),
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

function isArrivalAdmissionRow(row) {
  return canonicalJson(eavtRecord(row).a) === canonicalJson(ARRIVAL_ADMISSION_TERM);
}

function hasArrivalAdmissionRows(logPath) {
  let found = false;
  journal.scan(logPath, undefined, (_accum, row) => {
    if (isArrivalAdmissionRow(row)) found = true;
    return undefined;
  });
  return found;
}

export function arrivalStatementRows(receipt, packet, at, rootName) {
  const event = receipt.event;
  const value = Object.freeze({
    // Frozen legacy wire discriminant; this value is the recorded source admission.
    kind: "metroplat.arrival.source-witness",
    rootName,
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
      }),
      a: ARRIVAL_ADMISSION_TERM,
      v: value,
      t: at,
    }),
  ]);
}

export function appendArrivalAtRoot(root, event, options = {}) {
  const at = options.at ?? event.time;
  const store = openJournal(root);
  const rootName = journalAppendAddress(root, ARRIVAL_FEED, at, options).rootName;
  const receipt = admitCloudEventArrival(event);
  const packet = writePacket(store, at, receipt);
  const admission = store.appendRows(ARRIVAL_FEED, arrivalStatementRows(receipt, packet, at, rootName), {
    ...options,
    at,
    rootName,
    subject: options.subject ?? "arrival",
    caller: options.caller ?? Object.freeze({
      transport: "arrival-admission",
      cloudEventIdentity: receipt.cloudEventIdentity,
    }),
  });
  return Object.freeze({ ...arrivalReceiptWithAdmission(receipt, admission, packet.relativePath), rootName });
}

export function readArrivalLogProjection(logPath, options) {
  const description = journal.describe(logPath);
  const entries = [];
  const folded = journal.scan(logPath, undefined, (_accum, row) => {
    entries.push(projectArrivalRow(logPath, row, options));
    return undefined;
  });
  const transports = Object.freeze([...new Set(entries.flatMap((entry) => entry.transport === undefined ? [] : [entry.transport]))].sort());
  return Object.freeze({
    kind: "metroplat.arrival.log-settlement",
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

export function arrivalLogPathForDate(root, date) {
  return journal.feed(root, ARRIVAL_FEED, `${date}T00:00:00.000Z`, { subject: "arrival" });
}

export function projectArrivalLogPathState(logArtifact, options) {
  if (!hasArrivalAdmissionRows(logArtifact)) return undefined;
  const projection = readArrivalLogProjection(logArtifact, options);
  writeFileAtomic(journal.projectPath(logArtifact, "state", "json"), `${canonicalJson(projection)}\n`);
  return projection;
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
