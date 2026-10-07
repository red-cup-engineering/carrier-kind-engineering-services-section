/**
 * src/dashboards/tile/projection - the Tile (Construction 4.1 / Definition 4.2, §4 of the
 * corpus's bilattice-coloured sofic-tiling research note) read off real
 * claim-session material.
 *
 * `core/closure/analysis/tile.mts` carries the generic Definition-4.2
 * construction over an abstract recorded structure; this module supplies
 * Construction 4.1's concrete reading FROM `glueClaimSessions` output
 * (`src/claims/session.mts`) — the cell graph, the reading valuation, and the
 * cover.
 *
 * The cell graph is a modelling decision the paper itself leaves open (§7:
 * "the cell graph and substitution are modelled, not canonical"). Here: two
 * DISTINCT cells are adjacent exactly when they are both members of the same
 * real membership set — `glued.conflicts` (both are standing cross-source
 * contradictions) or the cover-nerve's own `coordination.obstructions` (both
 * are real coordination obstructions). This is a genuine relation over a
 * (usually small) subset of the cell set, not a boolean split of the WHOLE
 * vertex set into two complete-bipartite halves (the degenerate pattern
 * `coloring.mts`'s header warns against) — most cells belong to no clique and
 * stay isolated, unconstrained.
 *
 * @packageDocumentation
 */
import { glueClaimSessions } from "@red-cup-engineering/relating/running/session";
import {
  buildTile,
  cliqueAdjacency,

} from "@red-cup-engineering/metrologic/tiling/tile";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** One projection of real claim-session material as an Tile, carrying the
 *  glued settlement and the derived cover alongside the tile itself. */

function normalizedClaimCellText(text) {
  return text.trim().toLowerCase().replace(/\s+/gu, " ");
}

/** Mirrors `session.mts`'s private `gluedClaimCell`/`normalizedClaimCell`
 *  cell-key rule exactly (`role:normalizedText`, or bare `normalizedText` with
 *  no role) — the same duplication pattern `fact-claims.mts` already uses to
 *  read cell membership without parsing glued cell strings back apart. */
function claimCellKey(role, text) {
  const normalized = normalizedClaimCellText(text);
  return role === undefined ? normalized : `${role}:${normalized}`;
}

function boundaryField(boundary, field) {
  if (boundary === null || boundary === undefined || typeof boundary !== "object" || Array.isArray(boundary)) return undefined;
  const value = (boundary)[field];
  return typeof value === "string" ? value : undefined;
}

/** Construction 4.1's cover U: source -> the cells it actually recorded,
 *  read off the same bundles `glueClaimSessions` glues (not consumed by
 *  `buildTile` — eta is reused from the coordination certificate, never
 *  rederived from U — carried here for a faithful, inspectable Construction
 *  4.1 reading). */
function coverOfBundles(bundles) {
  const bySource = new Map();
  for (const bundle of bundles) {
    const cells = bySource.get(bundle.source) ?? new Set();
    for (const observation of bundle.observations) {
      const text = boundaryField(observation.boundary, "text");
      if (text === undefined || text.length === 0) continue;
      cells.add(claimCellKey(boundaryField(observation.boundary, "role"), text));
    }
    bySource.set(bundle.source, cells);
  }
  return Object.freeze(Object.fromEntries([...bySource].map(([source, cells]) => [source, Object.freeze([...cells])])));
}

function readingsOfJudgement(judgement) {
  if (judgement === null || typeof judgement !== "object" || Array.isArray(judgement)) {
    throw new TypeError("tile: glued judgement is not a cell record");
  }
  const record = {};
  for (const [cell, value] of Object.entries(judgement)) {
    if (typeof value !== "string" || !(readingFamilies.knowledge).includes(value)) {
      throw new TypeError(`tile: cell ${cell} carries a non-reading judgement value`);
    }
    record[cell] = value;
  }
  return Object.freeze(record);
}

/** Read Construction 4.1 + Definition 4.2 off real claim-session material:
 *  glue the bundles (the SAME `glueClaimSessions` the fleet cut and
 *  `fact-claims.mts` already use), take the cell set and reading valuation
 *  directly off the glued judgement, build the cell graph from the glued
 *  conflicts and coordination obstructions, and reuse the already-computed
 *  coordination-cohomology rank as eta (never recomputed). */
export function tileOfClaimSessionBundles(bundles) {
  const glued = glueClaimSessions(bundles);
  const readings = readingsOfJudgement(glued.judgement);
  const cells = Object.freeze(Object.keys(readings).sort());
  const obstructionCells = Object.freeze(glued.coordination.obstructions.map((entry) => entry.cell));
  const adjacency = cliqueAdjacency(cells, [glued.conflicts, obstructionCells]);
  const structure = Object.freeze({ cells, adjacency, readings });
  const tile = buildTile(structure, {
    rank: glued.coordination.rank,
    vanishing: glued.coordination.vanishing === "witness",
  });
  return Object.freeze({
    kind: "tile.claim-session-projection",
    glued,
    cover: coverOfBundles(bundles),
    tile,
  });
}
