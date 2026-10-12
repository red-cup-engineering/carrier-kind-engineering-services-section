/**
 * skan — Škáŋ's acts deepened: the supreme judge and the giver of naǧí.
 *
 * Corpus: content/_archive/existence/lakota/discharging/library/tobtob-kin/skan. Where
 * tobtob-kin.mts names the static Wakȟáŋ `skan` as the ⊥ (absurd) reading of the four-fold,
 * THIS module deepens what the corpus records of Finger and Sword: Škáŋ's verbs. Škáŋ is
 * not "motion" in the kinematic sense (that is Takúškaŋškaŋ, the visible effect); Škáŋ is
 * the PRINCIPLE that anything moves or lives at all — the cannot-not-act, the power that
 * rose from Íŋyaŋ's emptying. The under-determined position is not passive; it is the
 * active-source from which determinations issue.
 *
 * Two acts, both sitting at ⊥:
 *   - As SUPREME JUDGE, Škáŋ pronounces on undetermined cases — taking the under-determined
 *     (⊥) and resolving it toward t or f. This is settling read cosmogonically: the
 *     supreme-judge-holding-the-undecided, the moving-principle-that-must-resolve. The
 *     judgement is the resolution of an absurd (⊥) reading toward a determinate one under
 *     evidence — the cosmogonic form of the settling closure.
 *   - As GIVER OF NAǦÍ, Škáŋ takes from the stars a naǧí (spirit) and gives it to each being
 *     at birth; every spirited being is alive because Škáŋ has given. The substrate is
 *     continually-being-animated — a present-tense ongoing-source, not a remote first-cause.
 *
 * lakotaTerm: "Škáŋ / Takúškaŋškaŋ".
 */


/** A naǧí (spirit) Škáŋ gives to a being — the animation of the relational substrate. */

      
    

/** Škáŋ gives a being its naǧí — every spirited being is alive because Škáŋ has given. */
export function givesNagi(being) {
  return Object.freeze({ kind: "organizing-as-lakota.nagi", being, givenBy: "Škáŋ" });
}

/** Škáŋ's judgement on a cell: the supreme judge resolving the under-determined. */

    

      

/**
 * Škáŋ pronounces. From the ⊥ (absurd) seat, the supreme judge resolves an under-determined
 * cell toward the determinate reading the evidence carries (`toward`, t or f); a cell already
 * determinate or contradicted is not the judge's to move. The cosmogonic form of the
 * settling closure: the moving-principle taking the undecided to a verdict.
 */
export function pronounce(before, toward) {
  const judged = before === "absurd";
  return Object.freeze({
    kind: "organizing-as-lakota.skan.judgement",
    before,
    pronounced: judged ? toward : before,
    judged,
  });
}
