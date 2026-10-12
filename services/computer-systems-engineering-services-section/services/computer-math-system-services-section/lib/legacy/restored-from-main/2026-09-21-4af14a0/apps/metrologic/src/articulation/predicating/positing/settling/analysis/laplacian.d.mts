/**
 * analysis/laplacian — spectral geometry of the relation graph.
 *
 * The relation graph of a section (terms as vertices, weighted by how many cells
 * relate each pair) carries the combinatorial Laplacian L = D − W. From it,
 * exactly over ℤ: the deviation operator (Lf)(x) = Σ_y w(x,y)(f(x)−f(y)); the
 * harmonic judgment Lf = 0 (witness/obstruction, not a float threshold); the
 * component count as the zero-eigenvalue multiplicity (rank deficiency); the
 * characteristic polynomial; and the weighted spanning-tree count (Matrix-Tree).
 * Reflexive cells contribute nothing. Carrier-valued throughout.
 */
import { type Cell, type PredicationTerm } from "../../../predication.mjs";
import { type Integer, type Matrix, type Natural, type Rational } from "./exact-number.mjs";
/** The relation graph of a section: distinct terms, weighted adjacency (exact). */
export interface RelationGraphCarrier {
    readonly kind: "meme-analysis.laplacian.graph";
    readonly terms: readonly PredicationTerm[];
    readonly weights: Matrix;
}
/** The relation graph of a bare list of predication CELLS — distinct subject/object terms as
 *  vertices, weighted by how many cells relate each pair. This is the part `relationGraph` actually
 *  needs: it reads only `cell.subject`/`cell.object`, never the charge or the fixed-point reading's
 *  order/bound. Exposing it lets ANY holder of cells (a faculty's held section, a membrane) read the
 *  Laplacian geometry without first materializing a full `SectionCarrier`. */
export declare function relationGraphOfCells(cells: readonly Cell[]): RelationGraphCarrier;
/** The relation graph of a section (its entries' cells). Delegates to {@link relationGraphOfCells}. */
export declare function relationGraph(section: Readonly<{
    entries: readonly Readonly<{
        cell: Cell;
    }>[];
}>): RelationGraphCarrier;
/** The combinatorial Laplacian L = D − W of a symmetric weighted adjacency matrix, exact integer
 *  entries. The bare-matrix core the graph readings delegate to. */
export declare function laplacianOfWeights(weights: Matrix): Matrix;
/** The combinatorial Laplacian L = D − W of a relation graph, exact integer entries. */
export declare function laplacianOf(graph: RelationGraphCarrier): Matrix;
/** The deviation operator on a rational observable (exact, carrier-valued). */
export declare function deviationOf(graph: RelationGraphCarrier, values: readonly Rational[]): readonly Rational[];
/** An observable that is a harmonic mode (deviation vanishes everywhere). */
export interface HarmonicWitness {
    readonly kind: "meme-analysis.laplacian.harmonic:witness";
    readonly graph: RelationGraphCarrier;
    readonly values: readonly Rational[];
}
/** An observable that is not harmonic (the first nonzero deviation). */
export interface HarmonicObstruction {
    readonly kind: "meme-analysis.laplacian.harmonic-obstruction";
    readonly graph: RelationGraphCarrier;
    readonly values: readonly Rational[];
    readonly atTerm: PredicationTerm;
    readonly deviation: Rational;
}
/** The result of judging an observable for harmonicity. */
export type HarmonicJudgment = HarmonicWitness | HarmonicObstruction;
/** Whether an observable is a harmonic mode. */
export declare function harmonic(graph: RelationGraphCarrier, values: readonly Rational[]): HarmonicJudgment;
/** The connected-component count of a bare weighted graph (zero-eigenvalue multiplicity = rank
 *  deficiency; n − rank(L), so isolated vertices are counted). */
export declare function componentCountOfWeights(weights: Matrix): Natural;
/** The connected-component count (zero-eigenvalue multiplicity = rank deficiency). */
export declare function componentCount(graph: RelationGraphCarrier): Natural;
/** The characteristic polynomial of L (the exact spectrum). */
export declare function spectrumPolynomial(graph: RelationGraphCarrier): readonly Integer[];
/** The weighted spanning-tree count of a bare weighted graph (a reduced-Laplacian determinant;
 *  Matrix-Tree). `0` when the graph is disconnected. */
export declare function treeCountOfWeights(weights: Matrix): Integer;
/** The weighted spanning-tree count (a reduced-Laplacian determinant; Matrix-Tree). */
export declare function treeCount(graph: RelationGraphCarrier): Integer;
/** Whether an integer observable is HARMONIC on a bare weighted graph: `(L·v)(x) = 0` at every
 *  vertex — i.e. `v` lies in `ker L`. Equivalently, `v` is constant on every connected component:
 *  a consensus / equilibrium mode where no value flows along any edge. The exact-ℤ analogue of the
 *  `harmonic` judgment for graphs whose vertices are not predication cells. */
