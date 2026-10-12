/**
 * analysis/aperiodic-autocorrelation - finite Patterson autocorrelation.
 *
 * Executable carrier for `RelMath.Aperiodic.FiniteAutocorrelation`: Boolean
 * occupation patterns on a finite cyclic group, pair-difference counts, and
 * homometry as equality of those finite autocorrelation vectors. This is not a
 * diffraction measure; it is the finite combinatorial shadow before Fourier
 * analysis.
 */
export type OccupationPattern = readonly boolean[];
export interface AutocorrelationReceipt {
    readonly kind: "aperiodic.autocorrelation.receipt:witness";
    readonly sourceModule: "RelMath.Aperiodic.FiniteAutocorrelation";
    readonly theorems: readonly [
        "RelMath.Aperiodic.autocorr",
        "RelMath.Aperiodic.autocorr_le",
        "RelMath.Aperiodic.Homometric",
        "RelMath.Aperiodic.Homometric.refl",
        "RelMath.Aperiodic.Homometric.symm",
        "RelMath.Aperiodic.Homometric.trans"
    ];
    readonly pattern: OccupationPattern;
    readonly shifted: OccupationPattern;
    readonly autocorrelation: readonly number[];
    readonly shiftedAutocorrelation: readonly number[];
    readonly boundedBySiteCount: true;
    readonly homometricRefl: true;
    readonly homometricSymm: true;
    readonly homometricTrans: true;
    readonly boundary: "finite pair-correlation only; no Fourier transform or diffraction measure";
}
/** Pair-difference count at cyclic displacement `displacement`. */
export declare function autocorr(pattern: OccupationPattern, displacement: number): number;
export declare function autocorrelation(pattern: OccupationPattern): readonly number[];
export declare function homometric(left: OccupationPattern, right: OccupationPattern): boolean;
/** Finite carrier for `RelMath.Aperiodic.FiniteAutocorrelation`. */
export declare function receipt(): AutocorrelationReceipt;
