/**
 * analysis/tile - the Tile construction (Construction 4.1 / Definition 4.2,
 * §4 of the corpus's bilattice-coloured sofic-tiling research note): a
 * witnessed structure's charge colouring, layout, cohomological, spectral,
 * and information invariants as one tuple (kappa, lambda, eta, delta, h).
 *
 * kappa is the raw charge valuation gamma UNCHANGED wherever gamma already
 * properly colours the cell graph (Def 4.2a); it is refined only on the
 * component(s) where gamma fails properness. h is the TOTAL colouring
 * entropy log2 P(G,4) (Remark 3.8) — not `coloring.mts`'s own per-vertex
 * `coloringEntropy`. A disjoint union's chromatic polynomial factors over its
 * components (P(G1 ⊔ G2, k) = P(G1,k)·P(G2,k), the standard graph-theory
 * product rule), so isolated cells (no conflict/obstruction edge) are counted
 * analytically — each contributes exactly 4 proper 4-colourings — instead of
 * being fed through `coloring.mts`'s exhaustive backtracking search; only the
 * non-isolated component(s) are ever searched exactly. Without this, a real
 * cell graph with hundreds of uncontested cells would make the exhaustive
 * search intractable (exponential in the isolated-cell count) for no
 * mathematical reason, since an isolated vertex is unconstrained by
 * construction.
 *
 * eta is NEVER recomputed here — it is the caller's own already-certified
 * cover-nerve H1 rank (`coordination-cohomology.mts`, reached in practice via
 * `predicating.monotonicityCertificateOfFederatedCover`), carried through
 * unchanged, per the paper's own instruction to reuse rather than recompute.
 *
 * delta (diffraction) has no in-package reader: `core/dynamics/substitution`
 * carries no Fourier/diffraction module, and the nearest candidate,
 * `analysis/aperiodic-autocorrelation.mts`, documents itself as "finite
 * pair-correlation only; no Fourier transform or diffraction measure". It is
 * therefore always reported omitted here, never fabricated.
 *
 * @packageDocumentation
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import type { ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { type Matrix } from "@red-cup-engineering/computer-data-engine/exact-number";
/** The Construction 4.1 witnessed structure a generic Tile is built from:
 *  a finite cell set V, the cell graph G (edges between cells that must
 *  differ), and the charge valuation gamma over V. The cover U (source →
 *  cells) is part of Construction 4.1 too but is not consumed here — eta is
 *  reused from an already-computed cover-nerve certificate, never rederived
 *  from U by this module. */
export interface TileStructure {
    readonly cells: readonly string[];
    readonly adjacency: Matrix;
    readonly charges: Readonly<Record<string, ChargeValueName>>;
}
/** An already-computed cover-nerve H1 certificate, reused unchanged as eta. */
export interface CoordinationReadout {
    readonly rank: number;
    readonly vanishing: boolean;
}
export interface TileKappa {
    readonly kind: "tile.kappa";
    readonly status: "proper" | "obstruction";
    readonly cells: readonly string[];
    /** kappa per cell when `status` is `"proper"`; the raw, un-refined gamma
     *  when `status` is `"obstruction"` (no proper FOUR-colouring exists — never
     *  fabricated as though it were proper). */
    readonly charges: Readonly<Record<string, ChargeValueName>>;
    /** True iff kappa differs from the raw gamma on at least one cell. */
    readonly refined: boolean;
}
export declare const tileLambdaSchema: {
    readonly $id: "metroplat/closure/analysis/tile/tile-lambda";
    readonly type: "object";
    readonly required: readonly ["kind", "mode", "order", "label"];
    readonly properties: {
        readonly kind: {
            readonly const: "tile.lambda";
        };
        readonly mode: {
            readonly const: "sequential";
        };
        readonly order: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly label: {
            readonly const: "layout: sequential (substitution not derived)";
        };
    };
    readonly additionalProperties: false;
    readonly title: "TileLambda";
    readonly description: "The Tile construction's layout invariant: sequential cell order.";
};
export type TileLambda = FromJsonSchema<typeof tileLambdaSchema>;
export declare const tileEtaSchema: {
    readonly $id: "metroplat/closure/analysis/tile/tile-eta";
    readonly type: "object";
    readonly required: readonly ["kind", "rank", "vanishing", "source"];
    readonly properties: {
        readonly kind: {
            readonly const: "tile.eta";
        };
        readonly rank: {
            readonly type: "number";
        };
        readonly vanishing: {
            readonly type: "boolean";
        };
        readonly source: {
            readonly const: "reused-coordination-certificate";
        };
    };
    readonly additionalProperties: false;
    readonly title: "TileEta";
    readonly description: "The Tile construction's cohomological invariant, reused unchanged from a cover-nerve certificate.";
};
export type TileEta = FromJsonSchema<typeof tileEtaSchema>;
export declare const tileDeltaSchema: {
    readonly $id: "metroplat/closure/analysis/tile/tile-delta";
    readonly type: "object";
    readonly required: readonly ["kind", "status", "reason"];
    readonly properties: {
        readonly kind: {
            readonly const: "tile.delta";
        };
        readonly status: {
            readonly const: "omitted";
        };
        readonly reason: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly title: "TileDelta";
    readonly description: "The Tile construction's diffraction invariant, always reported omitted (no in-package reader).";
};
export type TileDelta = FromJsonSchema<typeof tileDeltaSchema>;
export interface TileH {
    readonly kind: "tile.h";
    readonly bits: number;
    /** The exact P(G,4) where representable; may be `Infinity` for graphs with
     *  many isolated cells (the true value exceeds IEEE-754 double range) —
     *  `bits` stays exact via a log-sum over components even then. `0` when no
     *  proper 4-colouring exists on some non-isolated component. */
    readonly properColoringCount: number;
    readonly isolatedCells: number;
}
export interface Tile {
    readonly kind: "tile.tile";
    readonly kappa: TileKappa;
    readonly lambda: TileLambda;
    readonly eta: TileEta;
    readonly delta: TileDelta;
    readonly h: TileH;
}
/** Build the Tile (Def 4.2) of a witnessed structure (Construction 4.1),
 *  given an already-computed cover-nerve coordination certificate for eta. */
export declare function buildTile(structure: TileStructure, coordination: CoordinationReadout): Tile;
/** A genuine, generic cell-graph constructor: cells are pairwise adjacent
 *  exactly when they co-occur in one of the given cliques (e.g. "these cells
 *  are each a real standing conflict", "these cells are each a real
 *  coordination obstruction") — a real membership relation over the cell set,
 *  not a two-valued split of the WHOLE vertex set (most cells, belonging to
 *  no clique, stay isolated). Cliques of size <2 contribute no edges. */
export declare function cliqueAdjacency(cells: readonly string[], cliques: readonly (readonly string[])[]): Matrix;
