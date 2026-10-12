const FM_RE = /^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/;
const KEY_RE = /^([^\s:][^:]*):(\s(.*))?$/;
const BLOCK_ITEM_RE = /^\s+-\s?/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

export class FrontmatterError extends Error {}

function splitTopLevel(s) {
  const items = [];
  let current = "";
  let quote = null;
  for (const ch of s) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items;
}

function unquoteDouble(s) {
  return s.slice(1, -1).replace(/\\(.)/g, (_, c) => ({ n: "\n", t: "\t", '"': '"', "\\": "\\" }[c] ?? c));
}

function unquoteSingle(s) {
  return s.slice(1, -1).replace(/''/g, "'");
}

// A deliberately minimal YAML-scalar reader covering the subset the corpus
// actually writes: quoted strings (single/double, backslash-escaped inside
// double quotes), booleans, null/~, safe-integer and decimal numbers, and
// bare strings passed through as-is.
function parseScalar(raw) {
  if (raw === "" || raw === "~" || raw.toLowerCase() === "null") return null;
  if (raw.toLowerCase() === "true") return true;
  if (raw.toLowerCase() === "false") return false;
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) return unquoteDouble(raw);
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) return unquoteSingle(raw);
  if (NUMBER_RE.test(raw)) return Number(raw);
  return raw;
}

function parseFlowList(raw) {
  const inner = raw.slice(1, -1).trim();
  if (inner === "") return [];
  return splitTopLevel(inner).map((item) => parseScalar(item.trim()));
}

function parseValue(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) return parseFlowList(raw);
  return parseScalar(raw);
}

function parseYamlMapping(block) {
  const lines = block.split("\n");
  const result = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i += 1;
      continue;
    }
    const m = KEY_RE.exec(line);
    if (!m) throw new FrontmatterError(`malformed frontmatter line: ${JSON.stringify(line)}`);
    const key = m[1].trim();
    const rest = (m[3] ?? "").trim();
    i += 1;
    if (rest !== "") {
      result[key] = parseValue(rest);
      continue;
    }
    const items = [];
    while (i < lines.length && BLOCK_ITEM_RE.test(lines[i])) {
      items.push(parseScalar(lines[i].replace(BLOCK_ITEM_RE, "").trim()));
      i += 1;
    }
    result[key] = items.length > 0 ? items : null;
  }
  return result;
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
