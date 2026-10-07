/**
 * discipline — a practice as a BEHAVIOUR (frontier register: skills-disciplines-and-the-character-agent).
 *
 * In the 561 corpus a character inhabits working DOMAINS (divining, engineering, performing, governing,
 * …) — its disciplines. On the ludic substrate a discipline is exactly a Girard BEHAVIOUR: the
 * bi-orthogonal closure of its exemplary plays, the magic-circle'd set of plays that COUNT in the
 * practice. A character practices a discipline iff its design lies in that behaviour (it proves the
 * discipline's formula). This is the playing-side reading of the same boundary gaming names with the
 * magic circle and the lusory attitude.
 *
 * Consumes the real `biorthogonalClosure`; re-derives no ludics.
 */
import { biorthogonalClosure } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/behaviour.mjs";

/** A membership key for a design — its committed loci and readings, order-independent. */
export const designKey = (d) =>
  d.entries.map((e) => `${e.locusKey}:${e.reading}`).sort().join("|");

/** A discipline — a named practice, realized as a behaviour over a universe of plays. */

     

/**
 * discipline — constitute a named practice as the bi-orthogonal closure of its exemplary plays: the
 * magic-circle'd set of plays that count within it. `generators` are the practice's exemplars;
 * `universe` is the ambient design set.
 */
export function discipline(name, generators, universe) {
  const behaviour = biorthogonalClosure(generators, universe);
  return Object.freeze({
    kind: "playing.discipline",
    name,
    behaviour: Object.freeze([...behaviour]),
    size: behaviour.length,
    generators: Object.freeze([...generators]),
    universe: Object.freeze([...universe]),
  });
}

/** Whether a design is admitted to the discipline — its play counts within the practice (it lies in the
 *  behaviour). The ludic form of "this character practices this discipline". */
export function admits(d, design) {
  const key = designKey(design);
  return d.behaviour.some((member) => designKey(member) === key);
}
