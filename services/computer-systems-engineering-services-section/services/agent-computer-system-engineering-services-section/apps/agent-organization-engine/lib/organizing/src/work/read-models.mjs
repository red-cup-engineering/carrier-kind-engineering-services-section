import {
  diamondsByItem,
  closeWorkItemCausalSetCarrier,
  workItemCausalSetCarrier,

} from "./causal-set.mjs";
import { dutiesOfAgent, juralRelationsOfClaimRows, workItemOfCell, workLevelBelow } from "@red-cup-engineering/socializing/office";
import { readJuralRelations } from "@red-cup-engineering/socializing/jural";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import {
  causalHeightStrata,
  settleCausalSet,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import {
  edgelessColoring,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coloring";
import {
  joinClosureOperator,
  operationalAccountingLedger,
  valuation,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/flow";


import {
  causallyFollows,
  agencyWorkAllocationKey,
  agencyWorkAllocationMarkerOfRow,
  intentOfObligationEvidence,
  workItemObservationCollector,
  workItemObservationsOfRows,
  workLedgerObligationOfRow,

} from "./observations.mjs";
import { ratToExactString } from "@red-cup-engineering/exact-number-data-service/exact-number-host";
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Price one witnessed work diamond by the same join closure ordinary settlement uses. */
export function workItemAccountingOfDiamond(diamond) {
  const cell = diamond.item;
  const opening = readingAs("knowledge", diamond.lower.reading);
  const discharge = readingAs("knowledge", diamond.upper.reading);
  const ledger = operationalAccountingLedger(
    joinClosureOperator(discharge),
    valuation([cell], { [cell]: opening }),
    1,
  );
  if (ledger.settled.values[cell] !== discharge) {
    return Object.freeze({
      kind: "metroplat.workItem.accounting-obstruction",
      reason: "non-monotone-reading-transition",
      opening: diamond.lower.reading,
      discharge: diamond.upper.reading,
    });
  }
  if (!ledger.closed || !ledger.quiescent || ledger.residue !== 0) {
    return Object.freeze({
      kind: "metroplat.workItem.accounting-obstruction",
      reason: "unclosed-ledger",
      opening: diamond.lower.reading,
      discharge: diamond.upper.reading,
    });
  }
  return Object.freeze({
    kind: "metroplat.workItem.accounting:witness",
    id: semanticId(ledger),
    ledger,
  });
}

/** `reading` stays in claim-session transport's own (relation model notation)
 *  vocabulary here — `juralRelationsOfClaimRows`/`dutiesOfAgent` (`./model.mjs`)
 *  cross into the governance provider's canonical labels at their own boundary. */
export function juralClaimRowOf(candidate) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
  const record = candidate;
  const cell = record["cell"];
  const reading = record["reading"];
  if (typeof cell !== "string" || typeof reading !== "string") return undefined;
  try {
    readingAs("knowledge", reading);
  } catch {
    return undefined;
  }
  return Object.freeze({ cell, reading });
}

export function juralClaimRowsOfStatements(rows) {
  const claimRows = [];
  for (const row of rows) {
    const [, attribute, value] = row;
    const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
    if (claimRow !== undefined) claimRows.push(claimRow);
  }
  return Object.freeze(claimRows);
}

function governanceViewOfMaterial(
  subject,
  date,
  claimRows,
) {
  const relations = juralRelationsOfClaimRows(claimRows);
  if (relations.length === 0) return undefined;
  const read = readJuralRelations(relations);
  return Object.freeze({
    kind: "metroplat.holography.governance-settlement",
    subject,
    date,
    observers: read.observers,
    powers: read.powers,
    dominion: read.dominion,
    concentration: read.concentration,
    accountabilityGap: read.accountabilityGap,
    directedCycle: read.directedCycle,
    contested: read.contested,
    relations: read.relations,
    correlatives: read.correlatives,
  });
}

export function governanceViewCollector() {
  const claimRows = [];
  return Object.freeze({
    push: (row) => {
      const [, attribute, value] = row;
      const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
      if (claimRow !== undefined) claimRows.push(claimRow);
    },
    read: (subject, date) =>
      governanceViewOfMaterial(subject, date, claimRows),
  });
}

export function governanceViewOfRows(
  subject,
  date,
  rows,
) {
  const collector = governanceViewCollector();
  for (const row of rows) collector.push(row);
  return collector.read(subject, date);
}

function workItemViewOfMaterial(
  feed,
  date,
  observations,
  causesByWitness = new Map(),
) {
  if (observations.length === 0) return undefined;
  const diamonds = diamondsByItem(observations);
  const byParent = new Map();
  for (const diamond of diamonds) {
    const key = diamond.parent ?? "";
    const list = byParent.get(key);
    if (list === undefined) byParent.set(key, [diamond]);
    else list.push(diamond);
  }
  const parents = {};
  let overflowed = 0;
  for (const [parent, siblingDiamonds] of byParent) {
    const closure = closeWorkItemCausalSetCarrier(siblingDiamonds);
    if (closure.kind === "metroplat.workItem.causal-set-out-of-scope") overflowed += 1;
    parents[parent.length === 0 ? "(none)" : parent] = Object.freeze({
      diamonds: siblingDiamonds,
      causalSet: workItemCausalSetCarrier(siblingDiamonds),
      settlement: closure,
    });
  }
  const diamondsByScope = workItemDiamondsByScope(observations);
  const statuses = workItemStatusesOfObservations(observations);
  const scopes = {};
  for (const scope of [...new Set(observations.map((observation) => observation.item))].sort()) {
    const scopeDiamonds = diamondsByScope.get(scope) ?? Object.freeze([]);
    const lifecycleStatus = statuses.get(scope);
    const latest = scopeDiamonds.at(-1);
    const causalDischarge = lifecycleStatus === "discharged" && latest?.lower.witness !== undefined
      && latest.upper.witness !== undefined
      && causallyFollows(latest.upper.causes, latest.lower.witness, causesByWitness);
    const terminalReading = latest?.upper.reading !== "unknown";
    const accounting = latest !== undefined && lifecycleStatus === "discharged" && causalDischarge && terminalReading
      ? workItemAccountingOfDiamond(latest)
      : undefined;
    const accounted = accounting?.kind === "metroplat.workItem.accounting:witness";
    const status = lifecycleStatus === "discharged" && (!causalDischarge || (terminalReading && !accounted))
      ? "obstructed" : lifecycleStatus;
    scopes[scope] = Object.freeze({
      status,
      diamonds: scopeDiamonds.length,
      causalDischarge,
      ...(accounting === undefined ? {} : { accounting }),
      ...(scopeDiamonds.length === 0 ? {} : {
        latest: latest?.id,
        settlement: closeWorkItemCausalSetCarrier(scopeDiamonds),
      }),
      evidence: Object.freeze([
        `scope:${scope}`,
        `status:${status}`,
        `diamonds:${scopeDiamonds.length}`,
        `causal-discharge:${causalDischarge}`,
        ...(accounting === undefined ? [] : [
          `accounting:${accounting.kind}`,
          ...(accounted ? [`accounting-address:${accounting.id}`] : [`accounting-obstruction:${accounting.reason}`]),
        ]),
      ]),
    });
  }
  const identity = Object.freeze({
    kind: "metroplat.holography.work-item-settlement",
    feed,
    date,
    diamonds: diamonds.length,
    scopes: Object.freeze(scopes),
    roadmap: workRoadmapOfObservations(observations),
    parents: Object.freeze(parents),
    overflowed,
  });
  return Object.freeze({
    ...identity,
    id: semanticId(identity),
  });
}

/** One dependency-height cut through a single enclosure's causal closure
 * landscape. An unparented scope is its own degenerate landscape. */

/**
 * JSON-boundary carrier for a causal-set witness used by the roadmap.
 *
 * The causal owner keeps its exact `Rational` internally. Exposing the
 * successor-set representation of that rational directly makes a modest
 * work graph expand superlinearly at the content-addressing boundary, so the
 * work readout uses the existing exact `p/q` codec while retaining every
 * other field of the causal judgment verbatim.
 */

function workRoadmapCausalClosureCarrier(
  judgment,
) {
  if (judgment.kind === "lorentzian.causalSettle-obstruction") return judgment;
  return Object.freeze({
    ...judgment,
    orderingFraction: ratToExactString(judgment.orderingFraction),
  });
}

const relationKey = (left, right) => `${left}\u0000${right}`;

/** Exact four-coloring of a sparse conflict graph, component by component. */
function sparseFourColoring(scopes, adjacency, colorCount) {
  const scopeIndex = new Map(scopes.map((scope, index) => [scope, index]));
  const colors = new Array(scopes.length).fill(-1);
  const visited = new Set();
  for (const scope of scopes) {
    if (adjacency.get(scope)?.size === 0) {
      colors[scopeIndex.get(scope)] = 0;
      continue;
    }
    if (visited.has(scope)) continue;
    const component = [];
    const pending = [scope];
    visited.add(scope);
    while (pending.length > 0) {
      const current = pending.pop();
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          pending.push(neighbor);
        }
      }
    }
    component.sort((left, right) => scopeIndex.get(left) - scopeIndex.get(right));
    const assigned = new Map();
    const extend = (index) => {
      if (index === component.length) return true;
      const current = component[index];
      const unavailable = new Set([...adjacency.get(current) ?? []].map((neighbor) => assigned.get(neighbor)).filter((color) => color !== undefined));
      for (let color = 0; color < colorCount; color += 1) {
        if (unavailable.has(color)) continue;
        assigned.set(current, color);
        if (extend(index + 1)) return true;
        assigned.delete(current);
      }
      return false;
    };
    if (!extend(0)) return Object.freeze({ kind: "meme-analysis.coloring.proper-obstruction", colorCount });
    for (const [member, color] of assigned) colors[scopeIndex.get(member)] = color;
  }
  return Object.freeze({ kind: "meme-analysis.coloring.proper:witness", colors: Object.freeze(colors), colorCount });
}

