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
 * file dropped), named by when it changed, so a run is started once per
 * reading however often the clock looks. A failed run with no reading is asked again after
 * retryAfterSeconds when the schedule gives one, and otherwise waits for its finding to be answered. `run-due` is the heartbeat a host's timer calls: it carries the
 * observed time as its input and no work policy of its own (opportunistic scheduling loop), so
 * what runs is decided by the admitted schedules alone.
 *
 * Each attempt of an occurrence is reserved exactly once (a write-once marker naming the process
 * that took it), so concurrent or repeated ticks never run it twice. The verb is dispatched through
 * the catalog under the schedule's account, where standing and the house's rules are judged as for
 * any other call. An attempt whose process died before its outcome was recorded is recorded as
 * interrupted, and counts as a failed attempt. Missed occurrences are not replayed: a delayed vote
 * or order has a different effect than the one scheduled, so only the latest due occurrence runs.
 *
 * A tick reserves due attempts, starts them, and returns without waiting for them: the standard
 * here is Kubernetes CronJob's `concurrencyPolicy: Forbid` (a schedule never runs twice at once,
 * which the reservation protocol above already gives) composed with the actor model's "send, don't
 * wait" (starting work is not the same as waiting on it). One slow attempt — an inference placement
 * walking several providers, a build, a fetch — must never stall every other schedule on the node.
 * Each attempt records its own outcome through `recordOutcome` when it ends, whether it resolves,
 * rejects, or throws: a detached attempt is never allowed to become an unhandled rejection. A
 * process-wide MAX_IN_FLIGHT bounds concurrent attempts; a tick reserves only as many due attempts
 * as there are free slots, leaving the rest for a later tick. One tick still reserves at most
 * MAX_PER_TICK attempts, starting from a rotating offset so no schedule starves another. Schedules
 * and outcomes are rows of the semantic record journal; each schedule's last outcome is also kept
 * as its projection, which `schedules` reads. Definitions use metroplat.clock.schedule; invocation
 * outcomes keep metroplat.clock. Separating the carriers lets startup and every heartbeat read
 * the current definitions without verifying the entire invocation history.
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, watch, writeFileSync } from "node:fs";
import path from "node:path";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { dispatchProjectedSurface, dispatchWire } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { subjectOf } from "../agency/cast.mjs";
import { assertTimeZone, cronRuleOf, latestScheduledAtOrBefore, nextScheduledAfter } from "@red-cup-engineering/cron-services-section/schedule";

const MAX_PER_TICK = 32;
// Process-wide: bounds concurrent attempts across every tick (and, in one process, every node's
// clock), not just one tick's own reservations.
const MAX_IN_FLIGHT = 8;
// How long a shutting-down heartbeat gives in-flight attempts to finish and record their outcome
// normally before leaving the rest to the reservation protocol (see runClockHeartbeat).
const SHUTDOWN_GRACE_MS = 5_000;

const journalOf = (binding) => createSemanticRecordJournal({ root: binding.dataRoot, objectKind: "metroplat.clock" });
// Schedule definitions have their own carrier: reading ten definitions must
// not verify every historical invocation outcome before the node can start.
const scheduleJournalOf = (binding) => createSemanticRecordJournal({ root: binding.dataRoot, objectKind: "metroplat.clock.schedule" });
const stateDir = (binding, ...parts) => path.join(binding.clockStateRoot ?? path.join(binding.dataRoot, "data", "state", "clock"), ...parts);
const readJson = (file) => existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;

/**
 * Wait for the clock's next reason to look: the earliest instant a current schedule is next due,
 * or a demand schedule's receipt being written (a run ending is the moment its reading changes),
 * whichever comes first; `intervalMs` is only the longest the clock goes without looking, which a
 * schedule admitted at run time may need. A node with nothing due and no run ending sleeps.
 */
