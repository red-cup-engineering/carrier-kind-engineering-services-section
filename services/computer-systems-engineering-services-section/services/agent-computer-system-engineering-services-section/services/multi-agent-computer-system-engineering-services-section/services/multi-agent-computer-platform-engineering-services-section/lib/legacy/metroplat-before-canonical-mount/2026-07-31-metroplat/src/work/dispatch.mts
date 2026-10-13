import { WORK_LEVELS, type WorkLevel } from "./model.mts";
import type {
  AgentWorkAgent,
  AgentWorkDuty,
  AgentWorkReadout,
} from "./readout.mts";

export type AgentWorkDispatchState = "ready" | "blocked" | "done";
export type AgentWorkDispatchCoordination = "clear" | "contested" | "coordination-required";

export interface AgentWorkDispatchItem {
  readonly agent: string;
  readonly scope: string;
  readonly state: AgentWorkDispatchState;
  readonly status: AgentWorkDuty["status"];
  readonly level?: WorkLevel;
  readonly structural: AgentWorkDuty["structural"];
  readonly coordination: AgentWorkDuty["coordination"];
  readonly via: AgentWorkDuty["via"];
  readonly office?: string;
  readonly passive: string;
  readonly standing: string;
  readonly reasons: readonly string[];
}

export interface AgentWorkDispatchAgent {
  readonly agent: string;
  readonly ready: number;
  readonly blocked: number;
  readonly done: number;
  readonly next?: AgentWorkDispatchItem;
  readonly queue: readonly AgentWorkDispatchItem[];
  readonly evidence: readonly string[];
}

export interface AgentWorkDispatchReadout {
  readonly kind: "metroplat.agent-work.dispatch-settlement";
  readonly subject: string;
  readonly date: string;
  readonly feed: string;
  readonly policy: "declared-duty-with-structural-and-coordination-readiness";
  readonly coordination: AgentWorkDispatchCoordination;
  /** Exact H¹-style obstruction count carried by governance. */
  readonly coordinationCost: number;
  readonly agents: readonly AgentWorkDispatchAgent[];
  readonly queue: readonly AgentWorkDispatchItem[];
  readonly evidence: readonly string[];
}

function levelOfScope(scope: string): WorkLevel | undefined {
  const separator = scope.indexOf(":");
  if (separator <= 0) return undefined;
  const level = scope.slice(0, separator);
  return (WORK_LEVELS as readonly string[]).includes(level) ? level as WorkLevel : undefined;
}

function stateOfDuty(duty: AgentWorkDuty): AgentWorkDispatchState {
  // A duty is dispatchable only when its settled standing is held. Unknown,
  // denied, and contested relations remain visible in the queue as evidence,
  // but none of them assigns labor to the agent.
  if (duty.standing !== "held") return "blocked";
  if (duty.status === "discharged") return "done";
  if (duty.status === "obstructed") return "blocked";
  if (duty.structural.state !== "ready") return "blocked";
  if (duty.coordination.state === "obstructed") return "blocked";
  return "ready";
}

function reasonsOfDuty(duty: AgentWorkDuty, level: WorkLevel | undefined): readonly string[] {
  const reasons = [
    `status:${duty.status}`,
    `via:${duty.via}`,
    `standing:${duty.standing}`,
    `structural:${duty.structural.state}`,
    ...duty.structural.blockers.map((blocker) => `structural-blocker:${blocker}`),
    `coordination:${duty.coordination.state}`,
    ...(duty.coordination.lane === undefined ? [] : [`coordination-lane:${duty.coordination.lane}`]),
    ...(level === undefined ? [] : [`level:${level}`]),
    ...(duty.office === undefined ? [] : [`office:${duty.office}`]),
  ];
  return Object.freeze(reasons);
}

