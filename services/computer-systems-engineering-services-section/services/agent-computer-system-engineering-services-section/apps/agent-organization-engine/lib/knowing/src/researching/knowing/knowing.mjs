/**
 * knowing — SettledResearch → Knowledge: the static ≤_k reading of a research act.
 *
 * Nested directly under researching (a sibling derivative to introducing).
 * Knowledge is "how much has been settled" — the bilattice knowledge order ≤_k.
 * This reads the research act's settled codomain: its closure regime and on-shell
 * judgment (whether it factors through a C-coalgebra, i.e. is certified) together
 * with the relations it actually settled — the firings of the settlement filtration.
 */
import { firings } from "@red-cup-engineering/signcraft/settle";
import { certified } from "../researching.mjs";

/** The knowledge carrier: the static ≤_k reading of a settled research act. */

/** know : SettledResearch → Knowledge. */
export function knowing(research) {
  return Object.freeze({
    kind: "knowing.knowledge",
    research,
    regime: research.regime,
    certified: certified(research),
    settled: firings(research.settlement),
  });
}
