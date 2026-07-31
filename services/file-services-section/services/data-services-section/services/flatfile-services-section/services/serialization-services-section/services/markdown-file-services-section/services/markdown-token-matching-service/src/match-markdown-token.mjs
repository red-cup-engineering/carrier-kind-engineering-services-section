// Pure matching over an already-observed MarkdownDocumentIndex (an array of
// {path, frontmatter, headings} entries, as returned by
// markdown-document-index-observation-service). Never reads a file: both
// the title/frontmatter stage and the heading stage of a staged search read
// from this one matcher, because both come from the same single parse of
// each document — splitting into two packages here would duplicate the
// read, not the concern.

const TITLE_KEYS = new Set(["title", "name"]);
const RANK = Object.freeze({ "frontmatter-title": 0, "frontmatter-field": 1, heading: 2 });
const SCORE = Object.freeze({ "frontmatter-title": 1, "frontmatter-field": 0.7, heading: 0.5 });

function folded(value, caseSensitive) {
  return caseSensitive ? value : value.toLowerCase();
}

// Flattens a frontmatter value to the string(s) worth testing: scalars
// stringify, arrays test each element, and a nested object (out of scope for
// a token search) contributes nothing rather than a misleading [object
// Object] hit.
function stringValues(value) {
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  return [];
}

/**
 * Test `token` against each index entry's frontmatter values (title-like
 * keys — "title", "name" — checked first) and each heading's title. Returns
 * a frozen array of match records tagging `matchKind` as
 * "frontmatter-title", "frontmatter-field", or "heading", ordered by that
 * same rank (title beats field beats heading) then alphabetically by path —
 * the caller (the staged-search app) decides which matchKind values belong
 * to which numbered stage, this service only ranks and tags.
 */
export function matchMarkdownToken({ token, index, options = {} } = {}) {
  if (typeof token !== "string" || token.trim() === "") throw new TypeError("token is required");
  if (!Array.isArray(index)) throw new TypeError("index must be an array");
  const caseSensitive = options.caseSensitive === true;
  const needle = folded(token, caseSensitive);

  const matches = [];
  for (const entry of index) {
    if (typeof entry?.path !== "string") continue;

    const frontmatter = entry.frontmatter ?? {};
    const keys = Object.keys(frontmatter);
    const orderedKeys = [
      ...keys.filter((key) => TITLE_KEYS.has(key.toLowerCase())),
      ...keys.filter((key) => !TITLE_KEYS.has(key.toLowerCase())),
    ];
    for (const key of orderedKeys) {
      for (const value of stringValues(frontmatter[key])) {
        if (!folded(value, caseSensitive).includes(needle)) continue;
        const matchKind = TITLE_KEYS.has(key.toLowerCase()) ? "frontmatter-title" : "frontmatter-field";
        matches.push({ path: entry.path, matchKind, matchedText: value, rank: RANK[matchKind], score: SCORE[matchKind] });
      }
    }

    for (const heading of entry.headings ?? []) {
      if (typeof heading?.title !== "string") continue;
      if (!folded(heading.title, caseSensitive).includes(needle)) continue;
      matches.push({ path: entry.path, matchKind: "heading", matchedText: heading.title, rank: RANK.heading, score: SCORE.heading });
    }
  }

  matches.sort((a, b) => a.rank - b.rank || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return Object.freeze(
    matches.map((match) => Object.freeze({
      path: match.path,
      matchKind: match.matchKind,
      matchedText: match.matchedText,
      score: match.score,
    })),
  );
}
