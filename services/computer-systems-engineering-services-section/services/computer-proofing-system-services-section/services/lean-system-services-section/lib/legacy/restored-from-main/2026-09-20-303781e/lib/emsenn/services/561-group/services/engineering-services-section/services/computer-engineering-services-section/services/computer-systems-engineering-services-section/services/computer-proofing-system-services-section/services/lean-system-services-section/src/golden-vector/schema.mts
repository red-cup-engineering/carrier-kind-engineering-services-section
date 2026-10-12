import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";

const idSchema = { type: "string", minLength: 1 } as const;

export const LeanGoldenVectorSchema = {
  $id: "metroplat/conformance/golden-vector",
  title: "LeanGoldenVector",
  description: "A Lean-emitted EAVT conformance row for a finite relational surface.",
  type: "object",
  required: ["$schema", "e", "a", "v", "t"],
  additionalProperties: false,
  properties: {
    $schema: { const: "metroplat/conformance/golden-vector" },
    e: idSchema,
    a: idSchema,
    v: {},
    t: idSchema,
  },
} as const;

export const leanGoldenVectorContract = schemaFrom(LeanGoldenVectorSchema);
