import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

/** A JSON object carrier identified by its `kind` discriminator. */
export const kindCarrier = (
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
