// device-character — a DEVICE is the SAME embodied-participant object as an LLM agent, differing only
// in what its actuate/observe coordinates bind to.
//
// THE SEAM (docs/dev/notes/2026-06-05-seam-bodies-actuators.md). Embodied handedness is a four-tuple
// h(d) = (recv, send, actuate, observe) — each coordinate bounded — and it is GENERIC over any embodied
// participant d, not LLM-specific (theories/.../you-are-in-a-drone-swarm.md:35,37;
// computer/docs/dev/notes/agentic-drone-swarm-systems.md:70-80). So a 3D printer and an LLM agent are
// two points in one space of embodied participants: they share recv/send/actuate/observe and differ
// only in what each coordinate BINDS to. This module realizes that as ONE object — deviceCharacter —
// whose actuate/observe bind to a pluggable DRIVER (the effect-the-world adapter). Swap the driver and
// you have a different participant; the object is identical.
//
// HOW IT LANDS ON THE SUBSTRATE this repo derives (NOT mapped onto any agent-framework prior):
//   - A device holds two predication graphs on a DEVICE SUB-ROOT (the synthetic-world discipline,
//     src/synthetic-world.mjs:10-12,149 — a device never touches live swarm memory):
//       INTENT graph — what a worker told the device to do (the device's actuate deposits), and
//       STATE  graph — what the device's sensors report (the device's own observe deposits).
//   - actuate(intent) is a stigmergy DEPOSIT (src/stigmergy.mjs:37): it appends the intent cell, then
//     invokes driver.effect(intent) and deposits whatever the driver reports as the new world reading
//     back onto the STATE graph — the device is a participant depositing its OWN sensor marks. No
//     message bus (agentic-drone-swarm-systems.md:91-96).
//   - observe() is a stigmergy SENSE (src/stigmergy.mjs:53): the device's section of its own sensor
//     deposits, each with charge/value(FOUR)/contradicted. Two sensors disagreeing fold to HELD-⊤.
//   - SAFETY is the held-⊤ gate (src/safety-cohomology.mjs:118 dispatchGate): actuate consults safety
//     FIRST and REFUSES (returns the ⊤ verdict, never effects the driver) while a device safety cell is
//     held-⊤. This is MHC condition (2), the safety-envelope precheck — the bilattice-meet of Π₁
//     conditions (computer/docs/dev/notes/swarm-governance.md:122). The refusal is ⊤, surfaced, never
//     a silent deny.
//   - diff() is the synthetic-world diff: INTENT vs STATE cells the swarm MODELS one way the world
//     reports another. A divergence is not an error; it is the local obstruction.
//
// It re-uses the VERIFIED synthetic-world primitives (depositSafety/retractSafety/obstructionMeasure
// over a sub-root) for the safety graph, and stigmergy deposit/sense for the intent/state graphs. It
// owns NO algebra — the fold is the substrate's settle, the gate is safety-cohomology.

import { deposit, sense } from "./stigmergy.mjs";
import { depositSafety, retractSafety, obstructionMeasure } from "./synthetic-world.mjs";

// A device lives under its own sub-root so it never touches live swarm memory (the synthetic-world
// discipline, synthetic-world.mjs:149). Fields are namespaced per device so two devices never share a
// stigmergy field.
function deviceRoot(root, name) {
  return `${root}/devices/${name}`;
}
const INTENT = (name) => `device/${name}/intent`;
const STATE = (name) => `device/${name}/state`;
const SAFETY = (name) => `device/${name}/safety`;

// A DRIVER is the binding of actuate/observe to the world. The interface is two methods:
//   effect(intent) -> [{ reading, object, ok?, by? }, ...]  — perform the intent, return sensor reads
//   sense?()       -> [{ reading, object }, ...]             — (optional) poll sensors with no actuation
// The seed ships SIMULATED drivers (a printer, a valve). A real transport (serial/gcode, GPIO) is a
// drop-in: same interface, real effect. NOTE (lead): a real transport is a new dependency — proper
// pnpm, no symlink hacks; the seed is simulated only.
const isReads = (x) => Array.isArray(x);

