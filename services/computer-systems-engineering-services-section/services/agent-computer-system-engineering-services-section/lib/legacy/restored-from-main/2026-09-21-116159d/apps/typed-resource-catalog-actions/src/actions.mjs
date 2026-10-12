import { jsonResource } from "@red-cup-engineering/agentic-relation-engine/codecs";
import { action, induceBins, literalResource } from "@red-cup-engineering/agentic-relation-engine/running";
import { auditCatalog, classifyResource, compileCatalog } from "@red-cup-engineering/typed-resource-catalog";
import { checkLanguageCone } from "@red-cup-engineering/typed-resource-catalog";
import { receiptRmn } from "@red-cup-engineering/typed-resource-catalog";

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

export const actions = Object.freeze([classifyTypedResourceAction, auditTypedResourceCatalogAction, checkLanguageConeAction, projectReceiptRmnAction]);
export const trcApex = induceBins(actions, {
  packageName: "@red-cup-engineering/typed-resource-catalog",
  basePath: "/typed-resource-catalog",
  resources: [literalResource("trc://law/recognition", "TRC recognition law", "recognize_child = recognize_parent AND local; the deepest unique witnessed proposition classifies; equal-depth incomparable propositions remain ambiguous.\n")],
});
