/**
 * formats/markdown/document — the round-trip codec for a markdown
 * document with optional YAML/TOML frontmatter: `parseMarkdown` reads text
 * into `{frontmatter, format, body}`; `createMarkdown` is its inverse,
 * writing a view back to text. Both are pure package-phase wire-format
 * functions (parse to / produce from a normal form) with no host world or
 * EAVT projection concern — that projection (`markdownDataform`,
 * `markdownProjector`) is built on top of this codec in
 * `projections/markdown.mts`, not folded into it.
 */
import { canonicalBytes } from "../../identity/index.mjs";
import { parse as parseJson } from "@red-cup-engineering/json-services-section";
import { decodeToml } from "@red-cup-engineering/toml-services-section/toml-codec";
import { decodeYaml, encodeYaml } from "../yaml/index.mjs";
import { markdownFeatures } from "./features.mjs";
import { splitFrontMatterFence } from "./frontmatter.mjs";
import { semanticLineBreaks } from "./semantic-line-breaks.mjs";
import { markdownStructure } from "./structure.mjs";

/** Read a markdown document's frontmatter fence and body. The fence's raw
 *  text is decoded through the codec its format names (`decodeYaml`/`decodeToml`);
 *  a document with no fence carries `frontmatter: null, format: null`. */
export function parseMarkdown(text) {
  const fence = splitFrontMatterFence(text);
  if (fence === null) return Object.freeze({ frontmatter: null, format: null, body: text });
  return Object.freeze({
    frontmatter: Object.freeze(fence.format === "yaml" ? decodeYaml(fence.raw) : decodeToml(fence.raw)),
    format: fence.format,
    body: fence.body,
  });
}

export function decodeMarkdownFrontmatter(
  format,
  raw,
  options = {},
) {
  if (format === "yaml" && options.jsonObjectFrontmatter === true && raw.trim().startsWith("{")) {
    const value = parseJson(raw.trim());
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("markdown: JSON frontmatter must be an object");
    }
    return Object.freeze(value);
  }
  return format === "yaml" ? decodeYaml(raw) : decodeToml(raw);
}

/** Read one Markdown text into the package's shared document readout: decoded
 *  frontmatter, body text, body feature spans, and EAVT-shaped assertions. */
export function readMarkdownDocument(text, options = {}) {
  const fence = splitFrontMatterFence(text);
  const allowedFormats = new Set(options.frontmatterFormats ?? ["yaml", "toml"]);
  const parsed = fence === null || !allowedFormats.has(fence.format)
    ? Object.freeze({ frontmatter: null, format: null, body: text })
    : Object.freeze({
      frontmatter: Object.freeze(decodeMarkdownFrontmatter(fence.format, fence.raw, options)),
      format: fence.format,
      body: fence.body,
    });
  const frontmatter = Object.freeze({ ...(parsed.frontmatter ?? {}) });
  const coordinate = options.coordinate ?? "markdown";
  const subject = options.subject ?? (typeof frontmatter["slug"] === "string" && frontmatter["slug"].trim() !== "" ? frontmatter["slug"] : coordinate);
  const assertions = [];
  const push = (a, v) => {
    assertions.push(Object.freeze({ e: subject, a, v: frontmatterRowValue(v), t: coordinate }));
  };
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) for (const item of value) push(key, item);
    else push(key, value);
  }
  push("body", parsed.body);
  return Object.freeze({
    subject,
    format: parsed.format,
    frontmatter,
    body: parsed.body,
    structure: markdownStructure(text),
    features: markdownFeatures(parsed.body),
    assertions: Object.freeze(assertions),
  });
}

function frontmatterRowValue(value) {
  if (value !== null && typeof value === "object") return canonicalBytes(value);
  return value;
}

/** Project one entity view to a markdown document: scalar attributes become
 *  `key: value` frontmatter lines, set-valued (array) attributes become YAML
 *  block lists, and the body attribute becomes the markdown body. The inverse
 *  of `parseMarkdown`; emits no frontmatter fences when nothing remains.
 *
 * @example
 * ```js
 * import { createMarkdown, parseMarkdown } from "@red-cup-engineering/metroplat/codecs/markdown";
 *
 * const text = createMarkdown({
 *   slug: "metroplat",
 *   title: "MetroPlat",
 *   body: "# MetroPlat\n",
 * });
 *
 * parseMarkdown(text).body; // "# MetroPlat\n"
 * ```
 */
export function createMarkdown(view, opts = {}) {
  const bodyKey = opts.bodyKey ?? "body";
  const rawBody = opts.body ?? view[bodyKey];
  const body0 = typeof rawBody === "string" ? rawBody : "";
  const body = opts.semanticLineBreaks === false ? body0 : semanticLineBreaks(body0);
  const frontmatter = {};
  for (const key of Object.keys(view).sort()) {
    if (key === bodyKey) continue;
    const value = view[key];
    if (value === undefined || value === null) continue;
    // The empty array is a value, not an absence, and is emitted. `[]` says
    // known-to-be-empty; a missing key says unknown. Those are `denied` and
    // `unknown` — distinct points of the charge algebra this package is built
    // on (lib/values: "two evidence bits, for and against"), and dropping `[]`
    // rewrites the first into the second, silently, on write.
    //
    // It also has to be emitted for this function to be what its own header
    // claims: the inverse of parseMarkdown. encodeYaml is already purpose-built
    // to carry it (codecs/yaml: `${key}: []`), canonical JSON already gives
    // `{"a":[]}` and `{}` distinct addresses, and the TOML branch in edit.mts
    // already preserves it — so dropping it here made one record's meaning
    // depend on its wire format.
    frontmatter[key] = value;
  }
  const head = encodeYaml(frontmatter);
  if (head === "") return body;
  return `---\n${head}---\n${body}`;
}
