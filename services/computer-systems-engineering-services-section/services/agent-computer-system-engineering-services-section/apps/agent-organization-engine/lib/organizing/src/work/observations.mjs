import { workSourceClosureContract, workSourceResultContract } from "./schema.mjs";
/**
 * running/work-item-observations — claim-session admit rows read as
 * `WorkItemObservation`s (`src/work/causal-set.mts`).
 *
 * Declaring an endeavor/campaign/project/plan/task/work-item means one call
 * to `write` with a claim whose cell is `scopeOf(level, id)` (socializing office's
 * `level:id` grammar) — the same claim-session row shape every other feature
 * already writes. This module is the pure reduction
 * from an already-recorded claim-session row (`EAVT`: entity/attribute/value/
 * time) to the observation shape `itemDiamonds`/`diamondsByItem` consume: the
 * boundary role a caller wrote (`obligation` open / `discharge` settle, the
 * convention `running/fact-claims.mts`'s `bundleForSource` already writes
 * through `boundary.role`) names the event; a cell's first recorded row is
 * its opening even absent an explicit role, and a reading that has left
 * `unknown` for a terminal FOUR value settles a cell even absent an
 * explicit `discharge` role. No file I/O here — the caller owns reading
 * the admit log; this module only reduces recorded rows in order, whether
 * they arrive as an array or as a file-backed fold.
 */
import { juralRelationOfClaimCell, scopeOf, workItemOfCell } from "@red-cup-engineering/socializing/office";

import { admitAgencyWorkResult, workResultSkillContext, validateDeterministicExecution, validateResultCodomain } from "./schema.mjs";
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";


/** Claim-session rows carry the relation model notation's own reading vocabulary
 *  (`held`/`denied`/`contested`/`unknown` — see `claims/session.mjs`). */
function isNotationReadingName(value) {
  try {
    readingAs("knowledge", value);
    return true;
  } catch {
    return false;
  }
}

function recordAt(value, key) {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value)[key];
}

function stringArray(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze([...new Set(value.filter((entry) => typeof entry === "string" && entry.length > 0))].sort());
}

function unionStrings(left, right) {
  return Object.freeze([...new Set([...(left ?? []), ...right])].sort());
}

/** One recorded obligation with the raw cell needed for later discharge and
 * its canonical work-item scope plus presentation/evidence material. */

/** Canonical authority facts projected by a successful office-service allocation.
 * They are read-only dispatch metadata: allocation already checked the source
 * office, duty, work, skill, closure, and capabilities before appending it. */

/** Stable in-memory join key for one exact allocated duty relation. */
export function agencyWorkAllocationKey(relation) {
  return `${relation.active}\u0000${relation.passive}\u0000${relation.scope}`;
}

/** One app worker attached to an exact admitted allocation. A release is an
 * explicit observation, so an interrupted worker does not strand its scope. */
export function agencyWorkAssignmentOfRow(row) {
  const [, attribute, value] = row;
  const boundary = recordAt(value, "boundary");
  if (recordAt(boundary, "role") !== "office-service-assignment" || recordAt(boundary, "operation") !== "agency-work-assignment-admit") return undefined;
  const scope = recordAt(boundary, "scope");
  const allocation = recordAt(boundary, "allocation");
  const workerThread = recordAt(boundary, "workerThread");
  const workerModel = recordAt(boundary, "workerModel");
  const state = recordAt(boundary, "state");
  if (typeof scope !== "string" || typeof allocation !== "string" || typeof workerThread !== "string"
    || (workerModel !== undefined && (typeof workerModel !== "string" || workerModel.length === 0)) || !["started", "released"].includes(state)
    || recordAt(attribute, "cell") !== `office-service-assignment:${allocation}` || recordAt(attribute, "reading") !== "unknown") return undefined;
  return Object.freeze({ scope, allocation, workerThread, ...(workerModel === undefined ? {} : { workerModel }), state });
}

