import {
  diamondsByItem,
  closeWorkItemCausalSetCarrier,
  workItemCausalSetCarrier,

} from "./causal-set.mjs";
import { dutiesOfAgent, juralRelationsOfClaimRows } from "@red-cup-engineering/socializing/office";
import { readJuralRelations } from "@red-cup-engineering/socializing/jural";

import {
  agencyWorkAssignmentOfRow,
  agencyWorkExecutionOfRow, agencyWorkReceiptOfRow,
  agencyWorkAllocationKey,
  agencyWorkAllocationMarkerOfRow,
  intentOfObligationEvidence,
  workItemObservationCollector,
  workLedgerObligationOfRow, workLedgerWithdrawalOfRow,

} from "./observations.mjs";
import {
  juralClaimRowOf,
  workRoadmapOfObservations,
  workItemStatusesOfObservations,

} from "./read-models.mjs";

  

function agentNamesOf(relations, requested) {
  if (requested !== undefined) {
    return Object.freeze([...new Set(requested)].filter((agent) => agent.length > 0).sort((left, right) => left.localeCompare(right)));
  }
  const agents = new Set();
  for (const relation of relations) {
    agents.add(relation.active);
    agents.add(relation.passive);
  }
  return Object.freeze([...agents].filter((agent) => agent.length > 0).sort((left, right) => left.localeCompare(right)));
}

function workParents(diamonds) {
  const byParent = new Map();
  for (const diamond of diamonds) {
    const key = diamond.parent ?? "";
    const list = byParent.get(key);
    if (list === undefined) byParent.set(key, [diamond]);
    else list.push(diamond);
  }
  return Object.freeze([...byParent].map(([parent, siblingDiamonds]) => {
    const closure = closeWorkItemCausalSetCarrier(siblingDiamonds);
    const obstructed = closure.kind === "metroplat.workItem.causal-set-out-of-scope" ? siblingDiamonds.length : 0;
    return Object.freeze({
      parent: parent.length === 0 ? null : parent,
      diamonds: siblingDiamonds.length,
      open: siblingDiamonds.filter((diamond) => diamond.deshrouded).length,
      discharged: siblingDiamonds.filter((diamond) => !diamond.deshrouded).length,
      obstructed,
      causalSet: workItemCausalSetCarrier(siblingDiamonds),
      settlement: closure,
    });
  }).sort((left, right) => String(left.parent ?? "").localeCompare(String(right.parent ?? ""))));
}

function workRead(observations, roadmap, statuses) {
  const diamonds = diamondsByItem(observations);
  const scopes = Object.freeze([...statuses.keys()].sort((left, right) => left.localeCompare(right)).map((scope) => Object.freeze({
    scope,
    status: statuses.get(scope),
  })));
  return Object.freeze({
    observations: observations.length,
    diamonds: diamonds.length,
    open: scopes.filter((scope) => scope.status === "open").length,
    discharged: scopes.filter((scope) => scope.status === "discharged").length,
    obstructed: scopes.filter((scope) => scope.status === "obstructed").length,
    scopes,
    parents: workParents(diamonds),
    roadmap,
  });
}

/**
 * What an obligation carries into every read of its work item, allocated or not: its subject,
 * source, text and evidence, the witnesses of its node, how it executes and the codomain it
 * returns. Allocation reads these (an assay is exempt from needing a standing taking by its
 * `assay-of:` evidence; a typed result is admitted against `returns`), so a read that dropped
 * one would gate the item on a field it never sees.
 */