function waitForNextDue(binding, intervalMs, signal, now) {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const schedules = currentSchedules(binding);
    const at = Date.parse(now());
    const soonest = schedules.reduce((earliest, schedule) => {
      // A demand occurrence already taken is spent until its receipt changes, which the watch hears.
      const occurrence = schedule.demand === undefined ? null : dueOccurrence(schedule, now());
      if (occurrence !== null && nextAttempt(binding, schedule, occurrence, now(), { record: false }) === null) return earliest;
      const next = Date.parse(nextDueAt(schedule, now()) ?? "");
      return Number.isFinite(next) && next < earliest ? next : earliest;
    }, at + intervalMs);
    const watchers = [];
    const timer = setTimeout(done, Math.max(0, soonest - at));
    const demands = schedules.filter((schedule) => schedule.demand !== undefined);
    for (const directory of new Set(demands.map((schedule) => path.dirname(schedule.demand)))) {
      try {
        mkdirSync(directory, { recursive: true });
        watchers.push(watch(directory, (_event, name) => { if (typeof name === "string" && name.endsWith(".json") && !name.endsWith(".demand.json")) done(); }));
      } catch { /* an unwatchable directory leaves its schedules to the timer */ }
    }
    // Where a demand job said new work arrives: any change there is a reason to look.
    for (const directory of new Set(demands.flatMap((schedule) => readJson(schedule.demand)?.demand?.watch ?? []).filter((entry) => typeof entry === "string"))) {
      try { watchers.push(watch(directory, () => done())); } catch { /* a directory not yet made is read at the next look */ }
    }
    function done() {
      clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * Run this node's one recurring-work heartbeat through its governed surface until aborted.
 * A tick (`run-due`) reserves due attempts, starts them, and returns as soon as they're started;
 * it does not wait for them to finish, so one slow attempt never delays the next tick's other
 * schedules. Ticking itself stays serial (one `run-due` call at a time) so the interval is honest,
 * but the attempts a tick starts run concurrently, bounded process-wide by MAX_IN_FLIGHT.
 * On abort, this function gives in-flight attempts SHUTDOWN_GRACE_MS to finish and record their
 * outcome the normal way; anything still running past the grace is left running, and the
 * reservation protocol covers it from there — if the process exits first, the next start finds
 * that attempt's pid dead and records it interrupted.
 * `surface` may be a function returning the surface, called only when a tick has work.
 */
export async function runClockHeartbeat(surface, { subject, dataRoot, clockStateRoot, rootName, intervalMs, signal, now = () => new Date().toISOString(), onObstruction = () => {} }) {
  if (typeof subject !== "string" || subject.length === 0) throw new TypeError("clock heartbeat subject is required");
  if (!Number.isInteger(intervalMs) || intervalMs < 1) throw new RangeError("clock heartbeat intervalMs must be a positive integer");
  if (signal === undefined || typeof signal.aborted !== "boolean") throw new TypeError("clock heartbeat signal is required");
  const binding = Object.freeze({ dataRoot, ...(clockStateRoot === undefined ? {} : { clockStateRoot }) });
  while (!signal.aborted) {
    // A tick with nothing due does no work and is not witnessed: an idle heartbeat would otherwise
    // write a witness every interval (about 14 KB each) for nothing.
    if (!anyAttemptDue(binding, now())) {
      await waitForNextDue(binding, intervalMs, signal, now);
      continue;
    }
    const result = await dispatchProjectedSurface(typeof surface === "function" ? await surface() : surface, ["run-due"], "{}", {
      subject,
      caller: Object.freeze({ transport: "metroplat-clock" }),
      now,
      witness: journalRpcWitness(dataRoot, { namespace: rootName }),
      coordinate: processLeaseCoordinator(dataRoot),
    });
    if (result.code !== 0) await onObstruction(result);
    if (!signal.aborted) await waitForNextDue(binding, intervalMs, signal, now);
  }
  await drainInFlight(dataRoot, SHUTDOWN_GRACE_MS);
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
 * The occurrence of a schedule due at `now`, or null. An interval's occurrence n is due at
 * firstDueAt + n·every; a calendar rule's occurrence is the epoch minute of its latest scheduled
 * instant, so its reservations are named by when they were due. Either is null past its starting
 * deadline.
 */
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

/** The current schedules: the latest record per id, retired ones dropped. */
export function currentSchedules(binding) {
  const byId = new Map();
  for (const row of scheduleJournalOf(binding).query({ category: "schedule" })) {
    const prior = byId.get(row.record.id);
    if (!prior || String(row.record.admittedAt) >= String(prior.admittedAt)) byId.set(row.record.id, row.record);
  }
  return [...byId.values()].filter((schedule) => !schedule.retired).sort((a, b) => a.id.localeCompare(b.id));
}

/** Whether any current schedule has an attempt to run at `now`; reads only, records nothing. */
export function anyAttemptDue(binding, now) {
  return currentSchedules(binding).some((schedule) => {
    const occurrence = dueOccurrence(schedule, now);
    return occurrence !== null && nextAttempt(binding, schedule, occurrence, now, { record: false }) !== null;
  });
}

// Attempt k of occurrence n is reserved at <n>.json (k = 0) or <n>.<k>.json, its outcome beside it.
const attemptFile = (binding, schedule, occurrence, attempt, suffix = "") =>
  stateDir(binding, "reservations", schedule.id, `${occurrence}${attempt === 0 ? "" : `.${attempt}`}${suffix}.json`);

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error?.code === "EPERM"; } };

/** Reserve one attempt, exactly once; false if it was already taken. */
function reserve(binding, schedule, occurrence, attempt, at) {
  mkdirSync(stateDir(binding, "reservations", schedule.id), { recursive: true });
  try {
    const fd = openSync(attemptFile(binding, schedule, occurrence, attempt), "wx");
    try { writeFileSync(fd, JSON.stringify({ schedule: schedule.id, occurrence, attempt, reservedAt: at, pid: process.pid })); } finally { closeSync(fd); }
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
}

/** Record an attempt's outcome: its row in the journal, beside its reservation, and as the schedule's last outcome. */
function recordOutcome(binding, schedule, outcome) {
  writeFileSync(attemptFile(binding, schedule, outcome.occurrence, outcome.attempt, ".outcome"), JSON.stringify(outcome));
  mkdirSync(stateDir(binding, "last"), { recursive: true });
  writeFileSync(stateDir(binding, "last", `${schedule.id}.json`), JSON.stringify(outcome));
  journalOf(binding).record({ category: "occurrence", recordedAt: outcome.ranAt, record: outcome, told: { for: outcome.ok, against: !outcome.ok } });
}

/**
 * The attempt of a due occurrence to run at `now`, or null. Attempts already taken are read in
 * order: one still running (its process alive) or succeeded ends the occurrence's turn; one whose
 * process died unrecorded is recorded interrupted (unless `record` is false); a failed one admits
 * the next attempt once its retry wait has passed and the policy allows another.
 */
function nextAttempt(binding, schedule, occurrence, now, { record = true } = {}) {
  const maxAttempts = schedule.maxAttempts ?? 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const reservation = readJson(attemptFile(binding, schedule, occurrence, attempt));
    if (reservation === undefined) return attempt;
    let outcome = readJson(attemptFile(binding, schedule, occurrence, attempt, ".outcome"));
    if (outcome === undefined) {
      if (reservation.pid !== undefined && alive(reservation.pid)) return null;
      outcome = { schedule: schedule.id, occurrence, attempt, verb: schedule.verb, account: schedule.account, ranAt: now, ok: false, interrupted: true, error: "the attempt's process ended before its outcome was recorded" };
      if (!record) return attempt;
      recordOutcome(binding, schedule, outcome);
    }
    if (outcome.ok) return null;
    if (Date.parse(now) < Date.parse(outcome.ranAt) + (schedule.retryAfterSeconds ?? 0) * 1000) return null;
  }
  return null;
}

// Attempts a tick has started but not yet recorded the outcome of, process-wide (send, don't
// wait: the tick that starts an attempt does not hold a slot open for its own lifetime, this map
// does). Keyed by data root plus attempt identity so one process hosting more than one node's
// clock never mixes their accounting; MAX_IN_FLIGHT is still a single, process-wide budget.
const inFlight = new Map();
const inFlightKey = (dataRoot, scheduleId, occurrence, attempt) => `${dataRoot}::${scheduleId}::${occurrence}::${attempt}`;

/** This data root's in-flight attempts, for a tick's result and for the shutdown drain. */
function inFlightFor(dataRoot) {
  return [...inFlight.values()].filter((entry) => entry.dataRoot === dataRoot);
}

/** Give this data root's in-flight attempts up to graceMs to finish and record their outcome the
 * normal way before a shutting-down heartbeat returns. Anything still running past the grace is
 * left running: the reservation protocol picks it up from there. */
async function drainInFlight(dataRoot, graceMs) {
  const pending = inFlightFor(dataRoot).map((entry) => entry.promise);
  if (pending.length === 0) return;
  await Promise.race([Promise.allSettled(pending), new Promise((resolve) => setTimeout(resolve, graceMs))]);
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

/** Reconcile trusted instance schedule declarations with this node's recurring-work journal.
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
    scheduleJournalOf(binding).record({ category: "schedule", recordedAt: record.admittedAt, record, told: { for: true, against: false } });
    changed.push({ id, state: "admitted" });
  }
  for (const prior of current.values()) {
    if (prior.declaredBy !== instanceId || selected.has(prior.id)) continue;
    const record = { ...prior, retired: true, admittedAt: now(), admittedBy: instanceId };
    scheduleJournalOf(binding).record({ category: "schedule", recordedAt: record.admittedAt, record, told: { for: false, against: true } });
    changed.push({ id: prior.id, state: "retired" });
  }
  return Object.freeze(changed);
}

/**
 * The clock's operations. `operations` is the callable catalog and `authorize` the catalog's
 * authorization (standing and rules), both read lazily, as arrival processing reads them.
 */
export function clockOperations(binding, operations, authorize) {
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
        scheduleJournalOf(binding).record({ category: "schedule", recordedAt: admittedAt, record, told: { for: !input.retired, against: input.retired === true } });
        return JSON.parse(JSON.stringify(record));
      },
    }),
    operation({
      verb: "schedules",
      summary: "The recurring work scheduled on this instance: each schedule, when it next runs, and its last outcome.",
      domain: schemaFrom({ $id: "metroplat/clock/schedules", title: "SchedulesRequest", type: "object", additionalProperties: false }),
      reads: ["metroplat/clock"],
      run: () => {
        const now = binding.now();
        return JSON.parse(JSON.stringify({
          kind: "metroplat.schedules",
          now,
          schedules: currentSchedules(binding).map((schedule) => ({
            ...schedule, nextDueAt: nextDueAt(schedule, now), last: readJson(stateDir(binding, "last", `${schedule.id}.json`)),
          })),
        }));
      },
    }),
    operation({
      verb: "run-due",
      summary: "The clock's tick: reserve and start each schedule's due attempt, as its account, through the catalog.",
      description: "A tick returns once due attempts are reserved and started; it does not wait for them to finish. At most MAX_IN_FLIGHT attempts run at once, process-wide, so one slow attempt never stalls another schedule; a tick beyond that budget reserves nothing further and leaves the rest for a later tick.",
      domain: schemaFrom({ $id: "metroplat/clock/run-due", title: "RunDue", type: "object", properties: { now: { type: "string" } }, additionalProperties: false }),
      writes: ["metroplat/clock"],
      effects: { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async (input = {}) => {
        const now = input.now ?? binding.now();
        const catalog = createOperationCatalog(operations());
        const schedules = currentSchedules(binding);
        const offset = schedules.length === 0 ? 0 : Math.floor(Date.parse(now) / 60_000) % schedules.length;
        const due = [];
        for (const schedule of [...schedules.slice(offset), ...schedules.slice(0, offset)]) {
          if (due.length === MAX_PER_TICK) break;
          if (inFlight.size + due.length >= MAX_IN_FLIGHT) break;
          const occurrence = dueOccurrence(schedule, now);
          if (occurrence === null) continue;
          const attempt = nextAttempt(binding, schedule, occurrence, now);
          if (attempt !== null && reserve(binding, schedule, occurrence, attempt, now)) due.push({ schedule, occurrence, attempt });
        }
        // Send, don't wait: each reserved attempt records its own outcome when it ends.
        const started = due.map(({ schedule, occurrence, attempt }) => {
          const startedAt = binding.now();
          const key = inFlightKey(binding.dataRoot, schedule.id, occurrence, attempt);
          // Started inside the chain, so even a synchronous throw (authorize, argument encoding) is an outcome.
          const promise = Promise.resolve().then(() => dispatchWire(catalog, [schedule.verb], JSON.stringify(schedule.input ?? {}), {
            subject: schedule.account,
            caller: Object.freeze({ transport: "clock", schedule: schedule.id, occurrence, attempt }),
            now: () => now,
            witness: journalRpcWitness(binding.dataRoot),
            coordinate: processLeaseCoordinator(binding.dataRoot),
          }, authorize()))
            .then((result) => ({ schedule: schedule.id, occurrence, attempt, verb: schedule.verb, account: schedule.account, ranAt: now, ok: result.code === 0, ...(result.code === 0 ? {} : { error: result.stderr.trim().slice(0, 2000) }) }))
            .catch((error) => ({ schedule: schedule.id, occurrence, attempt, verb: schedule.verb, account: schedule.account, ranAt: now, ok: false, error: `run-due attempt rejected: ${error instanceof Error ? error.message : String(error)}`.slice(0, 2000) }))
            .then((outcome) => {
              try { recordOutcome(binding, schedule, outcome); } catch (error) { process.stderr.write(`[recurring] failed to record outcome for ${schedule.id}#${occurrence}.${attempt}: ${error instanceof Error ? error.message : String(error)}\n`); }
            })
            .finally(() => inFlight.delete(key));
          inFlight.set(key, { dataRoot: binding.dataRoot, schedule: schedule.id, occurrence, attempt, startedAt, promise });
          return { schedule: schedule.id, occurrence, attempt, startedAt };
        });
        const stillInFlight = inFlightFor(binding.dataRoot).map(({ schedule, occurrence, attempt, startedAt }) => ({ schedule, occurrence, attempt, startedAt }));
        return JSON.parse(JSON.stringify({ kind: "metroplat.clock.tick", now, started, inFlight: stillInFlight }));
      },
    }),
  ]);
}
