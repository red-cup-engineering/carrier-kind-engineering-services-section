/**
 * tapa-wakayapi — the throwing of the ball, a witness-bearing rite-morphism.
 *
 * lakotaTerm: Tȟapá wakȟáyap — the throwing of the ball.
 *
 * Corpus: lakota/discharging/library/seven-rites-as-witness-morphisms. This is ONE of
 * the seven rites: an OPERATION on the substrate that, under proper conditions, fires a
 * wakȟáŋ-bearing witness-increment on the wisdom-coming cells. The performRite / compose
 * machinery and the `sevenRites` enumeration live in the positing hub ../wolakota.mjs,
 * which gathers this carrier. The RiteCarrier interface is declared in the hub and
 * imported here as a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** The tȟapá wakȟáyap (throwing of the ball) rite carrier. */
export const tapaWakayapi = Object.freeze({
  kind: "organizing-as-lakota.rite",
  lakota: "tȟapá wakȟáyap",
  gloss: "throwing of the ball",
  effect: "witness-increment on the wisdom-coming cells",
});
