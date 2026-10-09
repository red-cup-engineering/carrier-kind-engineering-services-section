/** Strategy equivariance under finite name permutations: the AGMOS morphism cut. */
import { strategy, symmetryInvarianceJudgment } from "../strategizing/strategy.mjs";
import { nominalArenaJudgment } from "./arena.mjs";
import { } from "./action.mjs";
import { } from "./permutation.mjs";

/**
 * Judge whether a strategy is FSym-equivariant for the supplied finite
 * permutation generators. This reuses the CGS symmetry-invariance law by first
 * installing the generated FSym actions into the arena symmetry groupoid.
 */
export function nominalEquivarianceJudgment(
  s,
  labels,
  permutations,
) {
  const nominalArena = nominalArenaJudgment(s.arena, labels, permutations);
  if (nominalArena.kind !== "game.nominal.arena:witness") {
    return Object.freeze({ kind: "game.nominal.equivariance-obstruction", nominalArena });
  }
  const enriched = strategy(nominalArena.arena, s.plays);
  const symmetryInvariance = symmetryInvarianceJudgment(enriched);
  return symmetryInvariance.kind === "game.strategy.symmetryInvariance:witness"
    ? Object.freeze({ kind: "game.nominal.equivariance:witness", nominalArena, symmetryInvariance })
    : Object.freeze({ kind: "game.nominal.equivariance-obstruction", symmetryInvariance });
}

