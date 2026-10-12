// featuring.ts — extract morphological features from a tagged word.
// Features are fiber-algebras: an ambiguous word carries ALL compatible features.
// Number features: "sg" | "pl" (may be both for invariant/ambiguous words).
// Verb form: "3sg" | "base" | "past" | "nonfin" | null (for non-verbs).

/** Return morphological features for a word given its POS tags. */
export function features(word, tags, bundle) {
  const result = [];

  const numFeats = bundle.numberFeatures(word, tags);
  for (const f of numFeats) {
    if (!result.includes(f)) result.push(f);
  }

  const vf = bundle.verbForm(word, tags);
  if (vf !== null && !result.includes(vf)) result.push(vf);

  if (bundle.roleBy === "case" && tags.includes("noun")) {
    const lower = word.toLowerCase();
    if (/(us|a)$/.test(lower)) result.push("case:nom");
    if (/(um|am)$/.test(lower)) result.push("case:acc");
    if (/(o|is)$/.test(lower)) result.push("case:abl");
    if (/(ae|i|orum|arum)$/.test(lower)) result.push("case:gen-dat");
  }

  return result;
}
