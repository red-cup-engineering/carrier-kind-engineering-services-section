/**
 * positing/logic/linear-logic-chu — Chu spaces valued in FOUR, and FOUR read
 * \*-autonomously.
 *
 * Source: `Obsmetrologia/Calculus/Logic/LinearLogicChu.lean`, namespace
 * `Obsmetrologia` (`ChuSpace`, `ChuSpace.dual`, `ChuSpace.dual_involution`,
 * `ChuSpace.dual_dual_r`, `Chu.dual_involution`, `ChuMap`, `ChuMap.id`,
 * `ChuMap.comp`, `ChuMap.dualMap`, `ChuMap.dualMap_dualMap`,
 * `four_negate_involution`, `four_star_autonomous`, `chargeFuse`, `chargeImp`,
 * `chargeFuse_tle_iff`, `diamond_adjoint_box`).
 *
 * Lean's `ChuSpace` is `⟨pts, sts, r⟩` with `r : pts → sts → Charge` over fully
 * general carrier `Type`s. The executable form fixes the two carriers to finite,
 * named point and state lists and stores `r` as a dense matrix of charge
 * carriers, because the headline law is an EQUALITY OF STRUCTURES
 * (`dual (dual C) = C`); a closure-valued matrix cannot witness that equality,
 * a transportable carrier can. `absent` is the entry a read outside the matrix
 * returns, and rides along under `negate` in the dual so the round trip is exact
 * off the matrix too.
 *
 * The alphabet is NOT re-derived here. Charges, their two orders, `negate` and
 * `joinKnowledge` are `positing/bilattice-charge`'s; the multiplicative fusion
 * `⊗` and residuum `⊸` this module reads `*`-autonomously are
 * `positing/logic/bilattice-linear-logic`'s `linearFusionValue` /
 * `linearResiduumValue`. Evidence merges and compares by STRUCTURAL content
 * coincidence, as everywhere else in this package.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { type ChargeCarrier, type ChargeValue, type ChargeValueName } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
/** A Chu space valued in FOUR: two named carriers and a dense charge matrix. */
export declare const ChuSpaceSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "points", "states", "absent", "matrix"];
    readonly properties: {
        readonly kind: {
            readonly const: "linearLogicChu.space";
        };
        readonly points: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly states: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly absent: any;
        readonly matrix: {
            readonly type: "array";
            readonly items: {
                readonly type: "array";
                readonly items: any;
            };
        };
    };
    readonly description: "A Chu space valued in FOUR: the points (rows), the states (columns), the charge a read outside the matrix returns, and the dense charge matrix r : points × states → Charge.";
    readonly additionalProperties: false;
};
/** `Obsmetrologia.ChuSpace` at finite named carriers: `⟨points, states, r⟩`. */
export type ChuSpace = FromJsonSchema<typeof ChuSpaceSchema>;
/** One cell of a point's costate: the charge this point carries at one state. */
export interface ChuCell {
    readonly state: string;
    readonly charge: ChargeCarrier;
}
/** One cell of a state's extension: the charge one point carries at this state. */
export interface ChuCoCell {
    readonly point: string;
    readonly charge: ChargeCarrier;
}
/** The charge a `(point, state)` read outside the matrix returns. */
export interface ChuSpaceOptions {
    readonly absent?: ChargeCarrier;
}
/**
 * Build a Chu space from a value function. Points and states are frozen in the
 * given order, so row and column reads are deterministic. A cell whose state is
 * outside the state carrier, or whose `chargeAt` returns null/undefined, reads
 * as `absent` (default `bottom` — the open-world "nothing witnessed here").
 */
export declare function chuSpace(points: Iterable<string>, states: Iterable<string>, chargeAt: (point: string, state: string) => ChargeCarrier | null | undefined, options?: ChuSpaceOptions): ChuSpace;
/** Build a Chu space from an explicit `{ [point]: { [state]: ChargeCarrier } }` matrix. */
export declare function chuSpaceOfMatrix(points: Iterable<string>, states: Iterable<string>, matrix: Readonly<Record<string, Readonly<Record<string, ChargeCarrier>>>>, options?: ChuSpaceOptions): ChuSpace;
/** Whether a value is a Chu space built by this module. */
export declare function isChuSpace(value: unknown): value is ChuSpace;
/** `r a x` — the charge at one point/state pair; `absent` outside the matrix. */
export declare function at(space: ChuSpace, point: string, state: string): ChargeCarrier;
/** The charge VALUE at one point/state pair (the name-level read of `at`). */
export declare function valueAt(space: ChuSpace, point: string, state: string): ChargeValue;
/** A point's costate: its charge across every state (a row of the matrix). */
export declare function row(space: ChuSpace, point: string): readonly ChuCell[];
/** A state's extension-with-charges: every point's charge on it (a column). */
export declare function col(space: ChuSpace, state: string): readonly ChuCoCell[];
/**
 * The positive extension of a state: the points whose charge is `potential` —
 * truth present, falsity absent, the truth-order top of FOUR.
 */
