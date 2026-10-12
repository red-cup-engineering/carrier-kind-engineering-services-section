import { parseDocument } from "yaml";

const FM_RE = /^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/;

export class FrontmatterError extends Error {}

function parseYamlMapping(block) {
  const document = parseDocument(block, {
    version: "1.2",
    uniqueKeys: true,
    prettyErrors: false,
  });
  if (document.errors.length > 0) {
    throw new FrontmatterError(document.errors.map((error) => error.message).join("; "));
  }
  let value;
  try {
    value = document.toJS({ maxAliasCount: 100 });
  } catch (error) {
    throw new FrontmatterError(error.message);
  }
  if (value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new FrontmatterError("frontmatter must be a YAML mapping");
  }
  return value;
}

// Splits markdown text into { fm, body }. fm is null when the file has no
// frontmatter block — that's a "this isn't a note, skip" signal, not an
// error. Throws FrontmatterError on a malformed YAML block (the block
// exists but won't parse) — that is an error worth surfacing.
export function parseFrontmatter(text) {
  const m = FM_RE.exec(text);
  if (!m) return { fm: null, body: text };
  const fm = parseYamlMapping(m[1]);
  return { fm, body: m[2] };
}

export function makeFlatfile({ slug, dir, kind, fm, body, path, mtime }) {
  return Object.freeze({ slug, dir, kind, fm, body, path, mtime });
}