/** Read the explicit canonical marker attached to an allocation claim. */
export function agencyWorkAllocationMarkerOfRow(row) {
  const [, attribute, value] = row;
  const claimCell = recordAt(attribute, "cell");
  const claimReading = recordAt(attribute, "reading");
  const boundary = recordAt(value, "boundary");
  if (recordAt(boundary, "role") !== "office-service-allocation") return undefined;
  const allocation = recordAt(boundary, "source");
  const scope = recordAt(boundary, "scope");
  const character = recordAt(boundary, "character");
  const office = recordAt(boundary, "office");
  const officeService = recordAt(boundary, "officeService");
  const duty = recordAt(boundary, "duty");
  const work = recordAt(boundary, "work");
  const skill = recordAt(boundary, "skill");
  const closureKind = recordAt(boundary, "closureKind");
  const requiresCapabilities = stringArray(recordAt(boundary, "requiresCapabilities"));
  const method = recordAt(boundary, "method");
  const receiverCondition = recordAt(boundary, "receiverCondition");
  const governing = recordAt(boundary, "governing");
  const delegation = recordAt(boundary, "delegation");
  const delegationAuthorization = recordAt(boundary, "delegationAuthorization");
  if (
    typeof allocation !== "string" || typeof scope !== "string" || typeof character !== "string" || typeof office !== "string" || typeof officeService !== "string" || typeof duty !== "string" || typeof work !== "string" || typeof skill !== "string"
    || (closureKind !== "procedure" && closureKind !== "inquiry" && closureKind !== "derivation" && closureKind !== "process")
    || typeof method !== "string" || typeof receiverCondition !== "string"
  ) return undefined;
  const relation = typeof claimCell === "string" && typeof claimReading === "string" && isNotationReadingName(claimReading)
    ? juralRelationOfClaimCell(claimCell, claimReading)
    : undefined;
  if (relation?.kind !== "duty" || relation.active !== character || relation.scope !== scope) return undefined;
  const delegatedRecord = delegation === undefined ? undefined : recordAt(delegation, "provider") !== undefined && recordAt(delegation, "authority") !== undefined
    ? delegation : undefined;
  const delegatedProvider = delegatedRecord === undefined ? undefined : recordAt(delegatedRecord, "provider");
  const delegatedAuthority = delegatedRecord === undefined ? undefined : recordAt(delegatedRecord, "authority");
  const authorizationAuthority = recordAt(delegationAuthorization, "authority");
  const authorizationRevision = recordAt(delegationAuthorization, "revision");
  const authorizationEvidence = stringArray(recordAt(delegationAuthorization, "evidence"));
  const delegated = typeof delegatedProvider === "string" && typeof delegatedAuthority === "string"
    && typeof authorizationAuthority === "string" && typeof authorizationRevision === "string" && authorizationEvidence.length > 0
    ? Object.freeze({ provider: delegatedProvider, operations: stringArray(recordAt(delegatedRecord, "operations")), effects: stringArray(recordAt(delegatedRecord, "effects")), authority: delegatedAuthority, authorization: Object.freeze({ authority: authorizationAuthority, revision: authorizationRevision, evidence: authorizationEvidence }) })
    : undefined;
  if (delegation !== undefined && (delegated === undefined || delegated.operations.length === 0 || delegated.effects.length === 0)) return undefined;
  const model = recordAt(boundary, "model");
  const reasoningEffort = recordAt(boundary, "reasoningEffort");
  const requiredCarrierValue = recordAt(boundary, "requiredCarrier");
  const requiredCarrier = requiredCarrierValue !== null && typeof requiredCarrierValue === "object"
    && typeof recordAt(requiredCarrierValue, "model") === "string"
    && typeof recordAt(requiredCarrierValue, "reasoningEffort") === "string"
    ? Object.freeze({ model: recordAt(requiredCarrierValue, "model"), reasoningEffort: recordAt(requiredCarrierValue, "reasoningEffort") })
    : undefined;
  return Object.freeze({ allocation, scope, character, ...(typeof model === "string" ? { model } : {}), ...(typeof reasoningEffort === "string" ? { reasoningEffort } : {}), ...(requiredCarrier === undefined ? {} : { requiredCarrier }), office, relation, passive: relation.passive, officeService, duty, work, skill, closureKind, requiresCapabilities, method,
    receiverCondition, ...(governing === undefined ? {} : { governing }), ...(delegated === undefined ? {} : { delegation: delegated }) });
}

