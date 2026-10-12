import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";

const nonemptyStringSchema = { type: "string", minLength: 1 } as const;

export const contentEntrySchema = {
  $id: "metroplat/projections/boundaries/content-store/entry",
  title: "ContentEntry",
  description: "One immediate confined data/content directory entry.",
  type: "object",
  required: ["name", "kind"],
  properties: {
    name: nonemptyStringSchema,
    kind: { enum: ["directory", "file", "other"] },
  },
  additionalProperties: false,
} as const;

export const contentResourceSchema = {
  $id: "metroplat/projections/boundaries/content-store/resource",
  title: "ContentResource",
  description: "One raw confined data/content resource before codec-level decoding.",
  type: "object",
  required: ["path", "content"],
  properties: {
    path: nonemptyStringSchema,
    content: { type: "string" },
  },
  additionalProperties: false,
} as const;

const contentObservationBaseProperties = {
  kind: { const: "metroplat.content-store-observation" },
  root: nonemptyStringSchema,
  relative: { type: "string" },
} as const;

const contentObservationBaseRequired = ["kind", "operation", "root", "relative"] as const;

export const contentResourceReadSchema = {
  $id: "metroplat/projections/boundaries/content-store/resource-read",
  title: "ContentResourceRead",
  description: "Receipt for reading one confined data/content resource.",
  type: "object",
  required: [...contentObservationBaseRequired, "resource"],
  properties: {
    ...contentObservationBaseProperties,
    operation: { const: "read-content-resource" },
    resource: contentResourceSchema,
  },
  additionalProperties: false,
} as const;

export const contentEntriesListSchema = {
  $id: "metroplat/projections/boundaries/content-store/entries-list",
  title: "ContentEntriesList",
  description: "Receipt for listing one confined data/content directory.",
  type: "object",
  required: [...contentObservationBaseRequired, "entries"],
  properties: {
    ...contentObservationBaseProperties,
    operation: { const: "list-content-entries" },
    entries: { type: "array", items: contentEntrySchema },
  },
  additionalProperties: false,
} as const;

export const contentTreeReadSchema = {
  $id: "metroplat/projections/boundaries/content-store/tree-read",
  title: "ContentTreeRead",
  description: "Receipt for walking a bounded confined data/content subtree.",
  type: "object",
  required: [...contentObservationBaseRequired, "resources"],
  properties: {
    ...contentObservationBaseProperties,
    operation: { const: "read-content-tree" },
    resources: { type: "array", items: contentResourceSchema },
  },
  additionalProperties: false,
} as const;

export const contentEntryContract = schemaFrom(contentEntrySchema);
export type ContentEntry = FromJsonSchema<typeof contentEntrySchema>;

export const contentResourceContract = schemaFrom(contentResourceSchema);
export type ContentResource = FromJsonSchema<typeof contentResourceSchema>;

export const contentResourceReadContract = schemaFrom(contentResourceReadSchema);
export type ContentResourceRead = FromJsonSchema<typeof contentResourceReadSchema>;

export const contentEntriesListContract = schemaFrom(contentEntriesListSchema);
export type ContentEntriesList = FromJsonSchema<typeof contentEntriesListSchema>;

export const contentTreeReadContract = schemaFrom(contentTreeReadSchema);
export type ContentTreeRead = FromJsonSchema<typeof contentTreeReadSchema>;
