/**
 * actions — managing-operations' work-management operations as cocone legs on
 * the @red-cup-engineering/agentic-relation-engine `acting` boundary.
 *
 * The chain is THIN, the way relating's is: there is ONE admission morphism that
 * injects raw work data, and every other operation is a real morphism over the
 * carrier it emits, so the verbs COMPOSE as a POSIX pipe.
 *
 *   plan       : raw work data       → Plan            (the only admission; the
 *                                                        injected datum is the WBS)
 *   operate    : Plan                → OperationReading
 *   schedule   : Plan                → Schedule        (critical path)
 *   flow       : Plan                → BoardReading
 *   prioritize : Plan                → CapacitySelection
 *   assign     : Plan                → WorkloadReading
 *   report     : Plan                → MetricsReading
 *   view       : Plan                → ViewModels
 *
 * so `managing plan <raw> | managing schedule`, `managing plan <raw> | managing
 * flow`, … all compose: each read takes the Plan carrier its predecessor `plan`
 * emitted on the `json` wire, exactly as `relate utter | relate articulate`
 * passes an UtteranceCarrier. The Plan is the hub object; the reads are its pure
 * invariants — the managing analogue of relating's `settle` + settlement reads.
 *
 * Four further morphisms stand on their own domain carriers (the way relating's
 * `coincide`/`realize` do), each a single object → judgment:
 *
 *   recur    : Recurrence → IsoDay[]      govern : Ballot      → GateOutcome
 *   account  : Budget     → BudgetStatus  automate: RuleFiring → Action[]
 *
 * The wire is `json`: data is data. EAVT is the shape of the LOG, not the data
 * boundary. Output projection law: a managed `Amount` carries `bigint` num/den
 * and a capacity selection carries `bigint` spent/remaining — neither is
 * JSON-serializable, so amounts project to `{ num, den, commodity, exact }` and
 * bigints to decimal strings. No carrier reaches `JSON.stringify`.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonValue,
  type JsonRecord,
} from "@red-cup-engineering/agentic-relation-engine";

import { operate } from "./index.mjs";
import { task, type Task, type TaskInput } from "./structuring/task.mjs";
import { dependency, type Dependency } from "./structuring/dependency.mjs";
import { criticalPath } from "./scheduling/critical-path.mjs";
import { recurrenceRule, expand, nextOccurrence } from "./scheduling/recurrence.mjs";
import { standardCalendar } from "./scheduling/calendar.mjs";
import { selectIntoCapacity, selectedKeys, type Candidate } from "./prioritizing/capacity.mjs";
import { board, wipBreaches, flowSnapshot, type WipLimits } from "./flowing/board.mjs";
import { STANDARD_WORKFLOW, type Workflow } from "./flowing/status.mjs";
import { workloadByAssignee, leastLoaded, type Estimates, type Capacities } from "./assigning/workload.mjs";
import { approvalGate, type Vote } from "./governing/consensus.mjs";
import { fireRules, type Rule, type AutomationEvent, type TaskSnapshot } from "./automating/rule.mjs";
import { spawnNext, type RecurringTask } from "./automating/recurring.mjs";
import { money, costEntry, budgetStatus, toExactString, type Amount, type Transaction } from "./accounting/budget.mjs";
import { minutesByTask, billableMinutes, type TimeEntry } from "./accounting/time-tracking.mjs";
import { burndown, burnup, throughput, velocity, averageDurations, type TaskTiming } from "./reporting/metrics.mjs";
import { listView, calendarView, timelineView, tableView } from "./viewing/views.mjs";
// ── boundary helpers (used only at the admission edge) ──

function asRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

function requireString(record: JsonRecord, key: string, verb: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires "${key}"`);
  return value;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function requireNumber(record: JsonRecord, key: string, verb: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${verb}: requires numeric "${key}"`);
  return value;
}

function arrayOf(record: JsonRecord, key: string): readonly JsonValue[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function recordOf(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

// ── output projection: amounts and bigints to JSON-safe shapes ──

/** Project an exact `Amount` (bigint num/den) to a JSON-safe shape. */
function amountJson(a: Amount): JsonValue {
  return { num: a.num.toString(), den: a.den.toString(), commodity: a.commodity, exact: toExactString(a) };
}

