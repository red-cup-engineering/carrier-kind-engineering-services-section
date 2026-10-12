// language-engine/tagging.mjs — assign part-of-speech tags to a word using a compiled
// bundle. Mechanically ported (types stripped) from the recovered
// @lenticule-science/language-topology/src/tagging.mts. Logic is unchanged.
// Closed-class words win (function words take ONLY their class).
// Open-class tags come from bundle morphology suffix rules.
// "noun" is the floor: every non-closed, non-matching word is a noun.

/** Return POS tags for a word. May return multiple tags (ambiguous open-class words).
 * Closed-class words return exactly one tag; open-class may return multiple. */
export function tag(word, bundle, opts) {
  const lower = word.toLowerCase();
  // Sentence-initial words may be capitalized — try lowercase for closed class
  const closed = bundle.closedClassTags(lower);
  if (closed.length > 0) return closed;

  // Numbers
  if (/^\d[\d,.]*$/.test(word)) return ["num"];

  // Open-class morphology (may return multiple: verb, noun, adj, adv, etc.)
  const morphTags = bundle.morphologyTags(word);
  if (morphTags.length > 0) return morphTags;

  // Floor: noun
  return ["noun"];
}