// deviceCharacter(root, name, driver, opts) — the device as an embodied participant.
export function deviceCharacter(root, name, driver, opts = {}) {
  if (typeof root !== "string" || !root) throw new TypeError("deviceCharacter: root (string) is required");
  if (typeof name !== "string" || !name) throw new TypeError("deviceCharacter: name (string) is required");
  if (!driver || typeof driver.effect !== "function") {
    throw new TypeError("deviceCharacter: driver with effect(intent)->reads is required");
  }
  const dRoot = deviceRoot(root, name);
  const intentField = INTENT(name);
  const stateField = STATE(name);
  const safetyField = SAFETY(name);
  const criticalSectors = opts.criticalSectors;

  // safety() — the held-⊤ dispatch gate over the device's SAFETY field. obstructionMeasure folds the
  // safety field's raw trace under the converse (clear / not-clear) and counts held-⊤ cells; the gate
  // REFUSES while any held-⊤ stands. Returns { admitted, value, contested } — value "stable" is a refusal.
  function safety() {
    const measure = obstructionMeasure(dRoot, [safetyField], {});
    const admitted = !measure.obstructed;
    return Object.freeze({
      kind: "swarm.device.safety",
      device: name,
      admitted,
      value: admitted ? "potential" : "stable", // ⊤ refusal, surfaced — never a silent deny (safety-cohomology.mjs:122)
      contested: measure.contradicted, // the held-⊤ safety cells, recoverable
      reason: admitted
        ? "device safety field holds no contradiction — actuation admitted"
        : `device safety REFUSED: ${measure.count} held-⊤ cell(s) on the device safety field.`,
    });
  }

  // depositSafetyMark(sector, by, affirm) — a worker (or the device) deposits a safety verdict on a
  // sector. Two opposite verdicts on one sector fold to held-⊤ and REFUSE actuation. This is the
  // safety-envelope precheck surface (MHC Π₁ condition 2).
  function depositSafetyMark(sector, by, affirm = true) {
    return depositSafety(dRoot, safetyField, sector, by, { affirm });
  }
  // resolveSafety(sector, by) — a GOVERNANCE act: retract the denial face so the cell settles and the
  // gate re-admits. Append-only (a tombstone), per synthetic-world.mjs:195-203. The ⊤ was held the
  // whole time; the resolving act makes it settle.
  function resolveSafety(sector, by) {
    return retractSafety(dRoot, safetyField, sector, by, {});
  }

  // actuate(intent) — Player-side move. intent = { action, object, value?, by? }.
  //   1. SAFETY FIRST: consult safety(); if refused, return the ⊤ gate verdict and DO NOT effect the
  //      driver. The actuation is held, surfaced, never silently dropped.
  //   2. DEPOSIT the intent onto the INTENT graph (the swarm's model of what the device should do).
  //   3. EFFECT it in the world (driver.effect) and DEPOSIT the resulting sensor reads onto the STATE
  //      graph — the device is a participant depositing its own sensor marks.
  function actuate(intent = {}) {
    const action = intent.action;
    const object = intent.object ?? null;
    const by = intent.by ?? name;
    if (!action) throw new TypeError("actuate: intent.action is required");

    const gate = safety();
    if (!gate.admitted) {
      return Object.freeze({ kind: "swarm.device.actuate", device: name, admitted: false, gate, effected: false });
    }

    // 2. the intent cell — what the swarm MODELS the device doing.
    const intentTrace = deposit(dRoot, intentField, action, object, by, { value: intent.value });

    // 3. effect it; the driver returns the sensor reads the device then deposits as ITS OWN marks.
    const reads = driver.effect({ action, object, value: intent.value });
    const stateDeposits = [];
    if (isReads(reads)) {
      for (const r of reads) {
        const mark = r.reading;
        if (!mark) continue;
        // a sensor read that DENIES (ok:false) deposits the converse face `not-<mark>`; two reads
        // disagreeing on one (mark,object) fold to held-⊤, surfaced not collapsed.
        const face = r.ok === false ? `not-${mark}` : mark;
        stateDeposits.push(deposit(dRoot, stateField, face, r.object ?? object, r.by ?? name, {}));
      }
    }

    return Object.freeze({
      kind: "swarm.device.actuate",
      device: name,
      admitted: true,
      gate,
      effected: true,
      intent: { action, object, value: intent.value ?? null, by },
      intentTrace,
      stateDeposits,
    });
  }

  // observe() — Opponent-side coordinate: fold the device's STATE field (its sensor deposits). Returns
  // the stigmergy sense — each sensor mark's settled charge, FOUR value, and contradiction flag. Two
  // sensors disagreeing on one reading surface here as held-⊤, never collapsed. If the driver exposes a
  // sense() poll, deposit those reads first so observe reflects a fresh poll.
  function observe() {
    if (typeof driver.sense === "function") {
      const polled = driver.sense();
      if (isReads(polled)) {
        for (const r of polled) {
          if (!r.reading) continue;
          const face = r.ok === false ? `not-${r.reading}` : r.reading;
          deposit(dRoot, stateField, face, r.object ?? null, r.by ?? name, {});
        }
      }
    }
    return sense(dRoot, stateField);
  }

  // diff() — the synthetic-world diff: INTENT vs STATE. For each intent mark the swarm deposited, find
  // the matching state mark the device's sensors reported on the same object; a divergence is a cell
  // the swarm MODELS one way (intent) the world reports another (state, or its converse), or a model
  // cell with no world report at all (a gap — the device never confirmed). Held-⊤ on EITHER graph is
  // surfaced as a contradiction. This is the device-state-as-predication-graph diffed against the
  // swarm's model of it.
  function diff() {
    const intent = sense(dRoot, intentField);
    const state = observe();
    const stateBy = new Map();
    for (const m of state.marks) stateBy.set(`${m.mark}|${m.object}`, m);

    const divergences = [];
    for (const im of intent.marks) {
      const key = `${im.mark}|${im.object}`;
      const matched = stateBy.get(key);
      const converse = stateBy.get(`not-${im.mark}|${im.object}`);
      if (converse) {
        divergences.push({ action: im.mark, object: im.object, kind: "contradicted", note: "world reports the converse face — held-⊤ if both stand" });
      } else if (!matched) {
        divergences.push({ action: im.mark, object: im.object, kind: "unconfirmed", note: "swarm models this intent; no sensor read confirms it" });
      }
    }
    return Object.freeze({
      kind: "swarm.device.diff",
      device: name,
      intentMarks: intent.marks.length,
      stateMarks: state.marks.length,
      contradictedState: state.contradictedMarks, // held-⊤ on the STATE graph, never collapsed
      divergences,
      converged: divergences.length === 0 && state.contradictedMarks.length === 0,
    });
  }

  return Object.freeze({
    kind: "swarm.device",
    name,
    root: dRoot,
    fields: Object.freeze({ intent: intentField, state: stateField, safety: safetyField }),
    actuate,
    observe,
    diff,
    safety,
    depositSafetyMark,
    resolveSafety,
  });
}

