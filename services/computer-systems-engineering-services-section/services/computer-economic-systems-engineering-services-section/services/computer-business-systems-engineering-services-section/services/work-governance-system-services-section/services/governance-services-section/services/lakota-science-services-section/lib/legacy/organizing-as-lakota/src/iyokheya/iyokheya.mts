/**
 * iyokheya — the articulating/discharging morphism: the cosmogony/discharge reading.
 *
 * lakotaTerm: Iyókheya ("to set apart")
 *
 * Iyókheya is the setting-apart — the articulating act by which the undivided totality
 * is set apart into the determinate four-fold. The cosmogonic self-emptying is the
 * first iyókheya: Íŋyaŋ-in-Haŋhépi (the initial ⊤, power-with-nothing-to-act-on as
 * contradiction) sets itself apart, pouring out into the four superior Wakȟáŋ, and the
 * field that results regenerates ⊤ and ⊥ from its own determinate pair — the discharge
 * is the self-emptying that resolves the contradiction, and what it sets apart it also
 * carries forward in the charge algebra.
 *
 * This module does not posit the cosmogony — it DERIVES it from the substrate it
 * fibers. The four superior Wakȟáŋ are named over @emsenn/relating's four
 * `ChargeValueName`s (in ./tobtob-kin/tobtob-kin.mjs), and the cosmogonic relations the
 * corpus records are checked against the charge algebra:
 *
 *   - Wí (t) ∨ₖ Makȟá (f) = Íŋyaŋ-residual (⊤): the two determinate truth-values,
 *     joined in KNOWLEDGE, regenerate the over-determination (the contradiction Íŋyaŋ
 *     bears). The spent rock is the knowledge-join of sun and earth.
 *   - Wí (t) ∧ₖ Makȟá (f) = Škáŋ (⊥): their knowledge-MEET is the under-determined
 *     position — the supreme judge holding the undecided, the seat determination
 *     issues from.
 *   - negation swaps Wí ↔ Makȟá (sun and earth are truth-duals) and FIXES Škáŋ and
 *     Íŋyaŋ (the ⊥/⊤ axis — the judge and the totality are self-dual). This is the
 *     corpus's reading that the determinate pair is the moving content while the
 *     judge/contradiction axis is the standing frame.
 *
 * corpus node: content/_archive/existence/lakota/discharging/library/tobtob-kin/
 */
import {
  chargeValue,
  joinKnowledgeValue,
  meetKnowledgeValue,
  negateValue,
  type ChargeValue,
  type ChargeValueName,
} from "@emsenn/relating";
import { tobtobKin, type SuperiorWakan, type Wakan } from "./tobtob-kin/tobtob-kin.mjs";
import { iyanHanhepi } from "./iyan-hanhepi.mjs";

/**
 * A cosmogonic relation the corpus records, checked against the charge algebra. The
 * `holds` flag is the proof: it is the algebra's own verdict, not an assertion.
 */
export interface CosmogonicRelation {
  readonly kind: "organizing-as-lakota.cosmogonic-relation";
  readonly statement: string;
  /** The charge-algebra operation, named. */
  readonly operation: string;
  /** The Wakȟáŋ the operation lands on. */
  readonly result: SuperiorWakan;
  /** Whether the algebra confirms it. Always true in a coherent build — the check. */
  readonly holds: boolean;
}

const sameValue = (a: ChargeValue, b: ChargeValue): boolean => a.name === b.name;

/**
 * The discharge of Íŋyaŋ-in-Haŋhépi — the cosmogony as the internal structure of the
 * four-charge field. Íŋyaŋ-in-Haŋhépi is the INITIAL ⊤ (power-with-nothing-to-act-on
 * is contradiction); discharging is the self-emptying that resolves it into the four
 * superior Wakȟáŋ; and the field that results regenerates ⊤ and ⊥ from its own
 * determinate pair — the cosmogony is not left behind but carried in the algebra.
 *
 * The `relations` are derived: each is computed with @emsenn/relating's value-level
 * lattice ops and its `holds` is the algebra's verdict.
 */
export interface Cosmogony {
  readonly kind: "organizing-as-lakota.cosmogony";
  /** Íŋyaŋ-in-Haŋhépi, the initial contradiction the discharge empties. */
  readonly seed: { readonly name: string; readonly position: "⊤"; readonly charge: ChargeValueName };
  /** The discharge order — the cosmogonic emergence sequence (Makȟá, Škáŋ, Wí, Íŋyaŋ-residual). */
  readonly dischargeOrder: readonly SuperiorWakan[];
  /** The four superior Wakȟáŋ the discharge produces. */
  readonly fourFold: readonly Wakan[];
  /** The recorded relations, each checked against the charge algebra. */
  readonly relations: readonly CosmogonicRelation[];
  /** Whether every recorded relation holds — the cosmogony is coherent in the substrate. */
  readonly coherent: boolean;
}

