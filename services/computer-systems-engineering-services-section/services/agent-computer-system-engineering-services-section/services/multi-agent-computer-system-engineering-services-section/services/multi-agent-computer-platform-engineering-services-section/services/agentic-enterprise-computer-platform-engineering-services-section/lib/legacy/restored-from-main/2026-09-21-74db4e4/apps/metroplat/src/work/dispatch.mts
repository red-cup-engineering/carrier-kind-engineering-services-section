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
  /** Recorded work scopes that may not be scheduled concurrently with this item. */
  readonly conflicts: readonly string[];
  readonly via: AgentWorkDuty["via"];
  readonly office?: string;
  readonly passive: string;
  readonly standing: string;
  readonly reasons: readonly string[];
  /** The structured-work-intent id whose obligation row declared this scope. */
  readonly intent?: string;
  /** Exact journal-feed subject for the obligation read back by this duty. */
  readonly subject?: string;
  readonly source?: AgentWorkDuty["source"];
  /** The declaring obligation row's item text — the repair instruction. */
  readonly text?: string;
  /** Exact admitted deterministic operation and result gate. */
  readonly deterministicExecution?: AgentWorkDuty["deterministicExecution"];
  /** Exact allocation journal source that authorized this office-directed scope. */
  readonly allocation?: AgentWorkDuty["allocation"];
  readonly duty?: AgentWorkDuty["duty"];
  /** Canonical work and skill that authorized this office-directed scope. */
  readonly work?: AgentWorkDuty["work"];
  readonly skill?: AgentWorkDuty["skill"];
  /** Declared method class and provider requirements; dispatch does not infer either from prose. */
  readonly closureKind?: AgentWorkDuty["closureKind"];
  readonly requiresCapabilities?: AgentWorkDuty["requiresCapabilities"];
  readonly method?: AgentWorkDuty["method"];
  readonly receiverCondition?: AgentWorkDuty["receiverCondition"];
  readonly delegation?: AgentWorkDuty["delegation"];
  /** The declaring obligation row's recorded enclosure, when it carried one. */
  readonly parent?: string;
}

