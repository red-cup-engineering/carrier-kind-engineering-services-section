/**
 * settling/dynamics/substitution/mld - finite MLD-invariant comparisons.
 *
 * This module names the mutually-locally-derivable reading that the Node package
 * can currently execute: compare the finite cohomological invariant carried by
 * two substitution incidence matrices. The invariant is the same structure
 * returned by {@link colimStructure}: rank, determinant, Smith normal form,
 * stable determinant, and localized integer module.
 *
 * The result stays in the package's witness/obstruction idiom. Equal invariants
 * produce a `substitution.dynamics.mld:witness`; unequal invariants produce an
 * obstruction naming the first separating component. This is useful as the
 * implemented Anderson-Putnam-classifier layer. It is not an arbitrary tiling
 * equivalence solver, and it does not construct local derivation maps between
 * raw tilings.
 *
 * Grounding: `lean/RelMath/Aperiodic/StepN/*`, the RelMath aperiodic import
 * spine, and the content aperiodic-regime classification notes. The public
 * authority here is the finite invariant comparison implemented below.
 *
 * @packageDocumentation
 */
import { type ColimStructure, type SubstitutionCarrier, type SubstitutionIncidenceMatrix } from "./index.mjs";
/** The finite classifying invariant of a substitution incidence matrix. */
export type MLDInvariant = ColimStructure;
/** The colimit invariant of a substitution incidence matrix, named in its MLD role. */
export declare function mldInvariant(matrix: SubstitutionIncidenceMatrix): MLDInvariant;
/** Two incidence matrices agree on the implemented finite MLD invariant. */
export interface MutuallyLocallyDerivableWitness {
    readonly kind: "substitution.dynamics.mld:witness";
    readonly left: MLDInvariant;
    readonly right: MLDInvariant;
}
/** Which component of the finite invariant separates two substitution matrices. */
export type MLDObstructionReason = "rank" | "determinant" | "smith-normal-form" | "localized-module";
/** Two incidence matrices differ on the implemented finite MLD invariant. */
export interface MutuallyLocallyDerivableObstruction {
    readonly kind: "substitution.dynamics.mld-obstruction";
    readonly reason: MLDObstructionReason;
    readonly left: MLDInvariant;
    readonly right: MLDInvariant;
}
/** The result of an MLD comparison. */
export type MutuallyLocallyDerivableJudgment = MutuallyLocallyDerivableWitness | MutuallyLocallyDerivableObstruction;
/** Compare two substitution incidence matrices by the finite MLD invariant. */
export declare function mutuallyLocallyDerivable(left: SubstitutionIncidenceMatrix, right: SubstitutionIncidenceMatrix): MutuallyLocallyDerivableJudgment;
/** Compare two substitution carriers by abelianizing over their own alphabets first. */
export declare function carriersMutuallyLocallyDerivable(left: Pick<SubstitutionCarrier, "rule" | "alphabet">, right: Pick<SubstitutionCarrier, "rule" | "alphabet">): MutuallyLocallyDerivableJudgment;
