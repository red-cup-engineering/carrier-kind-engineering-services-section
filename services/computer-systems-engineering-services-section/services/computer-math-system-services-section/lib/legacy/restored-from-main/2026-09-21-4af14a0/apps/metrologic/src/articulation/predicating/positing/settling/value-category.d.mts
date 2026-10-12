/**
 * settling/value-category — settling over a value category `V` (the universal `F_U` over `V`).
 *
 * The spine settles **charges**: the closure `cl = ◇∘□` iterates on the FOUR
 * bilattice to its fixed point. The corpus's `continuous-valued-settling` node
 * generalizes this — settling is parametric in a **value category** `V`, and the
 * *same* settling dynamics run over any complete/residuated lattice of values
 * (the Lawvere quantale, a continuous lattice, fuzzy `[0,1]`, the four-valued
 * bilattice FOUR, or the Boolean `{0,1}`). Settling is the universal closure `F_U`
 * *over* `V`. Ported faithfully from `lean/RelMath/Value/SettlingOverValueCategory.lean`
 * (and the slice of `ClosureOrdinalRegime.lean` it depends on) into the relating
 * substrate — relating's settling was hardwired to the `Charge`/`Valuation`
 * bilattice; this is the layer that lets a settling run over an arbitrary `V`.
 *
 * The corpus's key claim is a **uniformity**: the four-regime stratification of the
 * closure ordinal `κ` — strict(finite) / Scott / transfinite-bounded / aperiodic —
 * is **`V`-independent**. Which regime a settling lands in is decided by `κ`
 * (equivalently by the decidable `ClosureRegimeData`), and that decision never
 * looks at `V`. `V = {0,1}` (Boolean) and `V = FOUR` (Charge) both recover the
 * standard bilattice settling spine.
 *
 * No free data. relating's `ClosureRegime` values are reused, not re-introduced.
 * The Lean carries each structure's laws as proof fields; the faithful TS analog
 * is (a) **finite-exhaustion law judgments** (`partialOrderOver`, `closureOver`)
 * that witness the laws over a sample — the full carrier for a finite `V`, exactly
 * the `decide` the Lean uses — and (b) **smart constructors** that *refuse* to
 * admit data violating the corpus constraints (`closureRegimeData` rejects a finite
 * base that is not Scott-continuous / countably-cofinal, so an invalid datum is
 * unconstructible, as the Lean's proof fields make it). Formalizes
 * `content/.../settling/content/continuous-valued-settling/continuous-valued-settling.md`.
 *
 * This is a finite/sample-checked Node surface. It does not implement a full
 * continuous quantale runtime or prove laws for arbitrary host functions.
 *
 * @packageDocumentation
 */
import { type ClosureRegime } from "./closure.mjs";
import { type ChargeValue } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
/** A **value category** `V`: a carrier `T` with a partial order `le`, an equality
 * `eq`, and a seed value `bot`. `le` is required to be a partial order (reflexive,
 * transitive, antisymmetric w.r.t. `eq`) — witnessed for a finite `V` by
 * {@link partialOrderOver}. The corpus's value category settling runs over. */
export interface ValueCategory<T> {
    readonly kind: "settling.valueCategory";
    /** The value order `≤_V`. */
    readonly le: (left: T, right: T) => boolean;
    /** Equality on values (the antisymmetry codomain). */
    readonly eq: (left: T, right: T) => boolean;
    /** The seed value `⊥` settling climbs from. */
    readonly bot: T;
}
/** Construct a value category from its order, equality, and seed. */
export declare const valueCategory: <T>(le: (left: T, right: T) => boolean, eq: (left: T, right: T) => boolean, bot: T) => ValueCategory<T>;
/** A witness that `le` is a partial order over a sample (every checked triple
 * satisfies reflexivity, transitivity, antisymmetry). For a finite `V` pass the
 * whole carrier — this is the decision the Lean's `le_refl/le_trans/le_antisymm`
 * proof fields make. */
export interface PartialOrderWitness<T> {
    readonly kind: "settling.valueCategory.partialOrder:witness";
    readonly sample: readonly T[];
}
/** An obstruction to `le` being a partial order: a sample point/pair/triple that
 * breaks one of the three laws. */
