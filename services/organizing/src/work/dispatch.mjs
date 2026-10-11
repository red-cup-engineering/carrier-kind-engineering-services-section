import { WORK_LEVELS } from "@red-cup-engineering/socializing/office";

  

  

function levelOfScope(scope) {
  const separator = scope.indexOf(":");
  if (separator <= 0) return undefined;
  const level = scope.slice(0, separator);
  return (WORK_LEVELS).includes(level) ? level : undefined;
}

/** Facts every executable office allocation must carry at its boundary. */
export function isQualifiedWorkAllocation(duty) {
  return duty.allocation !== undefined && duty.allocatedModel !== undefined
    && duty.work !== undefined && duty.skill !== undefined && duty.closureKind !== undefined
    && duty.requiresCapabilities !== undefined && duty.method !== undefined
    && duty.receiverCondition !== undefined && duty.governing !== undefined;
}

/** Unknown historical carrier facts reserve the provider until requalified. */
export function sameWorkExecutionCarrier(left, right) {
  return (left.delegation?.provider ?? left.agent) === (right.delegation?.provider ?? right.agent)
    && (left.allocatedModel === undefined || right.allocatedModel === undefined || left.allocatedModel === right.allocatedModel);
}

function stateOfDuty(duty, signedAction) {
  // Claim-session `held` is decoded by the jural provider as a potential
  // relation. A potential duty is the affirmative, dispatchable relation;
  // active, stable, and absurd relations remain evidence only.
  if (duty.standing !== "potential") return "blocked";
  if (duty.status === "discharged") return "done";
  if (duty.status === "obstructed") return "blocked";
  // A duty reaches execution only through a current, capability-admitted
  // office-service allocation marker; bare character and legacy office duties
  // remain readable evidence but are not offers.
  // Preserve already recorded execution state. Qualification gates new offers;
  // it must not rewrite a started assignment as if it had never begun.
  if (duty.execution?.state === "started") return "in-flight";
  if (duty.execution !== undefined) return "blocked";
  if (duty.assignment?.state === "started") return "in-flight";
  if (!isQualifiedWorkAllocation(duty)) return "blocked";
  // Office capacity remains visible in `queue`, but only a claim scope bound
  // unambiguously to a typed, admitted SignRoadmap Action can enter the frontier.
  if (signedAction === undefined) return "blocked";
  if (signedAction.ambiguous === true || !Array.isArray(signedAction.resources) || signedAction.resources.length === 0) return "blocked";
  if (duty.structural.state !== "ready") return "blocked";
  if (duty.coordination.state === "obstructed") return "blocked";
  return "ready";
}

function reasonsOfDuty(duty, level, signedAction) {
  const reasons = [
    ...((duty.execution?.state === "proposed" || (duty.execution?.state === "failed" && duty.execution.resultKind === "skill-error")) && duty.execution.receiverReceipt === undefined && duty.status !== "discharged" ? ["result-awaiting-receipt"] : []),
    ...(duty.execution?.state === "failed" ? [`provider-execution-failed:${duty.execution.error ?? "unknown"}`] : []),
    ...(duty.execution?.skillOutcome === undefined ? [] : [
      `native-skill-routing:${duty.execution.skillOutcome.routing}`,
      `native-skill-reading:${duty.execution.skillOutcome.reading}`,
      ...(duty.execution.skillOutcome.errorClass === undefined ? [] : [`native-skill-error-class:${duty.execution.skillOutcome.errorClass}`]),
    ]),
    `status:${duty.status}`,
    `via:${duty.via}`,
    `standing:${duty.standing}`,
    `structural:${duty.structural.state}`,
    ...duty.structural.blockers.map((blocker) => `structural-blocker:${blocker}`),
    `coordination:${duty.coordination.state}`,
    ...(signedAction === undefined ? ["signed-action-missing"] : []),
    ...(signedAction?.ambiguous === true ? ["signed-action-ambiguous"] : []),
    ...(signedAction !== undefined && (!Array.isArray(signedAction.resources) || signedAction.resources.length === 0) ? ["signed-action-resource-missing"] : []),
    ...(duty.coordination.lane === undefined ? [] : [`coordination-lane:${duty.coordination.lane}`]),
    ...(level === undefined ? [] : [`level:${level}`]),
    ...(duty.office === undefined ? [] : [`office:${duty.office}`]),
    ...(duty.assignment === undefined ? [] : [`worker-thread:${duty.assignment.workerThread}`]),
    ...(isQualifiedWorkAllocation(duty)
      ? []
      : ["canonical-allocation-missing"]),
  ];
  return Object.freeze(reasons);
}