/** Direct sparse proof of the proper-coloring/factor-map equivalence. */
function sparseColoringFactorMap(scopes, adjacency, colors) {
  const scopeIndex = new Map(scopes.map((scope, index) => [scope, index]));
  for (const scope of scopes) {
    for (const neighbor of adjacency.get(scope) ?? []) {
      if (scopeIndex.get(scope) < scopeIndex.get(neighbor) && colors[scopeIndex.get(scope)] === colors[scopeIndex.get(neighbor)]) {
        return Object.freeze({
          kind: "meme-analysis.coloring.factorMap-obstruction",
          colors: Object.freeze([...colors]),
          proper: false,
          graphHom: false,
          equivalent: true,
          reason: "not-proper",
        });
      }
    }
  }
  return Object.freeze({
    kind: "meme-analysis.coloring.factorMap:witness",
    colors,
    proper: true,
    graphHom: true,
    equivalent: true,
  });
}

/**
 * Project a roadmap from ordinary work observations. Enclosure, dependency,
 * lifecycle, and conflict remain separate relations: only dependencies seed
 * causal order, while conflicts are colored into non-concurrent lanes.
 */
export function workRoadmapOfObservations(
  observations,
) {
  const scopes = Object.freeze([...new Set(observations.map((observation) => observation.item))].sort());
  const scopeSet = new Set(scopes);
  const parents = new Map(scopes.map((scope) => [scope, new Set()]));
  const dependencies = new Map(scopes.map((scope) => [scope, new Set()]));
  const declaredConflicts = new Map(scopes.map((scope) => [scope, new Set()]));
  for (const observation of observations) {
    if (observation.parent !== undefined) parents.get(observation.item).add(observation.parent);
    for (const dependency of observation.dependencies ?? []) dependencies.get(observation.item).add(dependency);
    for (const conflict of observation.conflicts ?? []) declaredConflicts.get(observation.item).add(conflict);
  }

  const relationObstructions = new Set();
  const invalidEnclosures = new Set();
  const parentOf = new Map();
  for (const scope of scopes) {
    const declaredParents = parents.get(scope) ?? new Set();
    if (declaredParents.size > 1) {
      relationObstructions.add(`ambiguous-enclosure:${scope}:${[...declaredParents].sort().join(",")}`);
      invalidEnclosures.add(scope);
      continue;
    }
    const parent = [...declaredParents][0];
    if (parent === undefined) {
      parentOf.set(scope, undefined);
      continue;
    }
    const childScope = workItemOfCell(scope);
    const parentScope = workItemOfCell(parent);
    if (childScope === null || parentScope === null) {
      relationObstructions.add(`invalid-enclosure:${scope}:${parent}`);
      invalidEnclosures.add(scope);
      continue;
    }
    if (!workLevelBelow(childScope.level, parentScope.level)) {
      relationObstructions.add(`non-enclosing-parent:${scope}:${parent}`);
      invalidEnclosures.add(scope);
      continue;
    }
    parentOf.set(scope, parent);
  }

  const links = [];
  const dependents = new Map(scopes.map((scope) => [scope, new Set()]));
  const validDependencies = new Map(scopes.map((scope) => [scope, new Set()]));
  const invalidDependencies = new Map(scopes.map((scope) => [scope, new Set()]));
  for (const scope of scopes) {
    for (const dependency of dependencies.get(scope) ?? []) {
      if (!scopeSet.has(dependency)) {
        relationObstructions.add(`missing-dependency:${scope}:${dependency}`);
        invalidDependencies.get(scope).add(dependency);
        continue;
      }
      if (dependency === scope) {
        relationObstructions.add(`self-dependency:${scope}`);
        invalidDependencies.get(scope).add(dependency);
        continue;
      }
      links.push(Object.freeze({ from: dependency, to: scope }));
      dependents.get(dependency).add(scope);
      validDependencies.get(scope).add(dependency);
    }
  }
  const dependencyCausalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: scopes,
    links: Object.freeze([...new Map(links.map((link) => [relationKey(link.from, link.to), link])).values()]
      .sort((left, right) => relationKey(left.from, left.to).localeCompare(relationKey(right.from, right.to)))),
  });
  const dependencySettlement = settleCausalSet(dependencyCausalSet);
  if (dependencySettlement.kind === "lorentzian.causalSettle-obstruction") {
    relationObstructions.add(`dependency-${dependencySettlement.reason}`);
  }

  const conflictEdges = new Set();
  const conflicts = new Map(scopes.map((scope) => [scope, new Set()]));
  const invalidConflicts = new Map(scopes.map((scope) => [scope, new Set()]));
  for (const scope of scopes) {
    for (const conflict of declaredConflicts.get(scope) ?? []) {
      if (!scopeSet.has(conflict)) {
        relationObstructions.add(`missing-conflict:${scope}:${conflict}`);
        invalidConflicts.get(scope).add(conflict);
        continue;
      }
      if (scope === conflict) {
        relationObstructions.add(`self-conflict:${scope}`);
        invalidConflicts.get(scope).add(conflict);
        continue;
      }
      conflicts.get(scope).add(conflict);
      conflicts.get(conflict).add(scope);
      conflictEdges.add(relationKey(scope, conflict));
      conflictEdges.add(relationKey(conflict, scope));
    }
  }
  const paletteSize = scopes.length === 0 ? 0 : 4;
  const edgeless = conflictEdges.size === 0 ? edgelessColoring(scopes.length, paletteSize) : undefined;
  const fourColoring = edgeless?.coloring ?? sparseFourColoring(scopes, conflicts, paletteSize);
  const lanes = fourColoring.kind === "meme-analysis.coloring.proper:witness"
    ? new Map(scopes.map((scope, index) => [scope, fourColoring.colors[index]]))
    : new Map();
  const conflictFactorMap = edgeless?.factorMap ?? (fourColoring.kind === "meme-analysis.coloring.proper:witness"
    ? sparseColoringFactorMap(scopes, conflicts, fourColoring.colors)
    : undefined);
  if (fourColoring.kind === "meme-analysis.coloring.proper-obstruction") {
    relationObstructions.add("conflict-graph-not-four-colorable");
  } else if (conflictFactorMap?.kind !== "meme-analysis.coloring.factorMap:witness") {
    relationObstructions.add("conflict-coloring-not-factor-map");
  }

  const statuses = workItemStatusesOfObservations(observations);
  const declarations = new Map(observations.filter((observation) => observation.event === "opened" && observation.text !== undefined)
    .map((observation) => [observation.item, observation]));
  const cycleScopes = dependencySettlement.kind === "lorentzian.causalSettle-obstruction"
    ? new Set(dependencySettlement.cycle)
    : new Set();
  const nodes = Object.freeze(scopes.map((scope) => {
    const status = statuses.get(scope) ?? "open";
    const blockers = new Set();
    for (const dependency of validDependencies.get(scope) ?? []) {
      if (statuses.get(dependency) !== "discharged") blockers.add(`unsettled:${dependency}`);
    }
    for (const dependency of invalidDependencies.get(scope) ?? []) {
      blockers.add(scopeSet.has(dependency) ? `invalid-dependency:${dependency}` : `missing:${dependency}`);
    }
    if (invalidEnclosures.has(scope)) blockers.add("invalid-enclosure");
    if (cycleScopes.has(scope)) blockers.add("dependency-cycle");
    if (status === "obstructed") blockers.add("lifecycle-obstructed");
    const structuralState = status === "discharged"
      ? "done"
      : blockers.size === 0 ? "ready" : "blocked";
    const scopeConflicts = Object.freeze([...(conflicts.get(scope) ?? [])].sort());
    const lane = scopeConflicts.length === 0 ? undefined : lanes.get(scope);
    const coordinationState = (invalidConflicts.get(scope)?.size ?? 0) > 0
      ? "obstructed"
      : scopeConflicts.length === 0
      ? "clear"
      : lane !== undefined ? "separated" : "obstructed";
    return Object.freeze({
      scope,
      ...(declarations.get(scope)?.text === undefined ? {} : { text: declarations.get(scope).text }),
      ...(declarations.get(scope)?.evidence === undefined ? {} : { evidence: declarations.get(scope).evidence }),
      ...(declarations.get(scope)?.producer === undefined ? {} : { producer: declarations.get(scope).producer }),
      ...(declarations.get(scope)?.witness === undefined ? {} : { witness: declarations.get(scope).witness }),
      ...(declarations.get(scope)?.causes === undefined ? {} : { causes: declarations.get(scope).causes }),
      ...(declarations.get(scope)?.obligationWitness === undefined ? {} : { obligationWitness: declarations.get(scope).obligationWitness }),
      status,
      parents: Object.freeze([...(parents.get(scope) ?? [])].sort()),
      dependencies: Object.freeze([...(dependencies.get(scope) ?? [])].sort()),
      dependents: Object.freeze([...(dependents.get(scope) ?? [])].sort()),
      conflicts: scopeConflicts,
      structural: Object.freeze({ state: structuralState, blockers: Object.freeze([...blockers].sort()) }),
      coordination: Object.freeze({
        state: coordinationState,
        ...(lane === undefined ? {} : { lane }),
      }),
    });
  }));
  const nodesByScope = new Map(nodes.map((node) => [node.scope, node]));
  const milestoneGroups = new Map();
  if (dependencySettlement.kind === "lorentzian.causalSettle:witness" && relationObstructions.size === 0) {
    const strata = causalHeightStrata(dependencyCausalSet);
    if (Array.isArray(strata)) {
      for (const [height, stratum] of (strata).entries()) {
        for (const scope of stratum) {
          const parent = parentOf.get(scope);
          const key = `${height}\u0000${parent === undefined ? `scope\u0000${scope}` : `parent\u0000${parent}`}`;
          const group = milestoneGroups.get(key);
          if (group === undefined) {
            milestoneGroups.set(key, { ...(parent === undefined ? {} : { parent }), height, scopes: [scope] });
          } else {
            group.scopes.push(scope);
          }
        }
      }
    }
  }
  const milestones = [];
  for (const [, group] of [...milestoneGroups].sort(([, left], [, right]) =>
    left.height - right.height
    || String(left.parent ?? left.scopes[0] ?? "").localeCompare(String(right.parent ?? right.scopes[0] ?? "")))) {
    const groupScopes = Object.freeze([...group.scopes].sort());
    const ready = groupScopes.filter((scope) => nodesByScope.get(scope)?.structural.state === "ready");
    const blocked = groupScopes.filter((scope) => nodesByScope.get(scope)?.structural.state === "blocked");
    const done = groupScopes.filter((scope) => nodesByScope.get(scope)?.structural.state === "done");
    const state = done.length === groupScopes.length
      ? "done"
      : ready.length > 0 ? "ready" : "blocked";
    milestones.push(Object.freeze({
      ...(group.parent === undefined ? {} : { parent: group.parent }),
      height: group.height,
      scopes: groupScopes,
      state,
      ready: Object.freeze(ready),
      blocked: Object.freeze(blocked),
      done: Object.freeze(done),
    }));
  }

  return Object.freeze({
    kind: "metroplat.work.roadmap-settlement",
    nodes,
    milestones: Object.freeze(milestones),
    dependencyCausalSet,
    dependencySettlement: workRoadmapCausalClosureCarrier(dependencySettlement),
    fourColoring,
    ...(conflictFactorMap === undefined ? {} : { conflictFactorMap }),
    relationObstructions: Object.freeze([...relationObstructions].sort()),
    evidence: Object.freeze([
      `scopes:${scopes.length}`,
      `dependencies:${dependencyCausalSet.links.length}`,
      `conflicts:${conflictEdges.size / 2}`,
      `milestones:${milestones.length}`,
      `milestone-enclosures:${milestoneGroups.size}`,
      "milestone-derivation:global-causal-height-with-enclosure-presentation",
      `four-coloring:${fourColoring.kind}`,
      `relation-obstructions:${relationObstructions.size}`,
    ]),
  });
}

