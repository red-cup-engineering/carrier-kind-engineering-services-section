import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

import { ARRIVAL_PROCESS_FEED, ARRIVAL_PROCESS_TERM, arrivalDispatchClaimFromCloudEvent } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { } from "@red-cup-engineering/json-services-section";

import { openJournal, journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import {
  arrivalLogPathForDate,
  readArrivalLogProjection,

} from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { dispatchWire } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt/row";

/** A receiver-local decision to bind received material to a local authority subject.
 * CloudEvent source and material claims are inputs to this decision, not authority. */

function stringAt(value, ...keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

function arrivalProcessingLogPath(logPath) {
  const { root, date } = journal.describe(logPath);
  return journal.feed(root, ARRIVAL_PROCESS_FEED, `${date}T00:00:00.000Z`, { subject: "arrival-processing" });
}

function processedArrivalIdentities(logPath) {
  const identities = new Set();
  journal.scan(arrivalProcessingLogPath(logPath), undefined, (_accum, row) => {
    const { a, v } = eavtRecord(row);
    if (canonicalJson(a) !== canonicalJson(ARRIVAL_PROCESS_TERM)) return undefined;
    if (stringAt(v, "state") !== "processed") return undefined;
    const identity = stringAt(v, "cloudEventIdentity");
    if (identity !== undefined) identities.add(identity);
    return undefined;
  });
  return identities;
}

function dispatchClaim(entry) {
  if (entry.packet === undefined) return undefined;
  try { return arrivalDispatchClaimFromCloudEvent(entry.packet.presentation); }
  catch { return undefined; }
}

function refuseBinding(reason) {
  return Object.freeze({
    kind: "metroplat.arrival.local-principal-binding",
    state: "refused",
    evidence: Object.freeze([]),
    reasons: Object.freeze([reason]),
  });
}

function resolvePrincipalBinding(
  entry,
  claim,
  bindPrincipal,
) {
  if (entry.cloudEventIdentity === undefined) return refuseBinding("arrival dispatch entry lacks CloudEvent identity");
  if (entry.packet === undefined || claim === undefined) return refuseBinding("arrival dispatch claim is not a valid admitted dispatch claim");
  if (bindPrincipal === undefined) return refuseBinding("arrival dispatch has no receiver-local principal binding");
  const request = Object.freeze({
    kind: "metroplat.arrival.local-principal-binding-request",
    cloudEventIdentity: entry.cloudEventIdentity,
    ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
    source: entry.packet.presentation.source,
    claim,
  });
  try {
    const binding = bindPrincipal(request);
    if (binding.kind !== "metroplat.arrival.local-principal-binding") return refuseBinding("arrival principal binding returned an unknown record");
    if (binding.state === "bound") {
      if (binding.subject.trim() === "") return refuseBinding("arrival principal binding did not supply a local subject");
      if (binding.evidence.length === 0) return refuseBinding("arrival principal binding lacks local evidence");
      return Object.freeze({
        kind: binding.kind,
        state: binding.state,
        subject: binding.subject,
        evidence: Object.freeze([...binding.evidence]),
        reasons: Object.freeze([...binding.reasons]),
      });
    }
    if (binding.state === "refused") return Object.freeze({
      kind: binding.kind,
      state: binding.state,
      evidence: Object.freeze([...binding.evidence]),
      reasons: Object.freeze([...binding.reasons]),
    });
    return refuseBinding("arrival principal binding returned an unknown state");
  } catch (error) {
    return refuseBinding(`arrival principal binding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function processingEntryValue(
  entry,
  state,
  obstructions,
  result,
) {
  const stdout = result?.stdout ?? "";
  const stderr = result?.stderr ?? "";
  return Object.freeze({
    // Frozen legacy wire discriminant; this value is a processing record.
    kind: "metroplat.arrival.processing-witness",
    ...(entry.cloudEventIdentity === undefined ? {} : { cloudEventIdentity: entry.cloudEventIdentity }),
    ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
    state,
    ...(entry.dispatchEvent?.verb === undefined ? {} : { verb: entry.dispatchEvent.verb }),
    ...(result === undefined ? {} : {
      code: result.code,
      stdout,
      stdoutBytes: Buffer.byteLength(stdout, "utf8"),
      stdoutSha256: sha256Hex(stdout),
      stderr,
      stderrBytes: Buffer.byteLength(stderr, "utf8"),
      stderrSha256: sha256Hex(stderr),
    }),
    obstructions,
  });
}

function arrivalProcessingRows(entries, at) {
  return Object.freeze(entries.map(({ entry, value }) => toEavt({
    e: Object.freeze({
      kind: "metroplat.arrival.processing",
      cloudEventIdentity: entry.cloudEventIdentity,
      packetDigest: entry.packetDigest,
    }),
    a: ARRIVAL_PROCESS_TERM,
    v: value,
    t: at,
  })));
}

function processingEntryFromValue(value) {
  const obstructionsValue = value["obstructions"];
  const obstructions = Array.isArray(obstructionsValue)
    ? obstructionsValue.filter((item) => typeof item === "string")
    : [];
  const state = value["state"];
  return Object.freeze({
    kind: "metroplat.arrival.processing-entry",
    ...(typeof value["cloudEventIdentity"] === "string" ? { cloudEventIdentity: value["cloudEventIdentity"] } : {}),
    ...(typeof value["packetDigest"] === "string" ? { packetDigest: value["packetDigest"] } : {}),
    state: state === "processed" || state === "skipped" || state === "obstructed" ? state : "obstructed",
    ...(typeof value["verb"] === "string" ? { verb: value["verb"] } : {}),
    ...(typeof value["code"] === "number" ? { code: value["code"] } : {}),
    ...(typeof value["stdoutBytes"] === "number" ? { stdoutBytes: value["stdoutBytes"] } : {}),
    ...(typeof value["stdoutSha256"] === "string" ? { stdoutSha256: value["stdoutSha256"] } : {}),
    ...(typeof value["stderrBytes"] === "number" ? { stderrBytes: value["stderrBytes"] } : {}),
    ...(typeof value["stderrSha256"] === "string" ? { stderrSha256: value["stderrSha256"] } : {}),
    obstructions: Object.freeze(obstructions),
  });
}

export async function processArrivalLogPath(
  operations,
  logPath,
  options,
) {
  const projection = readArrivalLogProjection(logPath, options);
  const catalog = createOperationCatalog(operations);
  const witness = journalRpcWitness(projection.root);
  const at = options.at;
  const processedIdentities = processedArrivalIdentities(logPath);
  const skipVerbs = new Set(options.skipVerbs ?? []);
  const processingRows = [];
  const entries = [];
  let dispatchCandidates = 0;
  let alreadyProcessed = 0;
  for (const entry of projection.entries) {
    if (entry.dispatchEvent === undefined) {
      entries.push(Object.freeze({
        kind: "metroplat.arrival.processing-entry",
        ...(entry.cloudEventIdentity === undefined ? {} : { cloudEventIdentity: entry.cloudEventIdentity }),
        ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
        state: "skipped",
        reason: "not-dispatch",
        obstructions: Object.freeze([]),
      }));
      continue;
    }
    dispatchCandidates += 1;
    if (entry.dispatchEvent.verb !== undefined && skipVerbs.has(entry.dispatchEvent.verb)) {
      entries.push(Object.freeze({
        kind: "metroplat.arrival.processing-entry",
        ...(entry.cloudEventIdentity === undefined ? {} : { cloudEventIdentity: entry.cloudEventIdentity }),
        ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
        state: "skipped",
        reason: "processor-verb",
        verb: entry.dispatchEvent.verb,
        obstructions: Object.freeze([]),
      }));
      continue;
    }
    if (entry.cloudEventIdentity !== undefined && processedIdentities.has(entry.cloudEventIdentity)) {
      alreadyProcessed += 1;
      entries.push(Object.freeze({
        kind: "metroplat.arrival.processing-entry",
        cloudEventIdentity: entry.cloudEventIdentity,
        ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
        state: "skipped",
        reason: "already-processed",
        ...(entry.dispatchEvent.verb === undefined ? {} : { verb: entry.dispatchEvent.verb }),
        obstructions: Object.freeze([]),
      }));
      continue;
    }
    const claim = dispatchClaim(entry);
    const obstructions = [...entry.obstructions];
    if (entry.cloudEventIdentity === undefined) obstructions.push("arrival dispatch entry lacks CloudEvent identity");
    if (entry.dispatchEvent.argv.length === 0) obstructions.push("arrival dispatch entry lacks argv");
    const binding = resolvePrincipalBinding(entry, claim, options.bindPrincipal);
    if (binding.state !== "bound") obstructions.push(...binding.reasons);
    if (obstructions.length > 0 || claim === undefined || binding.state !== "bound") {
      const value = processingEntryValue(entry, "obstructed", obstructions);
      processingRows.push(Object.freeze({ entry, value }));
      entries.push(processingEntryFromValue(value));
      continue;
    }
    const result = await dispatchWire(catalog, entry.dispatchEvent.argv, claim.stdin, {
      subject: binding.subject,
      caller: Object.freeze({
        transport: "arrival-processor",
        cloudEventIdentity: entry.cloudEventIdentity,
        subjectBindingEvidence: binding.evidence,
        ...(entry.dispatchEvent.caller === undefined ? {} : { boundaryCaller: entry.dispatchEvent.caller }),
      }),
      program: options.program ?? entry.dispatchEvent.program ?? "arrival-processor",
      now: () => at,
      witness,
    }, options.authorize);
    const value = processingEntryValue(entry, result.code === 0 ? "processed" : "obstructed", result.code === 0 ? [] : [result.stderr.trim() || "dispatch failed"], result);
    processingRows.push(Object.freeze({ entry, value }));
    entries.push(processingEntryFromValue(value));
  }
  const rows = arrivalProcessingRows(processingRows, at);
  const admission = rows.length === 0 ? undefined : openJournal(projection.root).appendRows(ARRIVAL_PROCESS_FEED, rows, {
    ...options,
    at,
    subject: options.subject ?? "arrival-processing",
    rootName: options.rootName ?? "@red-cup-engineering/metroplat",
    caller: options.caller ?? Object.freeze({ transport: "arrival-processor" }),
  });
  return Object.freeze({
    kind: "metroplat.arrival.processing-settlement",
    root: projection.root,
    date: projection.date,
    scanned: projection.entries.length,
    dispatchCandidates,
    alreadyProcessed,
    processed: entries.filter((entry) => entry.state === "processed").length,
    obstructed: entries.filter((entry) => entry.state === "obstructed").length,
    entries: Object.freeze(entries),
    ...(admission === undefined ? {} : { admission }),
  });
}

function arrivalProcessingDate(input, binding) {
  const explicit = stringAt(input, "date");
  return explicit === undefined ? binding.now().slice(0, 10) : explicit.slice(0, 10);
}

export function arrivalProcessingOperations(
  binding,
  operations,
  authorize,
) {
  return Object.freeze([
    operation({
      verb: "process-arrival",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Process admitted arrival packets for a date.",
      description: "Domain: { date? }. Consumes the shared admit-arrival log, executes admitted dispatch packets downstream, and records process-arrival statement rows keyed by CloudEvent identity.",
      run: (input) => {
        const at = binding.now();
        return processArrivalLogPath(operations, arrivalLogPathForDate(binding.dataRoot, arrivalProcessingDate(input, binding)), {
          ...binding,
          at,
          ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
          skipVerbs: Object.freeze(["process-arrival"]),
          authorize,
          ...(binding.bindPrincipal === undefined ? {} : { bindPrincipal: binding.bindPrincipal }),
        });
      },
    }),
  ]);
}