/** Read one canonical obligation boundary from a claim-session row. */
export function workLedgerObligationOfRow(row, sourceSubject) {
  const [, attribute, value] = row;
  const rawCell = recordAt(attribute, "cell");
  if (typeof rawCell !== "string") return undefined;
  const item = workItemOfCell(rawCell);
  if (item === null) return undefined;
  const boundary = recordAt(value, "boundary");
  if (recordAt(boundary, "role") !== "obligation") return undefined;
  const text = recordAt(boundary, "text");
  const source = recordAt(boundary, "source");
  const subject = recordAt(boundary, "subject");
  const parent = recordAt(boundary, "parent");
  const evidence = recordAt(boundary, "evidence");
  const sourceRepository = recordAt(boundary, "sourceRepository");
  const deterministicExecution = recordAt(boundary, "deterministicExecution");
  const returns = recordAt(boundary, "returns");
  const order = recordAt(boundary, "order");
  const work = recordAt(boundary, "work");
  const skill = recordAt(boundary, "skill");
  const requiredCarrierValue = recordAt(boundary, "requiredCarrier");
  const requiredCarrier = requiredCarrierValue !== null && typeof requiredCarrierValue === "object"
    && typeof recordAt(requiredCarrierValue, "model") === "string"
    && typeof recordAt(requiredCarrierValue, "reasoningEffort") === "string"
    ? Object.freeze({ model: recordAt(requiredCarrierValue, "model"), reasoningEffort: recordAt(requiredCarrierValue, "reasoningEffort") })
    : undefined;
  return Object.freeze({
    cell: rawCell,
    item: scopeOf(item.level, item.id),
    text: typeof text === "string" ? text : scopeOf(item.level, item.id),
    ...(typeof work === "string" ? { work } : {}),
    ...(typeof skill === "string" ? { skill } : {}),
    ...(requiredCarrier === undefined ? {} : { requiredCarrier }),
    ...(typeof sourceRepository === "string" && sourceRepository.length > 0 ? { sourceRepository } : {}),
    ...(deterministicExecution === undefined ? {} : { deterministicExecution: validateDeterministicExecution(deterministicExecution) }),
    ...(returns === undefined || returns === null ? {} : { returns: validateResultCodomain(returns) }),
    ...(typeof order === "string" ? { order } : {}),
    ...(typeof source === "string" ? { source } : {}),
    ...(typeof subject === "string" ? { subject } : typeof sourceSubject === "string" ? { subject: sourceSubject } : {}),
    ...(typeof parent === "string" ? { parent } : {}),
    evidence: Object.freeze(Array.isArray(evidence) ? evidence.filter((entry) => typeof entry === "string") : []),
  });
}

/** A declaration withdrawn by its exact witness. Withdrawal records abandoned machinery;
 * it is not discharge evidence and does not assert that the requested effect happened. */
export function workLedgerWithdrawalOfRow(row) {
  const cell = recordAt(row[1], "cell");
  if (typeof cell !== "string") return undefined;
  const item = workItemOfCell(cell);
  const boundary = recordAt(row[2], "boundary");
  const withdraws = recordAt(boundary, "withdraws");
  if (item === null || recordAt(boundary, "role") !== "obligation-withdrawal" || typeof withdraws !== "string") return undefined;
  return Object.freeze({ item: scopeOf(item.level, item.id), withdraws });
}

/** The `intent:<id>` evidence entry a structured-work-intent obligation
 * carries (`structured-intent.mts`'s `structuredWorkIntentObservations`),
 * read back verbatim including any colon the id itself contains. Undefined
 * when the obligation's evidence names no structured intent. */
export function intentOfObligationEvidence(evidence) {
  const prefix = "intent:";
  const entry = evidence.find((candidate) => candidate.startsWith(prefix));
  return entry === undefined ? undefined : entry.slice(prefix.length);
}

/** A row's recorded time reduced to a string: verbatim when the row already
 *  carries an ISO time; `${source}#${item}` for claim-session rows, whose
 *  time slot is the per-source recorded ordinal (`running/fact-claims.mts`'s
 *  `bundleForSource`, `at: {source, item}`) rather than a wall-clock stamp —
 *  sequencing itself comes from array order (`itemDiamonds` never sorts by
 *  `at`), so this string is descriptive only, never compared. */
