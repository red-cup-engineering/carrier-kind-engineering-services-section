import { jsonResource } from "@red-cup-engineering/relating/codecs";
import { action, induceBins, literalResource } from "@red-cup-engineering/relating/running";
import { auditCatalog, classifyResource, compileCatalog } from "./catalog.mjs";
import { checkLanguageCone } from "./language-cone.mjs";
import { catalogNodeWorkspaceSources } from "./node-workspace-source-catalog.mjs";
import { catalogWorkspaceContentGraph } from "@red-cup-engineering/workspace-content-graph-service";
import { scanTemporalFailureMarks } from "./temporal-failure-normalization.mjs";
import { receiptRmn } from "./rmn.mjs";

const MAX_ACTION_INPUT_BYTES = 1_048_576;

function record(input, verb) {
  if (typeof input === "string" && Buffer.byteLength(input, "utf8") > MAX_ACTION_INPUT_BYTES) {
    throw new TypeError(`${verb}: input exceeds ${MAX_ACTION_INPUT_BYTES} UTF-8 bytes`);
  }
  const value = jsonResource(input, `${verb} input`);
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_ACTION_INPUT_BYTES) {
    throw new TypeError(`${verb}: input exceeds ${MAX_ACTION_INPUT_BYTES} UTF-8 bytes`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${verb}: expected a JSON object`);
  return value;
}

export const classifyTypedResourceAction = action({
  verb: "classify-typed-resource", inputFormat: "json", outputFormat: "json",
  summary: "Classify one resource and return its witnessed restriction proof path.",
  run: (input) => { const value = record(input, "classify-typed-resource"); return classifyResource(compileCatalog(value.catalog, { closed: value.closed !== false }), value.resource, value.options ?? {}); },
});

export const auditTypedResourceCatalogAction = action({
  verb: "audit-typed-resource-catalog", inputFormat: "json", outputFormat: "json",
  summary: "Expose unresolved schema and catalog obligations without loosening them.",
  run: (input) => auditCatalog(record(input, "audit-typed-resource-catalog")),
});

export const checkLanguageConeAction = action({
  verb: "check-language-cone", inputFormat: "json", outputFormat: "json",
  summary: "Classify a language cone and distinguish witnessed, contradicted, and unknown leg agreement.",
  run: (input) => { const value = record(input, "check-language-cone"); return checkLanguageCone(compileCatalog(value.catalog, { closed: value.closed !== false }), value.cone); },
});

export const projectReceiptRmnAction = action({
  verb: "project-trc-receipt-rmn", inputFormat: "json", outputFormat: "json",
  summary: "Project a TRC receipt as an ascribed RMN Mark.",
  run: (input) => { const projected = receiptRmn(record(input, "project-trc-receipt-rmn")); return { mediaType: projected.mediaType, semanticId: projected.semanticId, term: projected.term }; },
});

export const catalogNodeWorkspaceSourcesAction = action({
  verb: "catalog-node-workspace-sources", inputFormat: "json", outputFormat: "json",
  summary: "Project an admitted Node workspace manifest set as canonical package territory with dependency and proof-path relations.",
  run: (input) => catalogNodeWorkspaceSources(record(input, "catalog-node-workspace-sources")),
});

export const catalogWorkspaceContentGraphAction = action({
  verb: "catalog-workspace-content-graph", inputFormat: "json", outputFormat: "json",
  summary: "GROW addressed package actors, JSON Schemas, Markdown, and witnessed oriented relations in one workspace content graph.",
  run: (input) => catalogWorkspaceContentGraph(record(input, "catalog-workspace-content-graph")),
});

export const scanTemporalFailureMarksAction = action({
  verb: "scan-temporal-failure-marks", inputFormat: "json", outputFormat: "json",
  summary: "Scan an admitted code territory for temporal-failure marks and project addressed normalization demands.",
  run: (input) => scanTemporalFailureMarks(record(input, "scan-temporal-failure-marks")),
});

export const actions = Object.freeze([classifyTypedResourceAction, auditTypedResourceCatalogAction, checkLanguageConeAction, projectReceiptRmnAction, catalogNodeWorkspaceSourcesAction, catalogWorkspaceContentGraphAction, scanTemporalFailureMarksAction]);
export const trcApex = induceBins(actions, {
  packageName: "@red-cup-engineering/typed-resource-catalog",
  basePath: "/typed-resource-catalog",
  resources: [literalResource("trc://law/recognition", "TRC recognition law", "recognize_child = recognize_parent AND local; the deepest unique witnessed proposition classifies; equal-depth incomparable propositions remain ambiguous.\n")],
});
