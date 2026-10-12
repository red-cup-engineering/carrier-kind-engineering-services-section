/**
 * tobtob-kin — the metaphysical core of organizing-as-lakota.
 *
 * lakotaTerm: Tóbtób Kiŋ ("the four-times-four")
 *
 * Tóbtób Kiŋ names the wakȟáŋ aspects that constitute Wakȟáŋ Tȟáŋka, headed by the four
 * SUPERIOR Wakȟáŋ — Škáŋ, Wí, Makȟá, Íŋyaŋ. The captain's substantive claim
 * (content/_archive/existence/lakota/discharging/library/tobtob-kin/) is that these
 * four ARE the four values of the relational field's bilattice: not four beings *plus*
 * logic-values, but the four logic positions in cosmogonic form. The Western algebra
 * (Belnap's FOUR, @emsenn/relating's reading) is a re-presentation of what the cosmogony
 * already names — Lakota cosmology is the SOURCE-form of the bilattice, not the other
 * way round.
 *
 * So this module does not posit the cosmogony — it names the four superior Wakȟáŋ over
 * @emsenn/relating's four `ReadingName`s and exposes the bijection reading ≅ Wakȟáŋ.
 * The discharge-derived cosmogony itself (the self-emptying that resolves the initial ⊤
 * into the four-fold, checked against the reading algebra) lives at the iyókheya reading
 * (./iyokheya.mjs); this is the shared four-fold core it fibers over.
 *
 * No Lakota datum is admitted here that the corpus does not record; no reading fact is
 * asserted that the algebra does not prove. The mapping is the only free choice, and
 * it is the captain's. This file imports nothing from siblings.
 */


/** The four superior Wakȟáŋ — the heads of the Tóbtób Kiŋ. */
         

/** One superior Wakȟáŋ, named over a reading value with its cosmogonic and logic roles. */

    

   

            

const wakan = (w) => Object.freeze(w);

/**
 * The four superior Wakȟáŋ as the four readings. The reading identities are the
 * load-bearing claim — they are the LIVE @emsenn/relating value names (absurd=⊥,
 * potential=t, active=f, stable=⊤), the convention organizing already reads
 * (`open: absurd`, `contested: stable`). NOT the Lean ArticulationCell corner names.
 */
export const skan = wakan({
  kind: "organizing-as-lakota.wakan",
  name: "Škáŋ",
  gloss: "Sky / Motion — the moving-principle, giver of naǧí, supreme judge",
  reading: "absurd",
  position: "⊥",
  logicRole: "under-determined: nothing yet pronounced; the seat determination issues from",
  cosmogonicRole: "the power that rose from Íŋyaŋ's blood — the engine of the field; supreme in present rank",
  emergenceRank: 2,
});

export const wi = wakan({
  kind: "organizing-as-lakota.wakan",
  name: "Wí",
  gloss: "Sun — the luminous affirmation, the ceremonial chief, warmth-and-life",
  reading: "potential",
  position: "t",
  logicRole: "true: positive determination; the lit-up assertion",
  cosmogonicRole: "created to warm Makȟá when she complained of the cold — the sun-as-yes",
  emergenceRank: 3,
});

export const makha = wakan({
  kind: "organizing-as-lakota.wakan",
  name: "Makȟá",
  gloss: "Earth — the grounded complement, the receiving-mother, the dense substrate",
  reading: "active",
  position: "f",
  logicRole: "false: negative determination; the not-yet-light ground",
  cosmogonicRole: "Íŋyaŋ's blood became Earth and water — the material that receives",
  emergenceRank: 1,
});

export const inyan = wakan({
  kind: "organizing-as-lakota.wakan",
  name: "Íŋyaŋ",
  gloss: "Rock — first in origin, last in present rank; the spent-source-as-totality",
  reading: "stable",
  position: "⊤",
  logicRole: "over-determined: both true and false at once; the contradiction-bearer",
  cosmogonicRole: "the self-emptied one who shrivelled to hard rock — his pouring-out IS the field",
  emergenceRank: 4,
});

/** The four superior Wakȟáŋ, in the canonical reading order ⊥, t, f, ⊤. */
export const tobtobKin = Object.freeze([skan, wi, makha, inyan]);

const byReading = Object.freeze({
  absurd: skan,
  potential: wi,
  active: makha,
  stable: inyan,
});

const byName = Object.freeze({
  "Škáŋ": skan,
  "Wí": wi,
  "Makȟá": makha,
  "Íŋyaŋ": inyan,
});

/** The superior Wakȟáŋ a reading value IS — the captain's bijection reading ≅ Wakȟáŋ. */
export const wakanOfReading = (reading) => byReading[reading];

/** The reading value a superior Wakȟáŋ IS. */
export const readingOfWakan = (name) => byName[name].reading;
