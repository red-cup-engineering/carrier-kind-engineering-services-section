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

} from "./standing.mjs";

export {
  termIntensionReadoutContract,
  termIntensionReadoutSchema,
  termIntensionRequestContract,
  termIntensionRequestSchema,

} from "./schema.mjs";

export {
  conceptResolutionFeed,
  conceptResolutionOfRow,
  conceptResolutionRows,
  conceptResolutionTerm,

} from "./concept-resolution.mjs";
