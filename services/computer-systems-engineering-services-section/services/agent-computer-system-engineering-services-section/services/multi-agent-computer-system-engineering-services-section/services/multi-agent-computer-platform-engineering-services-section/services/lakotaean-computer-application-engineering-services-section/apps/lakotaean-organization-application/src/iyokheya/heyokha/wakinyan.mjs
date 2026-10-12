/**
 * wakinyan — the Thunder-beings, the ⊤-bearing source of the heyókȟa bond (Wakíŋyaŋ).
 *
 * Corpus: content/_archive/existence/lakota/discharging/library/heyokha/library/wakinyan.
 * The Wakíŋyaŋ are the wakȟáŋ-powers of the West — the sky-borne carriers of the sudden
 * lightning-strike, the clear-sky-becoming-thunder. Where Wí (Sun) is the steady
 * luminous-affirmation (t) and Makȟá (Earth) is the grounded-complement (f), the Wakíŋyaŋ
 * are the powers that BREAK one state to deliver the other — calm breaking into strike.
 * The break is the contradiction; the strike is its discharge. So they are the canonical
 * ⊤-bearing wakȟáŋ: the principle of contradictive suddenness that, applied at any cell,
 * lifts it toward absurd (⊤).
 *
 * They are the SOURCE-of-the-bond, not the bond itself: dreaming the Wakíŋyaŋ installs the
 * ⊤-bearing principle into the dreamer's relational substrate, binding them to a vocation
 * of contrary conduct — they become a heyókȟa-bearer (see ./heyokha.mjs). The West is the
 * direction of the spring storms, the season-change that breaks winter: the Wakíŋyaŋ are
 * the powers that break the previous state to make way for the new, so heyókȟa's
 * contradiction is specifically the form that BREAKS-TOWARD-RENEWAL.
 *
 * Derived: the Wakíŋyaŋ sit at the ⊤ position (stable), Íŋyaŋ's cosmogonic location read
 * as the breaking-power; a wakinyan-vision is what installs an incumbent heyókȟa vocation
 * (the iff carried by ./heyokha.mjs's laxIdempotence). lakotaTerm: "Wakíŋyaŋ".
 */

import { markHeyokha } from "./heyokha.mjs";

/** The Thunder-beings, the ⊤-bearing wakȟáŋ-powers of the West whose dream makes the heyókȟa. */

    

  

/** The Wakíŋyaŋ — the ⊤-bearing Thunder-powers of the West. */
export const wakinyan = Object.freeze({
  kind: "organizing-as-lakota.wakinyan",
  direction: "West",
  charge: "stable",
  act: "the clear-sky-becoming-thunder: breaking one state to deliver the other",
  breaksTowardRenewal: true,
});

/**
 * A wakinyan-vision: the dream-event that installs the ⊤-bearing principle into a person's
 * substrate, binding them to the heyókȟa vocation of contrary conduct. The dreamer's first
 * contrary-conduct cell is the heyókȟa-mark the vision makes incumbent — the upstream
 * source of the polity's lax-idempotence 2-cell.
 */

    

     

    

/** Dream the Wakíŋyaŋ: install the ⊤-bearing heyókȟa vocation into the dreamer's substrate. */
export function wakinyanVision(dreamer) {
  return Object.freeze({
    kind: "organizing-as-lakota.wakinyan-vision",
    dreamer,
    installs: markHeyokha(dreamer),
    source: wakinyan,
  });
}
