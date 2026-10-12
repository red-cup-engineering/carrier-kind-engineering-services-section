

/** An all-caps token of 2+ letters ("US", "IT", "EU", "ECB") — a shape the
 * lowercase closed-class path must not resolve by lowercasing alone, since
 * that collapses acronyms onto unrelated closed-class pronoun/preposition
 * readings ("IT" -> "it", "US" -> "us"). */
const ACRONYM_RE = /^[A-Z]{2,}$/;

/** Closed-class readings an acronym must never fall back into via
 * lowercasing, absent case-preserved evidence for them. */
const CASE_COLLAPSE_BLOCKED = new Set(["pron", "prep"]);

/** Return POS tags for a word. May return multiple tags (ambiguous open-class words).
 * Closed-class words return exactly one tag; open-class may return multiple. */
export function tag(word, bundle, opts) {
  const lower = word.toLowerCase();

  if (ACRONYM_RE.test(word)) {
    const cased = bundle.closedClassTagsCased(word);
    if (cased.length > 0) return cased;
    const lowerClosed = bundle.closedClassTags(lower);
    if (lowerClosed.length > 0 && !lowerClosed.some((t) => CASE_COLLAPSE_BLOCKED.has(t))) return lowerClosed;
  } else {
    const closed = bundle.closedClassTags(lower);
    if (closed.length > 0) return closed;
  }

  if (/^\d[\d,.]*$/.test(word)) return ["num"];

  const morphTags = bundle.morphologyTags(word);
  if (morphTags.length > 0) return morphTags;

  return ["noun"];
}