export interface PartialOrderObstruction<T> {
    readonly kind: "settling.valueCategory.partialOrder-obstruction";
    readonly law: "reflexive" | "transitive" | "antisymmetric";
    readonly points: readonly T[];
}
/** The result of checking the partial-order laws over a sample. */
export type PartialOrderJudgment<T> = PartialOrderWitness<T> | PartialOrderObstruction<T>;
/** Check that a value category's `le` is a partial order over a finite sample
 * (the full carrier, for a finite `V`). Reflexive at each point; transitive over
 * each ordered triple; antisymmetric (`le a b ∧ le b a → eq a b`) over each pair. */
export declare function partialOrderOver<T>(V: ValueCategory<T>, sample: readonly T[]): PartialOrderJudgment<T>;
/** A **`V`-enriched closure operator**: the endomap `op` settling iterates. Required
 * inflationary + monotone + idempotent in the `V`-order — witnessed for a finite `V`
 * by {@link closureOver}. The same closure-operator shape as the spine's charge
 * closure, generalized over the value category. */
export interface VClosure<T> {
    readonly kind: "settling.vClosure";
    /** The closure endomap `cl`. */
    readonly op: (value: T) => T;
}
/** Construct a `V`-enriched closure from its endomap. */
export declare const vClosure: <T>(op: (value: T) => T) => VClosure<T>;
/** A witness that `op` is a closure (inflationary, monotone, idempotent) over a sample. */
export interface ClosureLawWitness<T> {
    readonly kind: "settling.vClosure.law:witness";
    readonly sample: readonly T[];
}
/** An obstruction to `op` being a closure: a sample point/pair breaking one law. */
export interface ClosureLawObstruction<T> {
    readonly kind: "settling.vClosure.law-obstruction";
    readonly law: "inflationary" | "monotone" | "idempotent";
    readonly points: readonly T[];
}
/** The result of checking the closure laws over a sample. */
export type ClosureLawJudgment<T> = ClosureLawWitness<T> | ClosureLawObstruction<T>;
/** Check that a `VClosure` is inflationary, monotone, and idempotent over a finite
 * sample (the full carrier, for a finite `V`) — the decision the Lean's
 * `infl/mono/idem` proof fields make. */
export declare function closureOver<T>(V: ValueCategory<T>, T_: VClosure<T>, sample: readonly T[]): ClosureLawJudgment<T>;
/** The **settling** of a value under a `V`-closure: its fixed point from a seed,
 * `settle v = cl v`. The universal `F_U` over `V`, evaluated at `v`. (Named
 * `settleOverValue` to avoid colliding with the spine's charge-level `settle`.) */
export declare const settleOverValue: <T>(T_: VClosure<T>, value: T) => T;
/** A witness that the settled value is a fixed point (Knaster–Tarski, closure form,
 * over `V`): `cl (settle v) = settle v`. */
export interface SettleFixedPointWitness<T> {
    readonly kind: "settling.valueCategory.settleFixedPoint:witness";
    readonly seed: T;
    readonly settled: T;
}
/** An obstruction: the settled value is not a fixed point (a closure-law violation). */
export interface SettleFixedPointObstruction<T> {
    readonly kind: "settling.valueCategory.settleFixedPoint-obstruction";
    readonly seed: T;
    readonly settled: T;
    readonly resettled: T;
}
/** The result of checking the settled value is a fixed point. */
export type SettleFixedPointJudgment<T> = SettleFixedPointWitness<T> | SettleFixedPointObstruction<T>;
/** **The settling is a fixed point.** Witnesses `cl (settle v) = settle v` (the
 * closure's idempotence). */
export declare function settleFixedPoint<T>(V: ValueCategory<T>, T_: VClosure<T>, value: T): SettleFixedPointJudgment<T>;
/** A witness that the settling is the **least** fixed point above the seed: for a
 * given fixed point `x ≥_V seed`, `settle seed ≤_V x`. */
export interface SettleLeastWitness<T> {
    readonly kind: "settling.valueCategory.settleLeast:witness";
    readonly seed: T;
    readonly settled: T;
    readonly bound: T;
}
/** An obstruction to the least-fixed-point property, or to its hypotheses. */
export interface SettleLeastObstruction<T> {
    readonly kind: "settling.valueCategory.settleLeast-obstruction";
    readonly reason: "seed-not-below-bound" | "bound-not-fixed" | "settled-not-below-bound";
    readonly seed: T;
    readonly settled: T;
    readonly bound: T;
}
/** The result of checking the least-fixed-point property against a candidate bound. */
export type SettleLeastJudgment<T> = SettleLeastWitness<T> | SettleLeastObstruction<T>;
/** **The settling is the least fixed point above the seed.** Given a candidate `x`
 * with `seed ≤_V x` and `op x = x`, witnesses `settle seed ≤_V x` — the
 * least-upper-bound character of the settled value. Refuses the check when its
 * hypotheses fail (so the witness genuinely certifies the least-fixed-point law). */
