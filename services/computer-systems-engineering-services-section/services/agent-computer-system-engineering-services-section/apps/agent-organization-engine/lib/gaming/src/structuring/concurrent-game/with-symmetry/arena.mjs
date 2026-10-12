/**
 * Arenas — concurrent game systems *with symmetry*.
 *
 * An arena is the board of a running game: a polarized prime event structure
 * together with a symmetry groupoid.  Symmetry is the feature that promotes
 * plain concurrent games to Castellan-Clairambault-Winskel's $\mathbf{CGS}$ —
 * the unique $*$-autonomous theory of computing.  A *symmetry* is a bijection
 * on events preserving causality, conflict, and polarity; the groupoid of such
 * bijections is what strategy equivalence is taken up to.  When the groupoid
 * contains $\mathrm{FSym}(\mathbb{A})$ (finite permutations of a name set),
 * strategy equivalence becomes nominal equivariance — this is how nominal
 * computation embeds into the theory of computing.
 */
import { causes, conflicts, eventById, eventIds, isPrimeEventStructure } from "@red-cup-engineering/playing/structuring/event/structure";
import { samePolarity } from "@red-cup-engineering/playing/structuring/polarity";

/** A total bijection on event ids, stored as `[from, to]` pairs. */

/** A symmetry groupoid — a set of bijections closed (in intent) under id, inverse, composition. */

export const identityBijection = (structure) =>
  Object.freeze(eventIds(structure).map((id) => Object.freeze([id, id])));

export function arena(structure, symmetry = []) {
  const id = identityBijection(structure);
  const hasIdentity = symmetry.some((bij) => sameBijection(bij, id));
  const groupoid = hasIdentity ? symmetry : [id, ...symmetry];
  return Object.freeze({
    kind: "game.arena",
    structure,
    symmetry: Object.freeze(groupoid.map((bij) => Object.freeze(bij.map((pair) => Object.freeze([pair[0], pair[1]]))))),
  });
}

/** The discrete arena over a polarized prime event structure (only the identity symmetry). */
export const discreteArena = (structure) => arena(structure, []);

export const arenaEvents = (a) => a.structure.events;

const applyBijection = (bij, id) => bij.find((pair) => pair[0] === id)?.[1] ?? null;

function sameBijection(left, right) {
  if (left.length !== right.length) return false;
  return left.every((pair) => right.some((other) => other[0] === pair[0] && other[1] === pair[1]));
}

/**
 * Judge whether a bijection is a symmetry of the arena: total and bijective on
 * events, and preserving polarity, causality, and conflict.
 */
export function symmetryJudgment(a, bij) {
  const ids = eventIds(a.structure);
  const images = new Set();
  for (const id of ids) {
    const image = applyBijection(bij, id);
    if (image === null || eventById(a.structure, image) === null) {
      return Object.freeze({ kind: "game.symmetry-obstruction", bijection: bij, reason: "not-total", offending: Object.freeze([id, image ?? id]) });
    }
    if (images.has(image)) {
      return Object.freeze({ kind: "game.symmetry-obstruction", bijection: bij, reason: "not-bijective", offending: Object.freeze([id, image]) });
    }
    images.add(image);
    const source = eventById(a.structure, id);
    const target = eventById(a.structure, image);
    if (source !== null && target !== null && !samePolarity(source.polarity, target.polarity)) {
      return Object.freeze({ kind: "game.symmetry-obstruction", bijection: bij, reason: "breaks-polarity", offending: Object.freeze([id, image]) });
    }
  }
  for (const a0 of ids) {
    for (const b0 of ids) {
      const fa = applyBijection(bij, a0);
      const fb = applyBijection(bij, b0);
      if (fa === null || fb === null) continue;
      if (causes(a.structure, a0, b0) !== causes(a.structure, fa, fb)) {
        return Object.freeze({ kind: "game.symmetry-obstruction", bijection: bij, reason: "breaks-causality", offending: Object.freeze([a0, b0]) });
      }
      if (conflicts(a.structure, a0, b0) !== conflicts(a.structure, fa, fb)) {
        return Object.freeze({ kind: "game.symmetry-obstruction", bijection: bij, reason: "breaks-conflict", offending: Object.freeze([a0, b0]) });
      }
    }
  }
  return Object.freeze({ kind: "game.symmetry:witness", bijection: bij });
}

export const isSymmetry = (a, bij) => symmetryJudgment(a, bij).kind === "game.symmetry:witness";

export function isArena(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.arena" && isPrimeEventStructure(candidate.structure) && Array.isArray(candidate.symmetry);
}
