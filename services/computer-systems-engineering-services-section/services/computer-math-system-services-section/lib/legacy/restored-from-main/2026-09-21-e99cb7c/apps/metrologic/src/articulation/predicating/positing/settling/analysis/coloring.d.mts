/**
 * settling/analysis/coloring — proper graph coloring and the chromatic number.
 *
 * A PROPER coloring assigns colors to the vertices of a bare weighted graph (adjacency = a positive
 * weight) so that adjacent vertices DIFFER; the CHROMATIC NUMBER `χ(G)` is the least number of colors
 * admitting one. Computed exactly by backtracking (NP-hard in general, exact and fine for the finite
 * graphs the corpus carries). A proper coloring is, dynamically, a factor map from the graph to a
 * finite palette — for a tiling adjacency graph, a factor of the tiling system onto a finite shift
 * (the "what information does a coloring encode" reading). Grounding: Evans-Gawlak-Ramsey-Strungaru-
 * Trang, "Colourings of aperiodic tilings" (exact vertex/edge/face chromatic numbers for chair,
 * Ammann-Beenker, pinwheel); the Four Color Theorem / Vizing bound the planar-tiling case.
 *
 * NB the adjacency must be a GENUINE relation (geometric tile-adjacency, predication edges), not one
 * derived from a two-valued vertex attribute — such a graph is 2-colored by the attribute itself and
 * its chromatic number is degenerate.
 */
import { type Matrix } from "./exact-number.mjs";
/** A proper `k`-coloring: a color `0…k-1` per vertex with adjacent vertices differing. */
export interface ProperColoringWitness {
    readonly kind: "meme-analysis.coloring.proper:witness";
    readonly colors: readonly number[];
    readonly colorCount: number;
}
/** No proper `k`-coloring exists (the graph needs more than `k` colors). */
export interface ProperColoringObstruction {
    readonly kind: "meme-analysis.coloring.proper-obstruction";
    readonly colorCount: number;
}
/** The result of a proper-coloring search. */
export type ProperColoringJudgment = ProperColoringWitness | ProperColoringObstruction;
/** The complete finite graph `K_n` as the existing exact weighted-adjacency carrier. */
export declare function completeGraphWeights(vertexCount: number): Matrix;
/** Check a supplied color assignment against the graph's adjacency relation. */
export declare function isProperColorAssignment(weights: Matrix, colors: readonly number[]): boolean;
/** Check the graph-hom/factor-map reading into the complete graph on the used palette. */
export declare function graphHomToCompletePalette(weights: Matrix, colors: readonly number[]): boolean;
export interface ColoringFactorMapWitness {
    readonly kind: "meme-analysis.coloring.factorMap:witness";
    readonly colors: readonly number[];
    readonly proper: boolean;
    readonly graphHom: boolean;
    readonly equivalent: boolean;
}
export interface ColoringFactorMapObstruction {
    readonly kind: "meme-analysis.coloring.factorMap-obstruction";
    readonly colors: readonly number[];
    readonly proper: boolean;
    readonly graphHom: boolean;
    readonly equivalent: boolean;
    readonly reason: "not-proper" | "not-graph-hom";
}
export type ColoringFactorMapJudgment = ColoringFactorMapWitness | ColoringFactorMapObstruction;
/** Lean `properColoring_iff_hom`: proper coloring iff graph hom into the complete palette graph. */
export declare function coloringFactorMap(weights: Matrix, colors: readonly number[]): ColoringFactorMapJudgment;
/** Whether the bare weighted graph admits a proper `k`-coloring (adjacent vertices differ), by
 *  backtracking. A witness carries the per-vertex color assignment; an obstruction reports the `k`. */
export declare function properColoring(weights: Matrix, colorCount: number): ProperColoringJudgment;
/** The CHROMATIC NUMBER `χ(G)` — the least number of colors admitting a proper vertex coloring, exact
 *  by ascending search. `χ ≤ |V|`; edgeless → 1, bipartite → 2, an odd cycle → 3, complete `Kₙ` → `n`. */
export declare function edgelessColoring(vertexCount: number, colorCount: number): Readonly<{
    coloring: ProperColoringJudgment;
    factorMap?: ColoringFactorMapWitness;
}>;
export declare function chromaticNumber(weights: Matrix): number;
/** The NUMBER of proper `k`-colorings of the graph — the chromatic polynomial `P(G, k)` evaluated at
 *  `k` — counted exactly by backtracking. `0` ⟺ `k < χ(G)`; for the edgeless graph it is `kⁿ`; for `Kₙ`
 *  it is the falling factorial `k(k-1)⋯(k-n+1)`. */
export declare function countProperColorings(weights: Matrix, colorCount: number): number;
/**
 * The COLORING ENTROPY at `k` colors: `log₂ P(G, k) / |V|` — the bits of information a proper
 * `k`-coloring carries PER VERTEX. A proper coloring is a factor of the graph onto a `k`-symbol
 * palette; this is the per-tile entropy of that factor. As the tiling patch grows, the per-tile
 * coloring entropy converges to the topological entropy of the coloring shift — a tiling-space
 * invariant FINER than the chromatic number (two tilings can share `χ` but differ in how much
 * freedom a coloring has). `0` when no proper `k`-coloring exists (`k < χ`) or the graph is empty.
 */
