/**
 * AOE service lines: a micro-enterprise's production loop as bounded MAPE-K turns.
 *
 * A service line is an ordered list of stages (Monitor what is there, Analyze it, Plan the stage's
 * act, Execute it, keep the Knowledge). One turn runs exactly one stage: the first stage of the
 * current cycle not yet complete. When the last stage completes, the next turn opens a new cycle at
 * the first stage. The clock (`./recurring.mjs`) repeats the turn; this module is not a scheduler.
 *
 * A stage handler returns a status. `complete` advances the line. `pending` waits and re-runs the
 * same stage next turn. `blocked` contains the failure: the stage stops before its next effect, an
 * AutonomyIncident and a RepairRequest are recorded, and the same stage is retried next turn.
 * `needs-human` is admitted only with a typed human boundary (HUMAN_BOUNDARY_TYPES); an untyped
 * request for a person is itself a machine-remediable defect and is recorded as blocked.
 *
 * Every transition is a SignCell in the store's `pipeline-event` type (a thread per run), re-projected through the
 * four evidence primitives (SignChain tellings, SignGraph topology, SignCraft settlement), so a
 * line's status is read from witnessed events and never from an ad-hoc status file.
 *
 * A line names its service, its stages, its event carrier and the field that names the subject a
 * cycle works on (a title, an edition). Lines whose events predate this module keep their carrier
 * identity and subject field, so their recorded history stays readable.
 */