export declare function settleLeast<T>(V: ValueCategory<T>, T_: VClosure<T>, seed: T, bound: T): SettleLeastJudgment<T>;
/** The decidable characterization of a settling's closure ordinal `κ`: whether the
 * closure is Scott-continuous, whether the base `(L,E,C)` is finite, whether the
 * cofinality is countable. Constructed only through {@link closureRegimeData},
 * which enforces the corpus constraints, so an invalid datum is unconstructible. */
export interface ClosureRegimeData {
    readonly kind: "settling.closureRegimeData";
    readonly scottContinuous: boolean;
    readonly finiteBase: boolean;
    readonly countableCofinality: boolean;
}
/** A witness admitting valid regime data. */
export interface ClosureRegimeDataWitness {
    readonly kind: "settling.closureRegimeData:witness";
    readonly data: ClosureRegimeData;
}
/** An obstruction: data violating a corpus constraint (a finite base that is not
 * Scott-continuous, or not countably cofinal). */
export interface ClosureRegimeDataObstruction {
    readonly kind: "settling.closureRegimeData-obstruction";
    readonly constraint: "finiteBase→scottContinuous" | "finiteBase→countableCofinality";
}
/** The result of admitting regime data. */
export type ClosureRegimeDataJudgment = ClosureRegimeDataWitness | ClosureRegimeDataObstruction;
/** Admit regime data, enforcing the corpus constraints `finiteBase → scottContinuous`
 * and `finiteBase → countableCofinality` (a finite base forces both). Returns an
 * obstruction rather than admitting invalid data — the runtime analog of the Lean's
 * `fin_scott` / `fin_cof` proof fields. */
export declare function closureRegimeData(scottContinuous: boolean, finiteBase: boolean, countableCofinality: boolean): ClosureRegimeDataJudgment;
/** **Classify** regime data into its regime via the corpus equivalences: strict
 * (finite, `κ<ω`) if the base is finite; else Scott (`κ=ω`) if Scott-continuous;
 * else transfinite-bounded (`ω<κ<ω₁`) if countably cofinal; else aperiodic (`κ≥ω₁`).
 * Reuses relating's existing `ClosureRegime` values. */
export declare function classifyRegime(d: ClosureRegimeData): ClosureRegime;
/** The four-regime dichotomy carrier: the classified regime and the four mutually
 * exclusive corpus conditions, exactly one of which holds. */
export interface FourRegimeDichotomy {
    readonly kind: "settling.fourRegimeDichotomy";
    readonly data: ClosureRegimeData;
    readonly regime: ClosureRegime;
    /** strict ⟺ finite base. */
    readonly strict: boolean;
    /** Scott ⟺ Scott-continuous ∧ ¬finite base. */
    readonly scott: boolean;
    /** transfinite-bounded ⟺ ¬Scott-continuous ∧ countable cofinality. */
    readonly transfiniteBounded: boolean;
    /** aperiodic ⟺ ¬Scott-continuous ∧ ¬countable cofinality. */
    readonly aperiodic: boolean;
    /** Whether exactly one condition holds and it matches `regime` (always true for
     * data admitted through {@link closureRegimeData}). */
    readonly exclusiveAndExhaustive: boolean;
}
/** **The four-regime dichotomy.** For any regime data, the classifier lands in one
 * of the four regimes and each is selected by exactly its corpus condition — the
 * four conditions mutually exclusive and jointly exhaustive. */
export declare function fourRegimeDichotomy(d: ClosureRegimeData): FourRegimeDichotomy;
/** **The regime of a settling over `V`, factored through `κ`'s data only.** Takes
 * the value category and the closure as parameters it *ignores*: `regimeOfValueSettling
 * V T d = classifyRegime d`. This is the `V`-independence — the function does not
 * read `V` or `T`. */
