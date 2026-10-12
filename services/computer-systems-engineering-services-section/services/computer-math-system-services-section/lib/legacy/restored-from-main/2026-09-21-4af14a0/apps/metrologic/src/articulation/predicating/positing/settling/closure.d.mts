/**
 * settling/closure — bounded ordinal closure as carrier data.
 *
 * This module is the Node-side workbench for processes that can be read as
 * repeated application of a monotone endomorphism on a caller-supplied lattice.
 * It does not try to be a general ordinal runtime. It gives ordinary Node code
 * an observable closure carrier: the orbit from bottom, the searched
 * stabilization stage, and a finite / Scott / transfinite regime read when the
 * bounded search finds a witness.
 *
 * Ordinals are built as zero / successor / labelled limit with a fundamental
 * sequence; a `Lattice<T>` carries bottom, leq, join, eq, and a stabilizing sup;
 * a `ClosureProcessCarrier<T>` is an endomorphism over that lattice with a
 * search horizon. `closeOrdinalProcess` iterates from bottom, recording the
 * finite orbit it actually evaluates, then probes finite and labelled limit
 * stages for stabilization. The result is a witness or obstruction, never an
 * implicit claim that all transfinite behavior has been decided.
 *
 * @example
 * ```js
 * import * as settling from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
 *
 * const eq = (left, right) => left === right;
 * const lattice = {
 *   bottom: 0,
 *   leq: (left, right) => left <= right,
 *   join: (left, right) => Math.max(left, right),
 *   eq,
 *   sup: settling.stabilizingSup({ eq }),
 * };
 *
 * const process = settling.closureProcess(lattice, (value) => Math.min(3, value + 1));
 * const closed = settling.closeOrdinalProcess(process);
 *
 * closed.search.kind; // "ordinal.closure.stabilizationSearch:witness"
 * closed.search.regime.kind; // "ordinal.closure.regime.finite"
 * ```
 *
 * @see closeOrdinalProcess
 */
import { type Natural } from "./analysis/exact-number.mjs";
import { type Mark } from "@red-cup-engineering/computer-data-engine/utterance";
/** The zero ordinal. */
export interface ZeroOrdinal {
    readonly kind: "ordinal.closure.ordinal.zero";
}
/** A successor ordinal. */
export interface SuccessorOrdinal {
    readonly kind: "ordinal.closure.ordinal.successor";
    readonly predecessor: Ordinal;
}
/** A label for a limit ordinal: an opaque mark, never a display string. */
export interface OrdinalLabel {
    readonly kind: "ordinal.closure.ordinalLabel";
    readonly mark: Mark;
}
/** A carrier label for canonical omega multiples. */
export interface OmegaMultipleOrdinalLabel {
    readonly kind: "ordinal.closure.omegaMultipleLabel";
    readonly multiplier: Natural;
}
/** A carrier label for omega squared. */
export interface OmegaSquaredOrdinalLabel {
    readonly kind: "ordinal.closure.omegaSquaredLabel";
}
/** A limit ordinal: a labelled ordinal with a fundamental sequence. */
export interface LimitOrdinal {
    readonly kind: "ordinal.closure.ordinal.limit";
    readonly label: OrdinalLabel;
    readonly fundamentalSequence: (n: Natural) => Ordinal;
}
/** An ordinal in the closure tower. */
export type Ordinal = ZeroOrdinal | SuccessorOrdinal | LimitOrdinal;
/** Witness that an ordinal is finite, with its natural value. */
export interface FiniteOrdinalWitness {
    readonly kind: "ordinal.closure.finiteOrdinal:witness";
    readonly ordinal: Ordinal;
    readonly value: Natural;
}
/** Obstruction to an ordinal being finite, with the non-zero residue. */
export interface FiniteOrdinalObstruction {
    readonly kind: "ordinal.closure.finiteOrdinal-obstruction";
    readonly ordinal: Ordinal;
    readonly residue: Ordinal;
}
/** The result of testing whether an ordinal is finite. */
export type FiniteOrdinalJudgment = FiniteOrdinalWitness | FiniteOrdinalObstruction;
/** The finite closure regime. */
export interface FiniteClosureRegime {
    readonly kind: "ordinal.closure.regime.finite";
}
/** The Scott closure regime (closure at omega). */
export interface ScottClosureRegime {
    readonly kind: "ordinal.closure.regime.scott";
}
/** The transfinite closure regime (beyond omega). */
export interface TransfiniteClosureRegime {
    readonly kind: "ordinal.closure.regime.transfinite";
}
/** The aperiodic closure regime (no countable stabilization). */
export interface AperiodicClosureRegime {
    readonly kind: "ordinal.closure.regime.aperiodic";
}
/** A closure regime in which the bounded process has a stabilization witness. */
export type StabilizingClosureRegime = FiniteClosureRegime | ScottClosureRegime | TransfiniteClosureRegime;
/** A closure regime. */
export type ClosureRegime = StabilizingClosureRegime | AperiodicClosureRegime;
/**
 * A caller-supplied lattice over `T`.
 *
 * `closeOrdinalProcess` trusts this object as the semantic carrier for the
 * process. `bottom` is the seed, `leq` and `join` describe the order, `eq`
 * decides stabilization, and `sup` supplies the limit-stage value for the
 * process's fundamental sequences.
 */
