/**
 * AOE recurring work: work that recurs, run as the account that contracted it.
 *
 * A schedule (engineering glossary: schedule) is an invocation (one operation verb and its input,
 * run as one account), a trigger and a retry policy (how many attempts an occurrence gets and how
 * long a failed attempt waits before the next). The trigger takes Kubernetes CronJob's shape: either
 * an interval (`everySeconds` from `firstDueAt`, optionally a number of occurrences) or a calendar
 * rule (a five-field cron `schedule` read in an IANA `timeZone`, UTC unless named, never before
 * `firstDueAt` when one is given), read by the house's one cron reading (cron-services-section).
 * `startingDeadlineSeconds` bounds how late an occurrence may still start: one later than that is
 * missed, not run. A third trigger is demand, for work the world hands over rather than the calendar:
 * `demand` names the receipt a run of the work leaves, and the receipt's own reading of what the
 * run left ({ pending, nextAt? }) is the trigger. The schedule is due when the work has never run,
 * as soon as a run ends with work pending, and at `nextAt` when one ends with none; each ended run is
 * one occurrence (named by the instant it ended or the nextAt it gave), and so is a change, after the
 * run ended, to a directory the reading names in `watch` (where new work arrives: an order queued, a
 * file dropped), named by when it changed, so a run is started once per reading however often the
 * clock looks. A failed run with no reading is asked again after retryAfterSeconds when the schedule
 * gives one, and otherwise waits for its finding to be answered.
 *
 * What the clock keeps is the store's (semiotic-eavt `store`; feltos-node specification section 6):
 * - a schedule is a `clock-schedule` record, a thread named by the schedule's id whose head is the
 *   latest definition; a retired schedule closes its thread;
 * - a schedule's last run is a `schedule-run` record, a thread named by the schedule's id whose head
 *   (data/state/schedule-run-state/<id>.json) is where the schedule stands: its last run and the
 *   instant that run ended;
 * - each run leaves one `schedule-run` log line (data/logs/schedule-run-logs/<date>.jsonl).
 * Whether a schedule is due is computed at the moment it is asked, from the schedule and the run it
 * last had (`clockReading`); nothing is written to keep that current. A tick that finds nothing due
 * writes nothing, and no tick is an RPC or leaves a witness: the heartbeat computes what is due, runs
 * each due job as its account through the catalog, writes the job's state when the run ends, and
 * logs one line. The job's own verb is witnessed as any other call is.
 *
 * A schedule never runs twice at once (Kubernetes CronJob's `concurrencyPolicy: Forbid`: a run in
 * this process holds its schedule until it records its outcome), and starting work is not waiting on
 * it ("send, don't wait"): the heartbeat starts due runs and returns to its wait. A run whose process
 * ended before it recorded an outcome left no state, so the schedule is due again at its next
 * reading as the same occurrence's next attempt. Missed occurrences are not replayed: a delayed vote
 * or order has a different effect than the one scheduled, so only the latest due occurrence runs.
 * A process-wide MAX_IN_FLIGHT bounds concurrent runs; one reading names at most MAX_PER_TICK of
 * them, from a rotating offset so no schedule starves another.
 *
 * The clock runs scheduled verbs through the catalog and authorization its operations were
 * assembled with (`clockOperations`), as arrival processing does.
 */