export declare function regimeOfValueSettling<T>(_V: ValueCategory<T>, _T: VClosure<T>, d: ClosureRegimeData): ClosureRegime;
/** A witness that `regimeOfValueSettling` is independent of `V` and the closure: the
 * regime depends only on `d`. */
export interface ValueIndependentRegimeWitness {
    readonly kind: "settling.valueIndependentRegime:witness";
    readonly data: ClosureRegimeData;
    readonly regime: ClosureRegime;
    readonly dichotomy: FourRegimeDichotomy;
}
/** **The four-regime classification is `V`-independent (HEADLINE).** For any value
 * category `V₁,V₂` and closures `T₁,T₂`, `regimeOfValueSettling` on the same data is
 * identical (it is `classifyRegime d` regardless of `V`/`T`), and the full
 * {@link fourRegimeDichotomy} holds. So the strict/Scott/transfinite/aperiodic
 * classification is `V`-parametric in statement but `V`-independent in content —
 * decided by the closure ordinal `κ` alone. Checks the independence across the two
 * supplied instances and returns the shared regime + dichotomy. */
export declare function fourRegimeValueIndependent<A, B>(V1: ValueCategory<A>, T1: VClosure<A>, V2: ValueCategory<B>, T2: VClosure<B>, d: ClosureRegimeData): ValueIndependentRegimeWitness | {
    readonly kind: "settling.valueIndependentRegime-obstruction";
    readonly left: ClosureRegime;
    readonly right: ClosureRegime;
};
/** Whether the settling-associated sheaf's `H¹` vanishes in a regime: `true` in the
 * strict and Scott regimes, `false` in the transfinite-bounded and aperiodic regimes
 * (where the cohomological content concentrates). The corpus's regime-dependent
 * cohomology table — the structural ground of "no-arbitrage = H¹ = 0" in the settled
 * regimes. */
export declare function cohomologyVanishesInRegime(regime: ClosureRegime): boolean;
/** **`V = FOUR` is a value category.** The bilattice `ChargeValue` read as a value
 * category: order the knowledge order `≤ₖ`, equality `sameChargeValue`, seed the
 * knowledge-bottom `absurd` (`⊥ₖ`). The value category the spine settles over. */
export declare const chargeValueCategory: ValueCategory<ChargeValue>;
/** The full charge carrier (the four values) — the finite sample the law judgments
 * exhaust over. */
export declare const chargeSample: readonly ChargeValue[];
/** **Lift a charge knowledge-join to a `VClosure` over `V = FOUR`.** `op a = k ∨ₖ a`
 * (possibilize toward `k`) is inflationary, monotone, and idempotent in `≤ₖ` — the
 * canonical charge settling closure. Settling `⊥ₖ` under it reaches `k`. */
export declare const chargeJoinVClosure: (k: ChargeValue) => VClosure<ChargeValue>;
/** **`V = {0,1}` is a value category.** Boolean read as a value category: order
 * `a ≤ b ⇔ ¬a ∨ b`, equality `===`, seed `false` (`⊥`). The minimal value category
 * the regime claim quantifies over. */
export declare const booleanValueCategory: ValueCategory<boolean>;
/** The full Boolean carrier — the sample the law judgments exhaust over. */
export declare const booleanSample: readonly boolean[];
/** A boolean join-closure `op a = k ∨ a` — the `V = {0,1}` settling toward `k`. */
export declare const booleanJoinVClosure: (k: boolean) => VClosure<boolean>;
/** **Both `{0,1}` and FOUR recover the spine (HEADLINE).** Bundles the recovery:
 * `chargeValueCategory` and `booleanValueCategory` are genuine value categories (the
 * partial-order laws hold over their full finite carriers); a charge join-closure is
 * a genuine `VClosure` over FOUR (the closure laws hold over the four values); and
 * its settling from the seed `⊥ₖ` reaches the target `k` (`settle_kBot`) — the
 * standard bilattice settling is the `V = FOUR` case of settling-over-`V`. Returns
 * the law judgments and the worked `settle ⊥ₖ = k` check for a chosen target. */