function carriedFieldsOf(obligation, node) {
  const evidence = node?.evidence ?? obligation?.evidence;
  return Object.freeze({
    ...(obligation?.subject === undefined ? {} : { subject: obligation.subject }),
    ...(obligation?.source === undefined ? {} : { source: obligation.source }),
    ...(obligation === undefined ? {} : { text: obligation.text }),
    ...(evidence === undefined ? {} : { evidence }),
    ...(node?.witness === undefined ? {} : { witness: node.witness }),
    ...(node?.causes === undefined ? {} : { causes: node.causes }),
    ...(node?.obligationWitness === undefined ? {} : { obligationWitness: node.obligationWitness }),
    ...(obligation?.deterministicExecution === undefined ? {} : { deterministicExecution: obligation.deterministicExecution }),
    ...(obligation?.returns === undefined ? {} : { returns: obligation.returns }),
    ...(obligation?.order === undefined ? {} : { order: obligation.order }),
    ...(obligation?.sourceRepository === undefined ? {} : { sourceRepository: obligation.sourceRepository }),
    ...(obligation?.requiredCarrier === undefined ? {} : { requiredCarrier: obligation.requiredCarrier }),
  });
}

function dutyRead(
  duty,
  statuses,
  roadmapNodes,
  obligations,
  allocations,
  assignments,
  executions,
) {
  const roadmapNode = roadmapNodes.get(duty.relation.scope);
  const obligation = obligations.get(duty.relation.scope);
  const allocation = allocations.get(agencyWorkAllocationKey(duty.relation));
  const candidateAssignment = allocation === undefined ? undefined : assignments.get(allocation.allocation);
  const assignment = candidateAssignment?.scope === duty.relation.scope ? candidateAssignment : undefined;
  const office = allocation?.office ?? duty.office;
  const intent = obligation === undefined ? undefined : intentOfObligationEvidence(obligation.evidence);
  return Object.freeze({
    scope: duty.relation.scope,
    passive: duty.relation.passive,
    standing: duty.relation.standing,
    via: duty.via,
    status: statuses.get(duty.relation.scope) ?? "open",
    structural: roadmapNode?.structural ?? Object.freeze({ state: "blocked", blockers: Object.freeze(["scope-not-declared"]) }),
    coordination: roadmapNode?.coordination ?? Object.freeze({ state: "clear" }),
    conflicts: roadmapNode?.conflicts ?? Object.freeze([]),
    ...(office === undefined ? {} : { office }),
    ...(intent === undefined ? {} : { intent }),
    ...carriedFieldsOf(obligation, roadmapNode),
    ...(allocation === undefined ? {} : {
      allocation: allocation.allocation,
      ...(allocation.model === undefined ? {} : { allocatedModel: allocation.model }),
      ...(allocation.reasoningEffort === undefined ? {} : { allocatedReasoningEffort: allocation.reasoningEffort }),
      ...(allocation.requiredCarrier === undefined ? {} : { requiredCarrier: allocation.requiredCarrier }),
      ...(executions.get(allocation.allocation)?.scope === duty.relation.scope ? { execution: executions.get(allocation.allocation) } : {}),
      duty: allocation.duty,
      work: allocation.work,
      skill: allocation.skill,
      closureKind: allocation.closureKind,
      requiresCapabilities: allocation.requiresCapabilities,
      method: allocation.method,
      receiverCondition: allocation.receiverCondition,
      ...(allocation.governing === undefined ? {} : { governing: allocation.governing }),
      ...(allocation.delegation === undefined ? {} : { delegation: allocation.delegation }),
    }),
    ...(assignment === undefined ? {} : { assignment }),
    ...(obligation?.parent === undefined ? {} : { parent: obligation.parent }),
  });
}

