/**
 * cognizing/attract — [Meme] → knowing/attractor: MEMORY RECALL as ATTRACTOR DYNAMICS.
 *
 * The corpus reads the settling endofunctor as a dynamical system (settling-endofunctor-
 * as-dynamical-system.md). Its standard closure (the closure 2-monad) is monotone,
 * inflationary, and idempotent, so by the no-non-trivial-periodic-orbit theorem
 * (closure-monad-no-non-trivial-periodic-orbits.md) its orbit NEVER cycles — every cue
 * converges to a FIXED-POINT ATTRACTOR. That is exactly the dense-associative-memory /
 * attractor-network account of retrieval (Hopfield): a partial cue settles to the stored
 * pattern it lies in the basin of, and the only open question is the REGIME (does it
 * settle at a bounded ordinal or climb aperiodically forever) and whether the attractor is
 * SPURIOUS (a held contradiction ⊤). `attract` reads a cue (a collection of memes) as that
 * recall: it folds it to its ≤_k closure (the attractor) and reports the recall outcome.
 * The convergence GUARANTEE is the theorem, not a hope — recall cannot oscillate. Total
 * over any collection of memes.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { admitMemes, foldSection, orbitRegime, reflexiveMeme, standingOf } from "./section.mjs";
import { attractorCarrier, memeCollectionCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const MEME_CARRIER_ID = memeCarrier.id;
const ATTRACTOR_CARRIER_ID = "knowing/attractor";

/** The closure regime of the recall orbit over the attractor: settled when no cell is one-sided, and
 *  ruminating (aperiodic) when a one-sided cell is a meme-about-a-meme. The four regimes restricted to
 *  the three reachable over a finite section. */
function regimeOfAttractor(attractor) {
  const oneSided = attractor.filter((m) => ["potential", "active"].includes(standingOf(m)));
  return orbitRegime(oneSided.length === 0, oneSided.some(reflexiveMeme));
}

/** Read a cue's recall as its attractor: the ≤_k fixed point it settles to, with the
 *  dynamical-systems verdict (regime / termination / spuriousness). The orbit is cycle-free
 *  by the no-non-trivial-periodic-orbit theorem, so this always names a genuine attractor. */
export function attractorOf(cue) {
  const attractor = foldSection(cue); // the ≤_k closure = the fixed point (idempotent)
  let settled = 0;
  let spurious = 0;
  for (const m of attractor) {
    const standing = standingOf(m);
    if (standing === "stable") spurious += 1; // ⊤ told-both — a spurious/contradictory attractor
    else if (standing === "potential" || standing === "active") settled += 1; // a clean one-sided memory
  }
  const regime = regimeOfAttractor(attractor);
  const terminates = regime !== "aperiodic";
  return {
    kind: "knowing.attractor",
    cue: cue.length,
    attractor: attractor.length,
    settled,
    spurious,
    regime,
    terminates,
    cycleFree: true, // the no-non-trivial-periodic-orbit theorem: the recall orbit never cycles
    recallable: terminates && spurious === 0, // a clean, fully-recallable stored memory
  };
}

/** attract — settle a cue (a collection of memes) to its memory attractor. */
export const attractAction = operation({
  verb: "attract",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Recall a cue's memory attractor: the fixed-point pattern it settles to (attractor dynamics; cycle-free by the no-periodic-orbit theorem).",
  description: `Domain: an array of meme carriers (${MEME_CARRIER_ID}) or { memes: [...] } — the recall CUE. Codomain: ${ATTRACTOR_CARRIER_ID} — MEMORY RECALL as ATTRACTOR DYNAMICS: the cue settles to its ≤_k fixed-point attractor (the stored pattern it lies in the basin of), exactly the dense-associative-memory / Hopfield account of content-addressable retrieval. The settling is monotone, inflationary, and idempotent, so by the no-non-trivial-periodic-orbit theorem the recall orbit NEVER cycles — it converges to a fixed point (no oscillatory non-recall). Reports the attractor size, the CLEAN (one-sided) vs SPURIOUS (⊤ told-both) recall, the closure REGIME (strict / scott / aperiodic — the never-settling rumination), whether recall terminates, and a clean-recallability verdict. Grounded in settling-endofunctor-as-dynamical-system.md and closure-monad-no-non-trivial-periodic-orbits.md.`,
  domain: memeCollectionCarrier,
  codomain: attractorCarrier,
  run: (input) =>
    jsonResource(attractorOf(admitMemes(input, "attract")), "attractor"),
});
