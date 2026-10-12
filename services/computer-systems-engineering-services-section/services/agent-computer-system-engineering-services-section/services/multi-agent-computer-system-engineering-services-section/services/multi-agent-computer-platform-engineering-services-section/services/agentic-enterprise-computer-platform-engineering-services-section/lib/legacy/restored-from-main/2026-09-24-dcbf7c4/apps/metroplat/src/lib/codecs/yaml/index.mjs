/**
 * codecs/text/yaml — a pure YAML codec for the frontmatter subset this corpus
 * writes: `decodeYaml` reads a YAML head (no `---` fences) into a JSON record,
 * `encodeYaml` writes one back out.
 *
 * Scope: bare keys (dots and dashes allowed) and quoted keys, quoted and bare scalars (dates
 * kept as ISO strings, never Date objects), null/~, inline arrays (nested),
 * block sequences (indented or at the key's own column), block sequences of
 * maps (`- key: value` items), nested maps, literal `|` and folded `>` block
 * scalars, and full-line or trailing `#` comments. Flow maps (`{ ... }`) are
 * outside the subset and throw rather than mis-parse. Pure string ↔ value,
 * no I/O; TypeError is the only failure mode.
 *
 * Laws: decodeYaml(encodeYaml(record)) deep-equals record for every record in
 * the subset, and decodeYaml(encodeYaml(decodeYaml(text))) = decodeYaml(text)
 * for conforming texts (canonical serialization may normalize quoting and drop
 * comments; it never loses an entry).
 */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { encodeEntry } from "@red-cup-engineering/yaml-frontmatter-codec-service";
import { decodeQuoted } from "@red-cup-engineering/cassia-lorne-substack-com/frontmatter";

const KEY_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})?)?$/u;
const INTEGER_PATTERN = /^[+-]?\d+$/u;
const FLOAT_PATTERN = /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/u;
const BLOCK_SCALAR_PATTERN = /^([|>])([+-]?)\s*$/u;

/** Decode a YAML head (fence-free text) into a frozen JSON record. */
export function decodeYaml(text) {
  if (typeof text !== "string") throw new TypeError("yaml: document must be a string");
  const lines = text.split("\n").map(stripCr);
  const cur = { pos: 0 };
  const record = decodeMap(lines, cur, 0, "yaml");
  skipBlank(lines, cur);
  if (cur.pos < lines.length) {
    throw new TypeError(`yaml: unexpected content at line ${cur.pos + 1}`);
  }
  return requireJsonValue(record, "yaml document");
}

/** Encode a JSON record as YAML head text (fence-free, trailing newline). */
export function encodeYaml(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("yaml: document must be a plain record");
  }
  const lines = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    encodeEntry(lines, key, value, 0, key);
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

// — decoding —