function agentRead(
  agent,
  claimRows,
  statuses,
  roadmapNodes,
  obligations,
  allocations,
  assignments,
  executions,
  voided = () => false,
  succeeded = () => false,
) {
  const currentDuties = new Map();
  for (const duty of dutiesOfAgent(claimRows, agent)) {
    // A duty to do withdrawn work is void: it is owed by no one and reserves no carrier.
    if (voided(duty.relation.scope)) continue;
    // A scope has one allocation succession: a duty whose allocation a later one caused,
    // under whichever character, is no longer owed by its holder.
    if (succeeded(duty.relation)) continue;
    const key = `${agencyWorkAllocationKey(duty.relation)}\u0000${duty.via}\u0000${duty.office ?? ""}`;
    currentDuties.set(key, duty);
  }
  const duties = Object.freeze([...currentDuties.values()].map((duty) => dutyRead(duty, statuses, roadmapNodes, obligations, allocations, assignments, executions)));
  return Object.freeze({
    agent,
    duties: duties.length,
    open: duties.filter((duty) => duty.status === "open").length,
    discharged: duties.filter((duty) => duty.status === "discharged").length,
    obstructed: duties.filter((duty) => duty.status === "obstructed").length,
    scopes: duties,
    offices: Object.freeze([...new Set(duties.flatMap((duty) => duty.office === undefined ? [] : [duty.office]))].sort((left, right) => left.localeCompare(right))),
  });
}