export interface Lattice<T> {
    readonly bottom: T;
    readonly leq: (left: T, right: T) => boolean;
    readonly join: (left: T, right: T) => T;
    readonly eq: (left: T, right: T) => boolean;
    readonly sup: (sequence: (n: Natural) => T) => T;
}
/**
 * The observable result of running a bounded closure process.
 *
 * `value` is the best value found by the search. When `search.kind` is
 * `"ordinal.closure.stabilizationSearch:witness"`, it is the stabilized value.
 * When the search returns an obstruction, it is the value at the searched bound.
 */
export interface ClosureCarrier<T> {
    readonly kind: "ordinal.closure.carrier";
    readonly process: ClosureProcessCarrier<T>;
    readonly value: T;
    readonly orbit: readonly ClosureOrbitPoint<T>[];
    readonly search: ClosureStabilizationSearchJudgment<T>;
    readonly stabilization: ClosureStabilizationJudgment<T>;
}
/**
 * A closure process: a lattice, an endomorphism, and a search horizon.
 *
 * The package does not prove the endomorphism is monotone or inflationary for an
 * arbitrary JavaScript function. Supplying a lawful endomorphism is the caller's
 * contract; the returned carrier records what the bounded search observed.
 */
export interface ClosureProcessCarrier<T> {
    readonly kind: "ordinal.closure.process";
    readonly lattice: Lattice<T>;
    readonly endomorphism: (value: T) => T;
    readonly horizon: ClosureStabilizationSearchHorizon;
}
/** A point on the closure orbit. */
export interface ClosureOrbitPoint<T> {
    readonly kind: "ordinal.closure.orbitPoint";
    readonly stage: Ordinal;
    readonly value: T;
}
/** Witness that the closure stabilizes at an ordinal. */
export interface ClosureStabilizationWitness<T> {
    readonly kind: "ordinal.closure.stabilization:witness";
    readonly ordinal: Ordinal;
    readonly value: T;
    readonly successor: T;
}
/** Obstruction to closure stabilization at the searched bound. */
export interface ClosureStabilizationObstruction<T> {
    readonly kind: "ordinal.closure.stabilization-obstruction";
    readonly searchedThrough: Ordinal;
    readonly value: T;
    readonly successor: T;
}
/** The result of testing stabilization at one ordinal. */
export type ClosureStabilizationJudgment<T> = ClosureStabilizationWitness<T> | ClosureStabilizationObstruction<T>;
/** Witness that the bounded search found stabilization, with its regime. */
export interface ClosureStabilizationSearchWitness<T> {
    readonly kind: "ordinal.closure.stabilizationSearch:witness";
    readonly ordinal: Ordinal;
    readonly regime: StabilizingClosureRegime;
    readonly stabilization: ClosureStabilizationWitness<T>;
}
/** Obstruction from the bounded search (claims no regime). */
export interface ClosureStabilizationSearchObstruction<T> {
    readonly kind: "ordinal.closure.stabilizationSearch-obstruction";
    readonly searchedThrough: Ordinal;
    readonly stabilization: ClosureStabilizationObstruction<T>;
}
/** The result of the bounded stabilization search. */
export type ClosureStabilizationSearchJudgment<T> = ClosureStabilizationSearchWitness<T> | ClosureStabilizationSearchObstruction<T>;
/** The bound on the stabilization search. */
export interface ClosureStabilizationSearchHorizon {
    readonly kind: "ordinal.closure.stabilizationSearchHorizon";
    readonly finiteStages: Natural;
    readonly limitBlocks: Natural;
}
/** One block of the stabilization search. */
export interface ClosureSearchBlock {
    readonly kind: "ordinal.closure.searchBlock";
    readonly base: Ordinal;
    readonly finiteStages: Natural;
}
/** The zero ordinal. */
export declare const zeroOrdinal: ZeroOrdinal;
/** The successor of an ordinal. */
export declare const successorOrdinal: (predecessorOrdinal: Ordinal) => SuccessorOrdinal;
/** An ordinal label wrapping a mark. */
export declare const ordinalLabel: (label: Mark) => OrdinalLabel;
/** A limit ordinal from a label and a fundamental sequence. */
export declare const limitOrdinal: (label: OrdinalLabel, fundamentalSequence: (n: Natural) => Ordinal) => LimitOrdinal;
/** The finite ordinal of value n. */
export declare const finiteOrdinal: (n: Natural) => Ordinal;
/** The ordinal obtained by applying successor n times. */
export declare const ordinalPlusFinite: (ordinal: Ordinal, n: Natural) => Ordinal;
/** Omega: the limit whose fundamental sequence enumerates the finite ordinals. */
export declare const omegaOrdinal: () => Ordinal;
/** Omega times k. */
export declare const omegaMultipleOrdinal: (k: Natural) => Ordinal;
/** Omega squared. */
export declare const omegaSquaredOrdinal: () => Ordinal;
/** Whether an ordinal is zero. */
export declare const isZeroOrdinal: (ordinal: Ordinal) => ordinal is ZeroOrdinal;
/** Whether an ordinal is a successor. */
export declare const isSuccessorOrdinal: (ordinal: Ordinal) => ordinal is SuccessorOrdinal;
/** Whether an ordinal is a limit. */
export declare const isLimitOrdinal: (ordinal: Ordinal) => ordinal is LimitOrdinal;
/** The finite closure regime value. */
export declare const finiteClosureRegime: FiniteClosureRegime;
/** The Scott closure regime value. */
export declare const scottClosureRegime: ScottClosureRegime;
/** The transfinite closure regime value. */
export declare const transfiniteClosureRegime: TransfiniteClosureRegime;
/** The aperiodic closure regime value. */
export declare const aperiodicClosureRegime: AperiodicClosureRegime;
/** Construct a stabilization search horizon. */
export declare const closureStabilizationSearchHorizon: (finiteStages: Natural, limitBlocks: Natural) => ClosureStabilizationSearchHorizon;
/**
 * Construct a closure process.
 *
 * The default horizon checks 64 finite stages and 4 labelled omega-multiple
 * limit blocks before the final omega-squared probe.
 */