/** Project a `Map<string, number>` to a plain JSON object. */
function mapToObject(map: ReadonlyMap<string, number>): JsonValue {
  return Object.fromEntries([...map.entries()]);
}

// ── the Plan: managing-operations' hub carrier ──

/**
 * The Plan is the one managed-operations object: the work-breakdown structure
 * plus all the data its readings fold over (durations for CPM, estimates and
 * scores for capacity, timings and a reporting horizon for metrics), and the
 * derived `reading`. Built once by `plan`; every read morphism is `Plan → X`.
 * It rides the `json` wire as a self-contained carrier, so the reads compose off
 * `plan` exactly as relating's settlement reads compose off `settle`.
 */
interface Plan {
  readonly kind: "managing.plan";
  readonly tasks: readonly Task[];
  readonly dependencies: readonly Dependency[];
  readonly workflow: Workflow;
  readonly durations: Readonly<Record<string, number>>;
  readonly estimates: Readonly<Record<string, number>>;
  readonly scores: Readonly<Record<string, number>>;
  readonly capacity: number;
  readonly resource: string;
  readonly wip: WipLimits;
  readonly capacities: Capacities;
  readonly dueByKey: Readonly<Record<string, string>>;
  readonly timings: readonly TaskTiming[];
  readonly days: readonly string[];
  readonly windows: readonly (readonly [string, string])[];
}

/** Re-admit a Plan carrier arriving on the wire (the codomain of `plan`). */
function asPlan(input: unknown, verb: string): Plan {
  const record = asRecord(input, verb);
  if (record["kind"] !== "managing.plan") {
    throw new TypeError(`${verb}: domain is a Plan (the codomain of \`plan\`); pipe \`managing plan … | managing ${verb}\``);
  }
  return record as unknown as Plan;
}

/** The keys of a Plan's tasks, in declared order. */
function keysOf(plan: Plan): string[] {
  return plan.tasks.map((t) => t.key);
}

// ── plan: the one admission — raw work data → the Plan hub carrier ──

export const planAction: Action = action({
  verb: "plan",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Admit raw work data as the Plan: the work-breakdown structure and the data its readings fold over.",
  description: "Domain: { tasks: TaskInput[], dependencies?, workflow?, durations?, estimates?, scores?, capacity?, resource?, wip?, capacities?, dueByKey?, timings?, days?, windows? }. Codomain: the Plan carrier — the hub every read morphism consumes — as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "plan");
    const tasks = arrayOf(record, "tasks").map((t) => task(t as unknown as TaskInput));
    const dependencies = arrayOf(record, "dependencies").map((d) => dependency(d as unknown as Parameters<typeof dependency>[0]));
    const plan: Plan = {
      kind: "managing.plan",
      tasks,
      dependencies,
      workflow: (record["workflow"] as Workflow | undefined) ?? STANDARD_WORKFLOW,
      durations: recordOf(record, "durations") as Record<string, number>,
      estimates: recordOf(record, "estimates") as Record<string, number>,
      scores: recordOf(record, "scores") as Record<string, number>,
      capacity: typeof record["capacity"] === "number" ? (record["capacity"] as number) : 0,
      resource: optionalString(record, "resource") ?? "capacity",
      wip: recordOf(record, "wip") as unknown as WipLimits,
      capacities: recordOf(record, "capacities") as unknown as Capacities,
      dueByKey: recordOf(record, "dueByKey") as Record<string, string>,
      timings: arrayOf(record, "timings") as unknown as TaskTiming[],
      days: arrayOf(record, "days").filter((d): d is string => typeof d === "string"),
      windows: arrayOf(record, "windows") as unknown as (readonly [string, string])[],
    };
    return jsonResource(plan as unknown as JsonValue, "managing plan");
  },
});

