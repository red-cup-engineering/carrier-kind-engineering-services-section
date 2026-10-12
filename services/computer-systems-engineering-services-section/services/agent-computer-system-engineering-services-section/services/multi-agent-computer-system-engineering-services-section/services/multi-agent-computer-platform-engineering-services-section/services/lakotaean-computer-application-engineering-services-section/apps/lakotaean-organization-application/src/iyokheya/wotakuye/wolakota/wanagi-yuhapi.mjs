/**
 * wanagi-yuhapi — the keeping of the soul, a witness-bearing rite-morphism.
 *
 * lakotaTerm: Wanáǧi yuhápi — the keeping of the soul.
 *
 * Corpus: lakota/discharging/library/seven-rites-as-witness-morphisms. This is ONE of
 * the seven rites: an OPERATION on the substrate that, under proper conditions,
 * maintains the ancestor-relation cells and then releases them. The performRite /
 * compose machinery and the `sevenRites` enumeration live in the positing hub
 * ../wolakota.mjs, which gathers this carrier. The RiteCarrier interface is declared in
 * the hub and imported here as a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** The wanáǧi yuhápi (keeping of the soul) rite carrier. */
export const wanagiYuhapi = Object.freeze({
  kind: "organizing-as-lakota.rite",
  lakota: "wanáǧi yuhápi",
  gloss: "keeping of the soul",
  effect: "maintains the ancestor-relation cells, then releases them",
});