export interface AgentWorkDispatchAgent {
  readonly agent: string;
  readonly ready: number;
  readonly blocked: number;
  readonly done: number;
  /** The ready causal antichain. Array order is presentation only. */
  readonly frontier: readonly AgentWorkDispatchItem[];
  /** Conflict-safe concurrent batches derived only from recorded conflict lanes. */
  readonly offers: readonly (readonly AgentWorkDispatchItem[])[];
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
  /** The union of every agent's ready causal frontier, in presentation order. */
  readonly frontier: readonly AgentWorkDispatchItem[];
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
  // Claim-session `held` is decoded by the jural provider as a potential
  // relation. A potential duty is the affirmative, dispatchable relation;
  // active, stable, and absurd relations remain evidence only.
  if (duty.standing !== "potential") return "blocked";
  if (duty.status === "discharged") return "done";
  if (duty.status === "obstructed") return "blocked";
  // A duty reaches execution only through a current, capability-admitted
  // office-service allocation marker; bare character and legacy office duties
  // remain readable evidence but are not offers.
  if (duty.allocation === undefined || duty.work === undefined || duty.skill === undefined || duty.closureKind === undefined || duty.requiresCapabilities === undefined || duty.method === undefined || duty.receiverCondition === undefined) return "blocked";
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
    ...((duty.work !== undefined && duty.skill !== undefined && duty.closureKind !== undefined && duty.requiresCapabilities !== undefined)
      ? []
      : ["canonical-allocation-missing"]),
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
    conflicts: duty.conflicts,
    via: duty.via,
    ...(duty.office === undefined ? {} : { office: duty.office }),
    passive: duty.passive,
    standing: duty.standing,
    reasons: reasonsOfDuty(duty, level),
    ...(duty.intent === undefined ? {} : { intent: duty.intent }),
    ...(duty.subject === undefined ? {} : { subject: duty.subject }),
    ...(duty.source === undefined ? {} : { source: duty.source }),
    ...(duty.text === undefined ? {} : { text: duty.text }),
    ...(duty.deterministicExecution === undefined ? {} : { deterministicExecution: duty.deterministicExecution }),
    ...(duty.allocation === undefined ? {} : { allocation: duty.allocation }),
    ...(duty.duty === undefined ? {} : { duty: duty.duty }),
    ...(duty.work === undefined ? {} : { work: duty.work }),
    ...(duty.skill === undefined ? {} : { skill: duty.skill }),
    ...(duty.closureKind === undefined ? {} : { closureKind: duty.closureKind }),
    ...(duty.requiresCapabilities === undefined ? {} : { requiresCapabilities: duty.requiresCapabilities }),
    ...(duty.method === undefined ? {} : { method: duty.method }),
    ...(duty.receiverCondition === undefined ? {} : { receiverCondition: duty.receiverCondition }),
    ...(duty.delegation === undefined ? {} : { delegation: duty.delegation }),
    ...(duty.parent === undefined ? {} : { parent: duty.parent }),
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
  const frontier = Object.freeze(queue.filter((item) => item.state === "ready"));
  const offerMap = new Map<number, AgentWorkDispatchItem[]>();
  for (const item of frontier) {
    const lane = item.coordination.lane ?? 0;
    const offer = offerMap.get(lane);
    if (offer === undefined) offerMap.set(lane, [item]);
    else offer.push(item);
  }
  const offers = Object.freeze([...offerMap.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, items]) => Object.freeze([...items].sort(compareDispatchItems))));
  return Object.freeze({
    agent: agent.agent,
    ready: queue.filter((item) => item.state === "ready").length,
    blocked: queue.filter((item) => item.state === "blocked").length,
    done: queue.filter((item) => item.state === "done").length,
    frontier,
    offers,
    queue,
    evidence: Object.freeze([
      `duties:${agent.duties}`,
      `ready:${queue.filter((item) => item.state === "ready").length}`,
      `blocked:${queue.filter((item) => item.state === "blocked").length}`,
      `done:${queue.filter((item) => item.state === "done").length}`,
      `offices:${agent.offices.length}`,
      `frontier:${frontier.length}`,
      `offers:${offers.length}`,
    ]),
  });
}

function coordinationOfWork(readout: AgentWorkReadout): AgentWorkDispatchCoordination {
  const governance = readout.governance;
  if (governance === undefined) return "clear";
  if (governance.accountabilityGap > 0) return "coordination-required";
  if (governance.contested > 0) return "contested";
  return "clear";
}

export function agentWorkDispatchReadoutOfWork(
  readout: AgentWorkReadout,
): AgentWorkDispatchReadout {
  const agents = Object.freeze(readout.agents.map(dispatchAgentOfWorkAgent));
  const queue = Object.freeze(agents.flatMap((agent) => agent.queue).sort(compareDispatchItems));
  const frontier = Object.freeze(agents.flatMap((agent) => agent.frontier).sort(compareDispatchItems));
  const ready = queue.filter((item) => item.state === "ready").length;
  const blocked = queue.filter((item) => item.state === "blocked").length;
  const done = queue.filter((item) => item.state === "done").length;
  const coordination = coordinationOfWork(readout);
  const coordinationCost = readout.governance?.accountabilityGap ?? 0;
  return Object.freeze({
    kind: "metroplat.agent-work.dispatch-settlement" as const,
    subject: readout.subject,
    date: readout.date,
    feed: readout.feed,
    policy: "declared-duty-with-structural-and-coordination-readiness" as const,
    coordination,
    coordinationCost,
    agents,
    frontier,
    queue,
    evidence: Object.freeze([
      `work-readout:${readout.kind}`,
      `agents:${agents.length}`,
      `ready:${ready}`,
      `frontier:${frontier.length}`,
      `blocked:${blocked}`,
      `done:${done}`,
      `coordination:${coordination}`,
      `coordination-cost:${coordinationCost}`,
      ...(readout.governance === undefined ? [] : [
        `governance-accountability-gap:`,
        `governance-contested:${readout.governance.contested}`,
      ]),
    ]),
  });
}