// ── the reads over the Plan hub (each Plan → X, composing off `plan`) ──

/** operate — the Plan's operational reading: dependency validity, order, flow. */
export const operateAction: Action = action({
  verb: "operate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a Plan into its operational state: dependency validity, execution order, and flow snapshot.",
  description: "Domain: a Plan (the codomain of `plan`). Codomain: the OperationReading as JSON.",
  run: (input: unknown): JsonValue => {
    const plan = asPlan(input, "operate");
    return jsonResource(
      operate({ tasks: plan.tasks, dependencies: plan.dependencies, workflow: plan.workflow }) as unknown as JsonValue,
      "managing operation reading",
    );
  },
});

/** schedule — the Plan's critical-path schedule over its durations. */
export const scheduleAction: Action = action({
  verb: "schedule",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a Plan's critical-path schedule: project duration, the critical path, and per-task float.",
  description: "Domain: a Plan (the codomain of `plan`). Codomain: the Schedule { projectDuration, criticalPath, tasks } as JSON.",
  run: (input: unknown): JsonValue => {
    const plan = asPlan(input, "schedule");
    const durations = new Map<string, number>(Object.entries(plan.durations));
    const result = criticalPath(keysOf(plan), durations, plan.dependencies);
    return jsonResource({
      projectDuration: result.projectDuration,
      criticalPath: result.criticalPath,
      tasks: [...result.tasks.values()],
    } as unknown as JsonValue, "managing schedule");
  },
});

/** flow — the Plan's kanban board, WIP breaches, and cumulative-flow snapshot. */
export const flowAction: Action = action({
  verb: "flow",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a Plan's workflow board: columns, WIP breaches, and a cumulative-flow snapshot.",
  description: "Domain: a Plan (the codomain of `plan`). Codomain: { board, breaches, snapshot } as JSON.",
  run: (input: unknown): JsonValue => {
    const plan = asPlan(input, "flow");
    const built = board(plan.workflow, plan.tasks, plan.wip);
    return jsonResource({
      board: built,
      breaches: wipBreaches(built).map((c) => c.label),
      snapshot: flowSnapshot(plan.workflow, plan.tasks),
    } as unknown as JsonValue, "managing board");
  },
});

/** prioritize — select the Plan's tasks into its capacity by merit-per-cost. */
export const prioritizeAction: Action = action({
  verb: "prioritize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a capacity selection over a Plan: its tasks chosen into the Plan's capacity by merit-per-cost.",
  description: "Domain: a Plan (the codomain of `plan`); each task draws `estimates[key]` against `scores[key]` merit into `capacity`. Codomain: { resource, selected, spent, remaining } as JSON.",
  run: (input: unknown): JsonValue => {
    const plan = asPlan(input, "prioritize");
    const candidates: Candidate[] = keysOf(plan).map((key) => ({
      key,
      estimate: plan.estimates[key] ?? 0,
      score: plan.scores[key] ?? 0,
    }));
    const run = selectIntoCapacity(candidates, plan.capacity, plan.resource);
    return jsonResource({
      resource: run.resource,
      selected: selectedKeys(run),
      spent: run.spent,
      remaining: run.remaining,
    } as unknown as JsonValue, "managing capacity selection");
  },
});

/** assign — the Plan's open workload per assignee, and the balancing target. */
export const assignAction: Action = action({
  verb: "assign",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a Plan's open workload per assignee and the least-loaded balancing target.",
  description: "Domain: a Plan (the codomain of `plan`); open effort uses `estimates`, capacity uses `capacities`. Codomain: { workload, leastLoaded? } as JSON.",
  run: (input: unknown): JsonValue => {
    const plan = asPlan(input, "assign");
    const loads = workloadByAssignee(plan.workflow, plan.tasks, plan.estimates as Estimates, plan.capacities);
    const candidates = plan.tasks.map((t) => t.assignee).filter((a): a is string => a !== undefined);
    return jsonResource({
      workload: loads,
      ...(candidates.length > 0 ? { leastLoaded: leastLoaded(loads, candidates) } : {}),
    } as unknown as JsonValue, "managing workload");
  },
});