function itemOfDuty(agent: string, duty: AgentWorkDuty): AgentWorkDispatchItem {
  const level = levelOfScope(duty.scope);
  return Object.freeze({
    agent,
    scope: duty.scope,
    state: stateOfDuty(duty),
    status: duty.status,
    ...(level === undefined ? {} : { level }),
    structural: duty.structural,
    coordination: duty.coordination,
    via: duty.via,
    ...(duty.office === undefined ? {} : { office: duty.office }),
    passive: duty.passive,
    standing: duty.standing,
    reasons: reasonsOfDuty(duty, level),
  });
}

function compareDispatchItems(left: AgentWorkDispatchItem, right: AgentWorkDispatchItem): number {
  const leftDispatchable = left.state === "ready" ? 0 : left.state === "blocked" ? 1 : 2;
  const rightDispatchable = right.state === "ready" ? 0 : right.state === "blocked" ? 1 : 2;
  if (leftDispatchable !== rightDispatchable) return leftDispatchable - rightDispatchable;
  const leftLane = left.coordination.lane ?? Number.MAX_SAFE_INTEGER;
  const rightLane = right.coordination.lane ?? Number.MAX_SAFE_INTEGER;
  if (leftLane !== rightLane) return leftLane - rightLane;
  if (left.scope !== right.scope) return left.scope.localeCompare(right.scope);
  return left.agent.localeCompare(right.agent);
}

function dispatchAgentOfWorkAgent(agent: AgentWorkAgent): AgentWorkDispatchAgent {
  const queue = Object.freeze(agent.scopes.map((duty) => itemOfDuty(agent.agent, duty)).sort(compareDispatchItems));
  const next = queue.find((item) => item.state === "ready");
  return Object.freeze({
    agent: agent.agent,
    ready: queue.filter((item) => item.state === "ready").length,
    blocked: queue.filter((item) => item.state === "blocked").length,
    done: queue.filter((item) => item.state === "done").length,
    ...(next === undefined ? {} : { next }),
    queue,
    evidence: Object.freeze([
      `duties:${agent.duties}`,
      `ready:${queue.filter((item) => item.state === "ready").length}`,
      `blocked:${queue.filter((item) => item.state === "blocked").length}`,
      `done:${queue.filter((item) => item.state === "done").length}`,
      `offices:${agent.offices.length}`,
    ]),
  });
}

function coordinationOfWork(readout: AgentWorkReadout): AgentWorkDispatchCoordination {
  const governance = readout.governance;
  if (governance === undefined) return "clear";
  if (governance.obstruction > 0) return "coordination-required";
  if (governance.contested > 0) return "contested";
  return "clear";
}

export function agentWorkDispatchReadoutOfWork(
  readout: AgentWorkReadout,
): AgentWorkDispatchReadout {
  const agents = Object.freeze(readout.agents.map(dispatchAgentOfWorkAgent));
  const queue = Object.freeze(agents.flatMap((agent) => agent.queue).sort(compareDispatchItems));
  const ready = queue.filter((item) => item.state === "ready").length;
  const blocked = queue.filter((item) => item.state === "blocked").length;
  const done = queue.filter((item) => item.state === "done").length;
  const coordination = coordinationOfWork(readout);
  const coordinationCost = readout.governance?.obstruction ?? 0;
  return Object.freeze({
    kind: "metroplat.agent-work.dispatch-settlement" as const,
    subject: readout.subject,
    date: readout.date,
    feed: readout.feed,
    policy: "declared-duty-with-structural-and-coordination-readiness" as const,
    coordination,
    coordinationCost,
    agents,
    queue,
    evidence: Object.freeze([
      `work-readout:${readout.kind}`,
      `agents:${agents.length}`,
      `ready:${ready}`,
      `blocked:${blocked}`,
      `done:${done}`,
      `coordination:${coordination}`,
      `coordination-cost:${coordinationCost}`,
      ...(readout.governance === undefined ? [] : [
        `governance:${readout.governance.discipline}`,
        `governance-obstruction:${readout.governance.obstruction}`,
        `governance-contested:${readout.governance.contested}`,
      ]),
    ]),
  });
}
