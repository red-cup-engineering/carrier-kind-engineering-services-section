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

import {
  strictFinitePhase,
} from "../../contracts/index.mts";
import {
  contentEntriesListContract,
  contentResourceReadContract,
  contentTreeReadContract,
  type ContentEntriesList,
  type ContentEntry,
  type ContentResourceRead,
  type ContentTreeRead,
} from "./schema.mts";
import { projectionSegmentKey } from "../../codecs/javascript/segment-key.mts";

export type {
  ContentEntriesList,
  ContentEntry,
  ContentResourceRead,
  ContentTreeRead,
} from "./schema.mts";

/** Filesystem content-tree boundary move exposed by the effectful service. */
export type ContentStoreOperationKind = "read-content-resource" | "list-content-entries" | "read-content-tree";

export function contentStoreRelativePath(root: string, full: string): string {
  return path.relative(path.resolve(root), full).split(path.sep).join("/");
}

export function contentStoreConfinedPath(root: string, relative: string): string {
  const rootAbs = path.resolve(root);
  const full = path.resolve(rootAbs, relative);
  if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) throw new Error("contentStoreConfinedPath: path escapes the root");
  return full;
}

function contentOperationDomain(operation: ContentStoreOperationKind): string {
  if (operation === "read-content-resource") return "content/path";
  if (operation === "list-content-entries") return "content/directory";
  return "content/tree";
}

function contentOperationCodomain(operation: ContentStoreOperationKind): string {
  if (operation === "read-content-resource") return "metroplat/projections/resource";
  if (operation === "list-content-entries") return "metroplat/content/directory-entries";
  return "metroplat/content/resource-set";
}

function contentOperationDescription(operation: ContentStoreOperationKind): string {
  if (operation === "read-content-resource") return "Read one confined content resource as boundary material.";
  if (operation === "list-content-entries") return "List one confined content directory without decoding its resources.";
  return "Walk a bounded confined content subtree and expose markdown resources.";
}

export function contentResourceRead(value: ContentResourceRead): ContentResourceRead {
  return contentResourceReadContract.assert(
    Object.freeze(value),
    "content resource read",
  ) as ContentResourceRead;
}

export function contentEntriesList(value: ContentEntriesList): ContentEntriesList {
  return contentEntriesListContract.assert(
    Object.freeze({ ...value, entries: Object.freeze([...value.entries]) }),
    "content entries list",
  ) as ContentEntriesList;
}

export function contentTreeRead(value: ContentTreeRead): ContentTreeRead {
  return contentTreeReadContract.assert(
    Object.freeze({ ...value, resources: Object.freeze([...value.resources]) }),
    "content tree read",
  ) as ContentTreeRead;
}
