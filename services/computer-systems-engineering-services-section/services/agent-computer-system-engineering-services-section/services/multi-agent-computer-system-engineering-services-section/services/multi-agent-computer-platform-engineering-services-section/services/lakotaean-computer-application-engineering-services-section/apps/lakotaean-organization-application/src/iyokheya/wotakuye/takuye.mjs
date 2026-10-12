/**
 * takuye — tȟakúye, the kin-relation as SUBSTANCE (the kin-cell).
 *
 * lakotaTerm: tȟakúye — "a relative; kin", the kin-relation taken as an object,
 * "something they have in common". This is the predicating-tier substance from which the
 * binding act (wótakuye) derives: relation-as-object, a subject standing in a named kin-
 * relation to an object, carrying the charge at which that relation is held.
 *
 * The corpus node is content/_archive/existence/lakota/discharging/library/predicating/.
 * The captain's reading (Ella Deloria): "Being Dakota is being related" — and the being is
 * ACTIVE. tȟakúye is the inert object-pole; wótakuye (../wotakuye.mts) is the act that binds
 * it. The charge convention is the LIVE @emsenn/relating one: absurd=⊥, potential=t,
 * active=f, stable=⊤.
 */


// ── tȟakúye: the kin-relation as substance ──────────────────────────────────────────

/**
 * A tȟakúye cell — kin-relation as SUBSTANCE, the relation-as-object ("something they
 * have in common"). It is the kin-cell itself: a subject standing in a named kin-relation
 * to an object, carrying the charge at which that relation is held.
 */

/** Construct a tȟakúye kin-cell — the kin-relation as substance, held at a charge. */
export function takuye(
  subject,
  predicate,
  object,
  charge = "potential",
) {
  return Object.freeze({
    kind: "organizing-as-lakota.takuye",
    subject,
    predicate,
    object,
    charge,
  });
}