export function workItemDiamondsByScope(
  observations,
) {
  const diamondsByScope = new Map();
  for (const observation of observations) {
    if (!diamondsByScope.has(observation.item)) diamondsByScope.set(observation.item, []);
  }
  for (const diamond of diamondsByItem(observations)) {
    const list = diamondsByScope.get(diamond.item);
    if (list === undefined) diamondsByScope.set(diamond.item, [diamond]);
    else list.push(diamond);
  }
  return new Map([...diamondsByScope].map(([scope, diamonds]) => [scope, Object.freeze([...diamonds])]));
}

export function workItemStatusOfScope(
  scope,
  diamondsByScope,
) {
  const scopeDiamonds = diamondsByScope.get(scope);
  if (scopeDiamonds === undefined || scopeDiamonds.length === 0) return "open";
  const closure = closeWorkItemCausalSetCarrier(scopeDiamonds);
  if (closure.kind !== "lorentzian.causalSettle:witness") return "obstructed";
  const latest = scopeDiamonds[scopeDiamonds.length - 1];
  return latest !== undefined && !latest.deshrouded ? "discharged" : "open";
}

/** A trailing canonical declaration remains open even before another observation
 * can bound its diamond. Receipt metadata without a declaration does not reopen
 * work; prior settled diamonds remain historical evidence for their own opening. */
