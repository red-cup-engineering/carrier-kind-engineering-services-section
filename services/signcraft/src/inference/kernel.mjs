// One face for the kernel: build a machine from witnessed incidence, then
// comprehend (settle with receipt), generate (wit-logged Gibbs over the
// enabled cone), learn (Physarum adaptation from settlement flux), and
// evaluate (masked-incidence). Composition point only; the laws live in
// the sibling modules.

import { makeContext, lawfulBasis } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle } from "./nuclei.mjs";
import { makeComplex } from "./complex.mjs";
import { generate as gibbsGenerate, enabledMoves } from "./generate.mjs";
import { fluxFromTrace, adapt } from "./adapt.mjs";
import { isReading } from "@red-cup-engineering/computer-data-services-section/four";

export * from "@red-cup-engineering/metrologic/closure/formal-context";
export * from "./nuclei.mjs";
export * from "./complex.mjs";
export * from "./generate.mjs";
export * from "./adapt.mjs";
export * from "./evaluate.mjs";

/**
 * Build a replayable machine-state value.  Its future is advanced only by
 * runMachineAction; it has no methods, clocks, random source, or hidden I/O.
 */
export function makeMachineState({ objects, attributes, incidencePairs, denialPairs = [] }) {
  const ctx = makeContext(objects, attributes, incidencePairs, denialPairs);
  const basis = lawfulBasis(ctx);
  const cx = makeComplex(attributes);
  let v = makeValuation();
  for (const [g, m] of incidencePairs) v = withReading(v, g, m, "potential");
  for (const [g, m] of denialPairs) v = withReading(v, g, m, "active");
  return Object.freeze({ ctx, basis, cx, v, journal: Object.freeze([]) });
}

/**
 * The actor transition.  An action is data and every branch returns a new
 * state plus an explicit result/effect list; no branch mutates the supplied
 * state or reaches for time, randomness, credentials, or I/O.
 */
export function runMachineAction(state, action) {
  if (!action || typeof action !== "object") return refusal(state, "invalid-action", "an action object is required");
  switch (action.kind) {
    case "tell": {
      if (typeof action.object !== "string" || typeof action.attribute !== "string" || !isReading(action.reading)) {
        return refusal(state, "invalid-telling", "tell requires object, attribute, and a reading");
      }
      return accepted({ ...state, v: withReading(state.v, action.object, action.attribute, action.reading) }, { kind: "told" });
    }
    case "settle": {
      const settled = settle(state.ctx, state.v, { ...action.options, basis: state.basis, cx: state.cx });
      const learned = adapt(state.cx, fluxFromTrace(state.ctx, settled.trace), action.adaptation);
      const receipt = Object.freeze({ kind: "settlement", steps: settled.steps, ledger: settled.ledger, adapted: learned.updated.length });
      return accepted(
        { ...state, v: settled.v, cx: learned.complex, journal: Object.freeze([...state.journal, receipt]) },
        { kind: "settled", settlement: settled, adaptation: learned },
      );
    }
    case "questions":
      return accepted(state, { kind: "questions", questions: enabledMoves(state.ctx, state.basis, state.v, action.object).map((m) => m.question) });
    case "generate": {
      if (!Number.isFinite(action.random) || action.random < 0 || action.random >= 1) {
        return refusal(state, "invalid-random", "generate requires random in [0, 1)");
      }
      const generated = gibbsGenerate(state.ctx, state.basis, state.cx, state.v, action.object, { ...action.options, rng: () => action.random });
      const journal = generated.wit ? Object.freeze([...state.journal, generated.wit]) : state.journal;
      return accepted({ ...state, journal }, { kind: "generated", generation: generated });
    }
    default:
      return refusal(state, "unknown-action", `unknown machine action: ${String(action.kind)}`);
  }
}

function accepted(state, result) {
  return Object.freeze({ state: Object.freeze(state), effects: Object.freeze([]), result: Object.freeze(result) });
}

function refusal(state, code, message) {
  return Object.freeze({ state, effects: Object.freeze([]), result: Object.freeze({ kind: "refusal", code, message }) });
}
