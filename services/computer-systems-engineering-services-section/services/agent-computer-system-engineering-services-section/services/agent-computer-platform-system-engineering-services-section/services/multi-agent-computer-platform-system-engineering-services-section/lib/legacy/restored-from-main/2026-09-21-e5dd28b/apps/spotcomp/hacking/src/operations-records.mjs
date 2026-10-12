import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const WORK_TYPES = new Set(['process', 'procedure', 'derivation', 'inquiry']);
const LOOP_STAGES = ['planning', 'dispatch', 'execution', 'tracking', 'review', 'feedback'];
const REGIMES = new Set(['strict', 'scott-continuous', 'transfinite-bounded', 'aperiodic']);
const LOOP_SCALES = new Set(['turn', 'session', 'project', 'swarm', 'deployment', 'organization']);
const EXHAUSTION_POLICIES = new Set(['reject', 'downgrade', 'quarantine', 'governed-transition']);
const OPERATION_KINDS = new Set(['read', 'admission', 'settlement', 'federation', 'governance', 'procedure']);

import { isObject } from "./object-record.mjs";

function checkString(errors, value, key, path, code) {
  if (!hasString(value, key)) {
    push(errors, code, path, `${key} must be a non-empty string`);
  }
}

function checkNonEmptyArray(errors, value, key, path, code) {
  if (!Array.isArray(value?.[key]) || value[key].length === 0) {
    push(errors, code, path, `${key} must be a non-empty array`);
  }
}

function checkAmount(errors, amount, path, code, allowZero = false) {
  if (!isObject(amount)) {
    push(errors, code, path, 'amount must be declared');
    return;
  }
  if (typeof amount.value !== 'number' || !Number.isFinite(amount.value) || amount.value < 0 || (!allowZero && amount.value === 0)) {
    push(errors, code, `${path}.value`, allowZero ? 'amount value must be non-negative' : 'amount value must be positive');
  }
  if (!hasString(amount, 'commodity')) {
    push(errors, code, `${path}.commodity`, 'amount commodity must be declared');
  }
}

function indexById(errors, items, path, codePrefix) {
  const index = new Map();
  if (!Array.isArray(items) || items.length === 0) {
    push(errors, `${codePrefix}-001`, path, 'must be a non-empty array');
    return index;
  }
  for (const item of items ?? []) {
    const itemPath = isObject(item) && hasString(item, 'id') ? item.id : `<${path}>`;
    if (!isObject(item)) {
      push(errors, `${codePrefix}-002`, itemPath, 'item must be an object');
      continue;
    }
    if (!hasString(item, 'id')) {
      push(errors, `${codePrefix}-003`, itemPath, 'id must be a non-empty string');
    } else if (index.has(item.id)) {
      push(errors, `${codePrefix}-004`, item.id, 'ids must be unique');
    } else {
      index.set(item.id, item);
    }
  }
  return index;
}

function checkReference(errors, index, id, path, code, label) {
  if (typeof id !== 'string' || id.length === 0) {
    push(errors, code, path, `${label} reference must be declared`);
  } else if (!index.has(id)) {
    push(errors, code, path, `unknown ${label} ${id}`);
  }
}

function checkImplementationBoundary(errors, bundle, path) {
  const boundary = bundle.implementationBoundary;
  if (!isObject(boundary)) {
    push(errors, 'OPR-BOUNDARY-001', path, 'implementationBoundary must be declared');
    return;
  }
  for (const key of [
    'noHostScriptWithoutTypedProjection',
    'noLedgerWithoutWitnessProjection',
    'noBudgetWithoutExhaustionPolicy',
    'noReadCostHidesSettlement',
    'noExternalManagerAsOperatingLayer',
    'operationsRecordsRemainTraceWitnessesNotSettlementProof',
  ]) {
    if (boundary[key] !== true) {
      push(errors, 'OPR-BOUNDARY-002', `implementationBoundary.${key}`, `${key} must be true`);
    }
  }
  checkEvidence(errors, boundary.evidence, 'implementationBoundary', 'OPR-BOUNDARY-003');
}

