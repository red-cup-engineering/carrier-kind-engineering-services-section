import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

/** A serializable morphism face. The executable `run` is intentionally outside this schema. */
export const inspectionReportCarrier = schemaFrom({
  $id: "relating.action.inspection",
  type: "object",
  required: ["kind", "verb", "hasRunTerm"],
  properties: {
    kind: { const: "relating.action.inspection" },
    verb: { type: "string", minLength: 1 },
    hasRunTerm: { type: "boolean" },
    domain: { type: "string" },
    codomain: { type: "string" },
    termClosed: { type: "boolean" },
    termSize: { type: "number" },
    termUses: { type: "array", items: { type: "string" } },
  },
  title: "ActionInspection",
  description: "SEN inspection report for a morphism carrier.",
  additionalProperties: false,
});
