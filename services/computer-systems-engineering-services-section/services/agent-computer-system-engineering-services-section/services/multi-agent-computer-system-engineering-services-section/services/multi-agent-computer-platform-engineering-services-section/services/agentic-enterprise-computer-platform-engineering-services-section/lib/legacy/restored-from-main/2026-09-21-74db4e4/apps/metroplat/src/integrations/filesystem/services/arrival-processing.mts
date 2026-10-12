import { canonicalBytes, sha256Hex } from "../../../lib/identity/index.mts";

import {
  ARRIVAL_PROCESS_FEED,
  ARRIVAL_PROCESS_TERM,
  arrivalDispatchClaimFromCloudEvent,
  type ArrivalDispatchClaim,
  type ArrivalLocalPrincipalBinder,
  type ArrivalLocalPrincipalBinding,
} from "../../../rpc/index.mts";
import { type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  eavtObject,
  toEavt,
  type EAVT,
} from "../../../lib/codecs/json/jsonl/eavt/index.mts";

import { openJournal, type JournalFeed, type JournalHandle, type RootEventWriteOptions, type EventWriteResult, journal } from "../../../journal/index.mts";
import {
  arrivalLogPathForDate,
  readArrivalLogProjection,
  type ArrivalProjectionEntry,
} from "./arrival.mts";
import { createOperationCatalog, operation, type Operation, type RpcAuthorize } from "../../../rpc/index.mts";
import { dispatchWire, type DispatchResult } from "../../cli/dispatch.mts";
import { journalRpcWitness } from "./rpc-witness.mts";

export interface ArrivalProcessingEntry {
  readonly kind: "metroplat.arrival.processing-entry";
  readonly cloudEventIdentity?: string;
  readonly packetDigest?: string;
  readonly state: "processed" | "skipped" | "obstructed";
  readonly reason?: string;
  readonly verb?: string;
  readonly code?: number;
  readonly stdoutBytes?: number;
  readonly stdoutSha256?: string;
  readonly stderrBytes?: number;
  readonly stderrSha256?: string;
  readonly obstructions: readonly string[];
}

export interface ArrivalProcessingResult {
  readonly kind: "metroplat.arrival.processing-settlement";
  readonly root: string;
  readonly date: string;
  readonly scanned: number;
  readonly dispatchCandidates: number;
  readonly alreadyProcessed: number;
  readonly processed: number;
  readonly obstructed: number;
  readonly entries: readonly ArrivalProcessingEntry[];
  readonly admission?: EventWriteResult;
}

/** A receiver-local decision to bind received material to a local authority subject.
 * CloudEvent source and material claims are inputs to this decision, not authority. */
export interface ArrivalProcessingOptions extends RootEventWriteOptions {
  readonly at?: string;
  readonly program?: string;
  readonly skipVerbs?: readonly string[];
  readonly authorize: RpcAuthorize;
  /** Required for dispatch: no remote receipt supplies authority by itself. */
  readonly bindPrincipal?: ArrivalLocalPrincipalBinder;
}

