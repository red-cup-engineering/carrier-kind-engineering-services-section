/**
 * multi-agent-arena — gaming as scale-2 playing (CGS with symmetry).
 *
 * gaming is `@red-cup-engineering/playing` lifted to the multi-agent FSym(𝔸) level.
 * The primary operations are:
 *   - lift: Design → { arena, plays, report }  (the playing ↪ gaming inclusion)
 *   - compose: the HO cut ‖ + interface hiding  → { composite, interface, converged }
 *   - parallel: the tensor ‖  → the interaction normal form
 */
import {
  liftAction,
  composeAction,
  interactAction,
  parallelAction,
} from "@red-cup-engineering/gaming";
import { designAction, dualizeAction } from "@red-cup-engineering/playing/actions";

// ── designs: the single-agent proof-forests ───────────────────────────────────────
// designAction takes act: "proponent" | "opponent" | "daimon" → mapped to reading
const P = designAction.execute({ entries: [{ locus: [], act: "proponent" }] }, {});
const O = dualizeAction.execute(P, {});
console.log("P reading:", P.entries[0].reading); // "potential" (proponent ↦ potential)
console.log("O reading:", O.entries[0].reading); // "active"    (opponent ↦ active)

// ── lift: the playing ↪ gaming inclusion (Design → Strategy) ─────────────────────
// At trivial symmetry (no demo/arena), the strategy coincides with the input Design
const lifted = liftAction.execute({ design: P }, {});
console.log("lift.report.wellFormed:", lifted.report.wellFormed); // true
console.log("lift.plays:", lifted.plays.length);  // 1 (the root play)
console.log("lift.designs:", lifted.designs.length); // round-trip: 1

// ── compose: the HO cut ‖ + interface hiding ─────────────────────────────────────
// compose takes { designA, designB } and computes the composite + hidden interface
const comp = composeAction.execute({ designA: P, designB: O }, {});
console.log("compose.converged:", comp.converged);   // true when the composite converges
console.log("compose.composite:", JSON.stringify(comp.composite).slice(0, 80));

// non-dual cuts don't converge
const sameComp = composeAction.execute({ designA: P, designB: P }, {});
console.log("same-polarity compose.converged:", sameComp.converged); // false

// ── parallel: the tensor product ‖ (the ⊗ of playing lifted to multi-agent) ───────
// parallel takes { designA, designB } and returns the interaction normal form
const par = parallelAction.execute({ designA: P, designB: O }, {});
console.log("parallel daimonLoci:", par.daimonLoci); // [[]] (root locus daimonized)
console.log("parallel normalForm:", par.normalForm.entries[0]?.reading); // "stable"

// ── interact: gaming's cut — same as parallel (the ‖ computation) ────────────────
const interaction = interactAction.execute({ designA: P, designB: O }, {});
console.log("interact meetings:", interaction.meetings.length);
console.log("interact daimonized:", interaction.meetings[0]?.daimonized); // true

// ── equivariance: a lifted Design is closed under trivial symmetry ───────────────
// lifted.plays = the Design's chronicles lifted onto the arena (trivial symmetry → 1 play)
console.log("plays (trivial symmetry):", lifted.plays.length); // 1