/** report — the Plan's flow metrics over its timings and reporting horizon. */
export const reportAction: Action = action({
  verb: "report",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a Plan's flow metrics: burndown, burnup, throughput, velocity, and average durations.",
  description: "Domain: a Plan (the codomain of `plan`); metrics fold over `timings` against `days` / `windows`. Codomain: the MetricsReading as JSON.",
  run: (input: unknown): JsonValue => {
    const plan = asPlan(input, "report");
    return jsonResource({
      burndown: plan.days.length > 0 ? burndown(plan.timings, plan.days) : [],
      burnup: plan.days.length > 0 ? burnup(plan.timings, plan.days) : [],
      throughput: plan.windows.length > 0 ? throughput(plan.timings, plan.windows) : [],
      velocity: plan.windows.length > 0 ? velocity(plan.timings, plan.windows) : [],
      averageDurations: averageDurations(plan.timings),
    } as unknown as JsonValue, "managing report");
  },
});

/** view — the Plan's list, table, timeline, and calendar view models. */
export const viewAction: Action = action({
  verb: "view",
  inputFormat: "json",
  outputFormat: "json",
  options: ["groupBy"],
  summary: "Read a Plan's view models: list, table, timeline, and calendar.",
  description: "Domain: a Plan (the codomain of `plan`). `--groupBy` selects the list grouping (default status); the timeline uses the Plan's durations, the calendar its `dueByKey`. Codomain: { list, table, timeline, calendar? } as JSON.",
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const plan = asPlan(input, "view");
    const groupBy = typeof args["groupBy"] === "string" ? (args["groupBy"] as keyof Task) : undefined;
    const durations = new Map<string, number>(Object.entries(plan.durations));
    const out: Record<string, JsonValue> = {
      list: listView(plan.tasks, groupBy === undefined ? undefined : (t) => t[groupBy] as string | undefined) as unknown as JsonValue,
      table: tableView(plan.tasks) as unknown as JsonValue,
      timeline: timelineView(criticalPath(keysOf(plan), durations, plan.dependencies), "2026-01-01", standardCalendar()) as unknown as JsonValue,
    };
    if (Object.keys(plan.dueByKey).length > 0) {
      const calendar = calendarView(plan.tasks, (t) => plan.dueByKey[t.key]);
      out["calendar"] = Object.fromEntries([...calendar.entries()]) as unknown as JsonValue;
    }
    return jsonResource(out as JsonValue, "managing views");
  },
});

// ── side morphisms: each a single domain carrier → its judgment ──

/** recur — a Recurrence (start + rule) → its occurrence days. */
export const recurAction: Action = action({
  verb: "recur",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Expand a recurrence (start day + rule) into its occurrence days.",
  description: "Domain: a Recurrence { start: IsoDay, rule: { frequency, interval?, weekdays?, count?, until? }, after? }. Codomain: { occurrences: IsoDay[], next? } as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "recur");
    const start = requireString(record, "start", "recur");
    const rule = recurrenceRule(recordOf(record, "rule") as unknown as Parameters<typeof recurrenceRule>[0]);
    const after = optionalString(record, "after");
    return jsonResource({
      occurrences: expand(start, rule),
      ...(after === undefined ? {} : { next: nextOccurrence(start, rule, after) }),
    } as unknown as JsonValue, "managing recurrence");
  },
});

