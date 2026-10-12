/**
 * inikagapi — the sweat lodge (inípi), a witness-bearing rite-morphism.
 *
 * lakotaTerm: Iníkağapi — the sweat lodge / inípi; purification.
 *
 * Corpus: lakota/discharging/library/seven-rites-as-witness-morphisms. This is ONE of
 * the seven rites: an OPERATION on the substrate that, under proper conditions, fires a
 * wakȟáŋ-bearing witness-increment on its cells. The performRite / compose machinery
 * and the `sevenRites` enumeration live in the positing hub ../wolakota.mjs, which
 * gathers this carrier. The RiteCarrier interface is declared in the hub and imported
 * here as a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** The iníkağapi (sweat lodge) rite carrier. */
export const inikagapi = Object.freeze({
  kind: "organizing-as-lakota.rite",
  lakota: "iníkağapi",
  gloss: "sweat lodge / inípi — purification",
  effect: "witness-increment on the purification cells",
});
