/**
 * models/plasma/topological-wave-sheaf - finite band sheaf witnesses.
 *
 * This captures `Obsmetrologia.Relational.Plasma.TopologicalWaveSheaf`:
 * bulk Lawvere-Laplacian modes, fuzzy band-equivalence composition, and
 * edge obstructions as non-vanishing H1 in curved band regimes.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";


export type ChargeMode = "bot" | "mid" | "top";

export const fuzzyBandEquivalenceSchema = {
  $id: "metroplat/models/plasma/topological-wave-sheaf/fuzzy-band-equivalence",
  type: "object",
  required: ["kind", "grade", "from", "to"],
  properties: {
    kind: { const: "relational.plasma.topologicalWave.fuzzyEquiv" },
    grade: { type: "number" },
    from: { type: "string" },
    to: { type: "string" },
  },
  additionalProperties: false,
  title: "FuzzyBandEquivalence",
  description: "A fuzzy band-equivalence edge between two bulk Lawvere-Laplacian modes, at a grade.",
} as const;

export type FuzzyBandEquivalence = FromJsonSchema<typeof fuzzyBandEquivalenceSchema>;

export interface BandSheaf {
  readonly kind: "relational.plasma.topologicalWave.bandSheaf";
  readonly coupling: ChargeMode;
  readonly curved: boolean;
}

export interface BulkModeWitness {
  readonly kind: "relational.plasma.topologicalWave.bulkMode:witness";
  readonly coupling: ChargeMode;
  readonly mode: ChargeMode;
  readonly fixed: true;
  readonly closedUnderLaplacian: true;
  readonly closedUnderJoin: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Plasma.laplacian_H0_modes_are_global_sections";
}

export interface FuzzyBandEquivalenceComposesWitness {
  readonly kind: "relational.plasma.topologicalWave.fuzzy_band_equivalence_composes:witness";
  readonly first: FuzzyBandEquivalence;
  readonly second: FuzzyBandEquivalence;
  readonly composed: FuzzyBandEquivalence;
  readonly leanDefinition: "Obsmetrologia.Relational.Plasma.fuzzy_band_equivalence_composes";
}

export interface EdgeObstructionWitness {
  readonly kind: "relational.plasma.topologicalWave.edge_obstruction:witness";
  readonly band: BandSheaf;
  readonly edgeObstruction: true;
  readonly h1Nonzero: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Plasma.edge_obstruction_implies_H1_nonzero",
    "Obsmetrologia.Relational.Plasma.canonicalEdgeBand_has_obstruction",
    "Obsmetrologia.Relational.Plasma.canonicalEdgeBand_H1_nonzero",
  ];
}

export interface FlatBandForbidsEdgeWitness {
  readonly kind: "relational.plasma.topologicalWave.flat_forbids_edge:witness";
  readonly band: BandSheaf;
  readonly noEdgeObstruction: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Plasma.flat_band_forbids_edge_obstruction";
}

export interface PlasmaTopologicalWaveSheafReceipt {
  readonly kind: "relational.plasma.topologicalWave.receipt:witness";
  readonly bulk: BulkModeWitness;
  readonly fuzzy: FuzzyBandEquivalenceComposesWitness;
  readonly edge: EdgeObstructionWitness;
  readonly flat: FlatBandForbidsEdgeWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Plasma.TopologicalWaveSheaf";
}

function chargeRank(charge: ChargeMode): number {
  return charge === "bot" ? 0 : charge === "mid" ? 1 : 2;
}

function chargeFromRank(rank: number): ChargeMode {
  return rank <= 0 ? "bot" : rank === 1 ? "mid" : "top";
}

export function joinCharge(left: ChargeMode, right: ChargeMode): ChargeMode {
  return chargeFromRank(Math.max(chargeRank(left), chargeRank(right)));
}

export function laplacian(coupling: ChargeMode, mode: ChargeMode): ChargeMode {
  return chargeFromRank(Math.min(chargeRank(coupling), chargeRank(mode)));
}

export function isBulkMode(coupling: ChargeMode, mode: ChargeMode): boolean {
  return laplacian(coupling, mode) === mode;
}

export function bulkModeWitness(coupling: ChargeMode, mode: ChargeMode): BulkModeWitness {
  if (!isBulkMode(coupling, mode)) throw new TypeError("bulkModeWitness: mode is not fixed by the Laplacian");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.bulkMode:witness" as const,
    coupling,
    mode,
    fixed: true as const,
    closedUnderLaplacian: true as const,
    closedUnderJoin: true as const,
    leanTheorem: "Obsmetrologia.Relational.Plasma.laplacian_H0_modes_are_global_sections" as const,
  });
}

export function fuzzyBandEquivalence(grade: number, from: string, to: string): FuzzyBandEquivalence {
  if (!Number.isFinite(grade) || grade < 0) throw new TypeError("fuzzyBandEquivalence: grade must be nonnegative");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.fuzzyEquiv" as const,
    grade,
    from,
    to,
  });
}

export function fuzzyBandEquivalenceComposes(
  first: FuzzyBandEquivalence,
  second: FuzzyBandEquivalence,
): FuzzyBandEquivalenceComposesWitness {
  if (first.to !== second.from) throw new TypeError("fuzzyBandEquivalenceComposes: middle band mismatch");
  const composed = fuzzyBandEquivalence(first.grade * second.grade, first.from, second.to);
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.fuzzy_band_equivalence_composes:witness" as const,
    first,
    second,
    composed,
    leanDefinition: "Obsmetrologia.Relational.Plasma.fuzzy_band_equivalence_composes" as const,
  });
}

export function bandSheaf(coupling: ChargeMode, curved: boolean): BandSheaf {
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.bandSheaf" as const,
    coupling,
    curved,
  });
}

export function edgeObstruction(band: BandSheaf): EdgeObstructionWitness {
  if (!band.curved) throw new TypeError("edgeObstruction: flat band has no protected edge");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.edge_obstruction:witness" as const,
    band,
    edgeObstruction: true as const,
    h1Nonzero: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.edge_obstruction_implies_H1_nonzero",
      "Obsmetrologia.Relational.Plasma.canonicalEdgeBand_has_obstruction",
      "Obsmetrologia.Relational.Plasma.canonicalEdgeBand_H1_nonzero",
    ] as const),
  });
}

export function flatBandForbidsEdgeObstruction(band: BandSheaf): FlatBandForbidsEdgeWitness {
  if (band.curved) throw new TypeError("flatBandForbidsEdgeObstruction: band is curved");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.flat_forbids_edge:witness" as const,
    band,
    noEdgeObstruction: true as const,
    leanTheorem: "Obsmetrologia.Relational.Plasma.flat_band_forbids_edge_obstruction" as const,
  });
}

export function canonicalEdgeBand(): BandSheaf {
  return bandSheaf("bot", true);
}

export function plasmaTopologicalWaveSheafReceipt(): PlasmaTopologicalWaveSheafReceipt {
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.receipt:witness" as const,
    bulk: bulkModeWitness("top", "mid"),
    fuzzy: fuzzyBandEquivalenceComposes(
      fuzzyBandEquivalence(0.8, "left", "middle"),
      fuzzyBandEquivalence(0.5, "middle", "right"),
    ),
    edge: edgeObstruction(canonicalEdgeBand()),
    flat: flatBandForbidsEdgeObstruction(bandSheaf("top", false)),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.TopologicalWaveSheaf" as const,
  });
}
