import {
  diamondsByItem,
  closeWorkItemCausalSet,
  workItemCausalSet,
  type WorkItemCausalSetClosure,
  type WorkItemDiamond,
  type WorkItemObservation,
} from "./causal-set.mts";
import {
  dutiesOfAgent,
  governance,
  juralRelationsOfClaimRows,
  type Governance,
  type JuralClaimRow,
  type JuralRelation,
  type StandingDuty,
} from "./model.mts";
import type { EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import { workItemObservationCollector } from "./observations.mts";
import {
  juralClaimRowOf,
  workRoadmapOfObservations,
  workItemDiamondsByScope,
  workItemStatusOfScope,
  type WorkRoadmapNode,
  type WorkRoadmapReadout,
  type WorkItemScopeStatus,
} from "./read-models.mts";

export interface AgentWorkScopeStatus {
  readonly scope: string;
  readonly status: WorkItemScopeStatus;
}

export interface AgentWorkDuty {
  readonly scope: string;
  readonly passive: string;
  readonly standing: string;
  readonly via: "agent" | "office";
  readonly status: WorkItemScopeStatus;
  readonly structural: WorkRoadmapNode["structural"];
  readonly coordination: WorkRoadmapNode["coordination"];
  readonly office?: string;
}

export interface AgentWorkAgent {
  readonly agent: string;
  readonly duties: number;
  readonly open: number;
  readonly discharged: number;
  readonly obstructed: number;
  readonly scopes: readonly AgentWorkDuty[];
  readonly offices: readonly string[];
}

export interface AgentWorkParent {
  readonly parent: string | null;
  readonly diamonds: number;
  readonly open: number;
  readonly discharged: number;
  readonly obstructed: number;
  readonly causalSet: ReturnType<typeof workItemCausalSet>;
  readonly settlement: WorkItemCausalSetClosure;
}

export interface AgentWorkReadoutWork {
  readonly observations: number;
  readonly diamonds: number;
  readonly open: number;
  readonly discharged: number;
  readonly obstructed: number;
  readonly scopes: readonly AgentWorkScopeStatus[];
  readonly parents: readonly AgentWorkParent[];
  readonly roadmap: WorkRoadmapReadout;
}

export interface AgentWorkReadout {
  readonly kind: "metroplat.agent-work.readout";
  readonly subject: string;
  readonly date: string;
  readonly feed: string;
  readonly work: AgentWorkReadoutWork;
  readonly agents: readonly AgentWorkAgent[];
  readonly evidence: readonly string[];
  readonly governance?: Governance;
}

export interface AgentWorkReadoutOptions {
  readonly subject: string;
  readonly date: string;
  readonly feed?: string;
  readonly agents?: readonly string[];
}

export interface AgentWorkReadoutCollector {
  push(row: EAVT): void;
  read(options: AgentWorkReadoutOptions): AgentWorkReadout;
}

function agentNamesOf(relations: readonly JuralRelation[], requested: readonly string[] | undefined): readonly string[] {
  if (requested !== undefined) {
    return Object.freeze([...new Set(requested)].filter((agent) => agent.length > 0).sort((left, right) => left.localeCompare(right)));
  }
  const agents = new Set<string>();
  for (const relation of relations) {
    agents.add(relation.active);
    agents.add(relation.passive);
  }
  return Object.freeze([...agents].filter((agent) => agent.length > 0).sort((left, right) => left.localeCompare(right)));
}

function workParents(diamonds: readonly WorkItemDiamond[]): readonly AgentWorkParent[] {
  const byParent = new Map<string, WorkItemDiamond[]>();
  for (const diamond of diamonds) {
    const key = diamond.parent ?? "";
    const list = byParent.get(key);
    if (list === undefined) byParent.set(key, [diamond]);
    else list.push(diamond);
  }
  return Object.freeze([...byParent].map(([parent, siblingDiamonds]) => {
    const closure = closeWorkItemCausalSet(siblingDiamonds);
    const obstructed = closure.kind === "metroplat.workItem.causal-set-out-of-scope" ? siblingDiamonds.length : 0;
    return Object.freeze({
      parent: parent.length === 0 ? null : parent,
      diamonds: siblingDiamonds.length,
      open: siblingDiamonds.filter((diamond) => diamond.deshrouded).length,
      discharged: siblingDiamonds.filter((diamond) => !diamond.deshrouded).length,
      obstructed,
      causalSet: workItemCausalSet(siblingDiamonds),
      settlement: closure,
    });
  }).sort((left, right) => String(left.parent ?? "").localeCompare(String(right.parent ?? ""))));
}

function workRead(observations: readonly WorkItemObservation[], roadmap: WorkRoadmapReadout): AgentWorkReadoutWork {
  const diamonds = diamondsByItem(observations);
  const byScope = workItemDiamondsByScope(observations);
  const scopes = Object.freeze([...byScope.keys()].sort((left, right) => left.localeCompare(right)).map((scope) => Object.freeze({
    scope,
    status: workItemStatusOfScope(scope, byScope),
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

function dutyRead(
  duty: StandingDuty,
  byScope: ReadonlyMap<string, readonly WorkItemDiamond[]>,
  roadmapNodes: ReadonlyMap<string, WorkRoadmapNode>,
): AgentWorkDuty {
  const roadmapNode = roadmapNodes.get(duty.relation.scope);
  return Object.freeze({
    scope: duty.relation.scope,
    passive: duty.relation.passive,
    standing: duty.relation.standing,
    via: duty.via,
    status: workItemStatusOfScope(duty.relation.scope, byScope),
    structural: roadmapNode?.structural ?? Object.freeze({ state: "blocked" as const, blockers: Object.freeze(["scope-not-declared"]) }),
    coordination: roadmapNode?.coordination ?? Object.freeze({ state: "clear" as const }),
    ...(duty.office === undefined ? {} : { office: duty.office }),
  });
}

function agentRead(
  agent: string,
  claimRows: readonly JuralClaimRow[],
  byScope: ReadonlyMap<string, readonly WorkItemDiamond[]>,
  roadmapNodes: ReadonlyMap<string, WorkRoadmapNode>,
): AgentWorkAgent {
  const duties = Object.freeze(dutiesOfAgent(claimRows, agent).map((duty) => dutyRead(duty, byScope, roadmapNodes)));
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

export function agentWorkReadoutCollector(): AgentWorkReadoutCollector {
  const claimRows: JuralClaimRow[] = [];
  const workItems = workItemObservationCollector();
  let rows = 0;
  return Object.freeze({
    push: (row: EAVT): void => {
      rows += 1;
      const [, attribute, value] = row;
      const claimRow = juralClaimRowOf(value) ?? juralClaimRowOf(attribute);
      if (claimRow !== undefined) claimRows.push(claimRow);
      workItems.push(row);
    },
    read: (options: AgentWorkReadoutOptions): AgentWorkReadout => {
      const observations = workItems.read();
      const byScope = workItemDiamondsByScope(observations);
      const roadmap = workRoadmapOfObservations(observations);
      const roadmapNodes = new Map(roadmap.nodes.map((node) => [node.scope, node]));
      const relations = juralRelationsOfClaimRows(claimRows);
      const agents = agentNamesOf(relations, options.agents);
      const governanceRead = relations.length === 0 ? undefined : governance(relations);
      return Object.freeze({
        kind: "metroplat.agent-work.readout" as const,
        subject: options.subject,
        date: options.date,
        feed: options.feed ?? "claim-session",
        work: workRead(observations, roadmap),
        agents: Object.freeze(agents.map((agent) => agentRead(agent, claimRows, byScope, roadmapNodes))),
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
  rows: Iterable<EAVT>,
  options: AgentWorkReadoutOptions,
): AgentWorkReadout {
  const collector = agentWorkReadoutCollector();
  for (const row of rows) collector.push(row);
  return collector.read(options);
}