export declare function extension(space: ChuSpace, state: string): readonly string[];
/** Transpose: swap points and states, transpose the matrix. `transpose ∘ transpose = id`. */
export declare function transpose(space: ChuSpace): ChuSpace;
/**
 * `Obsmetrologia.ChuSpace.dual` — the linear-logic dual `(–)^⊥`: transpose the
 * matrix (`points ↔ states`) AND negate every charge entry. `absent` is negated
 * too, so the round trip is exact off the matrix as well.
 */
export declare function dual(space: ChuSpace): ChuSpace;
/** Whether two charges denote the same value and carry coincident evidence. */
export declare function sameChuCharge(left: ChargeCarrier, right: ChargeCarrier): boolean;
/** Whether two Chu spaces are the same structure — the executable form of the Lean equality. */
export declare function sameChuSpace(left: ChuSpace, right: ChuSpace): boolean;
/** Fold a column to one charge through a bilattice join (default ⊕, identity ⊥). */
export declare function settleColumn(space: ChuSpace, state: string, join?: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier, identity?: ChargeCarrier): ChargeCarrier;
/** Fold a row to one charge through a bilattice join (default ⊕, identity ⊥). */
export declare function settleRow(space: ChuSpace, point: string, join?: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier, identity?: ChargeCarrier): ChargeCarrier;
/** The forward leg of a Chu transform: points run covariantly. */
export type ChuForward = (point: string) => string;
/** The backward leg of a Chu transform: states pull back contravariantly. */
export type ChuBackward = (state: string) => string;
/** A leg of a candidate transform left its carrier. */
export interface ChuMapDomainFailure {
    readonly kind: "linearLogicChu.chuMap.domain-failure";
    readonly leg: "forward" | "backward";
    readonly from: string;
    readonly mapped: string;
}
/** Adjointness failed at one `(point, state)` cell. */
export interface ChuMapAdjointnessFailure {
    readonly kind: "linearLogicChu.chuMap.adjointness-failure";
    readonly point: string;
    readonly state: string;
    readonly target: ChargeValueName;
    readonly source: ChargeValueName;
}
/** A reason a candidate adjoint pair is not a Chu transform. */
export type ChuMapFailure = ChuMapDomainFailure | ChuMapAdjointnessFailure;
/** The candidate pair is adjoint on every cell and both legs stay in their carriers. */
export interface ChuMapWitness {
    readonly kind: "linearLogicChu.chuMap:witness";
    readonly failures: readonly [];
}
/** The candidate pair is not a Chu transform; every failing cell is named. */
export interface ChuMapObstruction {
    readonly kind: "linearLogicChu.chuMap-obstruction";
    readonly failures: readonly ChuMapFailure[];
}
/** The result of checking a candidate adjoint pair. */
export type ChuMapJudgment = ChuMapWitness | ChuMapObstruction;
/**
 * `Obsmetrologia.ChuMap` — a Chu transform `C → D`: a forward map on points, a
 * backward map on states, and the adjointness EQUALITY IN FOUR
 * `D.r (fwd a) y = C.r a (bwd y)` on every point and state.
 */
export interface ChuMap {
    readonly kind: "linearLogicChu.map";
    readonly source: ChuSpace;
    readonly target: ChuSpace;
    readonly forward: ChuForward;
    readonly backward: ChuBackward;
}
/**
 * Check a candidate adjoint pair `source → target`. Both legs must stay in their
 * carriers (forward into `target.points`, backward into `source.states`), and
 * the adjointness equality must hold as a charge VALUE identity on every cell.
 */
