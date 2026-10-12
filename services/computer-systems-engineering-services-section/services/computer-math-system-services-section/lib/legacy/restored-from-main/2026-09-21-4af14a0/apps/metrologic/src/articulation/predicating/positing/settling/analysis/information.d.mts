/**
 * settling/analysis/information — Shannon information of empirical distributions.
 *
 * The base measures of information theory, computed from empirical COUNTS (a multiset of outcomes) —
 * the form a settled membrane hands over. Entropy `H = -Σ pᵢ log₂ pᵢ` (in bits) is a real-valued
 * invariant of a distribution; the mutual information `I(X;Y) = H(X) + H(Y) - H(X,Y)` of a joint
 * sample is the information one coordinate carries about the other — the capacity actually realized by
 * a channel of (sender, content) pairs. These are real-valued (logarithmic), not exact rationals — the
 * same status as the Myrheim–Meyer dimension. The marginal/joint counting is exact; only the log is
 * floating. Grounding: information theory as the degree-1 information cohomology (Baudot–Bennequin),
 * the cohomological frame the rest of the package already speaks (bind / contextuality / consensus H¹).
 */
import { type Matrix } from "./exact-number.mjs";
/**
 * `log₂ λ_PF` of a non-negative integer matrix — `log₂` of its Perron-Frobenius eigenvalue, found by
 * floating-point power iteration (the dominant per-step growth factor). Real-valued, like the Shannon
 * entropy; `0` for the empty or nilpotent matrix.
 *
 * Two readings, kept distinct because conflating them is wrong:
 * - On a TRANSITION matrix (a `0/1` adjacency of allowed symbol-pairs) it is the genuine TOPOLOGICAL
 *   ENTROPY of the shift of finite type — the exponential growth rate of admissible words (e.g.
 *   `log₂ φ` for the golden-mean SFT `[[1,1],[1,0]]`).
 * - On a substitution INCIDENCE matrix it is the INFLATION RATE `log₂ λ_PF` — the growth of tile counts
 *   per supertile level (`|σⁿ| ~ λ_PF^n`), `log₂(n-th metallic mean)` for the metallic family. This
 *   equals the entropy of the substitution's SFT COVER, and UPPER-BOUNDS the topological entropy of the
 *   substitution subshift itself — which is zero (substitution subshifts are almost-periodic,
 *   linear-complexity). So `log₂ λ_PF` is the inflation/information rate of the hierarchy, not the
 *   subshift's entropy.
 */
export declare function topologicalEntropy(matrix: Matrix): number;
/** Shannon entropy in bits of an empirical distribution given as non-negative counts:
 *  `H = -Σ (cᵢ/N) log₂(cᵢ/N)`, with `N = Σ cᵢ`. `0` for the empty or single-outcome distribution. */
export declare function shannonEntropy(counts: readonly number[]): number;
/** The mutual information of a joint sample (a list of `(X, Y)` outcome pairs). */
export interface MutualInformation {
    readonly kind: "meme-analysis.information.mutual";
    /** the number of joint samples. */
    readonly samples: number;
    /** `H(X)` — the marginal entropy of the first coordinate (bits). */
    readonly entropyX: number;
    /** `H(Y)` — the marginal entropy of the second coordinate (bits). */
    readonly entropyY: number;
    /** `H(X,Y)` — the joint entropy (bits). */
    readonly jointEntropy: number;
    /** `I(X;Y) = H(X) + H(Y) - H(X,Y)` — the information each coordinate carries about the other (bits,
     *  `≥ 0`). `0` ⟺ independence; `min(H(X),H(Y))` ⟺ one coordinate determines the other. */
    readonly mutualInformation: number;
}
/** Count marginals and the joint of `(X, Y)` string-keyed samples, then read entropies. The keys are
 *  compared as strings, joined by a `NUL` separator that cannot occur in either. */
export declare function mutualInformation(pairs: readonly (readonly [string, string])[]): MutualInformation;
