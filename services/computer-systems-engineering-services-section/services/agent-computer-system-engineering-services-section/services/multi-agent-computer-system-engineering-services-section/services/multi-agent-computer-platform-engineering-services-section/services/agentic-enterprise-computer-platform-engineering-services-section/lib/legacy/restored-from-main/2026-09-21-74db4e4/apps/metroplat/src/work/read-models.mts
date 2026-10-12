import {
  diamondsByItem,
  closeWorkItemCausalSet,
  workItemCausalSet,
  type WorkItemObservation,
  type WorkItemDiamond,
} from "./causal-set.mts";
import {
  dutiesOfAgent,
  governance,
  juralRelationsOfClaimRows,
  workItemOfCell,
  workLevelBelow,
  type JuralClaimRow,
} from "./model.mts";
import { isChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { deriveCborNi } from "@red-cup-engineering/computer-data-engine/identity";
import { contentAddress } from "../lib/identity/index.mts";
import {
  causalHeightStrata,
  settleCausalSet,
  type CausalLink,
  type CausalSet,
  type CausalSettlementJudgment,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal";
import {
  coloringFactorMap,
  edgelessColoring,
  properColoring,
  type ColoringFactorMapJudgment,
  type ProperColoringJudgment,
} from "@lenticule-science/metrologic/graph/coloring";
import { intOne, intZero, type Matrix } from "@red-cup-engineering/computer-data-engine/exact-number";
import {
  joinClosureOperator,
  operationalAccountingLedger,
  valuation,
  type OperationalAccountingLedger,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/flow";
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { ratToExactString } from "../lib/codecs/javascript/numbers/rational.mts";
import type { EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import {
  agencyWorkAllocationKey,
  agencyWorkAllocationMarkerOfRow,
  intentOfObligationEvidence,
  workItemObservationCollector,
  workItemObservationsOfRows,
  workLedgerObligationOfRow,
  type WorkLedgerObligation,
  type AgencyWorkAllocationMarker,
} from "./observations.mts";

export interface WorkItemAccountingWitness {
  readonly kind: "metroplat.workItem.accounting:witness";
  readonly id: string;
  readonly ledger: OperationalAccountingLedger;
}

export interface WorkItemAccountingObstruction {
  readonly kind: "metroplat.workItem.accounting-obstruction";
  readonly reason: "non-monotone-charge-transition" | "unclosed-ledger";
  readonly opening: WorkItemObservation["charge"];
  readonly discharge: WorkItemObservation["charge"];
}

export type WorkItemAccountingJudgment = WorkItemAccountingWitness | WorkItemAccountingObstruction;

/** Price one witnessed work diamond by the same join closure ordinary settlement uses. */
export function workItemAccountingOfDiamond(diamond: WorkItemDiamond): WorkItemAccountingJudgment {
  const cell = diamond.item;
  const ledger = operationalAccountingLedger(
    joinClosureOperator(diamond.upper.charge),
    valuation([cell], { [cell]: diamond.lower.charge }),
    1,
  );
  if (ledger.settled.values[cell] !== diamond.upper.charge) {
    return Object.freeze({
      kind: "metroplat.workItem.accounting-obstruction" as const,
      reason: "non-monotone-charge-transition" as const,
      opening: diamond.lower.charge,
      discharge: diamond.upper.charge,
    });
  }
  if (!ledger.closed || !ledger.quiescent || ledger.residue !== 0) {
    return Object.freeze({
      kind: "metroplat.workItem.accounting-obstruction" as const,
      reason: "unclosed-ledger" as const,
      opening: diamond.lower.charge,
      discharge: diamond.upper.charge,
    });
  }
  return Object.freeze({
    kind: "metroplat.workItem.accounting:witness" as const,
    id: contentAddress(ledger as unknown as JsonValue),
    ledger,
  });
}

export function juralClaimRowOf(candidate: JsonValue): JuralClaimRow | undefined {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
  const record = candidate as Readonly<Record<string, JsonValue>>;
  const cell = record["cell"];
  const charge = record["charge"];
  return typeof cell === "string" && typeof charge === "string" && isChargeValueName(charge)
    ? Object.freeze({ cell, charge })
    : undefined;
}

export function juralClaimRowsOfStatements(rows: Iterable<EAVT>): readonly JuralClaimRow[] {
  const claimRows: JuralClaimRow[] = [];
  for (const row of rows) {
    const [, attribute, value] = row;
    const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
    if (claimRow !== undefined) claimRows.push(claimRow);
  }
  return Object.freeze(claimRows);
}

function governanceViewOfMaterial(
  subject: string,
  date: string,
  claimRows: readonly JuralClaimRow[],
): JsonValue | undefined {
  const relations = juralRelationsOfClaimRows(claimRows);
  if (relations.length === 0) return undefined;
  const read = governance(relations);
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
  }) as unknown as JsonValue;
}

export interface GovernanceViewCollector {
  push(row: EAVT): void;
  read(subject: string, date: string): JsonValue | undefined;
}

export function governanceViewCollector(): GovernanceViewCollector {
  const claimRows: JuralClaimRow[] = [];
  return Object.freeze({
    push: (row: EAVT): void => {
      const [, attribute, value] = row;
      const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
      if (claimRow !== undefined) claimRows.push(claimRow);
    },
    read: (subject: string, date: string): JsonValue | undefined =>
      governanceViewOfMaterial(subject, date, claimRows),
  });
}

export function governanceViewOfRows(
  subject: string,
  date: string,
  rows: Iterable<EAVT>,
): JsonValue | undefined {
  const collector = governanceViewCollector();
  for (const row of rows) collector.push(row);
  return collector.read(subject, date);
}

function workItemViewOfMaterial(
  feed: string,
  date: string,
  observations: readonly WorkItemObservation[],
): JsonValue | undefined {
  if (observations.length === 0) return undefined;
  const diamonds = diamondsByItem(observations);
  const byParent = new Map<string, WorkItemDiamond[]>();
  for (const diamond of diamonds) {
    const key = diamond.parent ?? "";
    const list = byParent.get(key);
    if (list === undefined) byParent.set(key, [diamond]);
    else list.push(diamond);
  }
  const parents: Record<string, JsonValue> = {};
  let overflowed = 0;
  for (const [parent, siblingDiamonds] of byParent) {
    const closure = closeWorkItemCausalSet(siblingDiamonds);
    if (closure.kind === "metroplat.workItem.causal-set-out-of-scope") overflowed += 1;
    parents[parent.length === 0 ? "(none)" : parent] = Object.freeze({
      diamonds: siblingDiamonds,
      causalSet: workItemCausalSet(siblingDiamonds),
      settlement: closure,
    }) as unknown as JsonValue;
  }
  const diamondsByScope = workItemDiamondsByScope(observations);
  const scopes: Record<string, JsonValue> = {};
  for (const scope of [...new Set(observations.map((observation) => observation.item))].sort()) {
    const scopeDiamonds = diamondsByScope.get(scope) ?? Object.freeze([]);
    const lifecycleStatus = workItemStatusOfScope(scope, diamondsByScope);
    const latest = scopeDiamonds.at(-1);
    const causalDischarge = latest?.lower.witness !== undefined
      && latest.upper.witness !== undefined
      && latest.upper.causes?.includes(latest.lower.witness) === true;
    const accounting = latest !== undefined && lifecycleStatus === "discharged" && causalDischarge
      ? workItemAccountingOfDiamond(latest)
      : undefined;
    const accounted = accounting?.kind === "metroplat.workItem.accounting:witness";
    const status: WorkItemScopeStatus = lifecycleStatus === "discharged" && (!causalDischarge || !accounted)
      ? "obstructed" : lifecycleStatus;
    scopes[scope] = Object.freeze({
      status,
      diamonds: scopeDiamonds.length,
      causalDischarge,
      ...(accounting === undefined ? {} : { accounting }),
      ...(scopeDiamonds.length === 0 ? {} : {
        latest: latest?.id,
        settlement: closeWorkItemCausalSet(scopeDiamonds),
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
    }) as unknown as JsonValue;
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
    id: deriveCborNi({ value: identity }).uri,
  }) as unknown as JsonValue;
}

export type WorkItemScopeStatus = "open" | "discharged" | "obstructed";

export type WorkRoadmapStructuralState = "ready" | "blocked" | "done";
export type WorkRoadmapCoordinationState = "clear" | "separated" | "obstructed";

export interface WorkRoadmapNode {
  readonly scope: string;
  readonly status: WorkItemScopeStatus;
  readonly parents: readonly string[];
  readonly dependencies: readonly string[];
  readonly dependents: readonly string[];
  readonly conflicts: readonly string[];
  readonly structural: Readonly<{
    readonly state: WorkRoadmapStructuralState;
    readonly blockers: readonly string[];
  }>;
  readonly coordination: Readonly<{
    readonly state: WorkRoadmapCoordinationState;
    readonly lane?: number;
  }>;
}

/** One dependency-height cut through a single enclosure's causal closure
 * landscape. An unparented scope is its own degenerate landscape. */
export interface WorkRoadmapMilestone {
  readonly parent?: string;
  readonly height: number;
  readonly scopes: readonly string[];
  readonly state: WorkRoadmapStructuralState;
  readonly ready: readonly string[];
  readonly blocked: readonly string[];
  readonly done: readonly string[];
}

export interface WorkRoadmapReadout {
  readonly kind: "metroplat.work.roadmap-settlement";
  readonly nodes: readonly WorkRoadmapNode[];
  readonly milestones: readonly WorkRoadmapMilestone[];
  readonly dependencyCausalSet: CausalSet;
  readonly dependencySettlement: WorkRoadmapCausalSettlementJudgment;
  readonly fourColoring: ProperColoringJudgment;
  readonly conflictFactorMap?: ColoringFactorMapJudgment;
  readonly relationObstructions: readonly string[];
  readonly evidence: readonly string[];
}

/**
 * JSON-boundary carrier for a causal-set witness used by the roadmap.
 *
 * The causal owner keeps its exact `Rational` internally. Exposing the
 * successor-set representation of that rational directly makes a modest
 * work graph expand superlinearly at the content-addressing boundary, so the
 * work readout uses the existing exact `p/q` codec while retaining every
 * other field of the causal judgment verbatim.
 */
export type WorkRoadmapCausalClosureWitness = Omit<
  Extract<CausalSettlementJudgment, { readonly kind: "lorentzian.causalSettle:witness" }>,
  "orderingFraction"
> & Readonly<{ readonly orderingFraction: string }>;

export type WorkRoadmapCausalSettlementJudgment =
  | WorkRoadmapCausalClosureWitness
  | Extract<CausalSettlementJudgment, { readonly kind: "lorentzian.causalSettle-obstruction" }>;

function workRoadmapCausalClosureCarrier(
  judgment: CausalSettlementJudgment,
): WorkRoadmapCausalSettlementJudgment {
  if (judgment.kind === "lorentzian.causalSettle-obstruction") return judgment;
  return Object.freeze({
    ...judgment,
    orderingFraction: ratToExactString(judgment.orderingFraction),
  });
}

const relationKey = (left: string, right: string): string => `${left}\u0000${right}`;

/**
 * Project a roadmap from ordinary work observations. Enclosure, dependency,
 * lifecycle, and conflict remain separate relations: only dependencies seed
 * causal order, while conflicts are colored into non-concurrent lanes.
 */
export function workRoadmapOfObservations(
  observations: readonly WorkItemObservation[],
): WorkRoadmapReadout {
  const scopes = Object.freeze([...new Set(observations.map((observation) => observation.item))].sort());
  const scopeSet = new Set(scopes);
  const parents = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  const dependencies = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  const declaredConflicts = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  for (const observation of observations) {
    if (observation.parent !== undefined) parents.get(observation.item)!.add(observation.parent);
    for (const dependency of observation.dependencies ?? []) dependencies.get(observation.item)!.add(dependency);
    for (const conflict of observation.conflicts ?? []) declaredConflicts.get(observation.item)!.add(conflict);
  }

  const relationObstructions = new Set<string>();
  const invalidEnclosures = new Set<string>();
  const parentOf = new Map<string, string | undefined>();
  for (const scope of scopes) {
    const declaredParents = parents.get(scope) ?? new Set<string>();
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

  const links: CausalLink[] = [];
  const dependents = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  const validDependencies = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  const invalidDependencies = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  for (const scope of scopes) {
    for (const dependency of dependencies.get(scope) ?? []) {
      if (!scopeSet.has(dependency)) {
        relationObstructions.add(`missing-dependency:${scope}:${dependency}`);
        invalidDependencies.get(scope)!.add(dependency);
        continue;
      }
      if (dependency === scope) {
        relationObstructions.add(`self-dependency:${scope}`);
        invalidDependencies.get(scope)!.add(dependency);
        continue;
      }
      links.push(Object.freeze({ from: dependency, to: scope }));
      dependents.get(dependency)!.add(scope);
      validDependencies.get(scope)!.add(dependency);
    }
  }
  const dependencyCausalSet: CausalSet = Object.freeze({
    kind: "lorentzian.causalSet" as const,
    events: scopes,
    links: Object.freeze([...new Map(links.map((link) => [relationKey(link.from, link.to), link])).values()]
      .sort((left, right) => relationKey(left.from, left.to).localeCompare(relationKey(right.from, right.to)))),
  });
  const dependencySettlement = settleCausalSet(dependencyCausalSet);
  if (dependencySettlement.kind === "lorentzian.causalSettle-obstruction") {
    relationObstructions.add(`dependency-${dependencySettlement.reason}`);
  }

  const conflictEdges = new Set<string>();
  const conflicts = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  const invalidConflicts = new Map(scopes.map((scope) => [scope, new Set<string>()]));
  for (const scope of scopes) {
    for (const conflict of declaredConflicts.get(scope) ?? []) {
      if (!scopeSet.has(conflict)) {
        relationObstructions.add(`missing-conflict:${scope}:${conflict}`);
        invalidConflicts.get(scope)!.add(conflict);
        continue;
      }
      if (scope === conflict) {
        relationObstructions.add(`self-conflict:${scope}`);
        invalidConflicts.get(scope)!.add(conflict);
        continue;
      }
      conflicts.get(scope)!.add(conflict);
      conflicts.get(conflict)!.add(scope);
      conflictEdges.add(relationKey(scope, conflict));
      conflictEdges.add(relationKey(conflict, scope));
    }
  }
  const paletteSize = scopes.length === 0 ? 0 : 4;
  const edgeless = conflictEdges.size === 0 ? edgelessColoring(scopes.length, paletteSize) : undefined;
  const weights: Matrix | undefined = edgeless === undefined
    ? Object.freeze(scopes.map((left) => Object.freeze(scopes.map((right) =>
      conflictEdges.has(relationKey(left, right)) ? intOne : intZero))))
    : undefined;
  const fourColoring = edgeless?.coloring ?? properColoring(weights!, paletteSize);
  const lanes = fourColoring.kind === "meme-analysis.coloring.proper:witness"
    ? new Map(scopes.map((scope, index) => [scope, fourColoring.colors[index]!]))
    : new Map<string, number>();
  const conflictFactorMap = edgeless?.factorMap ?? (fourColoring.kind === "meme-analysis.coloring.proper:witness"
    ? coloringFactorMap(weights!, fourColoring.colors)
    : undefined);
  if (fourColoring.kind === "meme-analysis.coloring.proper-obstruction") {
    relationObstructions.add("conflict-graph-not-four-colorable");
  } else if (conflictFactorMap?.kind !== "meme-analysis.coloring.factorMap:witness") {
    relationObstructions.add("conflict-coloring-not-factor-map");
  }

  const diamondsByScope = workItemDiamondsByScope(observations);
  const statuses = new Map(scopes.map((scope) => [scope, workItemStatusOfScope(scope, diamondsByScope)]));
  const cycleScopes = dependencySettlement.kind === "lorentzian.causalSettle-obstruction"
    ? new Set(dependencySettlement.cycle)
    : new Set<string>();
  const nodes = Object.freeze(scopes.map((scope): WorkRoadmapNode => {
    const status = statuses.get(scope) ?? "open";
    const blockers = new Set<string>();
    for (const dependency of validDependencies.get(scope) ?? []) {
      if (statuses.get(dependency) !== "discharged") blockers.add(`unsettled:${dependency}`);
    }
    for (const dependency of invalidDependencies.get(scope) ?? []) {
      blockers.add(scopeSet.has(dependency) ? `invalid-dependency:${dependency}` : `missing:${dependency}`);
    }
    if (invalidEnclosures.has(scope)) blockers.add("invalid-enclosure");
    if (cycleScopes.has(scope)) blockers.add("dependency-cycle");
    if (status === "obstructed") blockers.add("lifecycle-obstructed");
    const structuralState: WorkRoadmapStructuralState = status === "discharged"
      ? "done"
      : blockers.size === 0 ? "ready" : "blocked";
    const scopeConflicts = Object.freeze([...(conflicts.get(scope) ?? [])].sort());
    const lane = scopeConflicts.length === 0 ? undefined : lanes.get(scope);
    const coordinationState: WorkRoadmapCoordinationState = (invalidConflicts.get(scope)?.size ?? 0) > 0
      ? "obstructed"
      : scopeConflicts.length === 0
      ? "clear"
      : lane !== undefined ? "separated" : "obstructed";
    return Object.freeze({
      scope,
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
  const milestoneGroups = new Map<string, { readonly parent?: string; readonly height: number; readonly scopes: string[] }>();
  if (dependencySettlement.kind === "lorentzian.causalSettle:witness" && relationObstructions.size === 0) {
    const strata = causalHeightStrata(dependencyCausalSet);
    if (Array.isArray(strata)) {
      for (const [height, stratum] of (strata as readonly (readonly string[])[]).entries()) {
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
  const milestones: WorkRoadmapMilestone[] = [];
  for (const [, group] of [...milestoneGroups].sort(([, left], [, right]) =>
    left.height - right.height
    || String(left.parent ?? left.scopes[0] ?? "").localeCompare(String(right.parent ?? right.scopes[0] ?? "")))) {
    const groupScopes = Object.freeze([...group.scopes].sort());
    const ready = groupScopes.filter((scope) => nodesByScope.get(scope)?.structural.state === "ready");
    const blocked = groupScopes.filter((scope) => nodesByScope.get(scope)?.structural.state === "blocked");
    const done = groupScopes.filter((scope) => nodesByScope.get(scope)?.structural.state === "done");
    const state: WorkRoadmapStructuralState = done.length === groupScopes.length
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
    kind: "metroplat.work.roadmap-settlement" as const,
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
  observations: readonly WorkItemObservation[],
): ReadonlyMap<string, readonly WorkItemDiamond[]> {
  const diamondsByScope = new Map<string, WorkItemDiamond[]>();
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
  scope: string,
  diamondsByScope: ReadonlyMap<string, readonly WorkItemDiamond[]>,
): WorkItemScopeStatus {
  const scopeDiamonds = diamondsByScope.get(scope);
  if (scopeDiamonds === undefined || scopeDiamonds.length === 0) return "open";
  const closure = closeWorkItemCausalSet(scopeDiamonds);
  if (closure.kind !== "lorentzian.causalSettle:witness") return "obstructed";
  const latest = scopeDiamonds[scopeDiamonds.length - 1];
  return latest !== undefined && !latest.deshrouded ? "discharged" : "open";
}

export interface WorkItemViewCollector {
  push(row: EAVT, witness?: Readonly<{ readonly id: string; readonly core: Readonly<{ readonly causes: readonly string[] }> }>): void;
  read(feed: string, date: string): JsonValue | undefined;
}

export function workItemViewCollector(): WorkItemViewCollector {
  const collector = workItemObservationCollector();
  return Object.freeze({
    push: (
      row: EAVT,
      witness?: Readonly<{ readonly id: string; readonly core: Readonly<{ readonly causes: readonly string[] }> }>,
    ): void => { collector.push(row, witness); },
    read: (feed: string, date: string): JsonValue | undefined =>
      workItemViewOfMaterial(feed, date, collector.read()),
  });
}

export function workItemViewOfRows(
  feed: string,
  date: string,
  rows: Iterable<EAVT>,
): JsonValue | undefined {
  const collector = workItemViewCollector();
  for (const row of rows) collector.push(row);
  return collector.read(feed, date);
}

function dutiesViewOfMaterial(
  agent: string,
  date: string,
  claimRows: readonly JuralClaimRow[],
  observations: readonly WorkItemObservation[],
  obligations: ReadonlyMap<string, WorkLedgerObligation>,
  allocations: ReadonlyMap<string, AgencyWorkAllocationMarker>,
): JsonValue | undefined {
  if (claimRows.length === 0) return undefined;
  const duties = dutiesOfAgent(claimRows, agent);
  if (duties.length === 0) return undefined;

  const diamondsByScope = workItemDiamondsByScope(observations);

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
        status: workItemStatusOfScope(duty.relation.scope, diamondsByScope),
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
  }) as unknown as JsonValue;
}

export interface DutiesViewCollector {
  push(row: EAVT): void;
  read(agent: string, date: string): JsonValue | undefined;
}

export function dutiesViewCollector(): DutiesViewCollector {
  const claimRows: JuralClaimRow[] = [];
  const workItems = workItemObservationCollector();
  const obligations = new Map<string, WorkLedgerObligation>();
  const allocations = new Map<string, AgencyWorkAllocationMarker>();
  return Object.freeze({
    push: (row: EAVT): void => {
      const [, attribute, value] = row;
      const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
      if (claimRow !== undefined) claimRows.push(claimRow);
      const obligation = workLedgerObligationOfRow(row);
      if (obligation !== undefined) obligations.set(obligation.item, obligation);
      const allocation = agencyWorkAllocationMarkerOfRow(row);
      if (allocation !== undefined) allocations.set(agencyWorkAllocationKey(allocation.relation), allocation);
      workItems.push(row);
    },
    read: (agent: string, date: string): JsonValue | undefined =>
      dutiesViewOfMaterial(agent, date, claimRows, workItems.read(), obligations, allocations),
  });
}

export function dutiesViewOfRows(
  agent: string,
  date: string,
  rows: Iterable<EAVT>,
): JsonValue | undefined {
  const collector = dutiesViewCollector();
  for (const row of rows) collector.push(row);
  return collector.read(agent, date);
}
