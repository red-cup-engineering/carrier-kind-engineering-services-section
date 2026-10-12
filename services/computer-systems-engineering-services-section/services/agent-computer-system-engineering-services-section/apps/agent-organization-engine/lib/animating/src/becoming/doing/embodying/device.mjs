/**
 * device — an embodied participant whose actuate and observe bind to a driver.
 *
 * "The actuator/sensor pair is the agent's body" (engineering note 2026-06-05, seam: bodies &
 * actuators). A printer, a valve and an LLM harness are one kind of thing: they share the handedness
 * h = (recv, send, actuate, observe) and differ only in what each coordinate binds to. A device binds
 * actuate and observe to a DRIVER, the world adapter:
 *
 *   effect(intent) → reads   perform `{ action, object, value }`, return the sensor reads it caused
 *   sense?()       → reads   poll the sensors without acting
 *
 * where a read is `{ reading, object, ok?, by? }` and `ok: false` reports the converse.
 *
 * A device is held as three FOUR-valued fields of cells, each cell keyed by (mark, object) and carrying
 * the testimony of every witness that deposited on it:
 *
 *   - INTENT: what the device was told to do (its actuate deposits), the model of it;
 *   - STATE: what its sensors report (its own observe deposits), the world's reading of it;
 *   - SAFETY: per sector, whether it is clear to act there.
 *
 * A cell's reading is the knowledge join of its standing testimony: an affirmation is t, a denial f, and
 * two witnesses disagreeing hold ⊤ — surfaced, never collapsed. A witness's retraction is a governance
 * act that withdraws its testimony, so a held cell settles again; nothing is overwritten.
 *
 * SAFETY is a Π₁ condition of meaningful human control (the safety-envelope precheck), so the gate is
 * the truth meet of the safety cells: actuation is admitted only at t. A contradicted sector refuses as ⊤
 * (held, recoverable), a denied one as f; the refusal is the verdict, and the driver is never effected.
 *
 * `diff` reads INTENT against STATE: an intended mark the world confirms has converged, one it reports
 * the converse of is contradicted, one with no report is unconfirmed. A divergence is the local
 * obstruction, not an error.
 *
 * Every step is linear: it consumes a device and returns the next one. Where the cells persist is the
 * caller's (a journal, a chain); this module holds no store.
 */
import { createHash } from "node:crypto";

import { knowledgeJoinAll, truthMeetAll } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { canonical } from "@red-cup-engineering/json-services-section";

import { handedness } from "./handedness.mjs";

const keyOf = (mark, object) => JSON.stringify([mark, object ?? null]);
const reads = (value) => (Array.isArray(value) ? value.filter((read) => read && typeof read.reading === "string" && read.reading.length > 0) : []);

/** A field's cells after `by` testifies `face` (t `potential` or f `active`) on (mark, object), or
 *  withdraws its testimony (`face` undefined). */
function testify(field, mark, object, by, face) {
  const key = keyOf(mark, object);
  const prior = field[key]?.testimony ?? {};
  const { [by]: _withdrawn, ...rest } = prior;
  const testimony = face === undefined ? rest : { ...rest, [by]: face };
  const { [key]: _old, ...others } = field;
  return Object.keys(testimony).length === 0 ? Object.freeze(others)
    : Object.freeze({ ...others, [key]: Object.freeze({ mark, object: object ?? null, testimony: Object.freeze(testimony) }) });
}

/** One cell's reading: the knowledge join of its standing testimony. */
const cellReading = (cell) => knowledgeJoinAll(Object.values(cell.testimony));

/** A field read: each cell with its reading, and the cells held at ⊤. */
export function fieldReading(field) {
  const cells = Object.values(field).map((cell) => Object.freeze({ mark: cell.mark, object: cell.object, reading: cellReading(cell), witnesses: Object.freeze(Object.keys(cell.testimony).sort()) }));
  return Object.freeze({ cells: Object.freeze(cells), contradicted: Object.freeze(cells.filter((cell) => cell.reading === "stable")) });
}

/** A device: `name`, its `driver`, and its three fields (empty unless resumed from `fields`). */
export function device(name, driver, fields = {}) {
  if (typeof name !== "string" || name.length === 0) throw new TypeError("device: name is required");
  if (!driver || typeof driver.effect !== "function") throw new TypeError("device: a driver with effect(intent) → reads is required");
  return Object.freeze({
    kind: "animating.device", name, driver,
    intent: Object.freeze({ ...fields.intent }), state: Object.freeze({ ...fields.state }), safety: Object.freeze({ ...fields.safety }),
  });
}

const next = (d, fields) => Object.freeze({ ...d, ...fields });

/** Deposit a safety verdict on a sector: `clear` true affirms it safe to act there, false denies it. */
export const markSafety = (d, sector, by, clear = true) => next(d, { safety: testify(d.safety, "clear", sector, by, clear ? "potential" : "active") });

/** Withdraw a witness's safety verdict on a sector: the governance act that lets a held sector settle. */
export const retractSafety = (d, sector, by) => next(d, { safety: testify(d.safety, "clear", sector, by, undefined) });

/** The safety gate: the truth meet of the safety cells, admitting actuation only at t. */
export function safetyGate(d) {
  const { cells, contradicted } = fieldReading(d.safety);
  const reading = truthMeetAll(cells.map((cell) => cell.reading));
  const refusing = cells.filter((cell) => cell.reading !== "potential").map((cell) => Object.freeze({ sector: cell.object, reading: cell.reading }));
  return Object.freeze({
    kind: "animating.device.safety", device: d.name, reading, admitted: reading === "potential",
    refusing: Object.freeze(refusing), contradicted: Object.freeze(contradicted.map((cell) => cell.object)),
  });
}

