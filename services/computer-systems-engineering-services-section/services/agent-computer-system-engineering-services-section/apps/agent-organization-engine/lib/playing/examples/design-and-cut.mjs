/**
 * design-and-cut — playing as *-autonomous interaction.
 *
 * The Design carrier is a reading-valuation over loci (proof-trees in the ludics
 * sense). The characteristic morphism is interact: Design ⊗ Design^⊥ → Interaction,
 * converging to the Daimon ⊤ when the two designs are dual.
 */
import { designAction, dualizeAction, interactAction } from "../src/actions.mjs";
import { atom, up, down } from "../src/structuring/concurrent-game/with-symmetry/ludicizing/proving/proposition.mjs";

// ── design: a reading-valuation over loci ─────────────────────────────────────────
const P = designAction.execute({ entries: [{ locus: [], act: "proponent" }] }, {});
console.log("P reading:", P.entries[0].reading); // "potential" (proponent ↦ potential)

// ── dualize: the polarity involution A^⊥ ─────────────────────────────────────────
const O = dualizeAction.execute(P, {});
console.log("O reading:", O.entries[0].reading); // "active" (opponent ↦ active)

// involution: dualizing twice is the identity
const backToP = dualizeAction.execute(O, {});
console.log("involution holds:", backToP.entries[0].reading === P.entries[0].reading); // true

// ── THE CUT: interact of dual designs converges to the Daimon ⊤ ─────────────────
const cut = interactAction.execute({ designA: P, designB: O }, {});
console.log("daimonized:", cut.meetings[0]?.daimonized);  // true
console.log("joined:", cut.meetings[0]?.joined);          // "stable" (potential ⊔_k active = ⊤)
console.log("normal form:", cut.normalForm.entries[0].reading); // "stable"

// ── a non-dual cut does NOT reach the Daimon ─────────────────────────────────────
const nonCut = interactAction.execute({ designA: P, designB: P }, {});
console.log("non-dual daimon loci:", nonCut.daimonLoci); // [] (no convergence)

// ── propositions: the logic layer ────────────────────────────────────────────────
const a = atom("p");
const plus  = up(atom("p"), atom("q"));   // ⊕ (disjunction / additive or)
const times = down(atom("p"), atom("q")); // ⊗ (tensor / multiplicative and)
console.log("proposition atom:", a.connective);    // "atom"
console.log("plus connective:", plus.connective);  // "plus"
console.log("times connective:", times.connective); // "times"
