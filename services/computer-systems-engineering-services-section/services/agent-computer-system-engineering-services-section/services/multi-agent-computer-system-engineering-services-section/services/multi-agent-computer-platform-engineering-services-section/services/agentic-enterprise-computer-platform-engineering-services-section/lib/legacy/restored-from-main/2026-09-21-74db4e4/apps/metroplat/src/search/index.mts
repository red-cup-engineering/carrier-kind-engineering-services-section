/**
 * Search owns term-intension normalization, settlement, schemas, concept-resolution reads,
 * and the host-backed evidence collectors that supply them. The modules exported here are
 * pure over already-collected evidence; host composition remains in `service.mts`.
 */
export {
  exactTermIntensionMatch,
  normalizeTermQuery,
  occurrenceFcaCells,
  deriveTermIntensionReadout,
  textMatchesTermIntension,
  type TermIntensionAnchor,
  type TermIntensionEvidenceGrade,
  type TermIntensionLens,
  type TermIntensionLensReading,
  type TermIntensionNormalized,
  type TermIntensionOccurrence,
  type TermIntensionReadout as PureTermIntensionReadout,
  type TermIntensionInput,
  type TermIntensionStatus,
} from "./standing.mts";

export {
  termIntensionReadoutContract,
  termIntensionReadoutSchema,
  termIntensionRequestContract,
  termIntensionRequestSchema,
  type TermIntensionReadout,
  type TermIntensionRequest,
} from "./schema.mts";

export {
  conceptResolutionFeed,
  conceptResolutionOfRow,
  conceptResolutionRows,
  conceptResolutionTerm,
  type ConceptResolution,
} from "./concept-resolution.mts";
