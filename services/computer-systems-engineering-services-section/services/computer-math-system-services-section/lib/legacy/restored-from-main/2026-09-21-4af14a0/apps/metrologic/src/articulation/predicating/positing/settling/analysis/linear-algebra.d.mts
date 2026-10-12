/**
 * analysis/linear-algebra - finite exact matrix receipts.
 *
 * This is the executable shadow of the RelMath LinearAlgebra spine: finite
 * integer matrices, Smith factors, rank, nullity, determinant, and
 * characteristic polynomial. The abstract field/vector-space proof remains in
 * Lean; this module records the computable finite matrix evidence.
 */
import { type Integer, type Matrix, type Natural } from "./exact-number.mjs";
export interface MatrixShapeCarrier {
    readonly kind: "linearAlgebra.matrix.shape";
    readonly rows: Natural;
    readonly columns: Natural;
    readonly square: boolean;
}
export interface SquareMatrixInvariantsCarrier {
    readonly kind: "linearAlgebra.matrix.squareInvariants";
    readonly matrix: Matrix;
    readonly shape: MatrixShapeCarrier;
    readonly determinant: Integer;
    readonly characteristicPolynomial: readonly Integer[];
    readonly rank: Natural;
    readonly smithNormalForm: readonly Integer[];
}
export interface RankNullityCarrier {
    readonly kind: "linearAlgebra.rankNullity";
    readonly sourceModule: "RelMath.LinearAlgebra.RankNullity";
    readonly matrix: Matrix;
    readonly shape: MatrixShapeCarrier;
    readonly rank: Natural;
    readonly nullity: Natural;
    readonly rankPlusNullity: Natural;
    readonly domainDimension: Natural;
    readonly rankNullityHolds: boolean;
    readonly smithNormalForm: readonly Integer[];
}
export type F2Vector = readonly boolean[];
export interface BoolWorkedRankNullityReceipt {
    readonly kind: "linearAlgebra.boolWorkedRankNullity.receipt:witness";
    readonly sourceModule: "RelMath.LinearAlgebra.Basic";
    readonly theorems: readonly [
        "RelMath.LinearAlgebra.dimension_well_defined",
        "RelMath.LinearAlgebra.dim_Fn",
        "RelMath.LinearAlgebra.steinitz_bound",
        "RelMath.LinearAlgebra.rank_nullity",
        "RelMath.LinearAlgebra.BoolWorked.rank_nullity_boolWorked"
    ];
    readonly domainDimension: 2;
    readonly codomainDimension: 1;
    readonly kernelBasis: readonly F2Vector[];
    readonly imageBasis: readonly F2Vector[];
    readonly kernelElements: readonly F2Vector[];
    readonly imageElements: readonly F2Vector[];
    readonly kernelBasisIndependent: true;
    readonly kernelBasisSpansKernel: true;
    readonly imageBasisIndependent: true;
    readonly imageBasisSpansImage: true;
    readonly rank: 1;
    readonly nullity: 1;
    readonly rankPlusNullity: 2;
    readonly dimensionWellDefined: true;
    readonly steinitzBoundWitnessed: true;
    readonly rankNullityHolds: true;
}
/** Finite matrix shape as exact naturals. */
export declare function matrixShape(matrix: Matrix): MatrixShapeCarrier;
/** Square-matrix determinant, characteristic polynomial, rank, and Smith factors. */
export declare function squareMatrixInvariants(matrix: Matrix): SquareMatrixInvariantsCarrier;
/** Rank-nullity receipt for a finite integer matrix read as a map Z^n -> Z^m. */
export declare function rankNullity(matrix: Matrix): RankNullityCarrier;
/** The worked Lean map `T : F2^2 -> F2`, `T(a,b) = a + b`. */
export declare function boolWorkedLinearMap(vector: F2Vector): F2Vector;
/** Finite executable carrier for `RelMath.LinearAlgebra.rank_nullity` over the worked F2 map. */
export declare function boolWorkedRankNullityReceipt(): BoolWorkedRankNullityReceipt;