/** Default `limit` for a paged `agent-work-dispatch` readout when the caller omits one. */
export const AGENT_WORK_DISPATCH_DEFAULT_LIMIT = 50;
/** Upper bound on `limit`, clamped in code (the house schema validator carries no `maximum` keyword). */
export const AGENT_WORK_DISPATCH_MAX_LIMIT = 500;
/** Each queue item's `reasons` are capped to this many entries in a paged readout. */
export const AGENT_WORK_DISPATCH_REASONS_LIMIT = 8;

export interface AgentWorkDispatchPagedItem extends AgentWorkDispatchItem {
  /** Count of `reasons` entries dropped beyond {@link AGENT_WORK_DISPATCH_REASONS_LIMIT}. Present only when truncated. */
  readonly reasonsTruncated?: number;
}

export interface AgentWorkDispatchPagedAgent extends Omit<AgentWorkDispatchAgent, "queue" | "frontier" | "offers"> {
  /** Capped to `limit` items. A live territory's ready set is not bounded by construction (a real crash: `agents[1].frontier[285].status`). */
  readonly frontier: readonly AgentWorkDispatchPagedItem[];
  /** Count of this agent's own `frontier` items dropped by the cap. Present only when truncated. */
  readonly frontierTruncated?: number;
  /** Capped to `limit` concurrent-offer groups. */
  readonly offers: readonly (readonly AgentWorkDispatchPagedItem[])[];
  /** Count of this agent's own `offers` groups dropped by the cap. Present only when truncated. */
  readonly offersTruncated?: number;
  /** Capped to `limit` items; the crash site (`agents[N].queue`) grows unboundedly with the causal territory otherwise. */
  readonly queue: readonly AgentWorkDispatchPagedItem[];
  /** Count of this agent's own `queue` items dropped by the cap. Present only when truncated. */
  readonly queueTruncated?: number;
}

export interface AgentWorkDispatchPage extends Omit<AgentWorkDispatchReadout, "agents" | "frontier" | "queue"> {
  /** Computed over the whole, unpaged queue — never affected by `limit`/`cursor`. */
  readonly ready: number;
  /** Computed over the whole, unpaged queue — never affected by `limit`/`cursor`. */
  readonly blocked: number;
  /** Computed over the whole, unpaged queue — never affected by `limit`/`cursor`. */
  readonly done: number;
  readonly agents: readonly AgentWorkDispatchPagedAgent[];
  /** Capped to `limit` items — the union of every agent's ready frontier is unbounded, same as any agent's own. */
  readonly frontier: readonly AgentWorkDispatchPagedItem[];
  /** Count of the top-level `frontier` items dropped by the cap. Present only when truncated. */
  readonly frontierTruncated?: number;
  /** One page of the flattened, sorted queue, starting at `cursor` (default the start). */
  readonly queue: readonly AgentWorkDispatchPagedItem[];
  /** Opaque offset cursor for the next page; absent when this page reaches the end. */
  readonly nextCursor?: string;
}

/** Cap one item's `reasons` to {@link AGENT_WORK_DISPATCH_REASONS_LIMIT} entries. */
function truncatedDispatchItem(item: AgentWorkDispatchItem): AgentWorkDispatchPagedItem {
  if (item.reasons.length <= AGENT_WORK_DISPATCH_REASONS_LIMIT) return item;
  return Object.freeze({
    ...item,
    reasons: Object.freeze(item.reasons.slice(0, AGENT_WORK_DISPATCH_REASONS_LIMIT)),
    reasonsTruncated: item.reasons.length - AGENT_WORK_DISPATCH_REASONS_LIMIT,
  });
}

