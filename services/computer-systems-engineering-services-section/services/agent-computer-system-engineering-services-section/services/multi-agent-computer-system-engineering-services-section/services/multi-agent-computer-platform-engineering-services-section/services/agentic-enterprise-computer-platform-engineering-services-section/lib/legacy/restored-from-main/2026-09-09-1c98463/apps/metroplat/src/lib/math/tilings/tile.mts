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
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import {
  chargeValueNames,
  type ChargeValueName,
} from "../../values/index.mts";
import {
  countProperColorings,
  isProperColorAssignment,
  properColoring,
} from "../graphs/coloring.mts";
import { intIsZero, intOne, intZero, type Integer, type Matrix } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";


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

export const tileLambdaSchema = {
  $id: "metroplat/closure/analysis/tile/tile-lambda",
  type: "object",
  required: ["kind", "mode", "order", "label"],
  properties: {
    kind: { const: "tile.lambda" },
    mode: { const: "sequential" },
    order: { type: "array", items: { type: "string" } },
    label: { const: "layout: sequential (substitution not derived)" },
  },
  additionalProperties: false,
  title: "TileLambda",
  description: "The Tile construction's layout invariant: sequential cell order.",
} as const;

export type TileLambda = FromJsonSchema<typeof tileLambdaSchema>;

export const tileEtaSchema = {
  $id: "metroplat/closure/analysis/tile/tile-eta",
  type: "object",
  required: ["kind", "rank", "vanishing", "source"],
  properties: {
    kind: { const: "tile.eta" },
    rank: { type: "number" },
    vanishing: { type: "boolean" },
    source: { const: "reused-coordination-certificate" },
  },
  additionalProperties: false,
  title: "TileEta",
  description: "The Tile construction's cohomological invariant, reused unchanged from a cover-nerve certificate.",
} as const;

export type TileEta = FromJsonSchema<typeof tileEtaSchema>;

export const tileDeltaSchema = {
  $id: "metroplat/closure/analysis/tile/tile-delta",
  type: "object",
  required: ["kind", "status", "reason"],
  properties: {
    kind: { const: "tile.delta" },
    status: { const: "omitted" },
    reason: { type: "string" },
  },
  additionalProperties: false,
  title: "TileDelta",
  description: "The Tile construction's diffraction invariant, always reported omitted (no in-package reader).",
} as const;

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

const DELTA_OMITTED_REASON =
  "no in-package diffraction reader: core/dynamics/substitution carries no Fourier/diffraction module, "
  + "and the nearest candidate, core/closure/analysis/aperiodic-autocorrelation.mts, documents itself as "
  + "\"finite pair-correlation only; no Fourier transform or diffraction measure\"";

function neighbours(adjacency: Matrix, vertex: number): number[] {
  const row = adjacency[vertex]!;
  const result: number[] = [];
  for (let other = 0; other < row.length; other += 1) {
    if (other !== vertex && !intIsZero(row[other]!)) result.push(other);
  }
  return result;
}

/** The connected components of a cell graph, as vertex-index groups. A
 *  disjoint union's chromatic polynomial factors over exactly these groups. */