function recordedAt(time, fallback) {
  if (typeof time === "string") return time;
  const source = recordAt(time, "source");
  const item = recordAt(time, "item");
  if (typeof source === "string" && typeof item === "number") return `${source}#${String(item).padStart(6, "0")}`;
  return String(fallback);
}

/**
 * Reduce one claim-session-shaped feed's already-recorded rows (in recorded
 * order) to `WorkItemObservation`s. Rows whose cell does not name a
 * work item (`workItemOfCell`) are skipped — a claim-session
 * feed may carry cells for unrelated facts (`running/fact-claims.mts`'s
 * value-exclusive facts, live-fleet cells, …). Parent is read from an
 * explicit `boundary.parent` string when a caller wrote one; never inferred
 * — spacelike absent a recorded reference, per this module's own doctrine
 * (`work-item-causal-set.mts`'s `WorkItemObservation.parent` docstring).
 */

/** Whether a witnessed consequence actually depends on this exact opening. */
export function causallyFollows(directCauses, obligation, causesByWitness) {
  const pending = [...(directCauses ?? [])];
  const visited = new Set();
  while (pending.length > 0) {
    const cause = pending.pop();
    if (cause === obligation) return true;
    if (visited.has(cause)) continue;
    visited.add(cause);
    pending.push(...(causesByWitness.get(cause) ?? []));
  }
  return false;
}

export function workItemObservationCollector() {
  const state = new Map();
  const openObservationIndex = new Map();
  const observations = [];
  const withdrawn = new Set();
  const causesByWitness = new Map();
  const witnessedDeclarations = new Set();
  let index = 0;
  const push = (
    row,
    witness,
  ) => {
    if (witness?.id !== undefined) causesByWitness.set(witness.id, witness.cites);
    const [, attribute, value, time] = row;
    const cellField = recordAt(attribute, "cell");
    const readingField = recordAt(attribute, "reading");
    const currentIndex = index;
    index += 1;
    if (typeof cellField !== "string" || typeof readingField !== "string" || !isNotationReadingName(readingField)) return;
    const item = workItemOfCell(cellField);
    if (item === null) return;
    const scope = scopeOf(item.level, item.id);
    const boundary = recordAt(value, "boundary");
    const role = recordAt(boundary, "role");
    const withdrawal = workLedgerWithdrawalOfRow(row);
    if (withdrawal !== undefined) {
      const opening = observations[openObservationIndex.get(scope)];
      if (opening?.obligationWitness?.witness === withdrawal.withdraws) withdrawn.add(scope);
      return;
    }
    const obligation = workLedgerObligationOfRow(row);
    if (obligation !== undefined) {
      if (obligation.source?.startsWith("structured-work-intent:") && witness !== undefined) witnessedDeclarations.add(scope);
      else witnessedDeclarations.delete(scope);
    }
    if (obligation !== undefined && withdrawn.has(scope)) {
      const opening = observations[openObservationIndex.get(scope)];
      if (witness?.id === opening?.obligationWitness?.witness) return;
      withdrawn.delete(scope);
    }
    const parentField = recordAt(boundary, "parent");
    const parent = typeof parentField === "string" ? parentField : undefined;
    const dependencies = stringArray(recordAt(boundary, "dependencies"));
    const conflicts = stringArray(recordAt(boundary, "conflicts"));
    const discharged = role === "discharge";
    const terminal = readingField !== "unknown";
    let event;
    const current = state.get(scope);
    const declaration = event => event === "opened" && obligation !== undefined ? {
      text: obligation.text,
      evidence: obligation.evidence,
      ...(obligation.requiredCarrier === undefined ? {} : { requiredCarrier: obligation.requiredCarrier }),
      producer: obligation.evidence.find((entry) => entry.startsWith("producer:"))?.slice("producer:".length),
      obligationWitness: obligation.source?.startsWith("structured-work-intent:") && witness !== undefined
        ? Object.freeze({ subject: obligation.subject, witness: witness.id })
        : undefined,
    } : {};
    if (current === "open" && !discharged && !terminal) {
      const openingIndex = openObservationIndex.get(scope);
      const opening = openingIndex === undefined ? undefined : observations[openingIndex];
      if (openingIndex !== undefined && opening !== undefined) {
        observations[openingIndex] = Object.freeze({
          ...opening,
          ...declaration("opened"),
          ...(obligation === undefined || witness === undefined ? {} : { witness: witness.id, causes: Object.freeze([...witness.cites]) }),
          dependencies: unionStrings(opening.dependencies, dependencies),
          conflicts: unionStrings(opening.conflicts, conflicts),
        });
      }
      return;
    }
    if (discharged || (terminal && current === "open")) {
      if (current !== "open") return;
      const currentOpening = observations[openObservationIndex.get(scope)];
      // A received report remains evidence about its original declaration.
      // It cannot settle a different canonical opening merely because its row
      // follows that opening in a deterministic order of concurrent witnesses.
      if (discharged && witness !== undefined && currentOpening?.obligationWitness?.witness !== undefined
          && !causallyFollows(witness.cites, currentOpening.obligationWitness.witness, causesByWitness)) return;
      event = "settled";
      state.set(scope, "settled");
      const openingIndex = openObservationIndex.get(scope);
      const opening = openingIndex === undefined ? undefined : observations[openingIndex];
      if (openingIndex !== undefined && opening !== undefined) {
        observations[openingIndex] = Object.freeze({
          ...opening,
          dependencies: unionStrings(opening.dependencies, dependencies),
          conflicts: unionStrings(opening.conflicts, conflicts),
        });
      }
      openObservationIndex.delete(scope);
    } else if (current !== "open") {
      // A settled witnessed declaration is reopened by another declaration,
      // not by late execution, proposal or receiving metadata. Those rows keep
      // their journal and causal evidence without manufacturing an anonymous
      // opening through which an older discharge could settle different work.
      if (current === "settled" && witnessedDeclarations.has(scope) && obligation === undefined) return;
      event = "opened";
      state.set(scope, "open");
    } else {
      return;
    }
    const observation = Object.freeze({
      item: scope,
      ...declaration(event),
      ...(parent === undefined ? {} : { parent }),
      dependencies,
      conflicts,
      event,
      reading: readingField,
      at: recordedAt(time, currentIndex),
      ...(witness === undefined ? {} : {
        witness: witness.id,
        causes: Object.freeze([...witness.cites]),
      }),
    });
    observations.push(observation);
    if (event === "opened") openObservationIndex.set(scope, observations.length - 1);
  };
  return Object.freeze({
    push,
    read: () => Object.freeze(observations.filter((observation) => !withdrawn.has(observation.item))),
  });
}

