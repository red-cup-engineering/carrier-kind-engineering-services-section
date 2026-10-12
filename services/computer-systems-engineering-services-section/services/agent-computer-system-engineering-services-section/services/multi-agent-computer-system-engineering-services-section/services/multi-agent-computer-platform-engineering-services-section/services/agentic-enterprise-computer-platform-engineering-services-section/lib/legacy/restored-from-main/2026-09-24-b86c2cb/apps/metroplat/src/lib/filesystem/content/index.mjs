/**
 * lib/filesystem/content — confined content-tree access
 * for reading confined `content/` filesystem material. Its contracts live at
 * `integrations/filesystem/store/content-store`. There is no separate
 * content-store service: the effectful read/write for this tier and for the
 * artifact tiers both live under `integrations/filesystem/services/store`,
 * because content and the log/state/record tiers share one directory root and
 * one journal projection pipeline.
 */
import path from "node:path";

import { strictFinitePhase } from "../../contracts/phase.mjs";
import {
  contentEntriesListContract,
  contentResourceReadContract,
  contentTreeReadContract,

} from "./schema.mjs";
import { projectionSegmentKey } from "../../codecs/javascript/segment-key.mjs";

/** Filesystem content-tree boundary move exposed by the effectful service. */

export function contentStoreRelativePath(root, full) {
  return path.relative(path.resolve(root), full).split(path.sep).join("/");
}

export function contentStoreConfinedPath(root, relative) {
  const rootAbs = path.resolve(root);
  const full = path.resolve(rootAbs, relative);
  if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) throw new Error("contentStoreConfinedPath: path escapes the root");
  return full;
}

function contentOperationDomain(operation) {
  if (operation === "read-content-resource") return "content/path";
  if (operation === "list-content-entries") return "content/directory";
  return "content/tree";
}

function contentOperationCodomain(operation) {
  if (operation === "read-content-resource") return "metroplat/projections/resource";
  if (operation === "list-content-entries") return "metroplat/content/directory-entries";
  return "metroplat/content/resource-set";
}

function contentOperationDescription(operation) {
  if (operation === "read-content-resource") return "Read one confined content resource as boundary material.";
  if (operation === "list-content-entries") return "List one confined content directory without decoding its resources.";
  return "Walk a bounded confined content subtree and expose markdown resources.";
}

export function contentResourceRead(value) {
  return contentResourceReadContract.assert(
    Object.freeze(value),
    "content resource read",
  );
}

export function contentEntriesList(value) {
  return contentEntriesListContract.assert(
    Object.freeze({ ...value, entries: Object.freeze([...value.entries]) }),
    "content entries list",
  );
}

export function contentTreeRead(value) {
  return contentTreeReadContract.assert(
    Object.freeze({ ...value, resources: Object.freeze([...value.resources]) }),
    "content tree read",
  );
}
