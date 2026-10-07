/**
 * Formulas — the names of behaviours.
 *
 * In ludics, "a formula is the name of a behaviour, recovered as a coarsening
 * of the locative content rather than asserted as a prior given" (Girard 2001).
 * The slogan: rules of logic are an emergent stratum on top of the logic of
 * rules.  A formula here is therefore a named behaviour: a label paired with
 * the generating design-set whose bi-orthogonal closure is the behaviour it
 * names.
 */

import { generatedBehaviour, playsIn } from "./behaviour.mjs";

export function formula(name, generators) {
  return Object.freeze({
    kind: "game.formula",
    name,
    generators: Object.freeze([...generators]),
  });
}

/** The behaviour a formula names, relative to a universe of designs. */
export function denotation(f, universe) {
  return generatedBehaviour(f.generators, universe);
}

/** Whether a design proves the formula — plays in the behaviour the formula names. */
export function proves(d, f, universe) {
  return playsIn(d, f.generators, universe);
}

export function isFormula(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.formula" && typeof candidate.name === "string" && Array.isArray(candidate.generators);
}
