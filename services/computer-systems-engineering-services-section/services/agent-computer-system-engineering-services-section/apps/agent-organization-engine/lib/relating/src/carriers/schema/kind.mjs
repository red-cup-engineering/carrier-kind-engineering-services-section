import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

/** A JSON object schema contract identified by its `kind` discriminator. */
export const kindSchema = (
  id,
  kind,
  title,
  description,
) => schemaFrom({
  $id: id,
  type: "object",
  required: ["kind"],
  properties: { kind },
  title,
  description,
  additionalProperties: true,
});
