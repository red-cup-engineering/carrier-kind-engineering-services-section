import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
/**
 * capability-decision — the result of a computing-local capability gate, declared as a plain
 * JSON-Schema literal (no TypeBox, no codegen, no Ajv). `admitted` is true exactly when every required
 * coordinate is present; `missing` carries the residual requirement list. The `as const` schema is the
 * single source: `FromSchema` infers the type and `schemaFrom` builds the validator + registers `$id`.
 */

export const capabilityDecisionSchema = {
  $id: "computing/capability-decision",
  title: "CapabilityDecision",
  type: "object",
  required: ["kind", "admitted", "status", "missing"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.capability-decision" },
    admitted: { type: "boolean" },
    status: { enum: ["potential", "active"] },
    missing: { type: "array", items: { type: "string", minLength: 1 } },
  },
};

/** The result of a computing-local capability gate — its type INFERRED from the schema. */

/** The registered carrier (validate/assert over the same literal). */
export const capabilityDecisionCarrier = schemaFrom(capabilityDecisionSchema);
