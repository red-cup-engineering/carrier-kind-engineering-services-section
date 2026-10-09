import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
const idSchema = { type: "string", minLength: 1 };
export const LeanGoldenVectorSchema = {
    $id: "lean-system/conformance/golden-vector",
    title: "LeanGoldenVector",
    description: "A Lean-emitted EAVT conformance row for a finite relational surface.",
    type: "object",
    required: ["$schema", "e", "a", "v", "t"],
    additionalProperties: false,
    properties: {
        $schema: { const: "lean-system/conformance/golden-vector" },
        e: idSchema,
        a: idSchema,
        v: {},
        t: idSchema,
    },
};
export const leanGoldenVectorContract = schemaFrom(LeanGoldenVectorSchema);
