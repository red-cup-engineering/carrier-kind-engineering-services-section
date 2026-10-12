/**
 * writing - projector and document-writing support for relating.
 *
 * Concrete boundary codecs live under `@red-cup-engineering/relating/codecs/...`, where their
 * paths encode substrate and syntax refinement. This surface keeps the document
 * writing products that are not exported as codec leaves.
 *
 * @packageDocumentation
 */

export { stringProjector } from "./text.mjs";
export { jsonResource } from "../codecs/text/json/index.mjs";
export { parseLines, serializeLines } from "../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/services/jsonl-services-section/src/index.mjs";

export { decodeToml, encodeToml, } from "@red-cup-engineering/toml-services-section/toml-codec";
export { iriRef, turtleLiteral } from "./turtle.mjs";

export * as schema from "./schema.mjs";
export {
  JSON_SCHEMA_DIALECT,
  schemaProjector,
  unfoldSchema,
  foldSchema,
  cohereSchemaAssertions,
  projectSchemaAssertions,
  resolveJsonPointer,

} from "./schema.mjs";

export * as markdown from "./markdown.mjs";
export {
  markdownProjector,
  markdownDataform,
  createMarkdown,
  markdownDocumentSchemaFragment,
  documentTypeDefinitions,
  documentTypeFragment,
  documentTypeAssertions,
  allDocumentTypeAssertions,

} from "./markdown.mjs";

export * as diagram from "./diagram.mjs";
export {
  presentedCategoryDiagramSchema,
  presentedCategoryDiagramCarrier,
  presentedCategoryDiagram,
  isPresentedCategoryDiagram,
  diagramFromCarrierCategory,
  objectFrom,
  morphismFrom,
  diagramToSvgDataform,
  diagramPalette,
  settlementFiltrationStateMachineDiagram,
  witnessLedgerSequenceDiagram,
  mermaidProjector,
  umlProjector,
  plantUmlProjector,
  writeMermaid,
  readMermaid,
  writeXmi,
  readXmi,
  writePlantUml,
  readPlantUml,

} from "./diagram.mjs";

export * as rmn from "./rmn.mjs";
export {
  RMN_JSON,
  rmnProjector,
  isRelationalTerm,
  parseRmn,
  settleRmn,
  extractRelationalScripts,
  htmlIsRelational,
  settleRelationalHtml,
  sessionIsRelational,
  settleRelationalSession,
} from "./rmn.mjs";

export * as http from "./http/index.mjs";
export * as path from "./path.mjs";
export {
  address,
  logPath,
  eavtLogPaths,
  termKey,
  segment,
  sanitizeSegment,
  desanitizeSegment,
  composeTerm,
  decomposeTerm,
  namespaceOf,
  withinNamespace,
  termOf,
  termOfNested,
  addressNested,
  dehydrateUtterances,
  rehydrateUtterances,
  normalizePath,
  pathParent,
  pathBasename,
  pathPoint,
  pathOfPoint,
  isPathname,
  validPath,
  pathProjector,

} from "./path.mjs";

export * as evidence from "./evidence.mjs";
export {
  entropyBitsAtBoundary,
  klBitsAtBoundary,
  mutualInformationBitsAtBoundary,

} from "./evidence.mjs";
export * as spectral from "./spectral.mjs";
export * as otlp from "./otlp.mjs";
export {
  otlpSpanSchema,
  otlpTracesSchema,
  agentEventChronicleSchema,
  otlpSpanCarrier,
  otlpTracesCarrier,
  agentEventChronicleCarrier,
  spanFromWitness,
  witnessFromSpan,
  otlpFromWitnesses,
  otlpFromAgentEventChronicle,
  witnessesFromOtlp,
  agentEventWitnessesFromOtlp,
  otlpBulkCells,

} from "./otlp.mjs";

export { quadraticToNumber } from "./quadratic.mjs";

export { printType, generateDeclaration } from "./print.mjs";
