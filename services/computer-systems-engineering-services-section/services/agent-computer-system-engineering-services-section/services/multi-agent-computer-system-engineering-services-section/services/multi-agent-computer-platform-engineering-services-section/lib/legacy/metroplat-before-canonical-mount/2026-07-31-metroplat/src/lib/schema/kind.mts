import { schemaFrom, type SchemaContract } from "./contract.mts";
import type { JsonRecord } from "../codecs/json/core.mts";

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
