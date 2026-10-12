/**
 * yuhapi — yuhápi / wóčhekiye, the WITNESS-act, to invoke kinship.
 *
 * lakotaTerm: yuhápi / wóčhekiye — to have/hold, to call-on-relation; prayer as the verbal
 * invocation of kinship with a spirit. The act produces a witness-bearing cell: to invoke
 * is to call upon a kin-relation and bear witness to it.
 *
 * The corpus node is content/_archive/existence/lakota/discharging/library/predicating/.
 * This is a leg of the predicating tier alongside wótakuye (./wotakuye.mts) and iyúhášni
 * (./iyuha-sni.mts). The charge convention is the LIVE @emsenn/relating one: absurd=⊥,
 * potential=t, active=f, stable=⊤.
 */

// ── yuhápi / wóčhekiye: the witness-act ─────────────────────────────────────────────

/**
 * A yuhápi reading — the WITNESS-act (yuhápi / wóčhekiye): to invoke kinship, to call-on-
 * relation. Prayer is the verbal invocation of kinship with a spirit; the act produces a
 * witness-bearing cell.
 */

/** Read the yuhápi witness-act — the invocation of a kin-relation. */
export function yuhapi(witness, relation) {
  return Object.freeze({
    kind: "organizing-as-lakota.yuhapi",
    witness,
    relation,
    bears: "witness",
  });
}
