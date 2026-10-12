/**
 * contracts is the phase-indexed relational Hoare-contract kernel for instruments, witnesses, semantic judgments, reports, and energetic obligations.
 * It may import values and schema-adjacent type surfaces, but it must not execute actions or perform disk, clock, network, or random work.
 */
export {
  semanticJudgment,
  semanticJudgmentWitnessed,
  semanticJudgmentAspectWitnessed,
  fiberAspectWitnessed,

} from "../logic/predicating/evidence/judgment.mjs";
export { semanticJudgmentSchema, semanticJudgmentContract } from "../logic/predicating/evidence/judgment-schema.mjs";
export * from "./contract.mjs";
export * from "./instrument.mjs";
export * from "./verification.mjs";
export {

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
} from "./phase.mjs";
export {

  operationConformanceVector,
  executableProgramPacket,
  schemaOperationsCompose,
  auditSchemaOperation,
} from "./contract-operation.mjs";
export {

  observationalLens,
  evidencePolicy,
} from "./observation.mjs";
export {

  energeticObligation,
  phaseEnergeticObligation,
} from "./energetics.mjs";
export {

  admissibilityPresentation,
  admissibilityProjectionBundle,
} from "./admissibility-presentation.mjs";
export * from "./contract-report.mjs";