function itemOfDuty(agent, duty, signedAction) {
  const level = levelOfScope(duty.scope);
  return Object.freeze({
    agent,
    scope: duty.scope,
    state: stateOfDuty(duty, signedAction),
    status: duty.status,
    ...(level === undefined ? {} : { level }),
    structural: duty.structural,
    coordination: duty.coordination,
    conflicts: duty.conflicts,
    via: duty.via,
    ...(duty.office === undefined ? {} : { office: duty.office }),
    passive: duty.passive,
    standing: duty.standing,
    reasons: reasonsOfDuty(duty, level, signedAction),
    ...(duty.intent === undefined ? {} : { intent: duty.intent }),
    ...(duty.subject === undefined ? {} : { subject: duty.subject }),
    ...(duty.source === undefined ? {} : { source: duty.source }),
    ...(duty.text === undefined ? {} : { text: duty.text }),
    ...(duty.evidence === undefined ? {} : { evidence: duty.evidence }),
    ...(duty.witness === undefined ? {} : { witness: duty.witness }),
    ...(duty.causes === undefined ? {} : { causes: duty.causes }),
    ...(duty.obligationWitness === undefined ? {} : { obligationWitness: duty.obligationWitness }),
    ...(signedAction === undefined ? {} : { signedAction }),
    ...(duty.deterministicExecution === undefined ? {} : { deterministicExecution: duty.deterministicExecution }),
    ...(duty.returns === undefined ? {} : { returns: duty.returns }),
    ...(duty.order === undefined ? {} : { order: duty.order }),
    ...(duty.sourceRepository === undefined ? {} : { sourceRepository: duty.sourceRepository }),
    ...(duty.requiredCarrier === undefined ? {} : { requiredCarrier: duty.requiredCarrier }),
    ...(duty.allocatedReasoningEffort === undefined ? {} : { allocatedReasoningEffort: duty.allocatedReasoningEffort }),
    ...(duty.allocatedModel === undefined ? {} : { allocatedModel: duty.allocatedModel }),
    ...(duty.execution === undefined ? {} : { execution: duty.execution }),
    ...(duty.allocation === undefined ? {} : { allocation: duty.allocation }),
    ...(duty.assignment === undefined ? {} : { assignment: duty.assignment }),
    ...(duty.duty === undefined ? {} : { duty: duty.duty }),
    ...(duty.work === undefined ? {} : { work: duty.work }),
    ...(duty.skill === undefined ? {} : { skill: duty.skill }),
    ...(duty.closureKind === undefined ? {} : { closureKind: duty.closureKind }),
    ...(duty.requiresCapabilities === undefined ? {} : { requiresCapabilities: duty.requiresCapabilities }),
    ...(duty.method === undefined ? {} : { method: duty.method }),
    ...(duty.receiverCondition === undefined ? {} : { receiverCondition: duty.receiverCondition }),
    ...(duty.governing === undefined ? {} : { governing: duty.governing }),
    ...(duty.delegation === undefined ? {} : { delegation: duty.delegation }),
    ...(duty.parent === undefined ? {} : { parent: duty.parent }),
  });
}

function compareDispatchItems(left, right) {
  const leftDispatchable = left.state === "ready" ? 0 : left.state === "in-flight" ? 1 : left.state === "blocked" ? 2 : 3;
  const rightDispatchable = right.state === "ready" ? 0 : right.state === "in-flight" ? 1 : right.state === "blocked" ? 2 : 3;
  if (leftDispatchable !== rightDispatchable) return leftDispatchable - rightDispatchable;
  const leftLane = left.coordination.lane ?? Number.MAX_SAFE_INTEGER;
  const rightLane = right.coordination.lane ?? Number.MAX_SAFE_INTEGER;
  if (leftLane !== rightLane) return leftLane - rightLane;
  if (left.scope !== right.scope) return left.scope.localeCompare(right.scope);
  return left.agent.localeCompare(right.agent);
}

