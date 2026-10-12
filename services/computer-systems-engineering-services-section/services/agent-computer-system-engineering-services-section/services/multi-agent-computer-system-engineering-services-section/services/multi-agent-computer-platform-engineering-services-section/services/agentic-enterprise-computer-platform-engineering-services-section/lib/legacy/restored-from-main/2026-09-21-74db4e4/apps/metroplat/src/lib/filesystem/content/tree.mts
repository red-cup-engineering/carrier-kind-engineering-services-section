/**
 * lib/filesystem/content/tree — confined content-tree reads.
 * inverse of `data/content/...`'s artifact-carried projection writes.
 *
 * The content tier is written by artifact-carried projection (elsewhere in
 * this store); reading an external content tree back — enumerating its
 * resources and reading one document — is its inverse, and belongs with
 * the other fs idioms rather than re-derived in every faculty that reads
 * the corpus. Decoding a resource into a document is the markdown codec's
 * job (`markdownDataform`), not this effectful boundary's: these return
 * lensed observations carrying raw `Resource`s, never decoded documents.
 *
 * Split out of `filesystem-store/index.mts` as its own file: reading the
 * human-markdown content tree back as documents is a distinct concern from
 * the generic statement log/state/record read-append-project mechanics the
 * rest of that module owns, even though both write under the same store.
 */
import path from "node:path";

import {
  contentEntriesList,
  contentStoreConfinedPath,
  contentStoreRelativePath,
  contentResourceRead,
  contentTreeRead,
  type ContentEntriesList,
  type ContentEntry,
  type ContentResourceRead,
  type ContentTreeRead,
} from "./index.mts";
import {
  readDirectoryEntries,
  readDirectoryNames,
  readFileUtf8,
  statPathOrNull,
} from "../index.mts";

interface ContentTreeResource {
  readonly path: string;
  readonly content: string;
}

export type {
  ContentEntriesList,
  ContentEntry,
  ContentResourceRead,
  ContentStoreOperationKind,
  ContentTreeRead,
} from "./index.mts";

const IGNORED_CONTENT = new Set([".git", "node_modules"]);

/** Read one content resource at a confined address as a lensed boundary observation. */
export function readContentResource(
  root: string,
  relative: string,
): ContentResourceRead {
  const full = contentStoreConfinedPath(root, relative.trim());
  const resource = Object.freeze({ path: contentStoreRelativePath(root, full), content: readFileUtf8(full) });
  return contentResourceRead({ kind: "metroplat.content-store-observation" as const, operation: "read-content-resource" as const, root, relative: resource.path, resource });
}

/** List immediate entries at a confined content address as a lensed boundary observation. */
export function listContentEntries(
  root: string,
  relative: string,
): ContentEntriesList {
  const full = contentStoreConfinedPath(root, relative.trim());
  const entries: ContentEntry[] = [];
  for (const dirent of readDirectoryEntries(full)) {
    if (IGNORED_CONTENT.has(dirent.name)) continue;
    entries.push(Object.freeze({ name: dirent.name, kind: dirent.isDirectory() ? "directory" : dirent.isFile() ? "file" : "other" }));
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const frozen = Object.freeze(entries);
  return contentEntriesList({ kind: "metroplat.content-store-observation" as const, operation: "list-content-entries" as const, root, relative: contentStoreRelativePath(root, full), entries: frozen });
}

/** Walk a confined content region, reading each `.md` file as a resource. Bounded by
 *  `limit` (resources kept) and `maxScan` (files visited) so a large tree is never read
 *  whole — the discovery a memory/research document deliberately does not do itself. */
export function readContentTree(
  root: string,
  region = "",
  opts: { readonly limit?: number; readonly maxScan?: number } = {},
): ContentTreeRead {
  const limit = opts.limit ?? 200;
  const maxScan = opts.maxScan ?? 20_000;
  const start = contentStoreConfinedPath(root, region.trim());
  const out: ContentTreeResource[] = [];
  let scanned = 0;
  const frontier: string[] = [start];
  while (frontier.length > 0 && out.length < limit && scanned < maxScan) {
    const current = frontier.shift();
    if (current === undefined) break;
    const st = statPathOrNull(current);
    if (st === null) continue;
    if (st.isDirectory()) {
      let children: string[];
      try {
        children = readDirectoryNames(current).filter((name) => !IGNORED_CONTENT.has(name)).sort((a, b) => a.localeCompare(b));
      } catch {
        children = [];
      }
      for (const child of children) frontier.push(path.join(current, child));
      continue;
    }
    if (!st.isFile() || !current.endsWith(".md")) continue;
    scanned += 1;
    try {
      out.push(Object.freeze({ path: contentStoreRelativePath(root, current), content: readFileUtf8(current) }));
    } catch {
      // unreadable resource: skip
    }
  }
  const resources = Object.freeze(out);
  return contentTreeRead({ kind: "metroplat.content-store-observation" as const, operation: "read-content-tree" as const, root, relative: contentStoreRelativePath(root, start), resources });
}
