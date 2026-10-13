import type { JsonValue } from "../json/core.mts";
import { define, type Projector, type Resource } from "../projector/index.mts";
import { isPathname } from "./posix.mts";

export * from "./address.mts";
export * from "./posix.mts";
export * from "./segments.mts";
export * from "./utterance-log.mts";

export type PathResource = Resource;

/** Root projector for POSIX path resources. */
export const pathProjector: Projector<JsonValue> = define<JsonValue>({
  type: "path",
  corner: "data",
  rung: "identity",
  recognize: (resource) => isPathname(resource.path),
});
