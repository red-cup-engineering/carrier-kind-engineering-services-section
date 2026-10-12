/**
 * @packageDocumentation
 * The content slug: NFKD normalize, strip marks, drop quotes, lowercase, and
 * join [a-z0-9] runs with hyphens.
 *
 * @metroplatSubject addressing
 */
export function contentSlug(value, fallback = "slug") {
  const out = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/['"]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return out.length === 0 ? fallback : out;
}

/** The identifier slug: case-preserving [A-Za-z0-9._-], other runs joined by "-". */
export function identifierSlug(value, fallback = "slug") {
  const out = value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return out.length === 0 ? fallback : out;
}