export declare const closureProcess: <T>(lattice: Lattice<T>, endomorphism: (value: T) => T, horizon?: ClosureStabilizationSearchHorizon) => ClosureProcessCarrier<T>;
/** Construct a search block. */
export declare const closureSearchBlock: (base: Ordinal, finiteStages: Natural) => ClosureSearchBlock;
/** The ordered search blocks for a horizon. */
export declare function closureSearchBlocks(horizon: ClosureStabilizationSearchHorizon): readonly ClosureSearchBlock[];
/** Whether an ordinal is finite, by stripping its successor chain. */
export declare function finiteOrdinalJudgment(ordinal: Ordinal): FiniteOrdinalJudgment;
/** The closure approximant of a process at an ordinal stage. */
export declare const closureApproximant: <T>(process: ClosureProcessCarrier<T>, ordinal: Ordinal) => T;
/**
 * The finite closure orbit of a process, yielded from bottom by successor
 * iteration.
 *
 * This generator does not visit limit stages; limit-stage reads are performed by
 * `closureStabilizationAt` and `closeOrdinalProcess` through the lattice `sup`.
 */
export declare function closureOrbitOfProcess<T>(process: ClosureProcessCarrier<T>): Generator<ClosureOrbitPoint<T>>;
/**
 * A bounded-friendly `sup` helper: return the first sequence value equal to its
 * predecessor.
 *
 * This is useful for finite examples whose limit approximation eventually
 * repeats. It is not a mathematical supremum for arbitrary infinite chains.
 */
export declare const stabilizingSup: <T>(lattice: Pick<Lattice<T>, "eq">) => (sequence: (n: Natural) => T) => T;
/**
 * Classify the stabilizing regime of an ordinal recognized by this workbench.
 *
 * Finite ordinals are finite regimes; omega-like limits whose early
 * fundamental-sequence sample is finite are Scott regimes; the remaining
 * recognized limits are transfinite regimes.
 */
export declare function closureRegimeOfOrdinal(ordinal: Ordinal): StabilizingClosureRegime;
/** Whether a process stabilizes at an ordinal (approximant equals its successor). */
export declare function closureStabilizationAt<T>(process: ClosureProcessCarrier<T>, ordinal: Ordinal): ClosureStabilizationJudgment<T>;
/**
 * Run the bounded stabilization search over a process.
 *
 * The function records the finite successor orbit it evaluates, then checks the
 * configured finite and limit blocks for a stabilization witness. A returned
 * obstruction means "not found within this horizon", not "no fixed point
 * exists".
 */
export declare function closeOrdinalProcess<T>(process: ClosureProcessCarrier<T>): ClosureCarrier<T>;
