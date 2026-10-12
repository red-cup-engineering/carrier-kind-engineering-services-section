/**
 * @packageDocumentation
 * Admission contracts for EAVT rows and data-artifact projection tiers.
 *
 * @metroplatSubject schema
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const tierName = { enum: ["log", "state", "record", "content"] };

const eavtTupleSchema = {
  type: "array",
  minItems: 4,
  maxItems: 4,
  prefixItems: [{}, {}, {}, {}],
  items: false,
};

export const eavtStatementLogContract = schemaFrom({
  $id: "metroplat/witness/eavt-log",
  title: "EAVTStatementLog",
  description: "An append-only source log of exact EAVT statement tuples: [entity, attribute, value, coordinate]. Generic over EAVT; a row only counts as RWIL when its attribute is specifically an SEN term. The $id is a frozen legacy wire address.",
  type: "array",
  items: eavtTupleSchema,
});

export const dataDirectoryStoreSchema = {
  $id: "filesystem:data-directory-witness-store",
  title: "DataDirectoryStore",
  description: "A stateless data-directory projection store with log, state, record, and optional content tiers. The $id is a frozen legacy wire address.",
  type: "object",
  required: ["logDir", "stateDir", "recordDir"],
  properties: {
    logDir: { type: "string", minLength: 1 },
    stateDir: { type: "string", minLength: 1 },
    recordDir: { type: "string", minLength: 1 },
    contentDir: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const dataDirectoryStoreContract = schemaFrom(dataDirectoryStoreSchema);

export const dataArtifactAddressSchema = {
  $id: "metroplat/stores/data-artifact-address",
  title: "DataArtifactAddress",
  description: "A dated durable artifact address under the data tree.",
  type: "object",
  required: ["kind", "root", "rootName", "tier", "encoding", "extension", "date", "action", "subject", "feed", "directory", "filename", "path", "relativePath"],
  properties: {
    kind: { const: "metroplat.data-artifact-address" },
    root: { type: "string", minLength: 1 },
    rootName: { type: "string", minLength: 1 },
    tier: tierName,
    encoding: { type: "string", minLength: 1 },
    extension: { type: "string", minLength: 1 },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    action: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    feed: { type: "string", minLength: 1 },
    directory: { type: "string", minLength: 1 },
    filename: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    relativePath: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const dataArtifactAddressContract = schemaFrom(dataArtifactAddressSchema);

export const dataArtifactSchemaContractSchema = {
  $id: "metroplat/stores/data-artifact-descriptor",
  title: "DataArtifactDescriptor",
  description: "A durable artifact-tier codomain/domain descriptor identified by tier role, filesystem path, media type, and schema address.",
  type: "object",
  required: ["kind", "tier", "role", "path", "mediaType", "schema"],
  properties: {
    kind: { const: "metroplat.data-artifact-descriptor" },
    tier: tierName,
    role: { enum: ["source", "sufficient-statistic", "rate-distortion-code", "lossy-cut"] },
    path: { type: "string", minLength: 1 },
    mediaType: { type: "string", minLength: 1 },
    schema: { enum: ["metroplat/witness/eavt-log", "metroplat/witness/state-view", "data/records", "content"] },
  },
  additionalProperties: false,
};

export const dataArtifactSchemaContractMaterial = schemaFrom(dataArtifactSchemaContractSchema);

export const dataRecordContract = schemaFrom({
  $id: "data/records",
  title: "DataRecordTier",
  description: "The settled record tier: compacted datom records derived from statement logs.",
  type: "array",
  items: {},
});

export const dataContentContract = schemaFrom({
  $id: "content",
  title: "DataContentTier",
  description: "The lossy content tier: term-addressed document cuts derived from state artifacts.",
  type: "array",
  items: {
    type: "object",
    required: ["path", "content"],
    properties: {
      path: { type: "string", minLength: 1 },
      content: { type: "string" },
    },
    additionalProperties: false,
  },
});

export const artifactTierContract = schemaFrom({
  $id: "metroplat/persistence/witness-tier",
  title: "ArtifactTier",
  description: "One artifact information tier: source log, state statistic, record code, or content cut. Generic over EAVT — not RWIL-specific. The $id and kind are frozen legacy wire values.",
  type: "object",
  required: ["kind", "name", "role", "rank", "pathSegment", "queryClass", "preserves", "mayForget"],
  properties: {
    kind: { const: "witness.tier" },
    name: tierName,
    role: { enum: ["source", "sufficient-statistic", "rate-distortion-code", "lossy-cut"] },
    rank: { type: "integer", minimum: 0 },
    pathSegment: { type: "string", minLength: 1 },
    queryClass: { type: "string", minLength: 1 },
    preserves: { type: "array", items: { type: "string" } },
    mayForget: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
});

export const artifactProjectionStepContract = schemaFrom({
  $id: "metroplat/persistence/witness-projection-step",
  title: "ArtifactProjectionStep",
  description: "A deterministic non-increasing information projection between artifact tiers. The $id and kind are frozen legacy wire values.",
  type: "object",
  required: ["kind", "from", "to", "law", "information", "preserves", "mayForget"],
  properties: {
    kind: { const: "witness.projection-step" },
    from: tierName,
    to: tierName,
    law: { const: "deterministic-projection" },
    information: { const: "non-increasing" },
    preserves: { type: "array", items: { type: "string" } },
    mayForget: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
});

export const artifactInformationChainContract = schemaFrom({
  $id: "metroplat/persistence/witness-information-chain",
  title: "ArtifactInformationChain",
  description: "The statement log -> state -> record -> content data-processing chain. Generic over EAVT; RWIL rows are the subtype whose attribute is an SEN term. The $id, kind, references, and dataProcessing value are frozen legacy wire material.",
  type: "object",
  required: ["kind", "tiers", "projections", "source", "terminal", "dataProcessing", "ok", "violations"],
  properties: {
    kind: { const: "witness.information-chain" },
    tiers: { type: "array", minItems: 4, items: { $ref: "witness-tier" } },
    projections: { type: "array", minItems: 3, items: { $ref: "witness-projection-step" } },
    source: { const: "log" },
    terminal: { const: "content" },
    dataProcessing: { const: "witness" },
    ok: { type: "boolean" },
    violations: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
}, [artifactTierContract, artifactProjectionStepContract]);

export const statementLogInformationContract = schemaFrom({
  $id: "metroplat/persistence/witness-log-information",
  title: "StatementLogInformation",
  description: "The finite source-information read of a statement log by canonical row identity. The $id, kind, and historical field names are frozen legacy wire material.",
  type: "object",
  required: ["kind", "rows", "uniqueStatements", "duplicateStatements", "entropyUnits", "duplicateSurprisal", "identities"],
  properties: {
    kind: { const: "witness.log-information" },
    rows: { type: "integer", minimum: 0 },
    uniqueStatements: { type: "integer", minimum: 0 },
    duplicateStatements: { type: "integer", minimum: 0 },
    entropyUnits: { type: "integer", minimum: 0 },
    duplicateSurprisal: { const: 0 },
    identities: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
});
