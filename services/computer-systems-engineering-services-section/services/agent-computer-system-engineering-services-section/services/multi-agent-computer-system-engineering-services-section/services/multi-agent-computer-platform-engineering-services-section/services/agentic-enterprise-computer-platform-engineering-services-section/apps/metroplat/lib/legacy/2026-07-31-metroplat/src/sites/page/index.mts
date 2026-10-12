/**
 * page - schema-addressed content record for non-article page and note material.
 *
 * The record is schema-only and imports no host adapter. Front-matter properties
 * pass through under `frontMatter`, with body markdown held as `body`.
 */
import type { FromSchema } from "../../lib/schema/contract.mts";
import { PageSchema } from "./schema.mts";

export { PageSchema, pageContract } from "./schema.mts";

export type Page = FromSchema<typeof PageSchema>;