function dispatchAgentOfWorkAgent(agent, signedActions) {
  const queue = Object.freeze(agent.scopes.map((duty) => itemOfDuty(agent.agent, duty, signedActions.get(duty.scope))).sort(compareDispatchItems));
  const frontier = Object.freeze(queue.filter((item) => item.state === "ready"));
  const offerMap = new Map();
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
    inFlight: queue.filter((item) => item.state === "in-flight").length,
    blocked: queue.filter((item) => item.state === "blocked").length,
    done: queue.filter((item) => item.state === "done").length,
    frontier,
    offers,
    queue,
    evidence: Object.freeze([
      `duties:${agent.duties}`,
      `ready:${queue.filter((item) => item.state === "ready").length}`,
      `in-flight:${queue.filter((item) => item.state === "in-flight").length}`,
      `blocked:${queue.filter((item) => item.state === "blocked").length}`,
      `done:${queue.filter((item) => item.state === "done").length}`,
      `offices:${agent.offices.length}`,
      `frontier:${frontier.length}`,
      `offers:${offers.length}`,
    ]),
  });
}

function coordinationOfWork(readout) {
  const governance = readout.governance;
  if (governance === undefined) return "clear";
  if (governance.accountabilityGap > 0) return "coordination-required";
  if (governance.contested > 0) return "contested";
  return "clear";
}

