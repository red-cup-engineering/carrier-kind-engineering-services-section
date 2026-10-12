/**
 * wiwanyang-wacipi — the sun dance, a witness-bearing rite-morphism.
 *
 * lakotaTerm: Wiwáŋyaŋg wačhípi — the sun dance.
 *
 * Corpus: lakota/discharging/library/seven-rites-as-witness-morphisms. This is ONE of
 * the seven rites: an OPERATION on the substrate that, under proper conditions,
 * witnesses the people standing-as-people and moves polity wičhózani toward quiescence.
 * The performRite / compose machinery and the `sevenRites` enumeration live in the
 * positing hub ../wolakota.mjs, which gathers this carrier. The RiteCarrier interface is
 * declared in the hub and imported here as a TYPE ONLY, so this file adds no runtime
 * import cycle.
 */

/** The wiwáŋyaŋg wačhípi (sun dance) rite carrier. */
export const wiwanyangWacipi = Object.freeze({
  kind: "organizing-as-lakota.rite",
  lakota: "wiwáŋyaŋg wačhípi",
  gloss: "sun dance",
  effect: "witnesses the people standing-as-people; moves polity wičhózani toward quiescence",
});
