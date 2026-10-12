/**
 * @packageDocumentation
 *
 * settling/stochastic — settling over the stochastic semiring (Markov, martingale).
 *
 * The value-category hub runs settling over any `V`. Its `stochastic-settling`
 * child takes `V` to be the **stochastic semiring** `([0,1], ·, +)` — `·` as
 * probability along a path, `+` as the convex combine over alternative paths — and
 * the canonical instance is Markov-chain transition settling: a finite state space,
 * a transition kernel `P`, and the closure step `T_stoch(v)(s,o) = Σ_z v(s,z)·P(z,o)`
 * (one matrix multiply). The **stationary distribution** `π` (with `π·P = π`) is the
 * settling's fixed point. Ported from `lean/RelMath/Probability/Stochastic.lean`.
 *
 * No reals, no rationals: the probability semiring is taken **abstractly** (a carrier
 * with `0/1/+/·` and a partial order), and the canonical `Nat` (counting-weight)
 * instance reuses relating's exact-number arithmetic. The Perron–Frobenius/stationary
 * content is structural over the abstract value. The headline finance reading: a
 * **martingale = a stationary process = a stochastic-closure fixed point** — the
 * substrate of the no-arbitrage / risk-neutral measure (FTAP).
 */
import { type ValueCategory, type VClosure, type ClosureRegimeData, type ValueIndependentRegimeWitness } from "./value-category.mjs";
import { type ClosureRegime } from "./closure.mjs";
import { type Natural, type Rational } from "./analysis/exact-number.mjs";
/** An **abstract stochastic semiring** `V`: the value structure stochastic settling
 * runs over — a carrier with `zero`/`one`/`add` (convex combine)/`mul` (sequential
 * probability) and a partial order `le`/`eq`. The corpus's `([0,1], ·, +)` taken at
 * the order-theoretic level the stationary/closure statements need (no reals). */
export interface StochSemiring<C> {
    readonly kind: "settling.stochSemiring";
    readonly zero: C;
    readonly one: C;
    readonly add: (left: C, right: C) => C;
    readonly mul: (left: C, right: C) => C;
    readonly le: (left: C, right: C) => boolean;
    readonly eq: (left: C, right: C) => boolean;
}
/** Construct a stochastic semiring from its operations. */
export declare const stochSemiring: <C>(zero: C, one: C, add: (l: C, r: C) => C, mul: (l: C, r: C) => C, le: (l: C, r: C) => boolean, eq: (l: C, r: C) => boolean) => StochSemiring<C>;
/** **The `Nat` stochastic semiring (counting weights).** The canonical concrete
 * instance over relating's exact `Natural`: the no-reals model of probability
 * weights, where counting measure `μ(A) = |A|` lives. */
export declare const natStochSemiring: StochSemiring<Natural>;
/** The exact rational stochastic semiring used by finite probability witnesses. */
export declare const ratStochSemiring: StochSemiring<Rational>;
/** A **Markov kernel** on a finite state space `S` valued in `V`: a transition kernel
 * `P : S → S → V` with a finite enumeration `states` (the list the matrix-multiply
 * sum ranges over). */
export interface MarkovKernel<S, C> {
    readonly kind: "settling.markovKernel";
    readonly states: readonly S[];
    readonly P: (z: S, o: S) => C;
}
/** Construct a Markov kernel from its state enumeration and transition kernel. */
export declare const markovKernel: <S, C>(states: readonly S[], P: (z: S, o: S) => C) => MarkovKernel<S, C>;
/** Weighted sum over the state enumeration `Σ_{z ∈ states} f z` (foldr add zero). */
export declare const kernelSum: <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, f: (z: S) => C) => C;
/** **Row action of the kernel on a distribution** `(advance π)(o) = Σ_z π z · P(z,o)`
 * — the stochastic vector-matrix product `π · P`. `π` is stationary iff `advance π = π`. */
export declare const advance: <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C) => (o: S) => C;
/** **The stochastic closure** `T_stoch(v)(s,o) = Σ_z v(s,z)·P(z,o)` — one Markov
 * advance (matrix multiply on the right). Iterating gives `v_k = P^k`; its fixed
 * point is the stationary settling. */
export declare const stochClosure: <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, v: (s: S, z: S) => C) => (s: S, o: S) => C;
/** **`π` is a stationary distribution of `K`**: `∀ o, Σ_z π z · P z o = π o` (`π·P = π`
 * over the listed states). The defining equation of a Markov stationary distribution. */
export declare const isStationary: <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C) => boolean;
/** Whether each origin row of a finite Markov kernel sums to the stochastic unit. */
export declare const rowsSumToOne: <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>) => boolean;
/** Detailed balance: `pi z * P z o = pi o * P o z` for every pair of states. */
export declare const detailedBalance: <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C) => boolean;
export interface DetailedBalanceStationaryWitness {
    readonly kind: "settling.detailedBalanceImpliesStationary:witness";
    readonly detailedBalance: boolean;
    readonly rowsSumToOne: boolean;
    readonly stationary: boolean;
    readonly implicationHolds: boolean;
}
/** Finite detailed-balance witness: detailed balance plus stochastic rows give stationarity. */
export declare function detailedBalanceImpliesStationary<S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C): DetailedBalanceStationaryWitness;
/** A witness identifying Markov-stationary with the stochastic-closure fixed point. */
export interface StationaryFixpointWitness<S> {
    readonly kind: "settling.markovStationaryIsClosureFixpoint:witness";
    /** `π · P = π` over the listed states. */
    readonly stationary: boolean;
    /** `T_stoch π = π` over the listed states — the *same* equation. */
    readonly fixpoint: boolean;
    /** Whether the two readings agree (always true: they are one defining equation). */
    readonly equivalent: boolean;
}
/** **Markov stationary = stochastic-closure fixed point (HEADLINE).** A distribution
 * `π` is stationary iff it is a fixed point of the stochastic closure on `π` — the
 * *same* equation `advance π = π`. So a Markov stationary distribution **is** a
 * stochastic-settling fixed point (and a martingale, read on the value side). */
