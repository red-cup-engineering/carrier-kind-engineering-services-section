/**
 * contracts is the phase-indexed relational Hoare-contract kernel for instruments, witnesses, semantic judgments, reports, and energetic obligations.
 * It may import values and schema-adjacent type surfaces, but it must not execute actions or perform disk, clock, network, or random work.
 */
export {
  semanticJudgment,
  semanticJudgmentWitnessed,
  semanticJudgmentAspectWitnessed,
  fiberAspectWitnessed,
  type SemanticJudgment,
  type SemanticJudgmentPolarity,
} from "../logic/predicating/evidence/judgment.mts";
export { semanticJudgmentSchema, semanticJudgmentContract } from "../logic/predicating/evidence/judgment-schema.mts";
export * from "./contract.mts";
export * from "./instrument.mts";
export * from "./verification.mts";
export {
  type DirectedPhaseEvidence,
  type TransfinitePhaseEvidence,
  type FinitePhaseEvidence,
  type LocalWindowPhaseEvidence,
  type MetastablePhaseEvidence,
  type BoundaryOnlyPhaseEvidence,
  type PhaseEvidence,
  type PhaseSignature,
  directedPhaseEvidence,
  transfinitePhaseEvidence,
  finitePhaseEvidence,
  localWindowPhaseEvidence,
  metastablePhaseEvidence,
  boundaryOnlyPhaseEvidence,
  phaseEvidence,
  phaseSignature,
  strictFinitePhase,
  scottStreamPhase,
  transfiniteClosurePhase,
  aperiodicOrderPhase,
  glassyMetastablePhase,
  boundaryOnlyPhase,
} from "./phase.mts";
export {
  type ProgramPacketPurity,
  type ProgramPacketTotality,
  type OperationConformanceVector,
  type ExecutableProgramPacket,
  type SchemaOperationPresentation,
  type SchemaOperationAudit,
  operationConformanceVector,
  executableProgramPacket,
  schemaOperationsCompose,
  auditSchemaOperation,
} from "./contract-operation.mts";
export {
  type ObservationalLens,
  type EvidencePolicy,
  observationalLens,
  evidencePolicy,
} from "./observation.mts";
export {
  type EnergyBehavior,
  type EnergeticLaw,
  type EnergeticObligation,
  energeticObligation,
  phaseEnergeticObligation,
} from "./energetics.mts";
export {
  type AdmissibilityPresentationProjection,
  type AdmissibilityPresentation,
  type AdmissibilityProjectionBundle,
  admissibilityPresentation,
  admissibilityProjectionBundle,
} from "./admissibility-presentation.mts";
export * from "./contract-report.mts";