import { existsSync, mkdirSync, readFileSync, statSync, watch } from "node:fs";
import path from "node:path";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { append, extend, get, heads, readHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { dispatchWire } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { subjectOf } from "../agency/cast.mjs";
import { assertTimeZone, cronRuleOf, latestScheduledAtOrBefore, nextScheduledAfter } from "@red-cup-engineering/cron-services-section/schedule";

const MAX_PER_TICK = 32;
// Process-wide: bounds concurrent runs across every tick (and, in one process, every node's clock).
const MAX_IN_FLIGHT = 8;
// How long a shutting-down heartbeat gives in-flight runs to finish and record their outcome.
const SHUTDOWN_GRACE_MS = 5_000;

/** The type of a schedule's definitions: a thread per schedule id. */
export const scheduleType = "clock-schedule";
/** The type of a schedule's runs: a thread per schedule id, its head the schedule's last run; also the run log. */
export const runType = "schedule-run";

const readJson = (file) => existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
const withoutCauses = ({ causes: _causes, ...record }) => record;

// The catalog and authorization each data root's clock runs scheduled verbs through, declared where
// its operations are assembled (`clockOperations`) and read by the heartbeat.
const clocks = new Map();

/**
 * Wait for the clock's next reason to look, as one reading named it: the earliest instant a blocked
 * or future run can start (`wakeAt`), a run ending (a slot freeing), a change to a directory a
 * demand schedule watches, or `intervalMs`, the longest the clock goes without looking. The wait is
 * always longer than zero, so the loop cannot spin.
 */
function waitForReading(reading, intervalMs, signal, now) {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const at = Date.parse(now());
    const wakeAt = Date.parse(reading?.wakeAt ?? "");
    const timer = setTimeout(done, wakeDelay(Number.isFinite(wakeAt) ? wakeAt : Infinity, at, intervalMs));
    const watchers = [];
    for (const directory of reading?.watch?.receipts ?? []) {
      try {
        mkdirSync(directory, { recursive: true });
        watchers.push(watch(directory, (_event, name) => { if (typeof name === "string" && name.endsWith(".json") && !name.endsWith(".demand.json")) done(); }));
      } catch { /* an unwatchable directory leaves its schedules to the timer */ }
    }
    // Where a demand job said new work arrives: any change there is a reason to look.
    for (const directory of reading?.watch?.arrivals ?? []) {
      try { watchers.push(watch(directory, () => done())); } catch { /* a directory not yet made is read at the next look */ }
    }
    // A run ending can free a slot and make a capacity-blocked schedule startable.
    let settled = false;
    if (inFlight.size > 0) Promise.race([...inFlight.values()].map((entry) => entry.promise)).then(done, done);
    function done() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

/** Milliseconds to wait from `at` until `wakeAt`, no longer than `intervalMs` and never less than one (P-wake). */
export function wakeDelay(wakeAt, at, intervalMs) {
  return Math.max(1, Math.min(wakeAt - at, intervalMs));
}

/**
 * Run this node's one recurring-work heartbeat until aborted. Each look takes the clock's reading
 * of the schedules and their last runs at the moment, starts a run of each schedule it names due,
 * and sleeps until the reading's next reason to look. A look that finds nothing due writes nothing.
 * Runs go on concurrently, bounded process-wide by MAX_IN_FLIGHT, and each records its own state and
 * log line when it ends (`onRun` is told the run's record). On abort, in-flight runs get
 * SHUTDOWN_GRACE_MS to finish and record normally; one still running past the grace is left, and
 * if the process exits first the schedule is simply due again at the next start.
 * `binding` is the one the clock's operations were assembled with (`clockOperations`).
 */
export async function runClockHeartbeat(binding, { intervalMs, signal, now = () => new Date().toISOString(), onRun = () => {} }) {
  if (typeof binding?.dataRoot !== "string") throw new TypeError("clock heartbeat binding is required");
  if (!Number.isInteger(intervalMs) || intervalMs < 1) throw new RangeError("clock heartbeat intervalMs must be a positive integer");
  if (signal === undefined || typeof signal.aborted !== "boolean") throw new TypeError("clock heartbeat signal is required");
  while (!signal.aborted) {
    const at = now();
    let reading;
    try {
      reading = clockReading(binding, at);
      startRuns(binding, reading, at, { now, onRun });
    } catch (error) {
      process.stderr.write(`[recurring] clock could not read its schedules: ${error instanceof Error ? error.message : String(error)}\n`);
      reading = undefined;
    }
    await waitForReading(reading, intervalMs, signal, now);
  }
  await drainInFlight(SHUTDOWN_GRACE_MS);
}

const rules = new Map();
const ruleOf = (expression) => {
  let rule = rules.get(expression);
  if (rule === undefined) rules.set(expression, rule = cronRuleOf(expression));
  return rule;
};
const zoneOf = (schedule) => schedule.timeZone ?? "UTC";

/**
 * A schedule's trigger, checked: exactly one of an interval or a calendar rule, and the fields that
 * belong to it. Returns the schedule; throws naming what is wrong.
 */
export function assertTrigger(schedule, what = "schedule") {
  const interval = schedule.everySeconds !== undefined;
  const calendar = schedule.schedule !== undefined;
  const demand = schedule.demand !== undefined;
  if ([interval, calendar, demand].filter(Boolean).length !== 1) throw new TypeError(`${what} ${schedule.id} needs exactly one trigger: everySeconds, a cron schedule, or demand`);
  if (demand) {
    if (typeof schedule.demand !== "string" || !path.isAbsolute(schedule.demand)) throw new TypeError(`${what} ${schedule.id}: demand names the absolute path of the receipt its runs leave`);
    for (const key of ["timeZone", "firstDueAt", "maxOccurrences", "startingDeadlineSeconds"]) {
      if (schedule[key] !== undefined) throw new TypeError(`${what} ${schedule.id}: ${key} belongs to a calendar trigger, not demand`);
    }
    return schedule;
  }
  if (calendar) {
    ruleOf(schedule.schedule);
    if (schedule.timeZone !== undefined) assertTimeZone(schedule.timeZone);
    if (schedule.maxOccurrences !== undefined) throw new TypeError(`${what} ${schedule.id}: a cron schedule's occurrences are its calendar's; maxOccurrences belongs to an interval`);
  } else if (schedule.timeZone !== undefined) {
    throw new TypeError(`${what} ${schedule.id}: timeZone reads a cron schedule; an interval has none`);
  }
  if (schedule.firstDueAt !== undefined && !Number.isFinite(Date.parse(schedule.firstDueAt))) throw new TypeError(`${what} ${schedule.id}: firstDueAt must be an instant`);
  return schedule;
}

// The instant an occurrence was due: n intervals after the first, or the calendar minute it names.
const dueAtOf = (schedule, occurrence) => (schedule.schedule === undefined
  ? Date.parse(schedule.firstDueAt) + occurrence * schedule.everySeconds * 1000
  : occurrence * 60_000);

/**
 * A demand schedule's reading: its receipt, with the instant its occurrence is due. Never run: due
 * now (occurrence 0). Ended with work pending: due at once, named by when it ended. Ended with none
 * and a nextAt: due then, named by it. Failed with no reading of its own: due retryAfterSeconds after
 * it ended when the schedule gives one. Otherwise nothing is due until another reading.
 */
function demandDue(schedule) {
  const receipt = readJson(schedule.demand);
  if (receipt === undefined) return { occurrence: 0, at: -Infinity };
  const ended = Date.parse(receipt.endedAt);
  const reading = receipt.demand;
  if (Number.isFinite(ended) && Number.isInteger(reading?.pending) && reading.pending > 0) return { occurrence: ended, at: ended };
  const changed = (Array.isArray(reading?.watch) ? reading.watch : []).reduce((latest, directory) => {
    try { return Math.max(latest, Math.floor(statSync(directory).mtimeMs)); } catch { return latest; }
  }, -Infinity);
  if (Number.isFinite(ended) && changed > ended) return { occurrence: changed, at: changed };
  const nextAt = Date.parse(reading?.nextAt);
  if (Number.isFinite(nextAt)) return { occurrence: nextAt, at: nextAt };
  // A run that was never asked for a reading (one from before its job was driven by demand) says
  // nothing about what is left, so the work runs once to say.
  if (receipt.demandAsked !== true && Number.isFinite(ended)) return { occurrence: ended, at: ended };
  if (receipt.ok !== true && reading === undefined && Number.isFinite(ended) && schedule.retryAfterSeconds !== undefined) {
    return { occurrence: ended, at: ended + schedule.retryAfterSeconds * 1000 };
  }
  return null;
}

/**
 * The occurrence of a schedule due at `now`, or null. An interval's occurrence n is due at
 * firstDueAt + n·every; a calendar rule's occurrence is the epoch minute of its latest scheduled
 * instant, so a run is named by when it was due. Either is null past its starting deadline.
 */
export function dueOccurrence(schedule, now) {
  const at = Date.parse(now);
  if (schedule.demand !== undefined) {
    const due = demandDue(schedule);
    return due !== null && due.at <= at ? due.occurrence : null;
  }
  let occurrence;
  if (schedule.schedule === undefined) {
    const elapsed = at - Date.parse(schedule.firstDueAt);
    if (!(elapsed >= 0)) return null;
    occurrence = Math.floor(elapsed / (schedule.everySeconds * 1000));
    if (schedule.maxOccurrences !== undefined && occurrence >= schedule.maxOccurrences) return null;
  } else {
    const latest = latestScheduledAtOrBefore(ruleOf(schedule.schedule), zoneOf(schedule), at);
    if (latest === undefined) return null;
    if (schedule.firstDueAt !== undefined && latest < Date.parse(schedule.firstDueAt)) return null;
    occurrence = latest / 60_000;
  }
  if (schedule.startingDeadlineSeconds !== undefined && at - dueAtOf(schedule, occurrence) > schedule.startingDeadlineSeconds * 1000) return null;
  return occurrence;
}

/** When a schedule's next occurrence after `now` is due, as an ISO instant, or null when none is. */
export function nextDueAt(schedule, now) {
  if (schedule.demand !== undefined) {
    const due = demandDue(schedule);
    return due === null ? null : new Date(Math.max(due.at, Date.parse(now))).toISOString();
  }
  if (schedule.schedule === undefined) {
    const due = dueOccurrence({ ...schedule, startingDeadlineSeconds: undefined, maxOccurrences: undefined }, now);
    const next = due === null ? 0 : due + 1;
    if (schedule.maxOccurrences !== undefined && next >= schedule.maxOccurrences) return null;
    return new Date(dueAtOf(schedule, Math.max(next, 0))).toISOString();
  }
  const from = Math.max(Date.parse(now), schedule.firstDueAt === undefined ? -Infinity : Date.parse(schedule.firstDueAt) - 1);
  const next = nextScheduledAfter(ruleOf(schedule.schedule), zoneOf(schedule), from);
  return next === undefined ? null : new Date(next).toISOString();
}

/** The record of a thread's head that `stamp` ranks last, without the causes the store added. */
function latestOf(root, type, name, stamp) {
  const head = readHead(root, type, name);
  let latest;
  for (const address of head?.frontier ?? []) {
    const record = typeof address === "string" ? get(root, type, address) : undefined;
    if (record !== undefined && (latest === undefined || String(stamp(record)) >= String(stamp(latest)))) latest = record;
  }
  return latest === undefined ? undefined : withoutCauses(latest);
}

/** The current schedules: each open thread's latest definition, retired ones dropped. */
export function currentSchedules(binding) {
  const schedules = [];
  for (const { name, head } of heads(binding.dataRoot, scheduleType)) {
    if (head.closed === true) continue;
    const schedule = latestOf(binding.dataRoot, scheduleType, name, (record) => record.admittedAt);
    if (schedule !== undefined && !schedule.retired) schedules.push(schedule);
  }
  return schedules.sort((a, b) => a.id.localeCompare(b.id));
}

/** The run a schedule last had (the head of its runs), or undefined when it has not run. */
export const lastRunOf = (binding, scheduleId) => latestOf(binding.dataRoot, runType, scheduleId, (record) => record.at);

// The longest a reading lets the clock go without looking when nothing names a later instant.
const SAFETY_INTERVAL_MS = 300_000;

// Runs a heartbeat has started and not yet recorded the outcome of, process-wide, keyed by data
// root and schedule (so one process hosting more than one node's clock never mixes their accounting;
// MAX_IN_FLIGHT is still a single process-wide budget).
const inFlight = new Map();
const inFlightKey = (dataRoot, scheduleId) => `${dataRoot}::${scheduleId}`;
// Occurrences whose run ended but whose state could not be written: held, so a failing disk is not a
// spin of the same job (the schedule reads due again at the next start).
const unrecorded = new Map();

/**
 * The state of a due occurrence given the schedule's last run: { attempt } when a run can start,
 * else why not. A run of the schedule in this process holds it (reason running). A last run of
 * another occurrence leaves this one untaken; of this occurrence, success ends its turn (reason
 * succeeded), and a failure admits the next attempt once its retry wait has passed (until then reason
 * retry-wait, `at` its end) and the policy allows another (else reason exhausted).
 */
function attemptState(binding, schedule, occurrence, now) {
  const key = inFlightKey(binding.dataRoot, schedule.id);
  if (inFlight.has(key)) return { reason: "running" };
  if (unrecorded.get(key) === occurrence) return { reason: "unrecorded" };
  const last = lastRunOf(binding, schedule.id);
  if (last === undefined || last.occurrence !== occurrence) return { attempt: 0 };
  if (last.ok) return { reason: "succeeded" };
  if (last.attempt + 1 >= (schedule.maxAttempts ?? 1)) return { reason: "exhausted" };
  const retryAt = Date.parse(last.at) + (schedule.retryAfterSeconds ?? 0) * 1000;
  if (Date.parse(now) < retryAt) return { reason: "retry-wait", at: retryAt };
  return { attempt: last.attempt + 1 };
}

/**
 * The clock's one reading of its schedules and their last runs at `now`. Writes nothing.
 * - due: the runs startable now, in the reading's rotating order, at most MAX_PER_TICK and at most the
 *   free in-flight slots;
 * - blocked: due occurrences that cannot start now, with why: capacity (no free slot), retry-wait,
 *   running (a run of the schedule is in flight), unrecorded or exhausted (no attempt left, or a
 *   demand reading that names no later instant);
 * - wakeAt: the earliest instant strictly after `now` that a blocked or future run can start (each
 *   schedule's next occurrence, each retry wait's end, a demand schedule's nextAt), or now plus the
 *   safety interval when none is named;
 * - freeSlots: the in-flight slots free now;
 * - watch: the directories whose change can make a demand schedule due (its receipt's directory, and
 *   the directories its last reading named), so the heartbeat can wait on them.
 * The schedules themselves ride on a non-enumerable `schedules` map for the tick.
 */
export function clockReading(binding, now, { safetyIntervalMs = SAFETY_INTERVAL_MS } = {}) {
  const at = Date.parse(now);
  const schedules = currentSchedules(binding);
  const freeSlots = Math.max(0, MAX_IN_FLIGHT - inFlight.size);
  const room = Math.min(MAX_PER_TICK, freeSlots);
  const offset = schedules.length === 0 ? 0 : Math.floor(at / 60_000) % schedules.length;
  const due = [];
  const blocked = [];
  let wakeAt = Infinity;
  const later = (instant) => { if (Number.isFinite(instant) && instant > at && instant < wakeAt) wakeAt = instant; };
  for (const schedule of [...schedules.slice(offset), ...schedules.slice(0, offset)]) {
    const occurrence = dueOccurrence(schedule, now);
    const state = occurrence === null ? null : attemptState(binding, schedule, occurrence, now);
    if (state?.attempt !== undefined) {
      if (due.length < room) due.push({ schedule: schedule.id, occurrence, attempt: state.attempt });
      else blocked.push({ schedule: schedule.id, occurrence, reason: "capacity" });
    } else if (state?.reason !== undefined && state.reason !== "succeeded") {
      blocked.push({ schedule: schedule.id, occurrence, reason: state.reason });
      if (state.reason === "retry-wait") later(state.at);
    }
    const next = Date.parse(nextDueAt(schedule, now) ?? "");
    if (Number.isFinite(next) && next > at) later(next);
    else if (Number.isFinite(next) && state?.attempt === undefined && !blocked.some((entry) => entry.schedule === schedule.id)) {
      // An instant not later than now with nothing to start: spent until its reading changes.
      blocked.push({ schedule: schedule.id, occurrence, reason: "exhausted" });
    }
  }
  const demands = schedules.filter((schedule) => schedule.demand !== undefined);
  const reading = {
    due,
    blocked,
    wakeAt: new Date(Number.isFinite(wakeAt) ? wakeAt : at + safetyIntervalMs).toISOString(),
    freeSlots,
    watch: {
      receipts: [...new Set(demands.map((schedule) => path.dirname(schedule.demand)))],
      arrivals: [...new Set(demands.flatMap((schedule) => readJson(schedule.demand)?.demand?.watch ?? []).filter((entry) => typeof entry === "string"))],
    },
  };
  Object.defineProperty(reading, "schedules", { value: new Map(schedules.map((schedule) => [schedule.id, schedule])) });
  return reading;
}

/** Give in-flight runs up to graceMs to finish and record their outcome before a shutting-down heartbeat returns. */
async function drainInFlight(graceMs) {
  const pending = [...inFlight.values()].map((entry) => entry.promise);
  if (pending.length === 0) return;
  await Promise.race([Promise.allSettled(pending), new Promise((resolve) => setTimeout(resolve, graceMs))]);
}

/**
 * Write the state of a run that ended: its record, the head of the schedule's runs, and the one
 * log line the console tails. A failure to write is said once and holds the occurrence (see `unrecorded`).
 */
function recordRun(binding, schedule, occurrence, attempt, outcome, endedAt, ms, onRun) {
  const key = inFlightKey(binding.dataRoot, schedule.id);
  const record = { at: endedAt, schedule: schedule.id, occurrence, attempt, ok: outcome.ok, ...(outcome.ok ? {} : { error: outcome.error }) };
  try {
    const address = extend(binding.dataRoot, runType, schedule.id, record);
    append(binding.dataRoot, runType, { at: endedAt, schedule: schedule.id, outcome: outcome.ok ? "ok" : "failed", ms, of: address, ...(outcome.ok ? {} : { error: outcome.error.slice(0, 500) }) });
    unrecorded.delete(key);
  } catch (error) {
    unrecorded.set(key, occurrence);
    process.stderr.write(`[recurring] failed to record the run of ${schedule.id}#${occurrence}.${attempt}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  try { onRun(Object.freeze(record)); } catch { /* a listener's failure is not the run's */ }
}

/** Start a run of each schedule `reading` names due, and return without waiting for them. */
function startRuns(binding, reading, now, { now: clockNow = () => now, onRun = () => {} } = {}) {
  const clock = clocks.get(binding.dataRoot);
  if (reading.due.length > 0 && clock === undefined) throw new TypeError("no clock operations were assembled for this data root");
  return reading.due.map(({ schedule: id, occurrence, attempt }) => {
    const schedule = reading.schedules.get(id);
    const key = inFlightKey(binding.dataRoot, id);
    const startedAt = clockNow();
    const began = Date.now();
    // Started inside the chain, so even a synchronous throw (authorize, argument encoding) is an outcome.
    const promise = Promise.resolve().then(() => dispatchWire(createOperationCatalog(clock.operations()), [schedule.verb], JSON.stringify(schedule.input ?? {}), {
      subject: schedule.account,
      caller: Object.freeze({ transport: "clock", schedule: id, occurrence, attempt }),
      now: () => now,
      witness: journalRpcWitness(binding.dataRoot),
      coordinate: processLeaseCoordinator(binding.dataRoot),
    }, clock.authorize()))
      .then((result) => ({ ok: result.code === 0, ...(result.code === 0 ? {} : { error: result.stderr.trim().slice(0, 2000) }) }))
      .catch((error) => ({ ok: false, error: `scheduled run rejected: ${error instanceof Error ? error.message : String(error)}`.slice(0, 2000) }))
      .then((outcome) => recordRun(binding, schedule, occurrence, attempt, outcome, clockNow(), Date.now() - began, onRun))
      .finally(() => inFlight.delete(key));
    inFlight.set(key, { schedule: id, occurrence, attempt, startedAt, promise });
    return { schedule: id, occurrence, attempt, startedAt, promise };
  });
}

/**
 * One tick of the clock: read what is due at `now` and start it. Returns what it started, which is
 * nothing, and writes nothing, when nothing is due. The heartbeat does this at every look; a host or
 * test that drives the clock itself calls it. `settled()` of the result waits for the started runs.
 */
export function tickClock(binding, now, options = {}) {
  const reading = clockReading(binding, now);
  const runs = startRuns(binding, reading, now, options);
  return Object.freeze({
    started: Object.freeze(runs.map(({ promise: _promise, ...run }) => Object.freeze(run))),
    settled: () => Promise.allSettled(runs.map(({ promise }) => promise)),
  });
}

const scheduleSchema = schemaFrom({
  $id: "metroplat/clock/schedule-admit", title: "ScheduleAdmission", type: "object", required: ["id", "verb"],
  properties: {
    id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
    verb: { type: "string", minLength: 1 },
    input: {},
    account: { type: "string", minLength: 1 },
    everySeconds: { type: "integer", minimum: 60, maximum: 31_536_000 },
    schedule: { type: "string", minLength: 1 },
    demand: { type: "string", minLength: 1 },
    timeZone: { type: "string", minLength: 1 },
    startingDeadlineSeconds: { type: "integer", minimum: 1, maximum: 31_536_000 },
    firstDueAt: { type: "string" },
    maxOccurrences: { type: "integer", minimum: 1 },
    maxAttempts: { type: "integer", minimum: 1, maximum: 10 },
    retryAfterSeconds: { type: "integer", minimum: 0, maximum: 86_400 },
    retired: { type: "boolean" },
  },
  additionalProperties: false,
});

/** Write a schedule's definition as the next record of its thread; a retired schedule closes the thread. */
const writeSchedule = (binding, record) => extend(binding.dataRoot, scheduleType, record.id, record, { closed: record.retired === true });

/** Reconcile trusted instance schedule declarations with this node's schedules.
 * The instance supplies data; AOE owns admission, replacement, and retirement. */
export function reconcileDeclaredSchedules(binding, instanceId, declarations, now = () => new Date().toISOString()) {
  if (typeof instanceId !== "string" || !instanceId) throw new TypeError("schedule declaration needs an instance identity");
  if (!Array.isArray(declarations)) throw new TypeError("instance schedules must be an array");
  const selected = new Map();
  for (const input of declarations) {
    scheduleSchema.assert(input, "instance schedule");
    assertTrigger(input, "instance schedule");
    if (input.retired === true || (input.everySeconds !== undefined && typeof input.firstDueAt !== "string")) {
      throw new TypeError("instance schedule needs a firstDueAt for its interval and cannot declare retired work");
    }
    if (input.account !== instanceId) throw new TypeError("instance schedule must run as its own account");
    if (selected.has(input.id)) throw new TypeError("duplicate instance schedule: " + input.id);
    selected.set(input.id, input);
  }
  const current = new Map(currentSchedules(binding).map((record) => [record.id, record]));
  const changed = [];
  for (const [id, input] of selected) {
    const prior = current.get(id);
    if (prior && prior.declaredBy !== instanceId) throw new TypeError("instance schedule collides with existing work: " + id);
    const record = { ...input, input: input.input ?? {}, admittedAt: now(), admittedBy: instanceId, declaredBy: instanceId };
    const declaredKeys = ["id", "verb", "input", "account", "everySeconds", "schedule", "demand", "timeZone", "startingDeadlineSeconds", "firstDueAt", "maxOccurrences", "maxAttempts", "retryAfterSeconds"];
    const same = prior && !prior.retired && declaredKeys.every((key) => JSON.stringify(prior[key]) === JSON.stringify(record[key]));
    if (same) continue;
    writeSchedule(binding, record);
    changed.push({ id, state: "admitted" });
  }
  for (const prior of current.values()) {
    if (prior.declaredBy !== instanceId || selected.has(prior.id)) continue;
    writeSchedule(binding, { ...prior, retired: true, admittedAt: now(), admittedBy: instanceId });
    changed.push({ id: prior.id, state: "retired" });
  }
  return Object.freeze(changed);
}

/**
 * The clock's operations, and the declaration of the catalog and authorization its heartbeat runs
 * scheduled verbs through: `operations` is the callable catalog and `authorize` the catalog's
 * authorization (standing and rules), both read lazily, as arrival processing reads them. The
 * operations admit and read schedules; the clock itself is the heartbeat (`runClockHeartbeat`).
 */
export function clockOperations(binding, operations, authorize) {
  clocks.set(binding.dataRoot, Object.freeze({ operations, authorize }));
  return Object.freeze([
    operation({
      verb: "schedule-admit",
      summary: "Schedule recurring work: one verb, its input, the account it runs as, when (an interval or a cron calendar rule in a time zone), and how many attempts an occurrence gets; or retire a schedule.",
      description: "The trigger is everySeconds from firstDueAt, or a five-field cron schedule read in timeZone (IANA, UTC by default), as Kubernetes CronJob reads them; startingDeadlineSeconds misses an occurrence that could not start in time. The account defaults to yours; the work runs under that account's standing, and the house's rules are judged at each run. An occurrence gets one attempt unless maxAttempts says more; a failed attempt waits retryAfterSeconds before the next. Admitting an id again replaces its schedule.",
      domain: scheduleSchema,
      writes: ["metroplat/clock"],
      run: (input, _args, context) => {
        const admittedAt = binding.now();
        const record = { ...input, input: input.input ?? {}, account: input.account ?? subjectOf(context, "anonymous"), firstDueAt: input.firstDueAt ?? admittedAt, admittedAt, admittedBy: subjectOf(context, "anonymous") };
        if (!input.retired) assertTrigger(record, "schedule-admit:");
        writeSchedule(binding, record);
        return JSON.parse(JSON.stringify(record));
      },
    }),
    operation({
      verb: "schedules",
      summary: "The recurring work scheduled on this instance: each schedule, when it next runs, and its last run.",
      domain: schemaFrom({ $id: "metroplat/clock/schedules", title: "SchedulesRequest", type: "object", additionalProperties: false }),
      reads: ["metroplat/clock"],
      run: () => {
        const now = binding.now();
        return JSON.parse(JSON.stringify({
          kind: "metroplat.schedules",
          now,
          schedules: currentSchedules(binding).map((schedule) => ({
            ...schedule, nextDueAt: nextDueAt(schedule, now), last: lastRunOf(binding, schedule.id),
          })),
        }));
      },
    }),
  ]);
}