function connectedComponents(adjacency: Matrix): number[][] {
  const size = adjacency.length;
  const seen = new Array<boolean>(size).fill(false);
  const components: number[][] = [];
  for (let start = 0; start < size; start += 1) {
    if (seen[start]) continue;
    const stack = [start];
    seen[start] = true;
    const component: number[] = [];
    while (stack.length > 0) {
      const vertex = stack.pop()!;
      component.push(vertex);
      for (const neighbour of neighbours(adjacency, vertex)) {
        if (!seen[neighbour]) {
          seen[neighbour] = true;
          stack.push(neighbour);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function submatrix(adjacency: Matrix, indices: readonly number[]): Matrix {
  return Object.freeze(indices.map((row) => Object.freeze(indices.map((col) => adjacency[row]![col]!))));
}

function colorIndexOf(name: ChargeValueName): number {
  const index = chargeValueNames.indexOf(name);
  /* istanbul ignore next -- chargeValueNames is total over ChargeValueName */
  if (index < 0) throw new TypeError(`tile: unknown charge value ${name}`);
  return index;
}

function rawColorIndex(cells: readonly string[], charges: Readonly<Record<string, ChargeValueName>>): number[] {
  return cells.map((cell) => {
    const name = charges[cell];
    if (name === undefined) throw new TypeError(`tile: cell ${cell} has no charge valuation`);
    return colorIndexOf(name);
  });
}

function buildKappa(cells: readonly string[], adjacency: Matrix, charges: Readonly<Record<string, ChargeValueName>>): TileKappa {
  const raw = rawColorIndex(cells, charges);
  const asRecord = (colors: readonly number[]): Readonly<Record<string, ChargeValueName>> =>
    Object.freeze(Object.fromEntries(cells.map((cell, index) => [cell, chargeValueNames[colors[index]!]!])));

  if (isProperColorAssignment(adjacency, raw)) {
    return Object.freeze({
      kind: "tile.kappa" as const,
      status: "proper" as const,
      cells: Object.freeze([...cells]),
      charges: asRecord(raw),
      refined: false,
    });
  }

  // gamma fails properness only where an actual conflict/obstruction edge
  // exists; isolated cells can never violate it. Refine only the
  // non-trivial component(s), leaving every isolated cell's gamma untouched.
  const refined = [...raw];
  let obstructed = false;
  for (const component of connectedComponents(adjacency)) {
    if (component.length <= 1) continue;
    const sub = submatrix(adjacency, component);
    const subColors = component.map((vertex) => raw[vertex]!);
    if (isProperColorAssignment(sub, subColors)) continue;
    const judgment = properColoring(sub, 4);
    if (judgment.kind !== "meme-analysis.coloring.proper:witness") {
      obstructed = true;
      continue;
    }
    component.forEach((vertex, position) => { refined[vertex] = judgment.colors[position]!; });
  }

  if (obstructed) {
    return Object.freeze({
      kind: "tile.kappa" as const,
      status: "obstruction" as const,
      cells: Object.freeze([...cells]),
      charges: asRecord(raw),
      refined: false,
    });
  }
  return Object.freeze({
    kind: "tile.kappa" as const,
    status: "proper" as const,
    cells: Object.freeze([...cells]),
    charges: asRecord(refined),
    refined: refined.some((value, index) => value !== raw[index]),
  });
}

function buildLambda(cells: readonly string[]): TileLambda {
  return Object.freeze({
    kind: "tile.lambda" as const,
    mode: "sequential" as const,
    order: Object.freeze([...cells]),
    label: "layout: sequential (substitution not derived)" as const,
  });
}

function buildEta(coordination: CoordinationReadout): TileEta {
  return Object.freeze({
    kind: "tile.eta" as const,
    rank: coordination.rank,
    vanishing: coordination.vanishing,
    source: "reused-coordination-certificate" as const,
  });
}

function buildDelta(): TileDelta {
  return Object.freeze({ kind: "tile.delta" as const, status: "omitted" as const, reason: DELTA_OMITTED_REASON });
}

function buildH(adjacency: Matrix): TileH {
  let isolatedCells = 0;
  let bits = 0;
  let productCount = 1;
  let anyZero = false;
  for (const component of connectedComponents(adjacency)) {
    if (component.length === 1) {
      isolatedCells += 1;
      bits += 2; // log2(4): one isolated cell has exactly 4 proper 4-colourings
      productCount *= 4;
      continue;
    }
    const count = countProperColorings(submatrix(adjacency, component), 4);
    if (count === 0) {
      anyZero = true;
      continue;
    }
    bits += Math.log2(count);
    productCount *= count;
  }
  return Object.freeze({
    kind: "tile.h" as const,
    bits: anyZero ? 0 : bits,
    properColoringCount: anyZero ? 0 : productCount,
    isolatedCells,
  });
}

/** Build the Tile (Def 4.2) of a witnessed structure (Construction 4.1),
 *  given an already-computed cover-nerve coordination certificate for eta. */
export function buildTile(structure: TileStructure, coordination: CoordinationReadout): Tile {
  if (structure.adjacency.length !== structure.cells.length) {
    throw new TypeError("buildTile: adjacency must be square over the cell set");
  }
  return Object.freeze({
    kind: "tile.tile" as const,
    kappa: buildKappa(structure.cells, structure.adjacency, structure.charges),
    lambda: buildLambda(structure.cells),
    eta: buildEta(coordination),
    delta: buildDelta(),
    h: buildH(structure.adjacency),
  });
}

/** A genuine, generic cell-graph constructor: cells are pairwise adjacent
 *  exactly when they co-occur in one of the given cliques (e.g. "these cells
 *  are each a real standing conflict", "these cells are each a real
 *  coordination obstruction") — a real membership relation over the cell set,
 *  not a two-valued split of the WHOLE vertex set (most cells, belonging to
 *  no clique, stay isolated). Cliques of size <2 contribute no edges. */
export function cliqueAdjacency(cells: readonly string[], cliques: readonly (readonly string[])[]): Matrix {
  const index = new Map(cells.map((cell, position) => [cell, position]));
  const size = cells.length;
  const matrix: Integer[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => intZero));
  for (const clique of cliques) {
    const positions = clique.map((cell) => index.get(cell)).filter((position): position is number => position !== undefined);
    for (const left of positions) {
      for (const right of positions) {
        if (left !== right) matrix[left]![right] = intOne;
      }
    }
  }
  return Object.freeze(matrix.map((row) => Object.freeze(row)));
}
