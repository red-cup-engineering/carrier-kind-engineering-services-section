import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
/**
 * carriers — organizing's hand-authored schema literals.
 */

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 };
const readingValueSchema = { enum: ["absurd", "potential", "active", "stable"] };

export const organizationSymmetrySchema = {
  $id: "organizing/symmetry",
  title: "OrganizationSymmetry",
  description:
    "The organization's SYMMETRY — the FSym(𝔸) structure of its membership. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "members", "roles", "interchangeable", "mobile", "uniform", "arenaUniform"],
  properties: {
    kind: { const: "organizing.symmetry" },
    members: nonnegativeIntegerSchema,
    roles: nonnegativeIntegerSchema,
    interchangeable: nonnegativeIntegerSchema,
    mobile: nonnegativeIntegerSchema,
    uniform: { type: "boolean" },
    arenaUniform: { type: "boolean" },
  },
};

export const organizationSymmetryCarrier = schemaFrom(organizationSymmetrySchema);

export const organizationStanceSchema = {
  $id: "organizing/stance",
  title: "OrganizationStance",
  description:
    "The organization's STANCE — which way the collective leans on the bilattice TRUTH order. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "lean", "coordinationFree"],
  properties: {
    kind: { const: "organizing.stance" },
    lean: readingValueSchema,
    coordinationFree: { type: "boolean" },
  },
};

export const organizationStanceCarrier = schemaFrom(organizationStanceSchema);

const socialChoiceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["acyclic", "contested", "majorityCyclic"],
  properties: {
    acyclic: { type: "boolean" },
    contested: nonnegativeIntegerSchema,
    majorityCyclic: { type: "boolean" },
  },
};

const consensusSchema = {
  type: "object",
  additionalProperties: false,
  required: ["coordinationFree", "converges", "contested", "flpEscaped"],
  properties: {
    coordinationFree: { type: "boolean" },
    converges: { type: "boolean" },
    contested: nonnegativeIntegerSchema,
    flpEscaped: { type: "boolean" },
  },
};

const equilibriumSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reachable", "bestResponseCyclic", "contested"],
  properties: {
    reachable: { type: "boolean" },
    bestResponseCyclic: { type: "boolean" },
    contested: nonnegativeIntegerSchema,
  },
};

export const governanceSchema = {
  $id: "organizing/governance",
  title: "Governance",
  description:
    "The organization's GOVERNANCE — the consolidation of socializing, computing, and gaming impossibility-escapes into one verdict. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "socialChoice", "consensus", "equilibrium", "governable", "irreducible"],
  properties: {
    kind: { const: "organizing.governance" },
    socialChoice: socialChoiceSchema,
    consensus: consensusSchema,
    equilibrium: equilibriumSchema,
    governable: { type: "boolean" },
    irreducible: nonnegativeIntegerSchema,
  },
};

export const governanceCarrier = schemaFrom(governanceSchema);

export const cohesionSchema = {
  $id: "organizing/cohesion",
  title: "OrganizationCohesion",
  description:
    "The organization's COHESION — whether its members' sentiment network partitions into stable coalitions. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "members", "ties", "balanced", "clusterable", "factions", "dissonance", "frustration"],
  properties: {
    kind: { const: "organizing.cohesion" },
    members: nonnegativeIntegerSchema,
    ties: nonnegativeIntegerSchema,
    balanced: { type: "boolean" },
    clusterable: { type: "boolean" },
    factions: nonnegativeIntegerSchema,
    dissonance: nonnegativeIntegerSchema,
    frustration: nonnegativeIntegerSchema,
  },
};

export const cohesionCarrier = schemaFrom(cohesionSchema);
