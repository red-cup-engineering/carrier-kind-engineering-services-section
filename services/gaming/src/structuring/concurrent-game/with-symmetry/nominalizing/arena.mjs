/** AGMOS nominal arena structure: FSym(A) included in the arena symmetry groupoid. */
import { arena as arenaOf } from "../arena.mjs";
import {
  nominalActionJudgment,

} from "./action.mjs";
import { } from "./permutation.mjs";

/**
 * Add the supplied finite FSym(A) generators to an arena when each generator
 * acts by a valid CGS symmetry.
 */
export function nominalArenaJudgment(
  base,
  labels,
  permutations,
) {
  const actions = [];
  for (const permutation of permutations) {
    const action = nominalActionJudgment(base, labels, permutation);
    if (action.kind !== "game.nominal.action:witness") {
      return Object.freeze({
        kind: "game.nominal.arena-obstruction",
        arena: base,
        labels: Object.freeze([...labels]),
        obstruction: action,
      });
    }
    actions.push(action);
  }
  return Object.freeze({
    kind: "game.nominal.arena:witness",
    arena: arenaOf(base.structure, [...base.symmetry, ...actions.map((action) => action.bijection)]),
    labels: Object.freeze([...labels]),
    actions: Object.freeze(actions),
  });
}