function stripCr(line) {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function isBlankOrComment(line) {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

function skipBlank(lines, cur) {
  while (cur.pos < lines.length && isBlankOrComment(lines[cur.pos] ?? "")) cur.pos += 1;
}

function decodeMap(lines, cur, indent, where) {
  const record = {};
  for (;;) {
    skipBlank(lines, cur);
    const line = lines[cur.pos];
    if (line === undefined) break;
    const lineIndent = indentOf(line);
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      throw new TypeError(`yaml line ${cur.pos + 1}: unexpected indentation under ${where}`);
    }
    const body = line.slice(indent);
    if (body.startsWith("- ") || body === "-") break;
    const entry = decodeKeyLine(body, cur.pos + 1);
    cur.pos += 1;
    record[entry.key] = decodeValue(lines, cur, indent, entry.rest, `${where}.${entry.key}`);
  }
  return record;
}

function decodeValue(lines, cur, keyIndent, rest, where) {
  const trimmed = rest.trim();
  const blockScalar = trimmed.match(BLOCK_SCALAR_PATTERN);
  if (blockScalar !== null) {
    return decodeBlockScalar(lines, cur, keyIndent, blockScalar[1] === ">", blockScalar[2] ?? "");
  }
  if (trimmed !== "" && !trimmed.startsWith("#")) {
    return decodeFlow(trimmed, where);
  }
  // Bare key: the value is a block sequence (at the key's column or deeper),
  // a nested map (deeper), or null when the next line is a sibling or the end.
  skipBlank(lines, cur);
  const next = lines[cur.pos];
  if (next === undefined) return null;
  const nextIndent = indentOf(next);
  const nextBody = next.slice(nextIndent);
  const nextIsDash = nextBody.startsWith("- ") || nextBody === "-";
  if (nextIsDash && nextIndent >= keyIndent) {
    return decodeSequence(lines, cur, nextIndent, where);
  }
  if (nextIndent > keyIndent) {
    return decodeMap(lines, cur, nextIndent, where);
  }
  return null;
}

function decodeSequence(lines, cur, indent, where) {
  const items = [];
  for (;;) {
    skipBlank(lines, cur);
    const line = lines[cur.pos];
    if (line === undefined || indentOf(line) !== indent) break;
    const body = line.slice(indent);
    if (!(body.startsWith("- ") || body === "-")) break;
    const rest = body === "-" ? "" : body.slice(2);
    cur.pos += 1;
    items.push(decodeSequenceItem(lines, cur, indent, rest, `${where}[${items.length}]`));
  }
  return items;
}

function decodeSequenceItem(lines, cur, dashIndent, rest, where) {
  if (rest.trim() === "") {
    return decodeValue(lines, cur, dashIndent + 1, "", where);
  }
  // A `- - item` line opens a nested sequence inline: its first item is the
  // remainder of the line, its continuation items sit two columns deeper.
  if (rest.startsWith("- ") || rest === "-") {
    const nested = [];
    nested.push(decodeSequenceItem(lines, cur, dashIndent + 2, rest === "-" ? "" : rest.slice(2), `${where}[0]`));
    for (;;) {
      skipBlank(lines, cur);
      const line = lines[cur.pos];
      if (line === undefined || indentOf(line) !== dashIndent + 2) break;
      const body = line.slice(dashIndent + 2);
      if (!(body.startsWith("- ") || body === "-")) break;
      cur.pos += 1;
      nested.push(decodeSequenceItem(lines, cur, dashIndent + 2, body === "-" ? "" : body.slice(2), `${where}[${nested.length}]`));
    }
    return nested;
  }
  const entry = tryKeyLine(rest);
  if (entry !== undefined) {
    return decodeSequenceMapItem(lines, cur, dashIndent, entry, where);
  }
  return decodeFlow(rest.trim(), where);
}

function tryKeyLine(text) {
  if (text.startsWith('"') || text.startsWith("'")) {
    let quoted;
    try {
      quoted = decodeQuoted(text, 0, "yaml key");
    } catch {
      return undefined;
    }
    const after = text.slice(quoted.end);
    if (!after.startsWith(":")) return undefined;
    return Object.freeze({ key: quoted.value, rest: after.slice(1) });
  }
  const colon = text.indexOf(":");
  if (colon === -1) return undefined;
  const key = text.slice(0, colon).trim();
  const after = text[colon + 1];
  if (!KEY_PATTERN.test(key) || (after !== undefined && !/\s/u.test(after))) return undefined;
  return Object.freeze({ key, rest: text.slice(colon + 1) });
}

function decodeKeyLine(body, lineNumber) {
  const entry = tryKeyLine(body);
  if (entry !== undefined) return entry;
  const colon = body.indexOf(":");
  if (colon === -1) throw new TypeError(`yaml line ${lineNumber}: expected \`key: value\``);
  throw new TypeError(`yaml line ${lineNumber}: \`${body.slice(0, colon).trim()}\` is not a bare key`);
}

// A `- key: value` item: the dash opens a map whose remaining entries sit
// deeper than the dash column.
function decodeSequenceMapItem(lines, cur, dashIndent, first, where) {
  const record = {};
  record[first.key] = decodeValue(lines, cur, dashIndent + 2, first.rest, `${where}.${first.key}`);
  for (;;) {
    skipBlank(lines, cur);
    const line = lines[cur.pos];
    if (line === undefined) break;
    const lineIndent = indentOf(line);
    if (lineIndent <= dashIndent) break;
    const entry = tryKeyLine(line.slice(lineIndent));
    if (entry === undefined) throw new TypeError(`yaml line ${cur.pos + 1}: expected \`key: value\` in ${where}`);
    cur.pos += 1;
    record[entry.key] = decodeValue(lines, cur, lineIndent, entry.rest, `${where}.${entry.key}`);
  }
  return record;
}

function decodeBlockScalar(lines, cur, keyIndent, folded, chomp) {
  const collected = [];
  let blockIndent = -1;
  while (cur.pos < lines.length) {
    const line = lines[cur.pos];
    if (line === undefined) break;
    if (line.trim() === "") {
      collected.push("");
      cur.pos += 1;
      continue;
    }
    const lineIndent = indentOf(line);
    if (lineIndent <= keyIndent) break;
    if (blockIndent === -1) blockIndent = lineIndent;
    if (lineIndent < blockIndent) break;
    collected.push(line.slice(blockIndent));
    cur.pos += 1;
  }
  while (collected.length > 0 && collected.at(-1) === "") collected.pop();
  const text = folded ? foldLines(collected) : collected.join("\n");
  if (chomp === "-") return text;
  return text === "" ? "" : `${text}\n`;
}

function foldLines(collected) {
  const paragraphs = [[]];
  for (const line of collected) {
    if (line === "") paragraphs.push([]);
    else paragraphs.at(-1).push(line);
  }
  return paragraphs
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => paragraph.join(" "))
    .join("\n\n");
}

