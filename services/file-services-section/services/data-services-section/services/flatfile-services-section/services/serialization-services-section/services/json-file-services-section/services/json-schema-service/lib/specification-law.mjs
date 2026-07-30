import { parseRml, semanticId } from "../../../../../../../../../../../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-semantic-conformance-die/src/rmn-core.mjs";

export const REQUIREMENT_IDS = Object.freeze(
  Array.from({ length: 8 }, (_, index) => `JSS-R${String(index + 1).padStart(3, "0")}`),
);
export const CASE_IDS = Object.freeze(
  Array.from({ length: 8 }, (_, index) => `JSS-C${String(index + 1).padStart(3, "0")}`),
);
export const DIALECT = "https://json-schema.org/draft/2020-12/schema";
export const SUPPORTED_VOCABULARY = Object.freeze([
  "$schema", "$id", "$ref", "$defs", "$comment", "$comment-absences",
  "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly",
  "type", "enum", "const",
  "required", "properties", "additionalProperties", "propertyNames", "minProperties", "maxProperties",
  "items", "minItems", "maxItems", "uniqueItems", "contains",
  "minLength", "maxLength", "pattern", "format",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
]);

const TYPES = Object.freeze({
  baseline: "JsonSchemaServiceRequirementsBaseline",
  architecture: "JsonSchemaServiceSoftwareArchitectureSpecification",
  hld: "JsonSchemaServiceHighLevelDesign",
  lld: "JsonSchemaServiceLowLevelDesign",
  vnv: "JsonSchemaServiceVerificationAndValidationSpecification",
  trace: "JsonSchemaServiceTraceabilityMatrix",
});

function map(value, coordinate) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${coordinate} must be an RML map`);
  return value;
}
function sequence(value, coordinate) {
  if (!Array.isArray(value)) throw new TypeError(`${coordinate} must be an RML sequence`);
  return value;
}
function document(text, type, coordinate) {
  const value = map(parseRml(text), coordinate);
  if (value.type !== type) throw new TypeError(`${coordinate}.type must be ${type}`);
  if (!Number.isSafeInteger(value.version) || value.version < 1) throw new TypeError(`${coordinate}.version must be positive`);
  return value;
}
function exact(actual, expected, coordinate) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new TypeError(`${coordinate} must be exactly ${expected.join(", ")} in order`);
  }
}
function unique(values, coordinate) {
  if (new Set(values).size !== values.length) throw new TypeError(`${coordinate} contains duplicates`);
}

/** Conform the complete JSON Schema specification chain with the RMN parser. */
export function conformJsonSchemaServiceSpecification(input) {
  const baseline = document(input.requirementsRml, TYPES.baseline, "requirements baseline");
  const architecture = document(input.architectureRml, TYPES.architecture, "architecture");
  const hld = document(input.highLevelDesignRml, TYPES.hld, "high-level design");
  const lld = document(input.lowLevelDesignRml, TYPES.lld, "low-level design");
  const vnv = document(input.verificationRml, TYPES.vnv, "V&V specification");
  const trace = document(input.traceRml, TYPES.trace, "traceability matrix");

  const requirements = sequence(baseline.requirements, "requirements baseline.requirements");
  exact(requirements.map((entry, index) => map(entry, `requirements[${index}]`).id), REQUIREMENT_IDS, "requirements baseline ids");
  for (const [index, entry] of requirements.entries()) {
    if (!['derived', 'stakeholder'].includes(entry.kind)) throw new TypeError(`requirements[${index}].kind must be derived or stakeholder`);
    if (typeof entry.text !== "string" || (entry.text.match(/\bMUST\b/gu) ?? []).length !== 1) throw new TypeError(`${entry.id} must carry exactly one MUST`);
  }
  if (baseline.dialect !== DIALECT) throw new TypeError(`requirements baseline.dialect must be ${DIALECT}`);
  exact(sequence(baseline["supported-vocabulary"], "requirements baseline.supported-vocabulary"), SUPPORTED_VOCABULARY, "supported vocabulary");

  const modules = sequence(architecture.modules, "architecture.modules");
  const moduleIds = modules.map((entry, index) => map(entry, `modules[${index}]`).id);
  unique(moduleIds, "architecture module ids");
  const allocations = new Map(REQUIREMENT_IDS.map((id) => [id, []]));
  for (const module of modules) for (const requirement of sequence(module.requirements, `${module.id}.requirements`)) {
    if (!allocations.has(requirement)) throw new TypeError(`${module.id} allocates unknown requirement ${requirement}`);
    allocations.get(requirement).push(module.id);
  }
  for (const [id, owners] of allocations) if (owners.length !== 1) throw new TypeError(`${id} must be allocated exactly once; found ${owners.length}`);
  if (architecture.identification?.requirements !== "content/designs/json-schema-service/requirements-baseline.rml") throw new TypeError("architecture must identify the canonical requirements baseline");
  if (hld.architecture !== "content/designs/json-schema-service/software-architecture-specification.rml") throw new TypeError("high-level design must identify canonical architecture");
  if (lld["high-level-design"] !== "content/designs/json-schema-service/high-level-design.rml") throw new TypeError("low-level design must identify canonical high-level design");

  const cases = sequence(vnv.cases, "V&V specification.cases");
  exact(cases.map((entry, index) => map(entry, `cases[${index}]`).id), CASE_IDS, "V&V case ids");
  exact(cases.map((entry) => entry.verifies), REQUIREMENT_IDS, "V&V requirement coverage");
  const entries = sequence(trace.entries, "traceability matrix.entries");
  exact(entries.map((entry, index) => map(entry, `trace[${index}]`).requirement), REQUIREMENT_IDS, "trace requirements");
  exact(entries.map((entry) => entry.case), CASE_IDS, "trace cases");
  if (!sequence(architecture["known-inconsistencies"], "architecture.known-inconsistencies").some((entry) => entry.id === "JSS-INC-001")) throw new TypeError("architecture must preserve JSS-INC-001");

  return Object.freeze({
    ids: Object.freeze({ baseline: semanticId(baseline), architecture: semanticId(architecture), hld: semanticId(hld), lld: semanticId(lld), vnv: semanticId(vnv), trace: semanticId(trace) }),
    allocations: Object.freeze(Object.fromEntries(allocations)),
  });
}