/** Derive the cosmogony from the charge algebra. */
export function discharge(): Cosmogony {
  const t = chargeValue("potential"); // Wí
  const f = chargeValue("active"); // Makȟá
  const join = joinKnowledgeValue(t, f); // Wí ∨ₖ Makȟá
  const meet = meetKnowledgeValue(t, f); // Wí ∧ₖ Makȟá
  const negWi = negateValue(t); // ∼Wí
  const negSkan = negateValue(chargeValue("absurd")); // ∼Škáŋ
  const negInyan = negateValue(chargeValue("stable")); // ∼Íŋyaŋ

  const relations: CosmogonicRelation[] = [
    {
      kind: "organizing-as-lakota.cosmogonic-relation",
      statement: "Wí (t) ∨ₖ Makȟá (f) = Íŋyaŋ-residual (⊤): sun joined to earth in knowledge regenerates the contradiction",
      operation: "joinKnowledgeValue(potential, active)",
      result: "Íŋyaŋ",
      holds: sameValue(join, chargeValue("stable")),
    },
    {
      kind: "organizing-as-lakota.cosmogonic-relation",
      statement: "Wí (t) ∧ₖ Makȟá (f) = Škáŋ (⊥): sun met with earth in knowledge is the under-determined seat of judgement",
      operation: "meetKnowledgeValue(potential, active)",
      result: "Škáŋ",
      holds: sameValue(meet, chargeValue("absurd")),
    },
    {
      kind: "organizing-as-lakota.cosmogonic-relation",
      statement: "∼Wí = Makȟá: sun and earth are truth-duals (negation swaps the determinate pair)",
      operation: "negateValue(potential)",
      result: "Makȟá",
      holds: sameValue(negWi, chargeValue("active")),
    },
    {
      kind: "organizing-as-lakota.cosmogonic-relation",
      statement: "∼Škáŋ = Škáŋ: the moving-judge at ⊥ is self-dual — the standing frame, not moving content",
      operation: "negateValue(absurd)",
      result: "Škáŋ",
      holds: sameValue(negSkan, chargeValue("absurd")),
    },
    {
      kind: "organizing-as-lakota.cosmogonic-relation",
      statement: "∼Íŋyaŋ = Íŋyaŋ: the contradiction-bearer at ⊤ is self-dual — the totality, not moving content",
      operation: "negateValue(stable)",
      result: "Íŋyaŋ",
      holds: sameValue(negInyan, chargeValue("stable")),
    },
  ];

  const seed = iyanHanhepi();

  return Object.freeze({
    kind: "organizing-as-lakota.cosmogony",
    seed: Object.freeze({ name: seed.lakotaTerm, position: seed.position, charge: seed.charge }),
    dischargeOrder: Object.freeze(
      [...tobtobKin].sort((a, b) => a.emergenceRank - b.emergenceRank).map((w) => w.name),
    ),
    fourFold: tobtobKin,
    relations: Object.freeze(relations.map((r) => Object.freeze(r))),
    coherent: relations.every((r) => r.holds),
  });
}

// ── iyókheya as the continuing differentiating-act ────────────────────────────────

/**
 * A distinction iyókheya draws — the first-distinction in act-form. The cosmogonic
 * discharge is not a one-time event but the CONTINUING structure of the field: every
 * distinction that exists is an iyókheya, a setting-apart that holds its two sides
 * distinct (Makȟá is iyókheya-from Íŋyaŋ; the sky is set apart from the earth; and in
 * lived practice every act of recognition — every kin-term spoken — is an iyókheya).
 *
 * By the structure of any boundary the act has TWO FACES at once: an INCLUSIVE face (what
 * falls within the marked) and an EXCLUSIVE face (what falls outside). Neither precedes
 * the other — to set apart is to do both at once; includes and excludes are co-primitive.
 */
export interface Distinction {
  readonly kind: "organizing-as-lakota.distinction";
  /** What falls within the marked — the inclusive face. */
  readonly includes: string;
  /** What falls outside the marked — the exclusive face. */
  readonly excludes: string;
  /** Includes and excludes are co-primitive — neither precedes the other. */
  readonly coPrimitive: true;
  /**
   * Whether the distinction is held within wótakuye (the binding that keeps the distinct
   * in coherent relation). A setting-apart is productive when it serves wótakuye and
   * destructive when it severs without binding — distinctions are only CONDITIONALLY good.
   */
  readonly heldInWotakuye: boolean;
  /** Severing iff not held — to set apart without binding is to break the relational substrate. */
  readonly severs: boolean;
}

/**
 * Set apart: draw a distinction, its two faces co-primitive. `heldInWotakuye` records
 * whether the distinction is held within the binding kin-relation — if not, the act
 * SEVERS (the boarding-school project was an iyókheya-without-wótakuye: it set children
 * apart from kin, language, ceremony, and place without sustaining the relational bindings
 * that would have made the separation productive; the result was harm, not knowledge).
 */
export function setApart(includes: string, excludes: string, heldInWotakuye: boolean): Distinction {
  return Object.freeze({
    kind: "organizing-as-lakota.distinction",
    includes,
    excludes,
    coPrimitive: true,
    heldInWotakuye,
    severs: !heldInWotakuye,
  });
}
