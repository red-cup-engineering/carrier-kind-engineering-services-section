import { logPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { eavtRecord } from "@red-cup-engineering/eavt/row";

import { define } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { isPathname } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";

export * from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
export * from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
export * from "@red-cup-engineering/computer-filepath-engineering-services-section/segments";
export { dehydrateUtterances, rehydrateUtterances } from "@red-cup-engineering/relating/writing/path";

/** Root projector for POSIX path resources. */
export const pathProjector = define({
  type: "path",
  corner: "data",
  rung: "identity",
  recognize: (resource) => isPathname(resource.path),
});

/** Subject and predicate log paths share the Data term-address codec. */
export function eavtLogPaths(root, row) {
  const record = eavtRecord(row);
  return Object.freeze([...new Set([record.e, record.a].map((anchor) => logPath(root, anchor)))]);
}
