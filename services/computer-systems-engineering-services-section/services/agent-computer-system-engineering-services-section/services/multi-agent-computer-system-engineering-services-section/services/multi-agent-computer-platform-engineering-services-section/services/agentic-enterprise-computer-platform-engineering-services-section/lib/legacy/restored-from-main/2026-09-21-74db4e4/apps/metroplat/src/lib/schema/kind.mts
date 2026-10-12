import { schemaFrom, type SchemaContract } from "@red-cup-engineering/computer-data-engine/contracts";
import type { JsonRecord } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

/** A JSON object schema contract identified by its `kind` discriminator. */
export const kindSchema = <const Id extends string, const Kind extends JsonRecord>(
  id: Id,
  kind: Kind,
  title: string,
  description: string,
): SchemaContract<unknown> => schemaFrom({
  $id: id,
  type: "object",
  required: ["kind"],
  properties: { kind },
  title,
  description,
  additionalProperties: true,
} as const);
