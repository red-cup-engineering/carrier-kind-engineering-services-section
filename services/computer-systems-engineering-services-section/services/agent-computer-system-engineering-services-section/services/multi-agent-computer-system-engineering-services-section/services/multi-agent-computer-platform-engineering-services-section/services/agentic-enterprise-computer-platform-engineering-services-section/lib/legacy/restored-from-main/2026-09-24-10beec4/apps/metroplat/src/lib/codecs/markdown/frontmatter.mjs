/**
 * formats/markdown/frontmatter — the frontmatter fence, split from its body.
 *
 * A markdown document's frontmatter fence (YAML `---...---` or TOML
 * `+++...+++`) is a wire delimiter, not a decoded value: this module only
 * finds which fence opens the document and separates its raw text from the
 * body. Callers choose the codec (`decodeYaml`, `decodeToml`, `JSON.parse`)
 * that reads the raw fence text — this is the one splitter both
 * `src/integrations/knowledge-vaults/wikilinks` and `projections/markdown` used to
 * reimplement independently as near-identical regexes.
 */

const FENCE_PATTERNS = Object.freeze([
  Object.freeze({ format: "yaml", pattern: /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u }),
  Object.freeze({ format: "toml", pattern: /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?/u }),
]);

/**
 * Strip a leading UTF-8 BOM and split a document's frontmatter fence from its
 * body. Returns `null` when the (BOM-stripped) document opens with neither a
 * YAML nor a TOML fence — the fence's raw text is not decoded here.
 */
export function splitFrontMatterFence(text) {
  const normalized = text.replace(/^﻿/u, "");
  for (const { format, pattern } of FENCE_PATTERNS) {
    const match = normalized.match(pattern);
    if (match !== null) {
      return Object.freeze({ format, raw: match[1] ?? "", body: normalized.slice(match[0].length) });
    }
  }
  return null;
}
