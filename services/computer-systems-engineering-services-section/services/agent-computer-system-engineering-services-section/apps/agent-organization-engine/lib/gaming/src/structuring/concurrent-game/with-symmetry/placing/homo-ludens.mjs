/**
 * Homo ludens — the player IS magic-circle participation (Huizinga 1938).
 *
 * Huizinga's *Homo Ludens* names the human as the *playing* animal; the corpus
 * (homo-ludens journal, 2026-05-24) lifts this from a species claim to a
 * structural one: "any entity participating in cultural-ludic structures is
 * participating in the predication-fiber algebra qua ludic substrate" — the
 * player is *defined* by participation in a magic circle, not the other way
 * round.
 *
 * Here that structural claim is realized minimally and concretely.  A *player*
 * is a design (its commitments — `@emsenn/game-algebra`) together with the
 * magic circle it enters.  It is a genuine player — exhibits the *Homo ludens
 * characterization* — exactly when it actually participates: its support
 * commits inside the circle.  A design that commits only outside the circle is
 * a spectator, not a player; the empty design is no player at all.
 *
 * The deeper paidia-substrate / rule-accumulation machinery (HL1–HL3 of the
 * journal) lives in the closure engine of `@emsenn/game-topology`, not here;
 * this module realizes only the magic-circle-participation criterion, which is
 * the geometric heart of the thesis ("the player IS defined by magic-circle
 * participation").
 */
import { locusFromKey } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";
import { support, supportKeys } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/design";
import {

} from "./magic-circle.mjs";

/** A player carrier: a design entering a magic circle. */
export function player(design, circle) {
  return Object.freeze({ kind: "game-geometry.player", design, circle });
}

/**
 * The loci at which a player commits *inside* the circle — the participation
 * support.  A locus participates when its key matches an in-play event id of
 * the circle (the design's loci are addressed by the same keys as the arena's
 * events in the ludics correspondence).
 */
export function participationLoci(p) {
  const inside = new Set(p.circle.inside);
  return Object.freeze(supportKeys(p.design).filter((key) => inside.has(key)).map((key) => locusFromKey(key)));
}

  

/**
 * Judge whether the player exhibits the *Homo ludens characterization*: it has
 * commitments, and at least one of them lands inside the magic circle.  The
 * player IS its participation — a design committing only outside the circle is
 * a spectator (obstruction `no-inside-participation`); the empty design is no
 * player (obstruction `no-commitments`).
 */
export function homoLudensJudgment(p) {
  if (support(p.design).length === 0) {
    return Object.freeze({
      kind: "game-geometry.homoLudens-obstruction",
      reason: "no-commitments",
    });
  }
  const participation = participationLoci(p);
  if (participation.length === 0) {
    return Object.freeze({
      kind: "game-geometry.homoLudens-obstruction",
      reason: "no-inside-participation",
    });
  }
  return Object.freeze({ kind: "game-geometry.homoLudens:witness", participation });
}

/** Whether the player is a genuine player — participates inside the circle. */
export const isPlayer = (p) =>
  homoLudensJudgment(p).kind === "game-geometry.homoLudens:witness";

export function isPlayerCarrier(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game-geometry.player"
    && typeof candidate.design === "object" && candidate.design !== null
    && typeof candidate.circle === "object" && candidate.circle !== null;
}
