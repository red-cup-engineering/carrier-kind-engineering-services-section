import { logPath } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/computer-file-engineering-services-section/services/computer-filepath-engineering-services-section/lib/address.mjs";
import { eavtObject, type EAVT } from "../json/jsonl/eavt/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { define, type Projector, type Resource } from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";
import { isPathname } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/computer-file-engineering-services-section/services/computer-filepath-engineering-services-section/lib/posix.mjs";

export * from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/computer-file-engineering-services-section/services/computer-filepath-engineering-services-section/lib/address.mjs";
export * from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/computer-file-engineering-services-section/services/computer-filepath-engineering-services-section/lib/posix.mjs";
export * from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/computer-file-engineering-services-section/services/computer-filepath-engineering-services-section/lib/segments.mjs";
export * from "./utterance-log.mts";

export type PathResource = Resource;

/** Root projector for POSIX path resources. */
export const pathProjector: Projector<JsonValue> = define<JsonValue>({
  type: "path",
  corner: "data",
  rung: "identity",
  recognize: (resource) => isPathname(resource.path),
});

/** Subject and predicate log paths share the Data term-address codec. */
export function eavtLogPaths(root: string, row: EAVT): readonly string[] {
  const record = eavtObject(row);
  return Object.freeze([...new Set([record.e, record.a].map((anchor) => logPath(root, anchor)))]);
}