/** Fold obligation metadata and the canonical open/settled lifecycle together. */
export function workLedgerObligationCollector() {
  const lifecycle = workItemObservationCollector();
  const obligations = new Map();
  return Object.freeze({
    push(row, witness) {
      lifecycle.push(row, witness);
      const obligation = workLedgerObligationOfRow(row);
      if (obligation !== undefined) obligations.set(obligation.item, obligation);
    },
    read() {
      const observations = lifecycle.read();
      const state = new Map();
      const openOrder = [];
      for (const observation of observations) {
        state.set(observation.item, observation.event === "opened" ? "open" : "settled");
        if (observation.event === "opened") {
          const prior = openOrder.indexOf(observation.item);
          if (prior !== -1) openOrder.splice(prior, 1);
          openOrder.push(observation.item);
        }
      }
      return Object.freeze(openOrder.flatMap((item) => {
        if (state.get(item) !== "open") return [];
        const obligation = obligations.get(item);
        return obligation === undefined ? [] : [obligation];
      }));
    },
  });
}

export function workItemObservationsOfRows(rows) {
  const collector = workItemObservationCollector();
  for (const row of rows) collector.push(row);
  return collector.read();
}

/** Provider execution and an unreceived result remain separate from discharge. */
export function agencyWorkExecutionOfRow(row, event) {
  const boundary = recordAt(row[2], "boundary");
  const role = recordAt(boundary, "role");
  const value = role === "work-result-proposal" ? recordAt(boundary, "proposal") : role === "office-service-execution" ? recordAt(boundary, "execution") : undefined;
  const allocation = recordAt(value, "allocation"), scope = recordAt(value, "scope");
  if (typeof allocation !== "string" || typeof scope !== "string" || typeof event?.id !== "string") return undefined;
  const sourceRepository = recordAt(value, "sourceRepository");
  const sourceBinding = recordAt(value, "sourceBinding"), sourceResult = recordAt(value, "sourceResult");
  if (sourceResult !== undefined && (!workSourceResultContract.validate(sourceResult) || sourceResult.sourceBinding !== sourceBinding?.id)) return undefined;
  if (sourceBinding !== undefined && !workSourceClosureContract.validate(sourceBinding)) return undefined;
  const source = { ...(typeof sourceRepository === "string" && sourceRepository.length > 0 ? { sourceRepository } : {}), ...(sourceBinding === undefined ? {} : { sourceBinding }), ...(sourceResult === undefined ? {} : { sourceResult }) };
  if (role === "work-result-proposal") {
    let result;
    try { result = admitAgencyWorkResult(recordAt(value, "result")); } catch { return undefined; }
    const skillOutcome = workResultSkillContext(result);
    const subject = recordAt(value, "subject"), execution = recordAt(value, "execution");
    if (typeof subject !== "string" || typeof execution !== "string") return undefined;
    const failed = recordAt(result, "kind") === "skill-error";
    if (failed && typeof recordAt(result, "error") !== "string") return undefined;
    const origin = recordAt(value, "origin");
    // A producer-reported failure is an attempt observation, never a claim of
    // successful work. Its immutable proposal retains the report and evidence.
    return { allocation, scope, ...source, state: failed ? "failed" : "proposed", receipt: event.id, subject, execution, resultKind: recordAt(result, "kind"),
      ...(skillOutcome === undefined ? {} : { skillOutcome }),
      ...(failed ? { error: `producer-reported-skill-error:${recordAt(result, "error")}` } : {}),
      ...(typeof recordAt(origin, "session") === "string" && typeof recordAt(origin, "model") === "string"
        ? { session: recordAt(origin, "session"), model: recordAt(origin, "model"), ...(typeof recordAt(origin, "reasoningEffort") === "string" ? { reasoningEffort: recordAt(origin, "reasoningEffort") } : {}) } : {}) };
  }
  const state = recordAt(value, "state");
  if (!["started", "failed"].includes(state)) return undefined;
  const requiredCarrierValue = recordAt(value, "requiredCarrier");
  const requiredCarrier = requiredCarrierValue !== null && typeof requiredCarrierValue === "object"
    && typeof recordAt(requiredCarrierValue, "model") === "string"
    && typeof recordAt(requiredCarrierValue, "reasoningEffort") === "string"
    ? Object.freeze({ model: recordAt(requiredCarrierValue, "model"), reasoningEffort: recordAt(requiredCarrierValue, "reasoningEffort") })
    : undefined;
  return { allocation, scope, ...source, state, receipt: event.id,
    ...(typeof recordAt(value, "session") === "string" && typeof recordAt(value, "model") === "string" ? { session: recordAt(value, "session"), model: recordAt(value, "model"), ...(typeof recordAt(value, "reasoningEffort") === "string" ? { reasoningEffort: recordAt(value, "reasoningEffort") } : {}) } : {}),
    ...(requiredCarrier === undefined ? {} : { requiredCarrier }),
    ...(typeof recordAt(value, "error") === "string" ? { error: recordAt(value, "error") } : {}),
    // What kind of failure its carrier said it was (`carrier-startup`: no session ever started, so
    // capacity rather than the work), and when it was recorded.
    ...(typeof recordAt(value, "failure") === "string" ? { failure: recordAt(value, "failure") } : {}),
    ...(typeof recordAt(value, "at") === "string" ? { at: recordAt(value, "at") } : {}) };
}

/** Independent receiving authorizes successful results or rejects their claims, a rejection
 * with the reason its receiver stated. Historical receipt of an error remains evidence, never
 * discharge. */
export function agencyWorkReceiptOfRow(row, event) {
  const boundary = recordAt(row[2], "boundary");
  if (recordAt(boundary, "role") !== "receiver-authorization"
    || recordAt(recordAt(boundary, "evaluation"), "allowed") !== true) return undefined;
  const proposalReceipt = recordAt(boundary, "proposalReceipt");
  return typeof proposalReceipt === "string" && typeof event?.id === "string"
    ? { proposalReceipt, receipt: event.id, decision: recordAt(boundary, "decision") ?? "accepted",
      ...(typeof recordAt(boundary, "reason") === "string" ? { reason: recordAt(boundary, "reason") } : {}) } : undefined;
}