export function agentWorkDispatchReadoutOfWork(
  readout,
  { signedActions = new Map() } = {},
) {
  const agents = Object.freeze(readout.agents.map((agent) => dispatchAgentOfWorkAgent(agent, signedActions)));
  const queue = Object.freeze(agents.flatMap((agent) => agent.queue).sort(compareDispatchItems));
  const unallocated = readout.unallocated ?? Object.freeze([]);
  const frontier = Object.freeze(agents.flatMap((agent) => agent.frontier).sort(compareDispatchItems));
  const ready = queue.filter((item) => item.state === "ready").length;
  const inFlight = queue.filter((item) => item.state === "in-flight").length;
  const blocked = queue.filter((item) => item.state === "blocked").length;
  const done = queue.filter((item) => item.state === "done").length;
  const coordination = coordinationOfWork(readout);
  const coordinationCost = readout.governance?.accountabilityGap ?? 0;
  return Object.freeze({
    kind: "metroplat.agent-work.dispatch-settlement",
    subject: readout.subject,
    date: readout.date,
    feed: readout.feed,
    policy: "declared-duty-with-structural-and-coordination-readiness",
    coordination,
    coordinationCost,
    agents,
    inFlight,
    unallocated,
    frontier,
    queue,
    evidence: Object.freeze([
      `work-readout:${readout.kind}`,
      `agents:${agents.length}`,
      `unallocated:${unallocated.length}`,
      `ready:${ready}`,
      `in-flight:${inFlight}`,
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

  

  

  

  

/** Cap one item's `reasons` to {@link AGENT_WORK_DISPATCH_REASONS_LIMIT} entries. */
function truncatedDispatchItem(item) {
  if (item.reasons.length <= AGENT_WORK_DISPATCH_REASONS_LIMIT) return item;
  return Object.freeze({
    ...item,
    reasons: Object.freeze(item.reasons.slice(0, AGENT_WORK_DISPATCH_REASONS_LIMIT)),
    reasonsTruncated: item.reasons.length - AGENT_WORK_DISPATCH_REASONS_LIMIT,
  });
}

/** Project an agent's views from the same global queue page. */
function dispatchAgentOnPage(agent, page) {
  const queue = Object.freeze(page.flatMap((item, index) => item.agent === agent.agent ? [index] : []));
  const selected = new Map(queue.map((index) => [page[index].scope, index]));
  const frontier = Object.freeze(queue.filter((index) => page[index].state === "ready"));
  const offers = Object.freeze(agent.offers
    .map((offer) => Object.freeze(offer.flatMap((item) => selected.has(item.scope) ? [selected.get(item.scope)] : [])))
    .filter((offer) => offer.length > 0));
  return Object.freeze({
    agent: agent.agent,
    ready: agent.ready,
    inFlight: agent.inFlight,
    blocked: agent.blocked,
    done: agent.done,
    frontier,
    offers,
    queue,
    evidence: agent.evidence,
    ...(agent.frontier.length > frontier.length ? { frontierTruncated: agent.frontier.length - frontier.length } : {}),
    ...(agent.offers.length > offers.length ? { offersTruncated: agent.offers.length - offers.length } : {}),
    ...(agent.queue.length > queue.length ? { queueTruncated: agent.queue.length - queue.length } : {}),
  });
}

/** A receiving read carries the source addresses of the signed apparatus. Its full
 * immutable Resource and witness bodies remain in the native scoped roadmap read;
 * copying each of them into every pending proposal obscured the receiving boundary. */
function receivingDispatchItem(item) {
  const source = item.signedAction;
  const signedAction = source === undefined ? undefined : source.ambiguous === true
    ? Object.freeze({ ambiguous: true, scope: source.scope, graph: source.graph,
      candidates: Object.freeze(source.candidates.map(candidate => Object.freeze({ id: candidate.id, graph: candidate.graph }))) })
    : Object.freeze({ id: source.id, graph: source.graph,
      resources: Object.freeze((source.resources ?? []).map(resource => Object.freeze({ id: resource.id, witness: resource.witness }))) });
  return Object.freeze({ ...item, ...(signedAction === undefined ? {} : { signedAction }) });
}

/** Parse an offset cursor: a non-negative integer string. Any other value resumes from the start. */
function offsetOfCursor(cursor) {
  if (cursor === undefined) return 0;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === cursor ? parsed : 0;
}

/**
 * Page an `AgentWorkDispatchReadout` for RPC exposure.
 *
 * One global queue page supplies every executable-item view. Per-agent queues,
 * frontiers and offers must not select different work outside that page or
 * restart at the first items when the caller advances the cursor.
 * Each work record is encoded only once in queue. All frontier, per-agent
 * queue/frontier and offer entries are page-local indices into that queue.
 * Counts and organizational evidence describe the full territory. Unallocated
 * obligations remain a separate, bounded discovery view; they are not offers.
 */
export function pageAgentWorkDispatchReadout(
  readout,
  options = {},
) {
  const limit = Math.min(
    AGENT_WORK_DISPATCH_MAX_LIMIT,
    Math.max(1, Number.isInteger(options.limit) ? (options.limit) : AGENT_WORK_DISPATCH_DEFAULT_LIMIT),
  );
  const offset = offsetOfCursor(options.cursor);
  const view = options.view === "receiving" ? "receiving" : "execution";
  // Select before pagination: pending receiving is independent of execution
  // readiness, and must not hide behind pages of unrelated ready work.
  const selected = readout.queue.filter(item => (options.scope === undefined || item.scope === options.scope)
    && (view !== "receiving" || item.reasons.includes("result-awaiting-receipt")));
  const ready = readout.queue.filter((item) => item.state === "ready").length;
  const inFlight = readout.queue.filter((item) => item.state === "in-flight").length;
  const blocked = readout.queue.filter((item) => item.state === "blocked").length;
  const done = readout.queue.filter((item) => item.state === "done").length;
  const page = [];
  let queueBytes = 0;
  for (const item of selected.slice(offset, offset + limit)) {
    const record = truncatedDispatchItem(view === "receiving" ? receivingDispatchItem(item) : item);
    const bytes = Buffer.byteLength(JSON.stringify(record));
    if (page.length > 0 && queueBytes + bytes > 500_000) break;
    page.push(record);
    queueBytes += bytes;
  }
  const frontier = Object.freeze(page.flatMap((item, index) => item.state === "ready" ? [index] : []));
  const unallocated = readout.unallocated ?? [];
  const nextCursor = offset + page.length < selected.length ? String(offset + page.length) : undefined;
  const discovery = [];
  let discoveryBytes = 0;
  for (const item of (view === "receiving" ? [] : unallocated.filter(item => options.scope === undefined || item.scope === options.scope)).slice(0, limit)) {
    const bytes = Buffer.byteLength(JSON.stringify(item));
    if (discovery.length > 0 && discoveryBytes + bytes > 200_000) break;
    discovery.push(item);
    discoveryBytes += bytes;
  }
  return Object.freeze({
    kind: readout.kind,
    subject: readout.subject,
    date: readout.date,
    feed: readout.feed,
    policy: readout.policy,
    coordination: readout.coordination,
    coordinationCost: readout.coordinationCost,
    ready,
    inFlight,
    blocked,
    done,
    queueViews: "indices",
    view,
    queueCount: selected.length,
    ...(options.scope === undefined ? {} : { scope: options.scope }),
    agents: Object.freeze(readout.agents.map((agent) => dispatchAgentOnPage(agent, page))),
    unallocatedCount: unallocated.length,
    unallocated: Object.freeze(discovery),
    ...(view === "execution" && unallocated.length > discovery.length ? { unallocatedTruncated: unallocated.length - discovery.length } : {}),
    frontier,
    ...(readout.frontier.length > frontier.length ? { frontierTruncated: readout.frontier.length - frontier.length } : {}),
    queue: Object.freeze(page),
    ...(nextCursor === undefined ? {} : { nextCursor }),
    evidence: readout.evidence,
  });
}
