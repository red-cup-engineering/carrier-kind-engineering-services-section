/**
 * researching — research : Memory → SettledResearch. The base morphism.
 *
 * A directed-relational-research act is `r : X → C Y` with C the settlement
 * comonad: `research` folds a memory's document relations into one settled topology
 * (the settling itself lives in `memory/settleMemoryFiltration`) and reads its closure
 * regime. The codomain `SettledResearch` is the domain of the next morphism,
 * `introducing`. This function is the morphism; nothing wraps it.
 */
import { classify } from "@red-cup-engineering/signcraft/settle";
import { settleMemoryFiltration } from "../memory/carrier.mjs";

/** The settled codomain of `research`: the SignCraft settlement and its regime. */

/** research : Memory → SettledResearch. Null only for an empty memory. */
export function research(memory) {
  const folded = settleMemoryFiltration(memory);
  if (folded === null) return null;
  const regime = classify(folded).regime;
  return Object.freeze({
    kind: "knowing.research.settled",
    settlement: folded,
    regime,
    onShell: regime !== "aperiodic",
  });
}

/** A research act is certified when it is on-shell (factors through a C-coalgebra). */
export function certified(research) {
  return research.onShell;
}
