// slugify-text — the house's one plain-text-to-slug transformation: lowercase,
// NFKD-decompose so diacritics separate from their base letters, strip the
// resulting combining marks, collapse every run of non-alphanumeric
// characters to a single hyphen, and trim leading/trailing hyphens.
//
// This is the union of what the hand-rolled `.replace(/[^a-z0-9]+/g, "-")`
// copies across the house needed for an ordinary "turn a title into a URL or
// filename segment" slug. It is deliberately narrow: callers whose law is
// genuinely different (an allowlist wider than [a-z0-9], such as Nix store
// names permitting `+._?`, or a slug that must preserve internal path
// separators) are not this function and should not be forced through it.
export function slugify(text) {
  if (typeof text !== "string") throw new TypeError("slugify requires a string");
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

// The identifier slug keeps case and `._-`: other runs join with one hyphen.
// Journal feed names and other case-significant identifiers use this law.
export function identifierSlug(text) {
  if (typeof text !== "string") throw new TypeError("identifierSlug requires a string");
  return text.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
}

// The heading slug is a document's in-page anchor for a heading: punctuation is
// deleted rather than hyphenated, whitespace runs become one hyphen, and `/` and
// `-` survive, so "Role: Assistant" anchors as "role-assistant".
export function headingSlug(text) {
  if (typeof text !== "string") throw new TypeError("headingSlug requires a string");
  return text.toLowerCase().replace(/[^a-z0-9\s/-]/gu, "").trim().replace(/\s+/gu, "-");
}