export function agentWorkReadoutCollector() {
  const claimRows = [];
  const workItems = workItemObservationCollector();
  const obligations = new Map();
  const obligationWitnesses = new Map();
  // Items whose current declaration was withdrawn. Work extending a withdrawn item is withdrawn
  // with it: a part is owed only while the whole it is part of is.
  const withdrawn = new Set();
  // Each allocation key's witnessed markers, and the allocation events a later allocation caused.
  // Enumeration is content order, not succession: the current marker is the uncaused one.
  const allocationEvents = new Map();
  const causedAllocations = new Set();
  const assignments = new Map();
  const executions = new Map();
  const receivedProposals = new Map();
  let rows = 0;
  return Object.freeze({
    // Source custody outlives offer/readiness: accepted Actions still need exact integration and retirement.
    obligationOf: (scope) => {
      const obligation = obligations.get(scope);
      return obligation === undefined ? undefined : Object.freeze({ ...obligation, witness: obligationWitnesses.get(scope) });
    },
    push: (row, sourceSubject, witness) => {
      rows += 1;
      const [, attribute, value] = row;
      const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
      if (claimRow !== undefined) claimRows.push(claimRow);
      const obligation = workLedgerObligationOfRow(row, sourceSubject);
      if (obligation !== undefined) {
        obligations.set(obligation.item, obligation);
        obligationWitnesses.set(obligation.item, witness?.id);
        withdrawn.delete(obligation.item);
      }
      const withdrawal = workLedgerWithdrawalOfRow(row);
      if (withdrawal !== undefined && obligationWitnesses.get(withdrawal.item) === withdrawal.withdraws) {
        obligations.delete(withdrawal.item);
        obligationWitnesses.delete(withdrawal.item);
        withdrawn.add(withdrawal.item);
      }
      const allocation = agencyWorkAllocationMarkerOfRow(row);
      if (allocation !== undefined) {
        const key = agencyWorkAllocationKey(allocation.relation);
        if (!allocationEvents.has(key)) allocationEvents.set(key, []);
        allocationEvents.get(key).push({ id: witness?.id, allocation });
        for (const cause of witness?.cites ?? []) causedAllocations.add(cause);
      }
      const assignment = agencyWorkAssignmentOfRow(row);
      if (assignment !== undefined) assignments.set(assignment.allocation, assignment);
      const execution = agencyWorkExecutionOfRow(row, witness);
      if (execution !== undefined) executions.set(execution.allocation, execution);
      const receipt = agencyWorkReceiptOfRow(row, witness);
      if (receipt !== undefined) receivedProposals.set(receipt.proposalReceipt, receipt);
      workItems.push(row, witness);
    },
    read: (options) => {
      const observations = workItems.read();
      const allocations = new Map();
      const succeeded = new Set();
      for (const [key, events] of allocationEvents) {
        const frontier = events.filter((event) => event.id === undefined || !causedAllocations.has(event.id));
        if (frontier.length === 0) succeeded.add(key);
        allocations.set(key, (frontier.length > 0 ? frontier : events).at(-1).allocation);
      }
      for (const [allocation, execution] of executions) {
        const received = receivedProposals.get(execution.receipt);
        if (received !== undefined && ((execution.state === "proposed" && received.decision === "rejected") || (execution.state === "failed" && execution.resultKind === "skill-error"))) {
          executions.set(allocation, { ...execution, state: "failed", error: received.decision === "rejected" ? `independent-receiver-rejected-result${received.reason === undefined ? "" : `: ${received.reason}`}` : execution.error, receiverReceipt: received.receipt });
        }
      }
      const voids = new Map();
      const voided = (scope, depth = 0) => {
        if (withdrawn.has(scope)) return true;
        if (voids.has(scope)) return voids.get(scope);
        const parent = obligations.get(scope)?.parent;
        const result = parent !== undefined && depth < 16 && voided(parent, depth + 1);
        voids.set(scope, result);
        return result;
      };
      const statuses = workItemStatusesOfObservations(observations);
      const roadmap = workRoadmapOfObservations(observations);
      const roadmapNodes = new Map(roadmap.nodes.map((node) => [node.scope, node]));
      const relations = juralRelationsOfClaimRows(claimRows);
      const agents = agentNamesOf(relations, options.agents);
      const outcomeContainers = new Set(roadmap.nodes.flatMap((node) => node.parents));
      const allocatedScopes = new Set([...allocations.values()].map((allocation) => allocation.scope));
      const unallocated = options.agents === undefined ? Object.freeze([...obligations.values()]
        .filter((obligation) => !allocatedScopes.has(obligation.item) && !voided(obligation.item) && statuses.get(obligation.item) === "open")
        // Undeclared parent outcomes compose their children; declared services
        // can still execute at any canonical scope, including a parent.
        .filter((obligation) => obligation.work !== undefined || obligation.skill !== undefined || !outcomeContainers.has(obligation.item))
        .map((obligation) => {
          const node = roadmapNodes.get(obligation.item);
          return Object.freeze({
            scope: obligation.item,
            ...(node?.structural === undefined ? {} : { structural: node.structural }),
            ...(node?.coordination === undefined ? {} : { coordination: node.coordination }),
            ...(node?.conflicts === undefined ? {} : { conflicts: node.conflicts }),
            ...(node?.producer === undefined ? {} : { producer: node.producer }),
            ...carriedFieldsOf(obligation, node),
            ...(obligation.work === undefined ? {} : { work: obligation.work }),
            ...(obligation.skill === undefined ? {} : { skill: obligation.skill }),
            reasons: Object.freeze([
              "canonical-allocation-missing",
              ...(obligation.work === undefined ? ["work-not-declared"] : []),
              ...(obligation.skill === undefined ? ["skill-not-declared"] : []),
            ]),
          });
        }).sort((left, right) => left.scope.localeCompare(right.scope))) : Object.freeze([]);
      const governanceRead = relations.length === 0 ? undefined : readJuralRelations(relations);
      return Object.freeze({
        kind: "metroplat.agent-work.readout",
        subject: options.subject,
        date: options.date,
        feed: options.feed ?? "claim-session",
        work: workRead(observations, roadmap, statuses),
        unallocated,
        agents: Object.freeze(agents.map((agent) => agentRead(agent, claimRows, statuses, roadmapNodes, obligations, allocations, assignments, executions, voided,
          (relation) => succeeded.has(agencyWorkAllocationKey(relation))))),
        evidence: Object.freeze([
          `rows:${rows}`,
          `work-observations:${observations.length}`,
          `claim-rows:${claimRows.length}`,
          `jural-relations:${relations.length}`,
          `agents:${agents.length}`,
        ]),
        ...(governanceRead === undefined ? {} : { governance: governanceRead }),
      });
    },
  });
}

export function agentWorkReadoutOfRows(
  rows,
  options,
) {
  const collector = agentWorkReadoutCollector();
  for (const row of rows) collector.push(row);
  return collector.read(options);
}
