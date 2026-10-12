/**
 * iyuha-sni — iyúhášni, the ASYMMETRIC withdrawal, the complement of wótakuye.
 *
 * lakotaTerm: iyúhášni — the withdrawal of standing, the not-holding. It retracts an
 * agent's standing FOR AN ENGAGEMENT to ⊥ (under-determined, "absurd"), but it does NOT
 * sever kin-cells and it cannot do binding work. This asymmetry is structurally load-
 * bearing: polity-maintenance requires ACTIVE kinship-conduct (wótakuye, ./wotakuye.mts),
 * not passive non-violation — withdrawal only sustains its own pole of the relational
 * tension.
 *
 * The corpus node is content/_archive/existence/lakota/discharging/library/predicating/.
 * The charge convention is the LIVE @emsenn/relating one: absurd=⊥, potential=t, active=f,
 * stable=⊤.
 */

// ── iyúhášni: the asymmetric withdrawal ─────────────────────────────────────────────

/**
 * An iyúhášni reading — the WITHDRAWAL act, the asymmetric complement of wótakuye. It
 * retracts an agent's standing-cells FOR AN ENGAGEMENT to ⊥ (under-determined, "absurd"),
 * but it does NOT sever kin-cells and it cannot do binding work. This asymmetry is
 * structurally load-bearing: polity-maintenance requires ACTIVE kinship-conduct, not
 * passive non-violation — withdrawal only sustains its own pole of the relational tension.
 */
export interface IyuhaSni {
  readonly kind: "organizing-as-lakota.iyuha-sni";
  /** The withdrawing agent. */
  readonly agent: string;
  /** The engagement whose standing-cells are retracted. */
  readonly engagement: string;
  /** Standing-cells retract to ⊥ (under-determined). */
  readonly retractsTo: "absurd";
  /** It does NOT sever kin-cells. */
  readonly severs: false;
  /** It cannot bind — the asymmetry with wótakuye. */
  readonly binds: false;
}

/** Read the iyúhášni withdrawal of an agent from an engagement — not a severance. */
export function iyuhaSni(agent: string, engagement: string): IyuhaSni {
  return Object.freeze({
    kind: "organizing-as-lakota.iyuha-sni",
    agent,
    engagement,
    retractsTo: "absurd",
    severs: false,
    binds: false,
  });
}