// ── SIMULATED DRIVERS (the seed ships these; a real serial/gcode/GPIO transport is a drop-in) ────────

// simulatedPrinterDriver — actuate binds to gcode-ish actions on a nozzle/bed; observe to temp/position
// sensors. effect performs the action and returns the resulting sensor reads. Pure in-memory model.
export function simulatedPrinterDriver(init = {}) {
  const stateModel = { nozzleTemp: init.nozzleTemp ?? 20, bedTemp: init.bedTemp ?? 20, position: init.position ?? "home", printing: false };
  return {
    kind: "driver.simulated.printer",
    effect({ action, object, value }) {
      switch (action) {
        case "heat-nozzle": stateModel.nozzleTemp = Number(value ?? 200); return [{ reading: "nozzle-at-temp", object: "nozzle", ok: stateModel.nozzleTemp >= 180 }];
        case "move": stateModel.position = object ?? "origin"; return [{ reading: "at-position", object: stateModel.position, ok: true }];
        case "print": stateModel.printing = true; return [{ reading: "printing", object: object ?? "job", ok: stateModel.nozzleTemp >= 180 }];
        case "stop": stateModel.printing = false; return [{ reading: "printing", object: object ?? "job", ok: false }];
        default: return [{ reading: action, object, ok: true }];
      }
    },
    sense() {
      return [
        { reading: "nozzle-at-temp", object: "nozzle", ok: stateModel.nozzleTemp >= 180 },
        { reading: "at-position", object: stateModel.position, ok: true },
      ];
    },
    _model: stateModel,
  };
}

// simulatedValveDriver — actuate binds to open/close on an irrigation valve; observe to a flow sensor.
// A FAULT (init.stuck=true) makes the valve fail to follow the command: it reports the converse of the
// commanded state, so the device's own STATE graph holds the disagreement and diff surfaces it.
export function simulatedValveDriver(init = {}) {
  const stateModel = { open: init.open ?? false, stuck: init.stuck ?? false };
  return {
    kind: "driver.simulated.valve",
    effect({ action, object }) {
      const want = action === "open" ? true : action === "close" ? false : stateModel.open;
      if (!stateModel.stuck) stateModel.open = want;
      // flow follows the ACTUAL valve position, not the command; a stuck valve reports the converse.
      const flowing = stateModel.open;
      return [{ reading: "flowing", object: object ?? "line", ok: flowing === want ? flowing : !want }];
    },
    sense() {
      return [{ reading: "flowing", object: "line", ok: stateModel.open }];
    },
    _model: stateModel,
  };
}
