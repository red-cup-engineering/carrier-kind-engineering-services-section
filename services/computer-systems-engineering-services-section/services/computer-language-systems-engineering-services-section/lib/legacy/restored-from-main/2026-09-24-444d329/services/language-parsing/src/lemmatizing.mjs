// lemmatizing.ts — return the lemma(s) for a word.
// Lemmatization may return multiple candidates (ambiguous forms).
// Irregular forms are checked first; the word itself is always a candidate.
// The result is never empty: unknown words return [word.toLowerCase()].

/** Return one or more lemma candidates for a word. */
export function lemma(word, _tags, bundle) {
  const lower = word.toLowerCase();
  const irreg = bundle.raw.morphology.irregularVerbs;

  // Check irregular verb table
  if (irreg) {
    for (const [base, forms] of Object.entries(irreg)) {
      if (Object.values(forms).includes(lower) || base === lower) {
        return [base];
      }
    }
  }

  // Check irregular plurals (in reverse: plural → singular)
  const irregPlurals = bundle.raw.morphology.irregularPlurals ?? {};
  for (const [sing, pl] of Object.entries(irregPlurals)) {
    if (pl === lower) return [sing];
  }

  // Default: the lowercased word is its own lemma
  return [lower];
}