/** Cap one `AgentWorkDispatchItem[]` to `limit` items, each reasons-capped. */
function pagedItems(items: readonly AgentWorkDispatchItem[], limit: number): readonly AgentWorkDispatchPagedItem[] {
  return Object.freeze(items.slice(0, limit).map(truncatedDispatchItem));
}

/** Cap an agent's own `queue`/`frontier`/`offers` to `limit`, independent of the top-level cursor. */
function pagedDispatchAgent(agent: AgentWorkDispatchAgent, limit: number): AgentWorkDispatchPagedAgent {
  return Object.freeze({
    agent: agent.agent,
    ready: agent.ready,
    blocked: agent.blocked,
    done: agent.done,
    frontier: pagedItems(agent.frontier, limit),
    offers: Object.freeze(agent.offers.slice(0, limit).map((offer) => pagedItems(offer, limit))),
    queue: pagedItems(agent.queue, limit),
    evidence: agent.evidence,
    ...(agent.frontier.length > limit ? { frontierTruncated: agent.frontier.length - limit } : {}),
    ...(agent.offers.length > limit ? { offersTruncated: agent.offers.length - limit } : {}),
    ...(agent.queue.length > limit ? { queueTruncated: agent.queue.length - limit } : {}),
  });
}

/** Parse an offset cursor: a non-negative integer string. Any other value resumes from the start. */
function offsetOfCursor(cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === cursor ? parsed : 0;
}

/**
 * Page an `AgentWorkDispatchReadout` for RPC exposure.
 *
 * A live causal territory's queue AND its ready frontier both readily exceed
 * the identity module's 1 MiB canonical-JSON limit -- two real crashes:
 * `agents[0].queue[329].reasons[3]` (a large queue) and, after the queue fix
 * alone, `agents[1].frontier[285].status` (a large *ready* set — "ready" does
 * not imply "small"). The MCP-facing `agent-work-dispatch` verb must never
 * hand back any of `queue`/`frontier`/`offers`, at any nesting, unbounded.
 * `ready`/`blocked`/`done` are always computed over the full, unpaged queue —
 * only the arrays themselves (top-level `queue` via `limit`/`cursor`/
 * `nextCursor`; every other array hard-capped to `limit`) are ever shortened.
 */
export function pageAgentWorkDispatchReadout(
  readout: AgentWorkDispatchReadout,
  options: { readonly limit?: number | undefined; readonly cursor?: string | undefined } = {},
): AgentWorkDispatchPage {
  const limit = Math.min(
    AGENT_WORK_DISPATCH_MAX_LIMIT,
    Math.max(1, Number.isInteger(options.limit) ? (options.limit as number) : AGENT_WORK_DISPATCH_DEFAULT_LIMIT),
  );
  const offset = offsetOfCursor(options.cursor);
  const ready = readout.queue.filter((item) => item.state === "ready").length;
  const blocked = readout.queue.filter((item) => item.state === "blocked").length;
  const done = readout.queue.filter((item) => item.state === "done").length;
  const page = readout.queue.slice(offset, offset + limit).map(truncatedDispatchItem);
  const nextCursor = offset + limit < readout.queue.length ? String(offset + limit) : undefined;
  return Object.freeze({
    kind: readout.kind,
    subject: readout.subject,
    date: readout.date,
    feed: readout.feed,
    policy: readout.policy,
    coordination: readout.coordination,
    coordinationCost: readout.coordinationCost,
    ready,
    blocked,
    done,
    agents: Object.freeze(readout.agents.map((agent) => pagedDispatchAgent(agent, limit))),
    frontier: pagedItems(readout.frontier, limit),
    ...(readout.frontier.length > limit ? { frontierTruncated: readout.frontier.length - limit } : {}),
    queue: Object.freeze(page),
    ...(nextCursor === undefined ? {} : { nextCursor }),
    evidence: readout.evidence,
  });
}