// — flow values —

function decodeFlow(text, where) {
  if (text.startsWith("[")) {
    const decoded = decodeInlineArrayAt(text, 0, where);
    requireOnlyTrailingComment(text.slice(decoded.end), where);
    return decoded.value;
  }
  if (text.startsWith("{")) {
    throw new TypeError(`${where}: inline flow maps ({ ... }) are not supported; use a block map`);
  }
  if (text.startsWith('"') || text.startsWith("'")) {
    const quoted = decodeQuoted(text, 0, where);
    requireOnlyTrailingComment(text.slice(quoted.end), where);
    return quoted.value;
  }
  return decodeBareScalar(stripTrailingComment(text));
}

function decodeInlineArrayAt(text, start, where) {
  const items = [];
  let i = start + 1;
  let expectItem = true;
  for (;;) {
    while (i < text.length && /\s/u.test(text[i] ?? "")) i += 1;
    if (i >= text.length) throw new TypeError(`${where}: inline array is missing its closing \`]\``);
    if (text[i] === "]") return Object.freeze({ value: items, end: i + 1 });
    if (!expectItem) {
      if (text[i] !== ",") throw new TypeError(`${where}: inline array items must be comma-separated`);
      i += 1;
      expectItem = true;
      continue;
    }
    const char = text[i] ?? "";
    if (char === "{") {
      throw new TypeError(`${where}[${items.length}]: inline flow maps ({ ... }) are not supported; use a block map`);
    }
    if (char === "[") {
      const nested = decodeInlineArrayAt(text, i, `${where}[${items.length}]`);
      items.push(nested.value);
      i = nested.end;
    } else if (char === '"' || char === "'") {
      const quoted = decodeQuoted(text, i, where);
      items.push(quoted.value);
      i = quoted.end;
    } else {
      let j = i;
      while (j < text.length && text[j] !== "," && text[j] !== "]") j += 1;
      items.push(decodeBareScalar(text.slice(i, j).trim()));
      i = j;
    }
    expectItem = false;
  }
}

function decodeBareScalar(token) {
  if (token === "") return "";
  if (token === "true") return true;
  if (token === "false") return false;
  if (token === "null" || token === "~") return null;
  if (DATE_PATTERN.test(token)) return token;
  if (INTEGER_PATTERN.test(token)) return Number(token);
  if (FLOAT_PATTERN.test(token)) return Number(token);
  return token;
}

function stripTrailingComment(token) {
  for (let i = 0; i < token.length; i += 1) {
    if (token[i] === "#" && (i === 0 || /\s/u.test(token[i - 1] ?? ""))) {
      return token.slice(0, i).trim();
    }
  }
  return token.trim();
}

function requireOnlyTrailingComment(rest, where) {
  const trimmed = rest.trim();
  if (trimmed !== "" && !trimmed.startsWith("#")) {
    throw new TypeError(`${where}: unexpected trailing content \`${trimmed}\``);
  }
}

// — encoding —
//
// encodeEntry, encodeSequence, and their own internal helpers (sequence-map
// items, inline arrays, block scalars, scalar quoting) now live at
// @red-cup-engineering/yaml-frontmatter-codec-service, imported above.