export declare function isHarmonicOfWeights(weights: Matrix, values: readonly Integer[]): boolean;
/** The discrete HODGE DECOMPOSITION of a bare weighted graph's edge-flow space `C¹`: every edge-flow
 *  splits uniquely as an EXACT (gradient, `im δ⁰`) part and a HARMONIC (cycle) part — coexact is empty,
 *  a graph having no 2-cells. The dimensions are exact: `exact = rank(L) = V − C` (the flows derivable
 *  from a vertex potential) and `harmonic = β₁ = E − V + C` (the independent cycles = first Betti = the
 *  H¹ obstruction that no local amendment can kill), summing to `edges = E`. */
export interface HodgeDecomposition {
    readonly kind: "meme-analysis.laplacian.hodge";
    /** `dim C¹ = E` — the total edge-flow space (edges counted with multiplicity). */
    readonly edges: Natural;
    /** `dim im δ⁰ = rank(L) = V − C` — the EXACT/gradient flows (derivable from a vertex potential). */
    readonly exact: Natural;
    /** `dim ker L¹ = β₁ = E − V + C` — the HARMONIC/cycle flows (the first Betti number, the H¹
     *  obstruction irreducible to any local amendment). */
    readonly harmonic: Natural;
}
/** The Hodge decomposition of a bare weighted graph (vertices = `weights.length`, edge multiplicity =
 *  the symmetric weights), exact over ℤ. */
export declare function hodgeDecompositionOfWeights(weights: Matrix): HodgeDecomposition;
/** The Hodge decomposition of a relation graph's edge-flow space. */
export declare function hodgeDecomposition(graph: RelationGraphCarrier): HodgeDecomposition;
/** A signed edge: two vertices and whether the relation is positive (`+`, agree) or negative
 *  (`−`, oppose) — the datum of a SIGNED graph (Cartwright–Harary / Heider). */
export type SignedEdge = readonly [left: number, right: number, positive: boolean];
/** The STRUCTURAL BALANCE of a signed graph: whether its vertices split into at most two camps with
 *  every `+` edge WITHIN a camp and every `−` edge BETWEEN camps — equivalently, no cycle carries an
 *  odd number of `−` edges (the Z₂ frustration / first cohomology of the signed graph). */
export interface SignedBalance {
    readonly kind: "meme-analysis.laplacian.signed-balance";
    /** `true` ⟺ a consistent two-camp (Heider-stable) split exists — the signed graph is balanced. */
    readonly balanced: boolean;
    /** the FRUSTRATION: the number of edges whose endpoints' forced parities conflict — the exact
     *  obstruction to balance (`0` ⟺ balanced). */
    readonly frustration: number;
}
/** The structural balance of a signed graph, by union-find with parity: a `+` edge forces equal camp
 *  parity, a `−` edge forces opposite parity; an edge whose endpoints are already in one component
 *  with the wrong relative parity is a frustration. Exact and total. */
export declare function signedBalance(vertexCount: number, edges: readonly SignedEdge[]): SignedBalance;
/** The DIFFUSION ENDPOINT of an integer observable `v` on a bare weighted graph: each vertex relaxes
 *  to the net consensus DIRECTION of its connected component — `sign(Σ_{component} v) ∈ {−1, 0, +1}`.
 *  This is the exact integer shadow of the harmonic projection `lim_{t→∞} e^{−tL} v` (the projection
 *  onto `ker L`, equal per-component to the value MEAN); its sign is the direction the component
 *  settles toward under diffusion. Returns one `{−1,0,+1}` integer per vertex, in vertex order. */
export declare function diffusionDirections(weights: Matrix, values: readonly Integer[]): readonly Integer[];
/** The exact symmetric integer adjacency matrix of a bare undirected multigraph on `vertexCount`
 *  vertices (`0 … vertexCount−1`), weighted by edge multiplicity; self-loops are ignored. Unlike
 *  {@link relationGraphOfCells}, the vertex set is FIXED, so isolated vertices are represented. */
export declare function weightsOfEdges(vertexCount: number, edges: readonly (readonly [number, number])[]): Matrix;
/** Independent cycles of an undirected multigraph, excluding self-loops as
 * weightsOfEdges does. Union by size and iterative path compression avoid both
 * a dense matrix and recursion proportional to the number of vertices. */
export declare function graphFirstBettiNumberOfEdgeList(vertexCount: number, edges: readonly (readonly [number, number])[]): number;
/** The spectral invariants of a bare undirected graph: its component count (H⁰, the zero-eigenvalue
 *  multiplicity) and its Matrix-Tree spanning-tree count. */
export interface GraphSpectrum {
    readonly kind: "meme-analysis.laplacian.spectrum";
    readonly components: Natural;
    readonly spanningTrees: Integer;
}
/** Read a bare undirected graph's spectral invariants (component count H⁰ + Matrix-Tree spanning-tree
 *  count) directly from a fixed vertex set and an edge list — for graphs whose vertices are NOT
 *  predication cells (observer graphs, agent graphs), where isolated vertices must be counted. */
export declare function graphSpectrum(vertexCount: number, edges: readonly (readonly [number, number])[]): GraphSpectrum;
