import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseMarkdown, markdownStructure } from "@red-cup-engineering/markdown-document-codec-service";

// Observation: touches the real filesystem, reads each given markdown path
// once, and decodes it through the codec service already owned by this
// tree (parseMarkdown for frontmatter, markdownStructure for headings) —
// never a second hand-rolled parser. No matching happens here; this is the
// one shared parse both markdown-token-matching-service's stage-3
// (frontmatter/title) and stage-4 (heading) reads come from, so a caller
// never pays to read or decode a document twice.
//
// A path that fails to decode as frontmatter (malformed YAML/TOML) is not a
// fatal defect for this service: markdownStructure parses heading/line
// structure independently of frontmatter decoding, so that entry still
// carries its headings with frontmatter: null rather than being dropped.
//
// A path that cannot be read at all (a dangling symlink, a permission
// denial) is likewise skipped rather than failing the whole index: over a
// tree the size this service is meant to run against, one unreadable file
// should not cost every other path its match.
export async function observeMarkdownDocumentIndex({ paths, root } = {}) {
  if (!Array.isArray(paths)) throw new TypeError("paths must be an array");
  if (typeof root !== "string" || !root) throw new TypeError("root is required");

  const entries = [];
  for (const path of paths) {
    if (typeof path !== "string" || !path) continue;
    let text;
    try {
      text = await readFile(resolve(root, path), "utf8");
    } catch {
      continue;
    }

    let frontmatter = null;
    try {
      frontmatter = parseMarkdown(text).frontmatter;
    } catch {
      frontmatter = null;
    }

    const { headings } = markdownStructure(text);
    entries.push(Object.freeze({
      path,
      frontmatter: frontmatter === null ? null : Object.freeze({ ...frontmatter }),
      headings,
    }));
  }

  return Object.freeze(entries);
}
