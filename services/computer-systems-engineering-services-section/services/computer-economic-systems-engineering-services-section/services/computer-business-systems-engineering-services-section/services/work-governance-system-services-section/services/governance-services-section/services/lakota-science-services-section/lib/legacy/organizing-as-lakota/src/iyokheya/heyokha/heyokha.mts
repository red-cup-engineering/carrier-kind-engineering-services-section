/**
 * heyokha — the ⊤-bearer of the polity.
 *
 * lakotaTerm: Heyókȟa (the contrary, the sacred-clown)
 *
 * corpus node: content/_archive/existence/lakota/.../heyokha and
 * .../lakotaean-governance/.../heyokha-bearing-preserves-lax-idempotence.
 *
 * Heyókȟa is the ⊤-bearer: the lived-bearer who continues the cosmogonic
 * contradiction (Íŋyaŋ-in-Haŋhépi, the initial ⊤) in perpetuity. Heyókȟa-conduct is
 * wakȟáŋ-marked CONTRARY conduct — cells the polity HOLDS AT ⊤ DELIBERATELY rather
 * than letting closure resolve them (the rider going one way, the polity-direction
 * another). The exemption rule: the wólakȟota discipline does NOT fire
 * virtue-evaluation on Heyókȟa-marked conduct-cells, so closure does not drive them
 * toward truth-resolution; the cell persists at ⊤. Wakíŋyaŋ (the Thunder-beings) are
 * the ⊤-bearing source of the heyókȟa vocation.
 *
 * THEOREM (heyokha-bearing-preserves-lax-idempotence): the polity's closure-2-monad
 * has NON-TRIVIAL lax-idempotence — the 2-cell μ : Cl² ⇒ Cl is a genuine non-identity
 * 2-cell — IF AND ONLY IF the polity has incumbent Heyókȟa-vocations. With heyókȟa,
 * cl² = cl on VALUES (both stop at ⊤) but the 2-cell tracking the route through the
 * heyókȟa-cells is non-trivial. Without heyókȟa, every conduct-cell is
 * virtue-evaluated, closure drives cells to truth-resolution, the 2-cell collapses to
 * identity (strict idempotence), and the polity LOSES its paraconsistency-feature.
 * So: Heyókȟa-presence ⟺ paraconsistency (the capacity to HOLD contradictions
 * productively rather than resolve them).
 *
 * Derivation from the substrate: the ⊤ position is Íŋyaŋ's cosmogonic location, so a
 * heyókȟa-mark is grounded by `markWakhan(bearer, "stable")` from wakhan — the
 * aspect is read off the Wakȟáŋ-of-charge bijection (stable ⊤ = Íŋyaŋ), not asserted.
 */
import { type ChargeValueName } from "@emsenn/relating";
import { type SuperiorWakan } from "../tobtob-kin/tobtob-kin.mjs";
import { markWakhan, type WakhanMark } from "../wakhan.mjs";

/**
 * A conduct-cell marked held-at-⊤-deliberately — heyókȟa-conduct. It is a WakhanMark
 * at the stable (⊤) charge with virtue-evaluation exempted: the wólakȟota discipline
 * does not fire on it, so closure cannot drive it to truth-resolution. The aspect is
 * Íŋyaŋ — the cosmogonic contradiction-bearer the cell continues.
 */
export interface HeyokhaMark<C> {
  readonly kind: "organizing-as-lakota.heyokha-mark";
  /** The conduct-cell held contrary to the polity-direction. */
  readonly bearer: C;
  /** The charge the cell is deliberately held at — always stable (⊤). */
  readonly heldAt: "stable";
  /** The Wakȟáŋ whose ⊤ position this is — Íŋyaŋ, the contradiction-bearer. */
  readonly aspect: "Íŋyaŋ";
  /** Whether virtue-evaluation is exempted — true: closure does not resolve this cell. */
  readonly virtueExempt: true;
  /** The grounding wakȟáŋ-mark the heyókȟa-mark is read from. */
  readonly wakhan: WakhanMark<C>;
}

/**
 * Mark a conduct-cell as heyókȟa-conduct: held at ⊤ deliberately, virtue-exempt. The
 * stable (⊤) charge grounds the mark through wakhan's `markWakhan`, so the aspect
 * Íŋyaŋ is the substrate's verdict on which Wakȟáŋ the ⊤ position is, not a free claim.
 */
export function markHeyokha<C>(bearer: C): HeyokhaMark<C> {
  const wakhan = markWakhan(bearer, "stable");
  return Object.freeze({
    kind: "organizing-as-lakota.heyokha-mark",
    bearer,
    heldAt: "stable",
    aspect: "Íŋyaŋ",
    virtueExempt: true,
    wakhan,
  });
}

/** How many cells of a marked field are deliberately held at ⊤ (heyókȟa-conduct). */
export function heldAtTop<C>(marks: readonly HeyokhaMark<C>[]): number {
  let n = 0;
  for (const mark of marks) if (mark.heldAt === "stable") n += 1;
  return n;
}

/**
 * The polity's lax-idempotence regime, read off the count of incumbent Heyókȟa-
 * vocations. This is the theorem's iff in carrier form: the 2-cell μ : Cl² ⇒ Cl is
 * non-trivial — and the polity is paraconsistent — exactly when at least one heyókȟa
 * vocation is incumbent. Suppress every heyókȟa (incumbent = 0) and closure
 * virtue-evaluates every conduct-cell, driving the 2-cell to the identity: strict
 * idempotence, and the loss of the polity's paraconsistency-feature.
 */
export interface LaxIdempotence {
  readonly kind: "organizing-as-lakota.lax-idempotence";
  /** The number of incumbent Heyókȟa-vocations. */
  readonly incumbent: number;
  /** Whether the 2-cell μ : Cl² ⇒ Cl is a genuine non-identity 2-cell. */
  readonly nonTrivialTwoCell: boolean;
  /** Whether the polity holds contradictions productively (⟺ nonTrivialTwoCell). */
  readonly paraconsistent: boolean;
  /** The regime: aperiodic (heyókȟa-borne ⊤ persists) or strict (⊤ resolved away). */
  readonly regime: "aperiodic" | "strict";
}

/**
 * Read the lax-idempotence regime from the count of incumbent Heyókȟa-vocations. The
 * iff is enforced structurally: nonTrivialTwoCell, paraconsistent, and the aperiodic
 * regime all track `incumbent > 0` together.
 */
export function laxIdempotence(incumbentVocations: number): LaxIdempotence {
  const nonTrivialTwoCell = incumbentVocations > 0;
  return Object.freeze({
    kind: "organizing-as-lakota.lax-idempotence",
    incumbent: incumbentVocations,
    nonTrivialTwoCell,
    paraconsistent: nonTrivialTwoCell,
    regime: nonTrivialTwoCell ? "aperiodic" : "strict",
  });
}

// Type re-exports kept local to this module's vocabulary.
export type { ChargeValueName, SuperiorWakan };
