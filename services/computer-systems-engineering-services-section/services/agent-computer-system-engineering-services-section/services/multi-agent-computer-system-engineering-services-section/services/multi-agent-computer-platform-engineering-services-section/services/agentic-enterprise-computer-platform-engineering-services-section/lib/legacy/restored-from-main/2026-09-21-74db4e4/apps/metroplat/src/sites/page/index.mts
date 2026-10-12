/**
 * page - schema-addressed content record for non-article page and note material.
 *
 * The record is schema-only and imports no host adapter. Front-matter properties
 * pass through under `frontMatter`, with body markdown held as `body`.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";

import { PageSchema } from "./schema.mts";

export { PageSchema, pageContract } from "./schema.mts";

export type Page = FromJsonSchema<typeof PageSchema>;
