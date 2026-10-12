/**
 * settling/dynamics/substitution/tiling — 2D block substitutions and tile-adjacency graphs.
 *
 * A 1D substitution word is a path (chromatic number 2 always); genuine coloring lives in 2D. A BLOCK
 * substitution sends each symbol to a fixed rectangular block of symbols; inflating a seed `k` times
 * tiles the plane with a level-`k` patch. The TILE-ADJACENCY GRAPH of a patch — a vertex per cell, an
 * edge between neighbouring cells — is the genuine (non-degenerate) graph the coloring readings need:
 * its `chromaticNumber` is the least number of colors with no two adjacent tiles alike, and its
 * proper-coloring space is a factor of the tiling onto a finite palette (the "coloring = factor map to
 * a finite shift = information" reading). The adjacency GEOMETRY drives the chromatic number:
 * orthogonal (4-neighbour, a bipartite grid → 2), triangular (4 + one diagonal → 3), king (8-neighbour
 * → 4). Grounding: Evans–Gawlak–Ramsey–Strungaru–Trang, "Colourings of aperiodic tilings"; the
 * memo on coloring aperiodic tiles. Bounded: a finite patch, not the full hull.
 *
 * @packageDocumentation
 */
import { type Matrix } from "../../analysis/exact-number.mjs";
/** A grid of symbols (rows of cells). */
export type Grid = readonly (readonly string[])[];
/** A 2D block substitution: each symbol maps to a fixed rectangular block of symbols. */
export interface BlockSubstitution {
    readonly kind: "substitution.dynamics.tiling.blockSubstitution";
    readonly block: Readonly<Record<string, Grid>>;
}
/** The neighbourhood convention of a tile-adjacency graph. */
export type Neighbourhood = "orthogonal" | "triangular" | "king";
/** A block substitution from a symbol→block table. */
export declare function blockSubstitution(block: Readonly<Record<string, Grid>>): BlockSubstitution;
/** Replace every cell of a grid with its block, tiling the blocks into one larger grid (blocks are
 *  assumed uniform in size; a symbol with no block maps to its own `1×1` cell). */
export declare function inflateGrid(substitution: BlockSubstitution, grid: Grid): Grid;
/** The level-`k` inflation of a seed symbol: apply the block substitution `k` times to the `1×1` seed. */
export declare function tilingPatch(substitution: BlockSubstitution, seed: string, level: number): Grid;
/** The TILE-ADJACENCY weight matrix of a grid patch: cell `(r,c)` is vertex `r·cols + c`; an edge
 *  (weight `1`) joins cells that are neighbours under the chosen convention. Feed it to
 *  `analysis.chromaticNumber` / the graph-Laplacian readings. */
export declare function gridAdjacency(grid: Grid, neighbourhood?: Neighbourhood): Matrix;
