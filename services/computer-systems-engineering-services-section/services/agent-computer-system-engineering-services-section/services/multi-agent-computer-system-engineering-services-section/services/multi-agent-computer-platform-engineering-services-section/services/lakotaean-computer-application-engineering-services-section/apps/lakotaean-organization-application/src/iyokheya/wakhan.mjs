/**
 * wakhan — the wakȟáŋ cell-quality, and Wakȟáŋ Tȟáŋka the global pattern.
 *
 * lakotaTerm: wakȟáŋ ("sacred"), Wakȟáŋ Tȟáŋka ("the Great Sacred")
 *
 * Wakȟáŋ is a QUALITY a cell or rule carries when properly attended — not a separate
 * region or entity (translating Wakȟáŋ Tȟáŋka as a Christian-style God was always a
 * mistranslation). It is a marking w : Cells → {0,1}; a cell may be wakȟáŋ at any of
 * the four charges (a sacred relation held t, negated f, unsettled ⊥, or under
 * contradiction ⊤ — the signature of an attack on the sacred). The substrate enforces
 * a purity discipline: ordinary rules cannot fire on wakȟáŋ-marked cells.
 *
 * The aspect of the sacred a mark bears is read off tobtob-kin's bijection charge ≅
 * Wakȟáŋ (./tobtob-kin/tobtob-kin.mjs), not asserted. The full closure-rule purity
 * discipline is built at the lifeway tier (wólakȟota); this is the quality itself.
 *
 * corpus node: content/_archive/existence/lakota/discharging/library/tobtob-kin/
 */

import { wakanOfReading } from "./tobtob-kin/tobtob-kin.mjs";

/**
 * The wakȟáŋ quality, modeled as a predicate over a carrier of any kind plus the charge
 * it is wakȟáŋ-at. A cell or rule the quality attaches to, read through its Wakȟáŋ
 * aspect.
 */

    

      

/** Mark a bearer wakȟáŋ at a charge — the quality, read through its Wakȟáŋ aspect. */
export function markWakhan(bearer, atCharge) {
  return Object.freeze({
    kind: "organizing-as-lakota.wakhan-mark",
    bearer,
    atCharge,
    aspect: wakanOfReading(atCharge).name,
  });
}

/**
 * Wakȟáŋ Tȟáŋka — the encompassing sacredness of the relational whole: the GLOBAL
 * pattern of wakȟáŋ-markings taken together, the substrate-property that the sacred is
 * the structure of relation itself. Not a primitive entity; the whole-is-wakȟáŋ
 * reading of a marked field.
 */

    

/** Read the global wakȟáŋ pattern of a marked field as Wakȟáŋ Tȟáŋka. */
export function wakanTanka(marks) {
  const aspects = [];
  for (const mark of marks) if (!aspects.includes(mark.aspect)) aspects.push(mark.aspect);
  return Object.freeze({
    kind: "organizing-as-lakota.wakan-tanka",
    marked: marks.length,
    aspects: Object.freeze(aspects),
    wholeIsWakhan: true,
  });
}