export interface SpineRecoveryWitness {
    readonly kind: "settling.spineRecovery:witness";
    readonly chargePartialOrder: PartialOrderJudgment<ChargeValue>;
    readonly booleanPartialOrder: PartialOrderJudgment<boolean>;
    readonly chargeClosureLaws: ClosureLawJudgment<ChargeValue>;
    readonly settledTarget: ChargeValue;
    readonly reachesTarget: boolean;
}
/** Witness the spine recovery for a chosen target charge `k`: the value-category and
 * closure laws over the finite carriers, and `settleOverValue (k ∨ₖ ·) ⊥ₖ = k`. */
export declare function spineRecovery(k: ChargeValue): SpineRecoveryWitness;
export interface CountingDequantizationReceipt {
    readonly kind: "settling.dequantization.counting:witness";
    readonly sample: readonly number[];
    readonly support: readonly boolean[];
    readonly boolStochIdempotent: true;
    readonly natStochNotIdempotent: true;
    readonly mapsZero: true;
    readonly mapsOne: true;
    readonly mapsAddToOr: true;
    readonly mapsMulToAnd: true;
    readonly monotone: true;
    readonly diamondApexCount: 5;
    readonly diamondApexSupport: true;
    readonly exactDiscreteEndpoint: true;
    readonly continuousMaslovFrontier: "real-power interpolation remains proof/frontier work";
}
export interface MagnitudeWitnessReceipt {
    readonly kind: "settling.dequantization.magnitudeWitness:witness";
    readonly theoremSuppBlindToDvd: "RelMath.Dequantization.supp_blind_to_dvd";
    readonly theoremWitnessOne: "RelMath.Dequantization.witness_one";
    readonly theoremWitnessZero: "RelMath.Dequantization.witness_zero";
    readonly theoremDiamondBoundaryWitness: "RelMath.Dequantization.diamond_boundary_witness";
    readonly theoremDiamondInteriorNoWitness: "RelMath.Dequantization.diamond_interior_no_witness";
    readonly divisor: number;
    readonly divisibleMagnitude: number;
    readonly nondivisibleMagnitude: number;
    readonly supportDivisible: true;
    readonly supportNondivisible: true;
    readonly supportSame: true;
    readonly divisibleWitness: false;
    readonly nondivisibleWitness: true;
    readonly witnessOne: true;
    readonly witnessZero: false;
    readonly diamondBoundaryMagnitude: 1;
    readonly diamondInteriorMagnitude: 0;
    readonly diamondBoundaryWitness: true;
    readonly diamondInteriorWitness: false;
    readonly dequantizationForgetsDivisibility: true;
}
/** The support map `supp n = (0 < n)`: magnitude to existence. */
export declare function support(n: number): boolean;
export declare function divides(divisor: number, magnitude: number): boolean;
/** The non-divisibility witness `D ∤ C`: magnitude information Boolean support forgets. */
export declare function magnitudeWitness(divisor: number, magnitude: number): boolean;
export declare function countingDequantizationReceipt(sampleInput?: readonly number[]): CountingDequantizationReceipt;
/** Bundle the finite Node shadow of `RelMath.Value.MagnitudeWitness`. */
export declare function magnitudeWitnessReceipt(divisorInput?: number): MagnitudeWitnessReceipt;

export declare const closureRegimeDataSchema: {
    readonly $id: "metroplat/closure/value-category/closure-regime-data";
    readonly type: "object";
    readonly required: readonly ["kind", "scottContinuous", "finiteBase", "countableCofinality"];
    readonly properties: {
        readonly kind: {
            readonly const: "settling.closureRegimeData";
        };
        readonly scottContinuous: {
            readonly type: "boolean";
        };
        readonly finiteBase: {
            readonly type: "boolean";
        };
        readonly countableCofinality: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "ClosureRegimeData";
    readonly description: "The regime-determining flags of a closure: Scott continuity, finite base, countable cofinality.";
};
export declare const closureRegimeDataObstructionSchema: {
    readonly $id: "metroplat/closure/value-category/closure-regime-data-obstruction";
    readonly type: "object";
    readonly required: readonly ["kind", "constraint"];
    readonly properties: {
        readonly kind: {
            readonly const: "settling.closureRegimeData-obstruction";
        };
        readonly constraint: {
            readonly enum: readonly ["finiteBase→scottContinuous", "finiteBase→countableCofinality"];
        };
    };
    readonly additionalProperties: false;
    readonly title: "ClosureRegimeDataObstruction";
    readonly description: "The regime data violates the finiteBase-implies-scottContinuous/countableCofinality constraint.";
};