export function validateOperationsRecordsBundle(bundle) {
  const errors = [];
  if (!isObject(bundle)) {
    return [{ code: 'OPR-BUNDLE-001', path: '<bundle>', message: 'operations records bundle must be an object' }];
  }

  const path = hasString(bundle, 'profileId') ? bundle.profileId : '<bundle>';
  if (!hasString(bundle, 'profileId')) {
    push(errors, 'OPR-BUNDLE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, bundle.evidence, path, 'OPR-BUNDLE-003');

  const processes = indexById(errors, bundle.processRecords, 'processRecords', 'OPR-PROCESS');
  const budgets = indexById(errors, bundle.budgets, 'budgets', 'OPR-BUDGET');
  const procedures = indexById(errors, bundle.procedureRecords, 'procedureRecords', 'OPR-PROCEDURE');
  const events = indexById(errors, bundle.workEvents, 'workEvents', 'OPR-EVENT');
  const postings = indexById(errors, bundle.ledgerPostings, 'ledgerPostings', 'OPR-POSTING');
  const costs = indexById(errors, bundle.costEvents, 'costEvents', 'OPR-COST');
  const loops = indexById(errors, bundle.operationsLoops, 'operationsLoops', 'OPR-LOOP');

  for (const process of processes.values()) {
    for (const key of ['deployment', 'spawnWitness', 'exitWitnessPolicy']) {
      checkString(errors, process, key, process.id, 'OPR-PROCESS-005');
    }
    if (!nonEmptyStringArray(process.capabilities)) {
      push(errors, 'OPR-PROCESS-006', process.id, 'capabilities must be non-empty');
    }
    if (!isObject(process.syscallPolicy) || !hasString(process.syscallPolicy, 'profile') || !nonEmptyStringArray(process.syscallPolicy.restrictions)) {
      push(errors, 'OPR-PROCESS-007', process.id, 'syscallPolicy must declare profile and restrictions');
    }
    if (!REGIMES.has(process.closureKind)) {
      push(errors, 'OPR-PROCESS-008', process.id, 'closureKind must be a declared settling regime');
    }
    checkEvidence(errors, process.evidence, process.id, 'OPR-PROCESS-009');
  }

  for (const budget of budgets.values()) {
    for (const key of ['resourceKind', 'scope', 'currentConsumptionDerivationRef', 'resetPolicy']) {
      checkString(errors, budget, key, budget.id, 'OPR-BUDGET-005');
    }
    checkAmount(errors, budget.bound, `${budget.id}.bound`, 'OPR-BUDGET-006', true);
    if (!EXHAUSTION_POLICIES.has(budget.exhaustionPolicy)) {
      push(errors, 'OPR-BUDGET-007', budget.id, 'exhaustionPolicy must be a governed policy');
    }
    if (!nonEmptyStringArray(budget.witnessRequirements)) {
      push(errors, 'OPR-BUDGET-008', budget.id, 'witnessRequirements must be non-empty');
    }
    checkEvidence(errors, budget.evidence, budget.id, 'OPR-BUDGET-009');
  }

  for (const procedure of procedures.values()) {
    if (!WORK_TYPES.has(procedure.workType)) {
      push(errors, 'OPR-PROCEDURE-005', procedure.id, 'workType must be process procedure derivation or inquiry');
    }
    for (const key of ['preconditions', 'steps', 'actors', 'budgets', 'expectedWitnesses', 'postconditions']) {
      checkNonEmptyArray(errors, procedure, key, procedure.id, 'OPR-PROCEDURE-006');
    }
    for (const budgetId of procedure.budgets ?? []) {
      checkReference(errors, budgets, budgetId, `${procedure.id}.budgets`, 'OPR-PROCEDURE-007', 'budget');
    }
    for (const step of procedure.steps ?? []) {
      if (!isObject(step) || !hasString(step, 'id') || !hasString(step, 'description') || !hasString(step, 'witnessKind')) {
        push(errors, 'OPR-PROCEDURE-008', procedure.id, 'steps must declare id description and witnessKind');
      }
    }
    if (!hasString(procedure, 'downgradeBehavior')) {
      push(errors, 'OPR-PROCEDURE-009', procedure.id, 'downgradeBehavior must be declared');
    }
    if (hasString(procedure, 'hostScript') && !hasString(procedure, 'typedOperatingProjectionRef')) {
      push(errors, 'OPR-PROCEDURE-010', procedure.id, 'hostScript requires typedOperatingProjectionRef');
    }
    checkEvidence(errors, procedure.evidence, procedure.id, 'OPR-PROCEDURE-011');
  }

  for (const event of events.values()) {
    if (!WORK_TYPES.has(event.workType)) {
      push(errors, 'OPR-EVENT-005', event.id, 'workType must be process procedure derivation or inquiry');
    }
    if (!LOOP_STAGES.includes(event.loopStage)) {
      push(errors, 'OPR-EVENT-006', event.id, 'loopStage must be one operations-loop stage');
    }
    for (const key of ['actor', 'witnessRef', 'traceRowRef']) {
      checkString(errors, event, key, event.id, 'OPR-EVENT-007');
    }
    if (hasString(event, 'procedure')) {
      checkReference(errors, procedures, event.procedure, `${event.id}.procedure`, 'OPR-EVENT-008', 'procedure');
    }
    if ((event.settlementFuelSpent === true || event.altersGovernanceBudgetOrPlayerState === true) && !WORK_TYPES.has(event.workType)) {
      push(errors, 'OPR-EVENT-009', event.id, 'fuel or state change requires declared workType');
    }
    if (event.loopStage === 'dispatch' && !hasString(event, 'historyExtensionRef')) {
      push(errors, 'OPR-EVENT-010', event.id, 'dispatch requires historyExtensionRef');
    }
    if (event.loopStage === 'tracking' && !hasString(event, 'fiberEvidenceRef')) {
      push(errors, 'OPR-EVENT-011', event.id, 'tracking requires fiberEvidenceRef');
    }
    if (event.loopStage === 'review' && !hasString(event, 'sectionCriterionRef')) {
      push(errors, 'OPR-EVENT-012', event.id, 'review requires sectionCriterionRef');
    }
    if (event.loopStage === 'feedback' && !hasString(event, 'nucleusUpdateRef')) {
      push(errors, 'OPR-EVENT-013', event.id, 'feedback requires nucleusUpdateRef');
    }
    checkEvidence(errors, event.evidence, event.id, 'OPR-EVENT-014');
  }

  for (const posting of postings.values()) {
    for (const key of ['witnessRef', 'debit', 'credit']) {
      checkString(errors, posting, key, posting.id, 'OPR-POSTING-005');
    }
    if (posting.debit === posting.credit) {
      push(errors, 'OPR-POSTING-006', posting.id, 'debit and credit accounts must differ');
    }
    checkAmount(errors, posting.amount, `${posting.id}.amount`, 'OPR-POSTING-007');
    if (!hasString(posting, 'timestamp') && !hasString(posting, 'tracePosition')) {
      push(errors, 'OPR-POSTING-008', posting.id, 'posting requires timestamp or tracePosition');
    }
    checkEvidence(errors, posting.evidence, posting.id, 'OPR-POSTING-009');
  }

  for (const cost of costs.values()) {
    checkReference(errors, events, cost.operationRef, `${cost.id}.operationRef`, 'OPR-COST-005', 'work event');
    if (!OPERATION_KINDS.has(cost.operationKind)) {
      push(errors, 'OPR-COST-006', cost.id, 'operationKind is not recognized');
    }
    if (!isObject(cost.quantale) || !hasString(cost.quantale, 'name') || !hasString(cost.quantale, 'unit') || !hasString(cost.quantale, 'composition') || !hasString(cost.quantale, 'join')) {
      push(errors, 'OPR-COST-007', cost.id, 'quantale must declare name unit composition and join');
    }
    checkAmount(errors, cost.cost, `${cost.id}.cost`, 'OPR-COST-008', true);
    if (cost.operationKind === 'read' && cost.cost?.value !== 0) {
      push(errors, 'OPR-COST-009', cost.id, 'read cost must be quantale unit');
    }
    if (cost.operationKind === 'settlement' && !(cost.cost?.value > 0)) {
      push(errors, 'OPR-COST-010', cost.id, 'settlement cost must be positive');
    }
    if (cost.triggersSettlement === true) {
      checkReference(errors, events, cost.settlementEventRef, `${cost.id}.settlementEventRef`, 'OPR-COST-011', 'settlement event');
      checkReference(errors, events, cost.readEventRef, `${cost.id}.readEventRef`, 'OPR-COST-012', 'read event');
      if (cost.settlementEventRef === cost.readEventRef) {
        push(errors, 'OPR-COST-013', cost.id, 'settlement and read events must be separate');
      }
    }
    checkEvidence(errors, cost.evidence, cost.id, 'OPR-COST-014');
  }

  for (const loop of loops.values()) {
    if (!LOOP_SCALES.has(loop.scale)) {
      push(errors, 'OPR-LOOP-005', loop.id, 'scale is not recognized');
    }
    if (!isObject(loop.stages)) {
      push(errors, 'OPR-LOOP-006', loop.id, 'stages must be declared');
    } else {
      for (const stage of LOOP_STAGES) {
        if (!Array.isArray(loop.stages[stage]) || loop.stages[stage].length === 0) {
          push(errors, 'OPR-LOOP-007', `${loop.id}.stages.${stage}`, `${stage} must cite at least one event`);
          continue;
        }
        for (const eventId of loop.stages[stage]) {
          checkReference(errors, events, eventId, `${loop.id}.stages.${stage}`, 'OPR-LOOP-008', 'work event');
          const event = events.get(eventId);
          if (event && event.loopStage !== stage) {
            push(errors, 'OPR-LOOP-009', `${loop.id}.stages.${stage}`, `${eventId} is not a ${stage} event`);
          }
        }
      }
    }
    checkEvidence(errors, loop.evidence, loop.id, 'OPR-LOOP-010');
  }

  checkImplementationBoundary(errors, bundle, path);

  return errors;
}

export const assertValidOperationsRecordsBundle = createProfileAssertion(validateOperationsRecordsBundle);