export declare function coloringEntropy(weights: Matrix, colorCount: number): number;
export interface CompleteGraphChromaticWitness {
    readonly kind: "meme-analysis.coloring.completeGraphChromatic:witness";
    readonly vertexCount: number;
    readonly chromaticNumber: number;
    readonly selfColoring: ProperColoringJudgment;
    readonly properColoringCountAtSelfPalette: number;
    readonly lowerBoundByInjection: boolean;
    readonly requiresAllColours: boolean;
}
/** Lean complete-graph ladder: `χ(K_n)=n`, with every proper `K_n` coloring injective. */
export declare function completeGraphChromatic(vertexCount: number): CompleteGraphChromaticWitness;
/** The Lean `K₄`/FOUR extremal case: four vertices require all four Belnap charges. */
export declare const k4RequiresFour: CompleteGraphChromaticWitness;
export interface HandshakeDegreeParityWitness {
    readonly kind: "meme-analysis.coloring.handshakeDegreeParity:witness";
    readonly degrees: readonly number[];
    readonly degreeSum: number;
    readonly directedEdgeCount: number;
    readonly oddDegreeCount: number;
    readonly degreeSumEven: boolean;
    readonly oddDegreeCountEven: boolean;
}
export interface HandshakeDegreeParityObstruction {
    readonly kind: "meme-analysis.coloring.handshakeDegreeParity-obstruction";
    readonly reason: "not-symmetric" | "not-irreflexive";
}
export type HandshakeDegreeParityJudgment = HandshakeDegreeParityWitness | HandshakeDegreeParityObstruction;
/** Lean `handshake_and_degree_parity` for finite symmetric, irreflexive adjacency matrices. */
export declare function handshakeDegreeParity(weights: Matrix): HandshakeDegreeParityJudgment;
export interface OddClosedWalkBipartiteObstructionWitness {
    readonly kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness";
    readonly start: number;
    readonly walk: readonly number[];
    readonly validWalk: boolean;
    readonly closed: boolean;
    readonly oddLength: boolean;
    readonly notBipartite: boolean;
}
export interface OddClosedWalkBipartiteObstructionObstruction {
    readonly kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction-obstruction";
    readonly start: number;
    readonly walk: readonly number[];
    readonly validWalk: boolean;
    readonly closed: boolean;
    readonly oddLength: boolean;
    readonly reason: "invalid-walk" | "not-closed" | "not-odd";
}
export type OddClosedWalkBipartiteObstructionJudgment = OddClosedWalkBipartiteObstructionWitness | OddClosedWalkBipartiteObstructionObstruction;
/** Lean `not_bipartite_of_odd_closed_walk`: an odd closed walk obstructs Bool-colorability. */
export declare function oddClosedWalkBipartiteObstruction(weights: Matrix, start: number, walk: readonly number[]): OddClosedWalkBipartiteObstructionJudgment;
export interface CombinatoricsExtremalReceipt {
    readonly kind: "meme-analysis.combinatoricsExtremal:witness";
    readonly sourceModule: "RelMath.Order.CombinatoricsExtremal";
    readonly theorems: readonly [
        "RelMath.Combinatorics.sum_mod_two",
        "RelMath.Combinatorics.countOdd_even_of_sum_even",
        "RelMath.Combinatorics.dsum_even",
        "RelMath.Combinatorics.degSum_even",
        "RelMath.Combinatorics.countOdd_degree_even",
        "RelMath.Combinatorics.handshake_and_degree_parity",
        "RelMath.Combinatorics.walk_color",
        "RelMath.Combinatorics.bipartite_no_odd_closed_walk",
        "RelMath.Combinatorics.bipartite_parity"
    ];
    readonly handshake: HandshakeDegreeParityWitness;
    readonly oddWalk: OddClosedWalkBipartiteObstructionWitness;
    readonly degreeSumEven: true;
    readonly oddDegreeCountEven: true;
    readonly bipartiteOddWalkObstruction: true;
}
export declare function combinatoricsExtremalReceipt(): CombinatoricsExtremalReceipt;
export interface RamseyMonoTriangleWitness {
    readonly kind: "meme-analysis.ramsey.r33:witness";
    readonly vertexCount: 6;
    readonly vertices: readonly [number, number, number];
    readonly color: boolean;
    readonly edges: readonly [boolean, boolean, boolean];
}
export interface RamseyMonoTriangleObstruction {
    readonly kind: "meme-analysis.ramsey.r33-obstruction";
    readonly reason: "not-six-by-six" | "no-monochromatic-triangle";
}
export type RamseyMonoTriangleJudgment = RamseyMonoTriangleWitness | RamseyMonoTriangleObstruction;
/** Lean `ramsey_three_three`: every Boolean edge-colouring of K6 has a monochromatic triangle. */
export declare function ramseyThreeThree(colors: readonly (readonly boolean[])[]): RamseyMonoTriangleJudgment;