export declare function checkChuMap(source: ChuSpace, target: ChuSpace, forward: ChuForward, backward: ChuBackward): ChuMapJudgment;
/** Construct a Chu transform from an adjoint pair, refusing a pair that is not adjoint. */
export declare function chuMap(source: ChuSpace, target: ChuSpace, forward: ChuForward, backward: ChuBackward): ChuMap;
/** `Obsmetrologia.ChuMap.id` — the identity transform; adjointness is reflexivity. */
export declare function idChuMap(space: ChuSpace): ChuMap;
/**
 * `Obsmetrologia.ChuMap.comp` — composition. Points run forward through both;
 * states pull back through both in the OPPOSITE order, which is what makes the
 * composite well-typed.
 */
export declare function composeChuMaps(first: ChuMap, second: ChuMap): ChuMap;
/**
 * `Obsmetrologia.ChuMap.dualMap` — the dual of a transform `(f,g) ↦ (g,f) :
 * dual D → dual C`: forward and backward swap roles, and adjointness in the dual
 * is the original adjointness with both sides negated.
 */
export declare function dualChuMap(map: ChuMap): ChuMap;
/** `Obsmetrologia.chargeFuse` — the multiplicative `⊗` on charge values. */
export declare const chargeFuse: (left: ChargeValue, right: ChargeValue) => ChargeValue;
/** `Obsmetrologia.chargeImp` — the linear implication `⊸` on charge values. */
export declare const chargeImp: (left: ChargeValue, right: ChargeValue) => ChargeValue;
/** `◇ a := a ⊗ k` at a fixed accessibility charge `k`. */
export declare const diamondAt: (k: ChargeValue) => (a: ChargeValue) => ChargeValue;
/** `□ b := k ⊸ b` at a fixed accessibility charge `k`. */
export declare const boxAt: (k: ChargeValue) => (b: ChargeValue) => ChargeValue;
/** The exhaustive finite receipt for `Obsmetrologia/Calculus/Logic/LinearLogicChu.lean`. */
export interface LinearLogicChuLawReceipt {
    readonly kind: "linearLogicChu.laws:witness";
    readonly source: "Obsmetrologia/Calculus/Logic/LinearLogicChu.lean";
    /** `Obsmetrologia.ChuSpace.dual_involution` / `Obsmetrologia.Chu.dual_involution`. */
    readonly dualInvolution: boolean;
    /** `Obsmetrologia.ChuSpace.dual_dual_r`. */
    readonly dualDualPointwise: boolean;
    /** The transpose is its own inverse (the orientation half of the dual). */
    readonly transposeInvolution: boolean;
    /** The dual swaps the two carriers. */
    readonly dualSwapsCarriers: boolean;
    /** `Obsmetrologia.four_negate_involution`. */
    readonly fourNegateInvolution: boolean;
    /** `Obsmetrologia.four_star_autonomous`, first conjunct, on charge values. */
    readonly tensorHomAdjunction: boolean;
    /** `Obsmetrologia.four_star_autonomous` — both conjuncts bundled. */
    readonly fourStarAutonomous: boolean;
    /** `Obsmetrologia.chargeFuse_tle_iff`. */
    readonly chargeFuseTleIff: boolean;
    /** `Obsmetrologia.diamond_adjoint_box`, at every accessibility charge. */
    readonly diamondAdjointBox: boolean;
    /** `Obsmetrologia.ChuMap.id` is adjoint on every space checked. */
    readonly identityAdjoint: boolean;
    /** `Obsmetrologia.ChuMap.comp` preserves adjointness. */
    readonly compositionAdjoint: boolean;
    /** `Obsmetrologia.ChuMap.dualMap` is adjoint. */
    readonly dualMapAdjoint: boolean;
    /** `Obsmetrologia.ChuMap.dualMap_dualMap`: `fwd`/`bwd` return to the original pair. */
    readonly dualMapDualMap: boolean;
    /** How many Chu spaces the space-level laws were checked on. */
    readonly spacesChecked: number;
    /** How many individual law comparisons the receipt performed. */
    readonly comparisons: number;
}
/**
 * Enumerate every Chu space on the given point and state carriers, at every
 * `absent` charge — the finite universe the space-level laws are checked over.
 */
export declare function chuSpaceUniverse(points: readonly string[], states: readonly string[]): readonly ChuSpace[];
/**
 * Bundle the exhaustive finite receipt for `LinearLogicChu.lean`. Space-level
 * laws run over every Chu space on the given carriers at every `absent` charge;
 * alphabet-level laws run over all of FOUR (and all of FOUR³ for the
 * adjunctions). Nothing here is asserted — every field is computed.
 */
export declare function linearLogicChuLawReceipt(points?: readonly string[], states?: readonly string[]): LinearLogicChuLawReceipt;
