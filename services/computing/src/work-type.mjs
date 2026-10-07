import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
/**
 * work-type — the computing read of a task closure, declared as a plain JSON-Schema literal (no
 * TypeBox, no codegen, no Ajv). process/procedure/derivation/inquiry as the 2×2 product of
 * meaning-settledness and execution-settledness. This is the executable-task reading of work, not an
 * office-governance reading. The `as const` schema is the single source: `FromSchema` infers the type
 * and `schemaFrom` builds the validator + registers the `$id`.
 */

export const workTypeSchema = {
  $id: "computing/work-type",
  title: "WorkTypeCarrier",
  type: "object",
  required: ["kind", "value", "meaningSettled", "executionSettled"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.work-type" },
    value: { enum: ["process", "procedure", "derivation", "inquiry"] },
    meaningSettled: { type: "boolean" },
    executionSettled: { type: "boolean" },
  },
};

/** The computing read of a task closure — its type INFERRED from `workTypeSchema`. */

/** The registered carrier (validate/assert over the same literal). */
export const workTypeCarrier = schemaFrom(workTypeSchema);
