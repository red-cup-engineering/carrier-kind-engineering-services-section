import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const reasonSequenceSchema = { type: "array", items: { type: "string", minLength: 1 } };

/** Wire contract for the canonical Witness/Obstruction judgment. */
export const semanticJudgmentSchema = {
  $id: "metroplat/contracts/semantic-judgment",
  title: "SemanticJudgment",
  description: "A semantic judgment whose positive inhabitant is a witness and whose negative inhabitant is an obstruction.",
  type: "object",
  required: ["kind", "subject", "polarity", "reasons"],
  properties: {
    kind: { const: "metroplat.semantic-judgment" },
    subject: { type: "string", minLength: 1 },
    polarity: { enum: ["witness", "obstruction", "partial", "boundary-only"] },
    reasons: reasonSequenceSchema,
  },
  additionalProperties: false,
};

export const semanticJudgmentContract = schemaFrom(semanticJudgmentSchema);
