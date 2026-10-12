
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

/** The filesystem boundary schema of a directory manifest — the single source `directoryManifestContract`
 *  validates against, replacing what used to be a hand-rolled field-by-field guard
 *  duplicating this same shape ad hoc. */
export const directoryManifestSchema = {
  $id: "metroplat/executing/directory-manifest",
  title: "DirectoryManifest",
  description: "The host-neutral presentation of a directory: its files carried as one JSON document.",
  type: "object",
  required: ["kind", "root", "files"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.directory-manifest" },
    root: { type: "string" },
    files: { type: "object" },
  },
};

/** The host-neutral presentation of a directory: its files carried as one JSON
 *  document. The read/write services present directories this way, so directory
 *  material enters the same lattice as file material. `files` is refined beyond
 *  what `FromJsonSchema<typeof directoryManifestSchema>` alone gives: the plain
 *  JSON-Schema interpreter does not carry a bare `{type: "object"}` property's
 *  value type to the type level, so its string-valued record is intersected in. */

export const directoryManifestContract = schemaFrom(directoryManifestSchema);

/** Whether a parsed JSON value is a directory manifest — checked against the
 *  manifest's own schema, never re-derived field by field at the call site. */
export function isDirectoryManifest(value) {
  return directoryManifestContract.validate(value);
}