/** The state field after the device's own sensor reads: a read that is not ok deposits the denial. */
const sensed = (state, name, list) => list.reduce((field, read) => testify(field, read.reading, read.object ?? null, read.by ?? name, read.ok === false ? "active" : "potential"), state);

/**
 * Player side: act. The gate is consulted first; refused, the driver is never effected and the device
 * is returned unchanged with the verdict. Admitted, the intent is deposited, the driver effects it, and
 * the reads it returns are deposited on STATE as the device's own marks.
 */
export function actuate(d, intent = {}) {
  const { action, object = null, value } = intent;
  if (typeof action !== "string" || action.length === 0) throw new TypeError("actuate: intent.action is required");
  const gate = safetyGate(d);
  if (!gate.admitted) return Object.freeze({ device: d, verdict: Object.freeze({ kind: "animating.device.actuate", device: d.name, admitted: false, effected: false, gate }) });
  const told = testify(d.intent, action, object, intent.by ?? d.name, "potential");
  const caused = reads(d.driver.effect({ action, object, value }));
  const after = next(d, { intent: told, state: sensed(d.state, d.name, caused) });
  return Object.freeze({ device: after, verdict: Object.freeze({ kind: "animating.device.actuate", device: d.name, admitted: true, effected: true, gate, intent: Object.freeze({ action, object, value: value ?? null }), reads: Object.freeze(caused) }) });
}

/** Opponent side: perceive. Polls the driver's sensors when it has any, then reads STATE. */
export function observe(d) {
  const polled = typeof d.driver.sense === "function" ? reads(d.driver.sense()) : [];
  const after = polled.length === 0 ? d : next(d, { state: sensed(d.state, d.name, polled) });
  return Object.freeze({ device: after, state: fieldReading(after.state) });
}

/** INTENT read against STATE, without polling: converged, contradicted or unconfirmed per intended mark. */
export function diff(d) {
  const state = new Map(fieldReading(d.state).cells.map((cell) => [keyOf(cell.mark, cell.object), cell]));
  const intended = fieldReading(d.intent).cells;
  const divergences = intended.flatMap((cell) => {
    const world = state.get(keyOf(cell.mark, cell.object));
    if (world === undefined) return [{ action: cell.mark, object: cell.object, kind: "unconfirmed" }];
    if (world.reading === "potential") return [];
    return [{ action: cell.mark, object: cell.object, kind: world.reading === "stable" ? "contested" : "contradicted" }];
  });
  const held = fieldReading(d.state).contradicted;
  return Object.freeze({
    kind: "animating.device.diff", device: d.name, intended: intended.length, reported: state.size,
    divergences: Object.freeze(divergences.map((x) => Object.freeze(x))), contradicted: held,
    converged: divergences.length === 0 && held.length === 0,
  });
}

/**
 * The device's handedness now: it receives intents and reports its reads (recv, send), observes through
 * its sensors, and actuates as its safety gate reads — t admitted, ⊤ held, f denied.
 */
export const deviceHandedness = (d) => handedness({ recv: "potential", send: "potential", actuate: safetyGate(d).reading, observe: "potential" });

/** The fields to persist: everything but the driver, which is the world binding and rebinds on resume. */
export const deviceFields = (d) => Object.freeze({ intent: d.intent, state: d.state, safety: d.safety });

/** The hash of the fields to persist, canonical JSON under sha256: what a journal holding the device
 *  must reproduce for a resume to recover it byte-identically (falsifiable agency's persistent state). */
export const deviceStateHash = (d) => createHash("sha256").update(canonical(deviceFields(d))).digest("hex");

// Simulated drivers: in-memory worlds a real transport (serial, G-code, GPIO) replaces with the same
// interface. Each effect confirms the action it was given (on the intent's own mark, so `diff` can read
// it) and returns what its sensors then report.

/** A printer: actuate binds to heating, moving and printing; observe to nozzle temperature and position. */
export function simulatedPrinterDriver(init = {}) {
  const world = { nozzleTemp: init.nozzleTemp ?? 20, position: init.position ?? "home", printing: false };
  const sensors = () => [{ reading: "nozzle-at-temp", object: "nozzle", ok: world.nozzleTemp >= 180 }, { reading: "at-position", object: world.position, ok: true }];
  return Object.freeze({
    kind: "animating.driver.simulated.printer",
    effect({ action, object, value }) {
      let took = true;
      if (action === "heat-nozzle") { world.nozzleTemp = Number(value ?? 200); took = world.nozzleTemp >= 180; }
      else if (action === "move") world.position = object ?? "origin";
      else if (action === "print") { took = world.nozzleTemp >= 180; world.printing = took; }
      else if (action === "stop") world.printing = false;
      return [{ reading: action, object, ok: took }, ...sensors()];
    },
    sense: sensors,
  });
}

/** A valve: actuate binds to open and close; observe to a flow sensor. A stuck valve does not follow the
 *  command: it reports the command as not taken, and `diff` shows the intent contradicted. */
export function simulatedValveDriver(init = {}) {
  const world = { open: init.open ?? false, stuck: init.stuck ?? false };
  const sensors = () => [{ reading: "flowing", object: "line", ok: world.open }];
  return Object.freeze({
    kind: "animating.driver.simulated.valve",
    effect({ action, object }) {
      const want = action === "open" ? true : action === "close" ? false : world.open;
      if (!world.stuck) world.open = want;
      return [{ reading: action, object, ok: world.open === want }, ...sensors()];
    },
    sense: sensors,
  });
}