/** govern — a Ballot (subject + reviewer votes) → the fleet approval gate. */
export const governAction: Action = action({
  verb: "govern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle a fleet approval gate over a ballot of reviewer votes on the bilattice network-sheaf.",
  description: "Domain: a Ballot { subject, votes: { reviewer, verdict }[], quorum?, edges? }. Codomain: the GateOutcome { approved, contested, pooledStatus, approvals, quorumMet } as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "govern");
    const quorum = typeof record["quorum"] === "number" ? (record["quorum"] as number) : undefined;
    const edges = record["edges"] as unknown as Parameters<typeof approvalGate>[0]["edges"];
    const outcome = approvalGate({
      subject: requireString(record, "subject", "govern"),
      votes: arrayOf(record, "votes") as unknown as Vote[],
      ...(quorum === undefined ? {} : { quorum }),
      ...(edges === undefined ? {} : { edges }),
    });
    return jsonResource({
      kind: outcome.kind,
      subject: outcome.subject,
      approved: outcome.approved,
      contested: outcome.contested,
      pooledStatus: outcome.pooledStatus,
      approvals: outcome.approvals,
      quorumMet: outcome.quorumMet,
    } as unknown as JsonValue, "managing gate outcome");
  },
});

/** account — a Budget (planned + project costs) → its status against actuals. */
export const accountAction: Action = action({
  verb: "account",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a Budget against recorded cost actuals, with optional time-tracking rollups.",
  description: "Domain: a Budget { project, plannedUnits, commodity?, costs?: { units, day, narration? }[], timeEntries?: TimeEntry[] }. Codomain: the BudgetStatus (amounts as { num, den, commodity, exact }) plus time rollups, as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "account");
    const project = requireString(record, "project", "account");
    const commodity = optionalString(record, "commodity") ?? "USD";
    const planned = money(typeof record["plannedUnits"] === "number" ? (record["plannedUnits"] as number) : 0, commodity);
    const transactions: Transaction[] = arrayOf(record, "costs").map((raw) => {
      const cost = raw as JsonRecord;
      const narration = optionalString(cost, "narration");
      return costEntry({
        project,
        amount: money(requireNumber(cost, "units", "account"), commodity),
        day: requireString(cost, "day", "account"),
        ...(narration === undefined ? {} : { narration }),
      });
    });
    const status = budgetStatus(planned, transactions, project);
    const timeEntries = arrayOf(record, "timeEntries") as unknown as TimeEntry[];
    return jsonResource({
      project: status.project,
      planned: amountJson(status.planned),
      actual: amountJson(status.actual),
      remaining: amountJson(status.remaining),
      overBudget: status.overBudget,
      remainingExact: status.remainingExact,
      ...(timeEntries.length > 0
        ? { time: { byTask: mapToObject(minutesByTask(timeEntries)), billableMinutes: billableMinutes(timeEntries) } }
        : {}),
    } as unknown as JsonValue, "managing budget status");
  },
});

/** automate — a RuleFiring (rules + event + snapshot) → the actions it emits. */
export const automateAction: Action = action({
  verb: "automate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Fire when/if/then automation rules over an event and snapshot; optionally spawn a recurrence.",
  description: "Domain: a RuleFiring { rules: Rule[], event: AutomationEvent, snapshot: TaskSnapshot, recurring?: RecurringTask, completedOn? }. Codomain: { actions: Action[], spawned? } as JSON.",
  run: (input: unknown): JsonValue => {
    const record = asRecord(input, "automate");
    const rules = arrayOf(record, "rules") as unknown as Rule[];
    const event = recordOf(record, "event") as unknown as AutomationEvent;
    const snapshot = recordOf(record, "snapshot") as unknown as TaskSnapshot;
    const fired = fireRules(rules, event, snapshot);
    const recurring = record["recurring"] as RecurringTask | undefined;
    const completedOn = optionalString(record, "completedOn");
    return jsonResource({
      actions: fired,
      ...(recurring !== undefined && completedOn !== undefined
        ? { spawned: spawnNext(recurring, completedOn) }
        : {}),
    } as unknown as JsonValue, "managing automation");
  },
});

/** The package's actions — the hub admission, its reads, and the side morphisms. */
export const actions: readonly Action[] = Object.freeze([
  planAction,
  operateAction,
  scheduleAction,
  flowAction,
  prioritizeAction,
  assignAction,
  reportAction,
  viewAction,
  recurAction,
  governAction,
  accountAction,
  automateAction,
]);
