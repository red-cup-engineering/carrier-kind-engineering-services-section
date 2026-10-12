/**
 * hanblecheyapi — the vision quest, a witness-bearing rite-morphism.
 *
 * lakotaTerm: Haŋbléčheyapi — the vision quest; crying for a vision.
 *
 * Corpus: lakota/discharging/library/seven-rites-as-witness-morphisms. This is ONE of
 * the seven rites: an OPERATION on the substrate that, under proper conditions, fires a
 * wakȟáŋ-bearing witness-increment on its cells (only if the vision is given). The
 * performRite / compose machinery and the `sevenRites` enumeration live in the positing
 * hub ../wolakota.mjs, which gathers this carrier. The RiteCarrier interface is declared
 * in the hub and imported here as a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** The haŋbléčheyapi (vision quest) rite carrier. */
export const hanblecheyapi = Object.freeze({
  kind: "organizing-as-lakota.rite",
  lakota: "haŋbléčheyapi",
  gloss: "vision quest — crying for a vision",
  effect: "witness-increment on the vision cells, only if the vision is given",
});
