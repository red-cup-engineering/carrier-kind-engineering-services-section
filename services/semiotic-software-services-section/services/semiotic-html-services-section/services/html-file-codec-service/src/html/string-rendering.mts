/**
 * Small dependency-free HTML string rendering primitives.
 *
 * These preserve the established content/microformat wire format: nullish
 * values become empty, quotes are escaped in every position, boolean true
 * attributes are bare, false/nullish attributes are omitted, class tokens are
 * de-duplicated in encounter order, and void elements use XHTML ` />` spelling.
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type HtmlStringAttributes = Readonly<Record<string, unknown>>;

export function attrs(map?: HtmlStringAttributes | null): string {
  if (!map) return "";
  let out = "";
  for (const [name, value] of Object.entries(map)) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) {
      out += ` ${name}`;
      continue;
    }
    out += ` ${name}="${escapeHtml(value)}"`;
  }
  return out;
}

export function classes(...tokens: (string | null | undefined | false)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (!token) continue;
    for (const part of token.split(/\s+/)) {
      if (!part || seen.has(part)) continue;
      seen.add(part);
      out.push(part);
    }
  }
  return out.join(" ");
}

const XHTML_VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Children are trusted, already-rendered HTML fragments by contract. */
export function el(
  tag: string,
  attributes?: HtmlStringAttributes | null,
  children?: string | readonly string[],
): string {
  const open = `<${tag}${attrs(attributes)}`;
  if (XHTML_VOID_ELEMENTS.has(tag)) return `${open} />`;
  const inner = Array.isArray(children) ? children.join("") : children ?? "";
  return `${open}>${inner}</${tag}>`;
}