export function workItemStatusesOfObservations(observations) {
  const diamondsByScope = workItemDiamondsByScope(observations);
  const latest = new Map(observations.map(observation => [observation.item, observation]));
  return new Map([...latest].map(([scope, observation]) => {
    const bounded = workItemStatusOfScope(scope, diamondsByScope);
    return [scope, bounded !== "obstructed" && observation.event === "opened" && observation.text !== undefined ? "open" : bounded];
  }));
}

export function workItemViewCollector() {
  const collector = workItemObservationCollector();
  const causesByWitness = new Map();
  return Object.freeze({
    push: (
      row,
      witness,
    ) => {
      if (witness?.id !== undefined) causesByWitness.set(witness.id, witness.cites);
      collector.push(row, witness);
    },
    read: (feed, date) =>
      workItemViewOfMaterial(feed, date, collector.read(), causesByWitness),
  });
}

export function workItemViewOfRows(
  feed,
  date,
  rows,
) {
  const collector = workItemViewCollector();
  for (const row of rows) collector.push(row);
  return collector.read(feed, date);
}

function dutiesViewOfMaterial(
  agent,
  date,
  claimRows,
  observations,
  obligations,
  allocations,
) {
  if (claimRows.length === 0) return undefined;
  const duties = dutiesOfAgent(claimRows, agent);
  if (duties.length === 0) return undefined;

  const statuses = workItemStatusesOfObservations(observations);

  return Object.freeze({
    kind: "metroplat.holography.duties-settlement",
    agent,
    date,
    duties: Object.freeze(duties.map((duty) => {
      const obligation = obligations.get(duty.relation.scope);
      const allocation = allocations.get(agencyWorkAllocationKey(duty.relation));
      const office = allocation?.office ?? duty.office;
      const intent = obligation === undefined ? undefined : intentOfObligationEvidence(obligation.evidence);
      return Object.freeze({
        active: duty.relation.active,
        passive: duty.relation.passive,
        scope: duty.relation.scope,
        standing: duty.relation.standing,
        via: duty.via,
        ...(office === undefined ? {} : { office }),
        status: statuses.get(duty.relation.scope) ?? "open",
        ...(intent === undefined ? {} : { intent }),
        ...(obligation?.subject === undefined ? {} : { subject: obligation.subject }),
        ...(obligation === undefined ? {} : { text: obligation.text }),
        ...(obligation?.parent === undefined ? {} : { parent: obligation.parent }),
        ...(allocation === undefined ? {} : {
          work: allocation.work,
          skill: allocation.skill,
          closureKind: allocation.closureKind,
          requiresCapabilities: allocation.requiresCapabilities,
        }),
      });
    })),
  });
}

export function dutiesViewCollector() {
  const claimRows = [];
  const workItems = workItemObservationCollector();
  const obligations = new Map();
  const allocations = new Map();
  return Object.freeze({
    push: (row) => {
      const [, attribute, value] = row;
      const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
      if (claimRow !== undefined) claimRows.push(claimRow);
      const obligation = workLedgerObligationOfRow(row);
      if (obligation !== undefined) obligations.set(obligation.item, obligation);
      const allocation = agencyWorkAllocationMarkerOfRow(row);
      if (allocation !== undefined) allocations.set(agencyWorkAllocationKey(allocation.relation), allocation);
      workItems.push(row);
    },
    read: (agent, date) =>
      dutiesViewOfMaterial(agent, date, claimRows, workItems.read(), obligations, allocations),
  });
}

export function dutiesViewOfRows(
  agent,
  date,
  rows,
) {
  const collector = dutiesViewCollector();
  for (const row of rows) collector.push(row);
  return collector.read(agent, date);
}
