import {
  parseRml,
  semanticId,
} from "@red-cup-engineering/rmn-semantic-conformance-die";

const ARCHITECTURE_TYPE = "SemioticExchangeChainSoftwareArchitectureSpecification";
const BASELINE_TYPE = "SemioticExchangeChainRequirementsBaseline";
const REQUIREMENT_IDS = Object.freeze(
  Array.from({ length: 20 }, (_, index) => `SXC-R${String(index + 1).padStart(3, "0")}`),
);

function requireMap(value, coordinate) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${coordinate} must be an RML map`);
  }
  return value;
}

function requireSequence(value, coordinate) {
  if (!Array.isArray(value)) throw new TypeError(`${coordinate} must be an RML sequence`);
  return value;
}

function requireType(value, expected, coordinate) {
  requireMap(value, coordinate);
  if (value.type !== expected) throw new TypeError(`${coordinate}.type must be ${expected}`);
  if (!Number.isSafeInteger(value.version) || value.version < 1) {
    throw new TypeError(`${coordinate}.version must be a positive integer`);
  }
}

function uniqueIds(values, coordinate) {
  const ids = values.map((value, index) => {
    requireMap(value, `${coordinate}[${index}]`);
    if (typeof value.id !== "string" || value.id.length === 0) {
      throw new TypeError(`${coordinate}[${index}].id must be nonempty text`);
    }
    return value.id;
  });
  if (new Set(ids).size !== ids.length) throw new TypeError(`${coordinate} contains duplicate ids`);
  return ids;
}

/**
 * Close the architecture-to-requirements proof path using Obsmetrologia's
 * canonical RML parser and RFC 6920 semantic identities.
 */
export function conformSemioticExchangeChainLaw({ architectureRml, requirementsRml }) {
  const architecture = parseRml(architectureRml);
  const baseline = parseRml(requirementsRml);
  requireType(architecture, ARCHITECTURE_TYPE, "architecture");
  requireType(baseline, BASELINE_TYPE, "requirements baseline");

  const requirements = requireSequence(baseline.requirements, "requirements baseline.requirements");
  const requirementIds = uniqueIds(requirements, "requirements baseline.requirements");
  if (requirementIds.length !== REQUIREMENT_IDS.length
      || requirementIds.some((id, index) => id !== REQUIREMENT_IDS[index])) {
    throw new TypeError(`requirements baseline must define exactly ${REQUIREMENT_IDS.join(", ")} in order`);
  }

  const modules = requireSequence(architecture.modules, "architecture.modules");
  uniqueIds(modules, "architecture.modules");
  const allocation = new Map(REQUIREMENT_IDS.map((id) => [id, []]));
  for (const module of modules) {
    for (const requirementId of requireSequence(module.requirements, `architecture.modules.${module.id}.requirements`)) {
      if (!allocation.has(requirementId)) {
        throw new TypeError(`${module.id} allocates unknown requirement ${requirementId}`);
      }
      allocation.get(requirementId).push(module.id);
    }
  }
  for (const [requirementId, owners] of allocation) {
    if (owners.length !== 1) {
      throw new TypeError(`${requirementId} must be allocated to exactly one module; found ${owners.length}`);
    }
  }

  const identification = requireMap(architecture.identification, "architecture.identification");
  if (identification.requirements !== "content/designs/semiotic-exchange-chain/requirements-baseline.rml") {
    throw new TypeError("architecture identification must point at the canonical requirements baseline");
  }

  return Object.freeze({
    architecture,
    baseline,
    architectureId: semanticId(architecture),
    requirementsId: semanticId(baseline),
    allocations: Object.freeze(Object.fromEntries(allocation)),
  });
}

export { ARCHITECTURE_TYPE, BASELINE_TYPE, REQUIREMENT_IDS };
