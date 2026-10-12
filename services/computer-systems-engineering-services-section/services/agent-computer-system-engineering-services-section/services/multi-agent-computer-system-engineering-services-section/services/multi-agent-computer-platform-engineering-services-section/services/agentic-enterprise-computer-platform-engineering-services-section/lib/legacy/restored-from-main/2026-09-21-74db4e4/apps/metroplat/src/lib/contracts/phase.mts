/**
 * contracts/phase - phase evidence and phase signatures for the Hoare-contract
 * layer in `contracts/index.mjs`. Split out of that file because "phase" was
 * one identifiable, self-contained cluster inside a single 5000+ line module.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";

import type { ContractValue } from "./contract.mts";


export const directedPhaseEvidenceSchema = {
  $id: "metroplat/contracts/phase/directed-phase-evidence",
  type: "object",
  required: ["kind", "id", "phase", "closureDepth", "appendOnly", "monotone", "approximation", "observations"],
  properties: {
    kind: { const: "metroplat.phase-evidence.directed" },
    id: { type: "string" },
    phase: { type: "string" },
    closureDepth: { const: "directed" },
    appendOnly: { type: "boolean" },
    monotone: { type: "boolean" },
    approximation: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "DirectedPhaseEvidence",
  description: "Phase evidence for the directed closure-depth regime: append-only, monotone, approximating.",
} as const;

export type DirectedPhaseEvidence = FromJsonSchema<typeof directedPhaseEvidenceSchema>;

export interface TransfinitePhaseEvidence {
  readonly kind: "metroplat.phase-evidence.transfinite";
  readonly id: string;
  readonly phase: string;
  readonly closureDepth: "transfinite";
  readonly stageIndexed: boolean;
  readonly limitAccounted: boolean;
  readonly cofinal: boolean;
  readonly stages: readonly ContractValue[];
}

export const finitePhaseEvidenceSchema = {
  $id: "metroplat/contracts/phase/finite-phase-evidence",
  type: "object",
  required: ["kind", "id", "phase", "closureDepth", "normalForm", "deterministic", "completed", "observations"],
  properties: {
    kind: { const: "metroplat.phase-evidence.finite" },
    id: { type: "string" },
    phase: { type: "string" },
    closureDepth: { const: "finite" },
    normalForm: { type: "boolean" },
    deterministic: { type: "boolean" },
    completed: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "FinitePhaseEvidence",
  description: "Phase evidence for the finite closure-depth regime: normal form, deterministic, completed.",
} as const;

export type FinitePhaseEvidence = FromJsonSchema<typeof finitePhaseEvidenceSchema>;

export const localWindowPhaseEvidenceSchema = {
  $id: "metroplat/contracts/phase/local-window-phase-evidence",
  type: "object",
  required: ["kind", "id", "phase", "closureDepth", "patchIndexed", "localRules", "hullCompatible", "observations"],
  properties: {
    kind: { const: "metroplat.phase-evidence.local-window" },
    id: { type: "string" },
    phase: { type: "string" },
    closureDepth: { const: "local-window" },
    patchIndexed: { type: "boolean" },
    localRules: { type: "boolean" },
    hullCompatible: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "LocalWindowPhaseEvidence",
  description: "Phase evidence for the local-window closure-depth regime: patch-indexed, local rules, hull-compatible.",
} as const;

export type LocalWindowPhaseEvidence = FromJsonSchema<typeof localWindowPhaseEvidenceSchema>;

export const metastablePhaseEvidenceSchema = {
  $id: "metroplat/contracts/phase/metastable-phase-evidence",
  type: "object",
  required: ["kind", "id", "phase", "closureDepth", "basinObserved", "overlapTracked", "residualFrustration", "observations"],
  properties: {
    kind: { const: "metroplat.phase-evidence.metastable" },
    id: { type: "string" },
    phase: { type: "string" },
    closureDepth: { const: "metastable" },
    basinObserved: { type: "boolean" },
    overlapTracked: { type: "boolean" },
    residualFrustration: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "MetastablePhaseEvidence",
  description: "Phase evidence for the metastable closure-depth regime: basin-observed, overlap-tracked, residual frustration.",
} as const;

export type MetastablePhaseEvidence = FromJsonSchema<typeof metastablePhaseEvidenceSchema>;

export const boundaryOnlyPhaseEvidenceSchema = {
  $id: "metroplat/contracts/phase/boundary-only-phase-evidence",
  type: "object",
  required: ["kind", "id", "phase", "closureDepth", "boundaryExposed", "bulkHidden", "evidenceRequired", "observations"],
  properties: {
    kind: { const: "metroplat.phase-evidence.boundary-only" },
    id: { type: "string" },
    phase: { type: "string" },
    closureDepth: { const: "boundary-only" },
    boundaryExposed: { type: "boolean" },
    bulkHidden: { type: "boolean" },
    evidenceRequired: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "BoundaryOnlyPhaseEvidence",
  description: "Phase evidence for the boundary-only closure-depth regime: boundary-exposed, bulk-hidden, evidence-required.",
} as const;

export type BoundaryOnlyPhaseEvidence = FromJsonSchema<typeof boundaryOnlyPhaseEvidenceSchema>;

export type PhaseEvidence =
  | DirectedPhaseEvidence
  | TransfinitePhaseEvidence
  | FinitePhaseEvidence
  | LocalWindowPhaseEvidence
  | MetastablePhaseEvidence
  | BoundaryOnlyPhaseEvidence;

export interface PhaseSignature {
  readonly id: string;
  readonly closureDepth: "none" | "finite" | "directed" | "transfinite" | "local-window" | "metastable" | "boundary-only";
  readonly finality: "normal-form" | "approximation" | "stage" | "local" | "basin" | "boundary";
  readonly recurrence: "none" | "monotone" | "periodic" | "aperiodic" | "history-dependent";
  readonly mobility: "fixed" | "local" | "heterogeneous" | "unbounded";
  readonly coherence: "total" | "partial" | "contested" | "obstructed";
  readonly contradiction: "reject" | "preserve" | "settle" | "hold";
  readonly coordinationCost: "none" | "local" | "global" | "evidenced";
  readonly observability: "bulk" | "projection" | "stream" | "boundary-only";
  readonly energy: "ignored" | "decreasing" | "accumulating" | "jamming" | "relaxing" | "costed";
}

export function directedPhaseEvidence(spec: Omit<DirectedPhaseEvidence, "kind" | "closureDepth">): DirectedPhaseEvidence {
  return Object.freeze({
    kind: "metroplat.phase-evidence.directed" as const,
    id: spec.id,
    phase: spec.phase,
    closureDepth: "directed" as const,
    appendOnly: spec.appendOnly,
    monotone: spec.monotone,
    approximation: spec.approximation,
    observations: Object.freeze([...spec.observations]),
  });
}

export function transfinitePhaseEvidence(spec: Omit<TransfinitePhaseEvidence, "kind" | "closureDepth">): TransfinitePhaseEvidence {
  return Object.freeze({
    kind: "metroplat.phase-evidence.transfinite" as const,
    id: spec.id,
    phase: spec.phase,
    closureDepth: "transfinite" as const,
    stageIndexed: spec.stageIndexed,
    limitAccounted: spec.limitAccounted,
    cofinal: spec.cofinal,
    stages: Object.freeze([...spec.stages]),
  });
}

export function finitePhaseEvidence(spec: Omit<FinitePhaseEvidence, "kind" | "closureDepth">): FinitePhaseEvidence {
  return Object.freeze({
    kind: "metroplat.phase-evidence.finite" as const,
    id: spec.id,
    phase: spec.phase,
    closureDepth: "finite" as const,
    normalForm: spec.normalForm,
    deterministic: spec.deterministic,
    completed: spec.completed,
    observations: Object.freeze([...spec.observations]),
  });
}

export function localWindowPhaseEvidence(spec: Omit<LocalWindowPhaseEvidence, "kind" | "closureDepth">): LocalWindowPhaseEvidence {
  return Object.freeze({
    kind: "metroplat.phase-evidence.local-window" as const,
    id: spec.id,
    phase: spec.phase,
    closureDepth: "local-window" as const,
    patchIndexed: spec.patchIndexed,
    localRules: spec.localRules,
    hullCompatible: spec.hullCompatible,
    observations: Object.freeze([...spec.observations]),
  });
}

export function metastablePhaseEvidence(spec: Omit<MetastablePhaseEvidence, "kind" | "closureDepth">): MetastablePhaseEvidence {
  return Object.freeze({
    kind: "metroplat.phase-evidence.metastable" as const,
    id: spec.id,
    phase: spec.phase,
    closureDepth: "metastable" as const,
    basinObserved: spec.basinObserved,
    overlapTracked: spec.overlapTracked,
    residualFrustration: spec.residualFrustration,
    observations: Object.freeze([...spec.observations]),
  });
}

export function boundaryOnlyPhaseEvidence(spec: Omit<BoundaryOnlyPhaseEvidence, "kind" | "closureDepth">): BoundaryOnlyPhaseEvidence {
  return Object.freeze({
    kind: "metroplat.phase-evidence.boundary-only" as const,
    id: spec.id,
    phase: spec.phase,
    closureDepth: "boundary-only" as const,
    boundaryExposed: spec.boundaryExposed,
    bulkHidden: spec.bulkHidden,
    evidenceRequired: spec.evidenceRequired,
    observations: Object.freeze([...spec.observations]),
  });
}

export function phaseEvidence(spec: PhaseEvidence): PhaseEvidence {
  switch (spec.kind) {
    case "metroplat.phase-evidence.directed":
      return directedPhaseEvidence(spec);
    case "metroplat.phase-evidence.transfinite":
      return transfinitePhaseEvidence(spec);
    case "metroplat.phase-evidence.finite":
      return finitePhaseEvidence(spec);
    case "metroplat.phase-evidence.local-window":
      return localWindowPhaseEvidence(spec);
    case "metroplat.phase-evidence.metastable":
      return metastablePhaseEvidence(spec);
    case "metroplat.phase-evidence.boundary-only":
      return boundaryOnlyPhaseEvidence(spec);
  }
  throw new TypeError("phaseEvidence: unrecognized phase evidence");
}

export function phaseSignature(spec: PhaseSignature): PhaseSignature {
  return Object.freeze({ ...spec });
}

export const strictFinitePhase = phaseSignature({
  id: "metroplat.phase.strict-finite",
  closureDepth: "finite",
  finality: "normal-form",
  recurrence: "none",
  mobility: "fixed",
  coherence: "total",
  contradiction: "reject",
  coordinationCost: "none",
  observability: "bulk",
  energy: "decreasing",
});

export const scottStreamPhase = phaseSignature({
  id: "metroplat.phase.scott-stream",
  closureDepth: "directed",
  finality: "approximation",
  recurrence: "monotone",
  mobility: "local",
  coherence: "partial",
  contradiction: "preserve",
  coordinationCost: "none",
  observability: "stream",
  energy: "accumulating",
});

export const transfiniteClosurePhase = phaseSignature({
  id: "metroplat.phase.transfinite-closure",
  closureDepth: "transfinite",
  finality: "stage",
  recurrence: "monotone",
  mobility: "unbounded",
  coherence: "partial",
  contradiction: "preserve",
  coordinationCost: "global",
  observability: "projection",
  energy: "accumulating",
});

export const aperiodicOrderPhase = phaseSignature({
  id: "metroplat.phase.aperiodic-order",
  closureDepth: "local-window",
  finality: "local",
  recurrence: "aperiodic",
  mobility: "heterogeneous",
  coherence: "partial",
  contradiction: "hold",
  coordinationCost: "local",
  observability: "projection",
  energy: "costed",
});

export const glassyMetastablePhase = phaseSignature({
  id: "metroplat.phase.glassy-metastable",
  closureDepth: "metastable",
  finality: "basin",
  recurrence: "history-dependent",
  mobility: "heterogeneous",
  coherence: "contested",
  contradiction: "hold",
  coordinationCost: "evidenced",
  observability: "stream",
  energy: "jamming",
});

export const boundaryOnlyPhase = phaseSignature({
  id: "metroplat.phase.boundary-only",
  closureDepth: "boundary-only",
  finality: "boundary",
  recurrence: "none",
  mobility: "fixed",
  coherence: "obstructed",
  contradiction: "preserve",
  coordinationCost: "evidenced",
  observability: "boundary-only",
  energy: "ignored",
});