export declare function markovStationaryIsClosureFixpoint<S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C): StationaryFixpointWitness<S>;
/** **A stochastic semiring is a hub value category.** `stochVC V` reads `V`'s
 * partial-order-with-seed (`le`/`eq`, seed `0`) as a {@link ValueCategory}, so all of
 * the value-category hub (including the four-regime classification) applies to
 * stochastic settling. */
export declare const stochVC: <C>(V: StochSemiring<C>) => ValueCategory<C>;
/** **The value-level stochastic closure** (the quiescent identity endo on `V`): a
 * `VClosure` over `stochVC V` whose settling is the value itself — witnessing that
 * `stochVC V` admits a closure, so the four-regime classification applies. */
export declare const stochVClosure: <C>(_V: StochSemiring<C>) => VClosure<C>;
/** **The doubly-stochastic 2-state witness kernel** (Perron–Frobenius existence
 * witness): over `natStochSemiring`, states `[0,1]`, the identity transition
 * `P z o = (z = o ? 1 : 0)` — every row and column sums to `1`. */
export declare const witnessKernel: MarkovKernel<number, Natural>;
/** **The uniform distribution on the 2-state witness** `π s = 1` — the stationary
 * distribution for the identity kernel. */
export declare const uniformWitness: (_s: number) => Natural;
/** **Perron–Frobenius existence (concrete witness): the uniform distribution is
 * stationary.** For the doubly-stochastic `witnessKernel`, `π · P = π` (each column
 * sums to `1`). A settling fixed point exists — proved with no reals. */
export declare const uniformWitnessStationary: () => boolean;
/** RelMath's finite exact-rational two-state Poisson-settling kernel. */
export declare const poissonKernel: MarkovKernel<number, Rational>;
/** Stationary distribution for {@link poissonKernel}: `[1/3, 2/3]`. */
export declare const poissonPi: (state: number) => Rational;
/** Native finite arithmetic shadow of the Poisson detailed-balance identity. */
export declare function poissonDetailedBalance(lambda: number, n: number): boolean;
export interface PoissonSettlingWitness {
    readonly kind: "settling.poissonSettling:witness";
    readonly detailedBalance: boolean;
    readonly rowsSumToOne: boolean;
    readonly stationary: boolean;
    readonly fixpoint: boolean;
    readonly equivalent: boolean;
    readonly detailedBalanceImpliesStationary: DetailedBalanceStationaryWitness;
}
/** Finite exact-rational receipt for `RelMath.Probability.PoissonSettling`. */
export declare function poissonSettlingReceipt(): PoissonSettlingWitness;
/** A witness that stochastic settling is a hub `V`-settling: the four-regime
 * classification applies `V`-independently, and a stationary settling exists. */
export interface StochasticIsValueSettlingWitness {
    readonly kind: "settling.stochasticIsValueSettling:witness";
    readonly regime: ClosureRegime;
    readonly regimeIndependent: ValueIndependentRegimeWitness | {
        readonly kind: "settling.valueIndependentRegime-obstruction";
        readonly left: ClosureRegime;
        readonly right: ClosureRegime;
    };
    readonly stationaryExists: boolean;
}
/** **Stochastic settling IS a hub `V`-settling (HEADLINE).** For any stochastic
 * semiring `V` and regime data `d`: (a) `stochVC V` is a value category carrying
 * `stochVClosure V`, so its regime is `regimeOfValueSettling` — `V`-independent and
 * agreeing with FOUR's regime via {@link fourRegimeValueIndependent}; and (b)
 * Perron–Frobenius existence holds concretely (the uniform distribution is a
 * stationary stochastic-closure fixed point). So stochastic settling is the hub's
 * settling at the stochastic semiring, the four-regime stratification applies, and a
 * stationary settling provably exists. */
export declare function stochasticIsValueSettling<C>(V: StochSemiring<C>, d: ClosureRegimeData): StochasticIsValueSettlingWitness;

export declare const detailedBalanceStationaryWitnessSchema: {
    readonly $id: "metroplat/closure/stochastic/detailed-balance-stationary-witness";
    readonly type: "object";
    readonly required: readonly ["kind", "detailedBalance", "rowsSumToOne", "stationary", "implicationHolds"];
    readonly properties: {
        readonly kind: {
            readonly const: "settling.detailedBalanceImpliesStationary:witness";
        };
        readonly detailedBalance: {
            readonly type: "boolean";
        };
        readonly rowsSumToOne: {
            readonly type: "boolean";
        };
        readonly stationary: {
            readonly type: "boolean";
        };
        readonly implicationHolds: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "DetailedBalanceStationaryWitness";
    readonly description: "Detailed balance plus stochastic rows give stationarity.";
};
