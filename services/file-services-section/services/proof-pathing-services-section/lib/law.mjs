import { parseRml, semanticId } from "@lenticule-science/rmn-semantic-conformance-die/src/rmn-core.mjs";

export const REQUIREMENT_IDS = Object.freeze(
  Array.from({ length: 9 }, (_, index) => `PPA-R${String(index + 1).padStart(3, "0")}`),
);
export const CASE_IDS = Object.freeze(
  Array.from({ length: 9 }, (_, index) => `PPA-C${String(index + 1).padStart(3, "0")}`),
);
export const FORMAL_FRONTIER = Object.freeze([
  "PPA-FR-010 AddressTerm",
  "PPA-FR-020 canonical_address",
  "PPA-FR-030 AddressReadingLeg",
  "PPA-FR-040 ConeOfReadings",
  "PPA-FR-050 leg_agreement",
]);

const TYPES = Object.freeze({
  baseline: "ProofPathAddressingRequirementsBaseline",
  architecture: "ProofPathAddressingSoftwareArchitectureSpecification",
  hld: "ProofPathAddressingHighLevelDesign",
  lld: "ProofPathAddressingLowLevelDesign",
  vnv: "ProofPathAddressingVerificationAndValidationSpecification",
  trace: "ProofPathAddressingTraceabilityMatrix",
});

function map(value, coordinate) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${coordinate} must be an RML map`);
  return value;
}

function sequence(value, coordinate) {
  if (!Array.isArray(value)) throw new TypeError(`${coordinate} must be an RML sequence`);
  return value;
}

function document(rml, type, coordinate) {
  const value = map(parseRml(rml), coordinate);
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

export function conformProofPathAddressingLaw(input) {
  const baseline = document(input.requirementsRml, TYPES.baseline, "requirements baseline");
  const architecture = document(input.architectureRml, TYPES.architecture, "architecture");
  const hld = document(input.highLevelDesignRml, TYPES.hld, "high-level design");
  const lld = document(input.lowLevelDesignRml, TYPES.lld, "low-level design");
  const vnv = document(input.verificationRml, TYPES.vnv, "V&V specification");
  const trace = document(input.traceRml, TYPES.trace, "traceability matrix");

  const requirements = sequence(baseline.requirements, "requirements baseline.requirements");
  const requirementIds = requirements.map((entry, index) => map(entry, `requirements[${index}]`).id);
  exact(requirementIds, REQUIREMENT_IDS, "requirements baseline ids");
  for (const [index, entry] of requirements.entries()) {
    if (!['derived', 'stakeholder'].includes(entry.kind)) throw new TypeError(`requirements[${index}].kind must be derived or stakeholder`);
    if (typeof entry.text !== "string" || (entry.text.match(/\bMUST\b/gu) ?? []).length !== 1) {
      throw new TypeError(`${entry.id} must carry exactly one MUST`);
    }
  }

  const modules = sequence(architecture.modules, "architecture.modules");
  const moduleIds = modules.map((entry, index) => map(entry, `modules[${index}]`).id);
  unique(moduleIds, "architecture module ids");
  const allocations = new Map(REQUIREMENT_IDS.map((id) => [id, []]));
  for (const module of modules) {
    for (const requirement of sequence(module.requirements, `${module.id}.requirements`)) {
      if (!allocations.has(requirement)) throw new TypeError(`${module.id} allocates unknown requirement ${requirement}`);
      allocations.get(requirement).push(module.id);
    }
  }
  for (const [id, owners] of allocations) {
    if (owners.length !== 1) throw new TypeError(`${id} must be allocated exactly once; found ${owners.length}`);
  }
  if (architecture.identification?.requirements !== "content/designs/proof-path-addressing/requirements-baseline.rml") {
    throw new TypeError("architecture must identify the canonical requirements baseline");
  }
  if (hld.architecture !== "content/designs/proof-path-addressing/software-architecture-specification.rml") {
    throw new TypeError("high-level design must identify the canonical architecture");
  }
  if (lld["high-level-design"] !== "content/designs/proof-path-addressing/high-level-design.rml") {
    throw new TypeError("low-level design must identify the canonical high-level design");
  }

  const cases = sequence(vnv.cases, "V&V specification.cases");
  const caseIds = cases.map((entry, index) => map(entry, `cases[${index}]`).id);
  exact(caseIds, CASE_IDS, "V&V case ids");
  exact(cases.map((entry) => entry.verifies), REQUIREMENT_IDS, "V&V requirement coverage");

  const entries = sequence(trace.entries, "traceability matrix.entries");
  exact(entries.map((entry) => map(entry, "trace entry").requirement), REQUIREMENT_IDS, "trace requirements");
  exact(entries.map((entry) => entry.case), CASE_IDS, "trace cases");

  const inconsistencies = sequence(architecture["known-inconsistencies"], "architecture.known-inconsistencies");
  if (!inconsistencies.some((entry) => entry.id === "PPA-INC-001" && /PPA-FR-010 through PPA-FR-050/u.test(entry.statement))) {
    throw new TypeError("architecture must preserve the open PPA formal frontier as PPA-INC-001");
  }
  exact(input.formalFrontier, FORMAL_FRONTIER, "section formal frontier");

  return Object.freeze({
    ids: Object.freeze({
      baseline: semanticId(baseline),
      architecture: semanticId(architecture),
      hld: semanticId(hld),
      lld: semanticId(lld),
      vnv: semanticId(vnv),
      trace: semanticId(trace),
    }),
    allocations: Object.freeze(Object.fromEntries(allocations)),
  });
}
