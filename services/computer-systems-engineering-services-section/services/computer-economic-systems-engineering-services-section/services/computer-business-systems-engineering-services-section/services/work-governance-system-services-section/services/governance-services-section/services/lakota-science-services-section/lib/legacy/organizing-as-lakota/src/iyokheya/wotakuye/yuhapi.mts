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
export interface Yuhapi {
  readonly kind: "organizing-as-lakota.yuhapi";
  /** The one who witnesses / invokes. */
  readonly witness: string;
  /** The relation called upon. */
  readonly relation: string;
  /** The cell produced bears witness. */
  readonly bears: "witness";
}

/** Read the yuhápi witness-act — the invocation of a kin-relation. */
export function yuhapi(witness: string, relation: string): Yuhapi {
  return Object.freeze({
    kind: "organizing-as-lakota.yuhapi",
    witness,
    relation,
    bears: "witness",
  });
}