import { createTypedMark, referenceOf } from "@red-cup-engineering/signcell/typed-mark";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createSignGraph } from "@red-cup-engineering/signcell/semantic-graph";
import { projectSignGraphTopology } from "@red-cup-engineering/signgraph/graph";
import { TellingLog } from "@red-cup-engineering/signchain/log";
import { KnowledgeBase } from "@red-cup-engineering/signcraft/knowledge-base";
import { each, extend, get, heads, put, readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";

export const STAGE_STATUSES = Object.freeze(["complete", "pending", "blocked", "needs-human"]);

/** The only reasons a line may stop for a person. Anything else is the line's own defect. */
export const HUMAN_BOUNDARY_TYPES = Object.freeze([
  "RESERVED_HUMAN_AUTHORITY_REQUIRED",
  "EXTERNAL_PROVIDER_REQUIRES_HUMAN",
  "LEGAL_NONDELEGABLE",
]);

export const FAILURE_CLASSES = Object.freeze([
  "VALIDATION_FAILURE",
  "AUTOMATION_DRIFT",
  "PROVIDER_OUTAGE",
  "LINT_FAILURE",
  "CONFIGURATION_FAILURE",
  "INSUFFICIENT_MACHINE_CAPABILITY",
  "CONTROL_PLANE_DEFECT",
  "UNKNOWN_FAILURE_CLASS",
]);

export function classifyFailure(code = "") {
  if (/validat|schema|conformance/iu.test(code)) return "VALIDATION_FAILURE";
  if (/selector|markup|browser|automation|drift/iu.test(code)) return "AUTOMATION_DRIFT";
  if (/provider|outage|network|timeout|unavailable/iu.test(code)) return "PROVIDER_OUTAGE";
  if (/lint|editorial|critic|proof/iu.test(code)) return "LINT_FAILURE";
  if (/config|missing-stage-handler|credential-path/iu.test(code)) return "CONFIGURATION_FAILURE";
  if (/capability|tool|executable|version/iu.test(code)) return "INSUFFICIENT_MACHINE_CAPABILITY";
  if (/stage-threw|state|internal|control/iu.test(code)) return "CONTROL_PLANE_DEFECT";
  return "UNKNOWN_FAILURE_CLASS";
}

const countBy = (values, key) => Object.fromEntries([...values.reduce((counts, value) => counts.set(key(value), (counts.get(key(value)) ?? 0) + 1), new Map())]);

/**
 * The control records every line keeps: human boundaries, autonomy incidents with their repair
 * requests, and intervention metrics. `service` names the records (each a store record of its kind
 * with a `service` member) and `subjectField` names the subject in them. A kind is a store type
 * (`human-boundary`, `autonomy-incident`, `repair-request`, `pipeline-event`, or one a line adds,
 * as Kindle adds `title-cost`): `write` puts a record, or extends a thread of them when it names
 * one; `read` returns a thread's contents causes first, or every content of the service by time;
 * `latest` returns the last record of each of the service's threads.
 */
export function serviceLineControl({ service, subjectField = "subject" }) {
  if (typeof service !== "string" || service === "") throw new TypeError("a service line control needs its service name");
  const threadName = (thread) => `${service}:${thread}`;
  const write = (dataRoot, kind, content, { at, thread } = {}) => {
    const record = { service, at, content };
    return thread === undefined ? put(dataRoot, kind, record) : extend(dataRoot, kind, threadName(thread), record);
  };
  const read = (dataRoot, kind, { thread } = {}) => {
    if (thread !== undefined) {
      const found = [];
      for (const item of walk(dataRoot, kind, readHead(dataRoot, kind, threadName(thread))?.frontier ?? [], { limit: 4096 })) if (item.record !== undefined) found.push(item.record.content);
      return found.reverse();
    }
    return [...each(dataRoot, kind)].map(({ record }) => record).filter((record) => record.service === service)
      .sort((a, b) => String(a.at).localeCompare(String(b.at))).map(({ content }) => content);
  };
  const latest = (dataRoot, kind) => {
    const found = [];
    for (const { name, head } of heads(dataRoot, kind)) {
      if (!name.startsWith(`${service}:`)) continue;
      const last = head.frontier.filter((address) => typeof address === "string").map((address) => get(dataRoot, kind, address))
        .filter((record) => record !== undefined).sort((x, y) => String(x.at).localeCompare(String(y.at))).at(-1);
      if (last !== undefined) found.push(last.content);
    }
    return found;
  };
  const records = (dataRoot, kind) => read(dataRoot, kind);

  function recordHumanBoundary(dataRoot, { service: boundaryService = service, step, reason, boundaryType, at, detail = {}, [subjectField]: subject = null }) {
    if (!HUMAN_BOUNDARY_TYPES.includes(boundaryType)) throw new TypeError(`invalid human boundary type: ${boundaryType}`);
    const event = Object.freeze({ type: "HumanBoundaryEvent", version: 1, service: boundaryService, [subjectField]: subject, step, reason, boundaryType, at, detail });
    write(dataRoot, "human-boundary", event, { at });
    return event;
  }

  function recordAutonomyIncident(dataRoot, { run, cycle, stage, code, reason = null, at, [subjectField]: subject = null }) {
    const failureClass = classifyFailure(`${code ?? ""} ${reason ?? ""}`);
    const repairRequest = Object.freeze({ type: "RepairRequest", version: 1, workItem: `${run}:${cycle}:${stage}:${code}`, service, [subjectField]: subject, failureClass, requestedAt: at, requestedAction: "diagnose-repair-assay-and-retry", status: "open" });
    const incident = Object.freeze({ type: "AutonomyIncident", version: 1, run, cycle, [subjectField]: subject, stage, code: code ?? "unspecified-failure", cause: reason, failureClass, authority: "machine-remediable-defect", containment: "stage-stopped-before-next-effect", repairRequest: repairRequest.workItem, recurrenceKey: `${stage}:${failureClass}:${code ?? "unspecified-failure"}`, at });
    write(dataRoot, "autonomy-incident", incident, { at });
    write(dataRoot, "repair-request", repairRequest, { at });
    return Object.freeze({ incident, repairRequest });
  }

  /** How often the line stopped for a person, and how often for the same non-reserved cause again. */
  function interventionMetrics(dataRoot) {
    const events = records(dataRoot, "human-boundary");
    const nonReserved = events.filter(({ boundaryType }) => boundaryType !== "RESERVED_HUMAN_AUTHORITY_REQUIRED");
    const causes = countBy(nonReserved, ({ reason }) => reason);
    const repeats = Object.values(causes).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    return Object.freeze({ total: events.length, byType: countBy(events, ({ boundaryType }) => boundaryType), recurringNonReserved: Object.fromEntries(Object.entries(causes).filter(([, count]) => count > 1)), repeatInterventionRate: nonReserved.length ? repeats / nonReserved.length : 0 });
  }

  return Object.freeze({ service, subjectField, write, read, latest, records, recordHumanBoundary, recordAutonomyIncident, interventionMetrics });
}

/**
 * Define a service line.
 *
 * `eventTypeName` and `eventTypeId` name the event carrier; `defaultRun` is the run a turn advances when none is named. `afterTurn` lets a
 * line keep its own accounts from each event (a title's costs); `statusExtras` adds them to status.
 */
export function defineServiceLine({
  service, stages, subjectField = "subject",
  eventTypeName = "ServiceLineEvent",
  eventTypeId = `org.561-group.${service}.service-line-event.v1`,
  eventTitle = `${service} service line event`,
  defaultRun = `autonomous-${service}-line`,
  afterTurn,
  statusExtras,
}) {
  if (!Array.isArray(stages) || stages.length === 0 || new Set(stages).size !== stages.length) throw new TypeError("a service line needs distinct stages");
  const control = serviceLineControl({ service, subjectField });
  const eventType = defineSchemaType({
    $id: eventTypeId, title: eventTitle,
    description: "One MAPE-K service-loop transition and its addressed evidence.",
    type: "object", additionalProperties: false,
    required: ["type", "version", "run", "cycle", "stage", "status", "at", "monitor", "analyze", "plan", "execute", "knowledge"],
    properties: {
      type: { const: eventTypeName }, version: { const: 1 }, run: { type: "string" }, cycle: { type: "integer", minimum: 1 },
      [subjectField]: { type: ["string", "null"] }, stage: { enum: [...stages] }, status: { enum: [...STAGE_STATUSES] }, at: { type: "string" },
      monitor: { type: "object" }, analyze: { type: "object" }, plan: { type: "object" }, execute: { type: "object" }, knowledge: { type: "object" },
    },
  });
  return Object.freeze({ service, stages: Object.freeze([...stages]), subjectField, eventType, eventTypeName, defaultRun, control, afterTurn, statusExtras });
}

export function serviceLineEvents(line, dataRoot, run) {
  const events = line.control.read(dataRoot, "pipeline-event", run === undefined ? {} : { thread: run }).filter((cell) => !run || cell.content.run === run);
  // A line's events are an evidence set, not an execution-order guarantee.
  // Replay by the signed prior-event chain, including turns sharing a timestamp.
  const byId = new Map(events.map(event => [event.id,event])), depths = new Map();
  const depth = (event, seen = new Set()) => {
    if(depths.has(event.id)) return depths.get(event.id);
    if(seen.has(event.id)) throw new Error('Cyclic service-line execution lineage');
    seen.add(event.id);
    const prior=byId.get(event.content.knowledge?.prior);
    const value=prior ? depth(prior,seen)+1 : 0;
    depths.set(event.id,value);return value;
  };
  for(const event of events)depth(event);
  return events.sort((a,b)=>depths.get(a.id)-depths.get(b.id)||a.content.at.localeCompare(b.content.at)||a.id.localeCompare(b.id));
}

function latestByStage(events) { const map = new Map(); for (const event of events) map.set(event.content.stage, event); return map; }

/** Re-project durable events through all four evidence primitives. */
export function projectServiceLineKnowledge(line, events) {
  const log = new TellingLog(), knowledge = new KnowledgeBase();
  for (const event of events) {
    const at = { subject: `${event.content.run}#${event.content.cycle}`, predicate: `stage:${event.content.stage}`, object: event.content.status };
    if (["blocked", "needs-human"].includes(event.content.status)) { log.deny(at, event.id); knowledge.tellAgainst(at, event.id); }
    else { log.tell(at, event.id); knowledge.tell(at, event.id); }
  }
  const relations = [{ id: "followed-by", subjectTypes: [line.eventType.id], objectTypes: [line.eventType.id], witnessTypes: [line.eventType.id] }];
  const edges = events.slice(1).map((event, index) => ({ subject: referenceOf(events[index]), predicate: "followed-by", object: referenceOf(event), witness: referenceOf(event) }));
  const graph = createSignGraph({ cells: events, relations, edges });
  if (!graph.ok) throw new TypeError(graph.refusal.message);
  const topology = projectSignGraphTopology(graph.value);
  return Object.freeze({ signChain: Object.freeze({ tellings: log.size }), signGraph: Object.freeze({ id: graph.value.id, nodes: topology.nodes().length, edges: topology.edges().length }), signCraft: Object.freeze({ settled: knowledge.section().length, paraconsistent: knowledge.compare().paraconsistent.length }) });
}

function cycleState(line, events) {
  if (events.length === 0) return { cycle: 1, events: [], stage: line.stages[0] };
  const cycle = Math.max(1, ...events.map((event) => event.content.cycle ?? 1));
  const current = events.filter((event) => (event.content.cycle ?? 1) === cycle), states = latestByStage(current);
  const stage = line.stages.find((name) => states.get(name)?.content.status !== "complete") ?? null;
  return stage === null ? { cycle: cycle + 1, events: [], stage: line.stages[0] } : { cycle, events: current, stage };
}

function resultStatus(result) {
  if (["needs-human", "blocked", "pending"].includes(result?.status)) return result.status;
  if (["obstructed", "refused", "failed"].includes(result?.status)) return "blocked";
  return "complete";
}

/** One bounded MAPE-K turn of a service line. */
export async function runServiceLineTurn(line, { dataRoot, run = line.defaultRun, subject = null, now = () => new Date().toISOString(), handlers, selectedStage }) {
  const { control, subjectField } = line;
  if(selectedStage!==undefined&&!line.stages.includes(selectedStage))throw new Error('Selected work must be an admitted service-line stage');
  const allPrior = serviceLineEvents(line, dataRoot, run), state = cycleState(line, allPrior), { cycle } = state, stage=selectedStage??state.stage, prior = state.events;
  const at = now(), monitor = { priorEvents: prior.length, cycle, stage, [subjectField]: subject }, handler = handlers?.[stage];
  const analyze = { ready: typeof handler === "function", blockers: typeof handler === "function" ? [] : [`missing-stage-handler:${stage}`] };
  const stagePlan = { action: `execute-${stage}`, boundedTurn: true };
  let result; const started = performance.now();
  try { result = typeof handler === "function" ? await handler({ run, cycle, [subjectField]: subject, stage, prior, at }) : { status: "blocked", code: "missing-stage-handler" }; }
  catch (error) { result = { status: "blocked", code: "stage-threw", reason: String(error?.message ?? error) }; }
  const elapsedMs = Math.max(0, performance.now() - started), status = resultStatus(result), selected = result[subjectField] ?? subject;
  let humanBoundary = result.blocker?.boundaryType ? result.blocker : null;
  if (status === "needs-human" && !humanBoundary && HUMAN_BOUNDARY_TYPES.includes(result.boundaryType)) humanBoundary = control.recordHumanBoundary(dataRoot, { [subjectField]: selected, step: stage, reason: result.code, boundaryType: result.boundaryType, at, detail: result.detail ?? {} });
  if (status === "needs-human" && !humanBoundary) result = { status: "blocked", code: "untyped-human-boundary", original: result };
  if (resultStatus(result) === "blocked" && !result.autonomyIncident && result.blocker?.type !== "AutonomyIncident") {
    const repair = control.recordAutonomyIncident(dataRoot, { run, cycle, [subjectField]: selected, stage, code: result.code, reason: result.reason, at });
    result = { ...result, autonomyIncident: repair.incident, repairRequest: repair.repairRequest };
  }
  const content = { type: line.eventTypeName, version: 1, run, cycle, [subjectField]: result[subjectField] ?? subject, stage, status: resultStatus(result), at, monitor, analyze, plan: stagePlan, execute: result, knowledge: { prior: allPrior.at(-1)?.id ?? null } };
  const admitted = createTypedMark(line.eventType, content); if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  control.write(dataRoot, "pipeline-event", admitted.value, { at, thread: run });
  line.afterTurn?.({ dataRoot, event: admitted.value, content, result, elapsedMs, humanBoundary, at });
  // Durable typed outcomes and their prior-event lineage are the execution
  // carrier. Historical graph/valuation research is an explicit read through
  // projectServiceLineKnowledge, not an unconsumed prerequisite to recording
  // the new outcome or advancing this newsroom.
  return Object.freeze({ event: admitted.value, status: serviceLineStatus(line, dataRoot, run) });
}

/** Every stage's last run in the current cycle, what runs next, and what blocks the line. */
export function serviceLineStatus(line, dataRoot, run = line.defaultRun) {
  const events = serviceLineEvents(line, dataRoot, run), state = cycleState(line, events), states = latestByStage(state.events);
  return Object.freeze({
    type: `${line.eventTypeName.replace(/Event$/u, "")}Status`, version: 1, run,
    cycle: state.cycle, lastRun: events.at(-1)?.content.at ?? null, backlog: 1, next: state.stage,
    stages: line.stages.map((stage) => ({ stage, status: states.get(stage)?.content.status ?? "pending", lastRun: states.get(stage)?.content.at ?? null })),
    blockers: [...states.values()].filter((event) => ["blocked", "needs-human"].includes(event.content.status)).map((event) => ({ stage: event.content.stage, status: event.content.status, code: event.content.execute.code ?? event.content.execute.blocker?.reason ?? null, boundaryType: event.content.execute.blocker?.boundaryType ?? null, failureClass: event.content.execute.autonomyIncident?.failureClass ?? event.content.execute.blocker?.failureClass ?? null, repairRequest: event.content.execute.repairRequest?.workItem ?? event.content.execute.blocker?.repairRequest ?? null })),
    ...(line.statusExtras?.(dataRoot) ?? {}),
    interventions: line.control.interventionMetrics(dataRoot),
  });
}
