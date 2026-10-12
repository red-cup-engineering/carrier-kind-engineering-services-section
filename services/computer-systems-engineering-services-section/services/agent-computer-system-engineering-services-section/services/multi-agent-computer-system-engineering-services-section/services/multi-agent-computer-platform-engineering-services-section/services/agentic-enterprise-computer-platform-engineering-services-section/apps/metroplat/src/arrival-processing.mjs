import {processingEntryValue,arrivalProcessingRecord,requestProcessingThread,processingEntryFromValue,actorRequestProcessing} from '@red-cup-engineering/computer-system-engine/rpc/actor-processing';
export {processAdmittedActorRequest} from '@red-cup-engineering/computer-system-engine/rpc/actor-processing';
import { processLeaseCoordinator } from '@red-cup-engineering/computer-system-engine/rpc/coordination';

import { ARRIVAL_PROCESS_FEED, arrivalDispatchClaimFromCloudEvent } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { } from "@red-cup-engineering/json-services-section";

import { extend } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { readArrivalProjection } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { dispatchWire } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";

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
        operation:claim.operation,
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

/**
 * Process the admitted arrivals of one day at a data root: each dispatch arrival not yet processed is
 * run under its bound principal, and each transition is the next record of its request's thread
 * (`arrival-processing`, found by the request's identity).
 */
export async function processArrivals(
  operations,
  root,
  date,
  options,
) {
  const projection = readArrivalProjection(root, date, options);
  const catalog = createOperationCatalog(operations);
  const witness = journalRpcWitness(root);
  const at = options.at;
  const skipVerbs = new Set(options.skipVerbs ?? []);
  const processingRows = [];
  const entries = [];
  let dispatchCandidates = 0;
  let alreadyProcessed = 0;
  for (const entry of projection.entries) {
    if(options.onlyIdentity!==undefined&&entry.cloudEventIdentity!==options.onlyIdentity)continue;
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
    // Signed actor work executes in its addressed inbox, including payment admission.
    // A day-wide collector cannot replay it as an unpriced generic operation.
    const wire=entry.packet?.presentation?.data;
    if(wire?.profile==='org.harmonious-union.activitypub.cloudevent.a2a-sen.v1'&&wire.transport==='A2A'){
      entries.push(Object.freeze({kind:'metroplat.arrival.processing-entry',
        cloudEventIdentity:entry.cloudEventIdentity,state:'skipped',reason:'actor-inbox-dispatch',obstructions:Object.freeze([])}));
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
    const immediate=entry.cloudEventIdentity===undefined?undefined:actorRequestProcessing(root,entry.cloudEventIdentity);
    if (entry.cloudEventIdentity !== undefined && immediate?.state==='processed') {
      alreadyProcessed += 1;
      entries.push(Object.freeze({...immediate,replayed:true}));
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
      operation:claim.operation,
      subject: binding.subject,
      caller: Object.freeze({
        transport: "arrival-processor",
        cloudEventIdentity: entry.cloudEventIdentity,
        subjectBindingEvidence: binding.evidence,
        ...(entry.dispatchEvent.caller === undefined ? {} : { boundaryCaller: entry.dispatchEvent.caller }),
      }),
      program: options.program ?? entry.dispatchEvent.program ?? "arrival-processor",
      request:entry.cloudEventIdentity,
      coordinate:options.coordinate??processLeaseCoordinator(root),
      now: () => at,
      witness,
    }, options.authorize);
    const value = processingEntryValue(entry, result.code === 0 ? "processed" : "obstructed", result.code === 0 ? [] : [result.stderr.trim() || "dispatch failed"], result);
    processingRows.push(Object.freeze({ entry, value }));
    entries.push(processingEntryFromValue(value));
  }
  for (const { value } of processingRows) {
    if (typeof value.cloudEventIdentity === "string") extend(root, ARRIVAL_PROCESS_FEED, requestProcessingThread(value.cloudEventIdentity), arrivalProcessingRecord(value, at));
  }
  return Object.freeze({
    kind: "metroplat.arrival.processing-settlement",
    root: root,
    date,
    scanned: projection.entries.length,
    dispatchCandidates,
    alreadyProcessed,
    processed: entries.filter((entry) => entry.state === "processed").length,
    obstructed: entries.filter((entry) => entry.state === "obstructed").length,
    entries: Object.freeze(entries),
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
      description: "Domain: { date? }. Consumes the day's arrivals, executes admitted dispatch packets downstream, and records each transition on its request's processing thread, keyed by CloudEvent identity.",
      run: (input) => {
        const at = binding.now();
        return processArrivals(operations, binding.dataRoot, arrivalProcessingDate(input, binding), {
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