export interface ArrivalProcessingBinding {
  readonly dataRoot: string;
  readonly rootName?: string;
  readonly now?: () => string;
  /** Optional receiver-local principal resolver supplied by application composition. */
  readonly bindPrincipal?: ArrivalLocalPrincipalBinder;
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

function arrivalProcessingLogPath(logPath: JournalHandle): JournalFeed {
  const { root, date } = journal.describe(logPath);
  return journal.feed(root, ARRIVAL_PROCESS_FEED, `${date}T00:00:00.000Z`, { subject: "arrival-processing" });
}

function processedArrivalIdentities(logPath: JournalHandle): ReadonlySet<string> {
  const identities = new Set<string>();
  journal.scan(arrivalProcessingLogPath(logPath), undefined, (_accum, row) => {
    const { a, v } = eavtObject(row);
    if (canonicalBytes(a) !== canonicalBytes(ARRIVAL_PROCESS_TERM as unknown as JsonValue)) return undefined;
    if (stringAt(v, "state") !== "processed") return undefined;
    const identity = stringAt(v, "cloudEventIdentity");
    if (identity !== undefined) identities.add(identity);
    return undefined;
  });
  return identities;
}

function dispatchClaim(entry: ArrivalProjectionEntry): ArrivalDispatchClaim | undefined {
  if (entry.packet === undefined) return undefined;
  try { return arrivalDispatchClaimFromCloudEvent(entry.packet.presentation); }
  catch { return undefined; }
}

function refuseBinding(reason: string): ArrivalLocalPrincipalBinding {
  return Object.freeze({
    kind: "metroplat.arrival.local-principal-binding" as const,
    state: "refused" as const,
    evidence: Object.freeze([]),
    reasons: Object.freeze([reason]),
  });
}

function resolvePrincipalBinding(
  entry: ArrivalProjectionEntry,
  claim: ArrivalDispatchClaim | undefined,
  bindPrincipal: ArrivalLocalPrincipalBinder | undefined,
): ArrivalLocalPrincipalBinding {
  if (entry.cloudEventIdentity === undefined) return refuseBinding("arrival dispatch entry lacks CloudEvent identity");
  if (entry.packet === undefined || claim === undefined) return refuseBinding("arrival dispatch claim is not a valid admitted dispatch claim");
  if (bindPrincipal === undefined) return refuseBinding("arrival dispatch has no receiver-local principal binding");
  const request = Object.freeze({
    kind: "metroplat.arrival.local-principal-binding-request" as const,
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
  entry: ArrivalProjectionEntry,
  state: ArrivalProcessingEntry["state"],
  obstructions: readonly string[],
  result?: DispatchResult,
): JsonRecord {
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
  }) as JsonRecord;
}

function arrivalProcessingRows(entries: readonly { readonly entry: ArrivalProjectionEntry; readonly value: JsonRecord }[], at: string): readonly EAVT[] {
  return Object.freeze(entries.map(({ entry, value }) => toEavt({
    e: Object.freeze({
      kind: "metroplat.arrival.processing",
      cloudEventIdentity: entry.cloudEventIdentity,
      packetDigest: entry.packetDigest,
    }) as unknown as JsonValue,
    a: ARRIVAL_PROCESS_TERM as unknown as JsonValue,
    v: value,
    t: at,
  })));
}

function processingEntryFromValue(value: JsonRecord): ArrivalProcessingEntry {
  const obstructionsValue = value["obstructions"];
  const obstructions = Array.isArray(obstructionsValue)
    ? obstructionsValue.filter((item): item is string => typeof item === "string")
    : [];
  const state = value["state"];
  return Object.freeze({
    kind: "metroplat.arrival.processing-entry" as const,
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
  operations: readonly Operation[],
  logPath: JournalHandle,
  options: ArrivalProcessingOptions,
): Promise<ArrivalProcessingResult> {
  const projection = readArrivalLogProjection(logPath);
  const catalog = createOperationCatalog(operations);
  const witness = journalRpcWitness(projection.root);
  const at = options.at ?? new Date().toISOString();
  const processedIdentities = processedArrivalIdentities(logPath);
  const skipVerbs = new Set(options.skipVerbs ?? []);
  const processingRows: { readonly entry: ArrivalProjectionEntry; readonly value: JsonRecord }[] = [];
  const entries: ArrivalProcessingEntry[] = [];
  let dispatchCandidates = 0;
  let alreadyProcessed = 0;
  for (const entry of projection.entries) {
    if (entry.dispatchEvent === undefined) {
      entries.push(Object.freeze({
        kind: "metroplat.arrival.processing-entry" as const,
        ...(entry.cloudEventIdentity === undefined ? {} : { cloudEventIdentity: entry.cloudEventIdentity }),
        ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
        state: "skipped" as const,
        reason: "not-dispatch",
        obstructions: Object.freeze([]),
      }));
      continue;
    }
    dispatchCandidates += 1;
    if (entry.dispatchEvent.verb !== undefined && skipVerbs.has(entry.dispatchEvent.verb)) {
      entries.push(Object.freeze({
        kind: "metroplat.arrival.processing-entry" as const,
        ...(entry.cloudEventIdentity === undefined ? {} : { cloudEventIdentity: entry.cloudEventIdentity }),
        ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
        state: "skipped" as const,
        reason: "processor-verb",
        verb: entry.dispatchEvent.verb,
        obstructions: Object.freeze([]),
      }));
      continue;
    }
    if (entry.cloudEventIdentity !== undefined && processedIdentities.has(entry.cloudEventIdentity)) {
      alreadyProcessed += 1;
      entries.push(Object.freeze({
        kind: "metroplat.arrival.processing-entry" as const,
        cloudEventIdentity: entry.cloudEventIdentity,
        ...(entry.packetDigest === undefined ? {} : { packetDigest: entry.packetDigest }),
        state: "skipped" as const,
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
      }) as JsonValue,
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
    kind: "metroplat.arrival.processing-settlement" as const,
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

function arrivalProcessingDate(input: unknown, binding: ArrivalProcessingBinding): string {
  const explicit = stringAt(input, "date");
  return explicit === undefined ? (binding.now?.() ?? new Date().toISOString()).slice(0, 10) : explicit.slice(0, 10);
}

export function arrivalProcessingOperations(
  binding: ArrivalProcessingBinding,
  operations: readonly Operation[],
  authorize: RpcAuthorize,
): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "process-arrival",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Process admitted arrival packets for a date.",
      description: "Domain: { date? }. Consumes the shared admit-arrival log, executes admitted dispatch packets downstream, and records process-arrival statement rows keyed by CloudEvent identity.",
      run: (input: unknown): Promise<ArrivalProcessingResult> => {
        const at = binding.now?.() ?? new Date().toISOString();
        return processArrivalLogPath(operations, arrivalLogPathForDate(binding.dataRoot, arrivalProcessingDate(input, binding)), {
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
