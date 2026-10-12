

/** Return morphological features for a word given its POS tags. */
export function features(word, tags, bundle) {
  const result = [];

  const numFeats = bundle.numberFeatures(word, tags);
  for (const f of numFeats) {
    if (!result.includes(f)) result.push(f);
  }

  const vf = bundle.verbForm(word, tags);
  if (vf !== null && !result.includes(vf)) result.push(vf);

  for (const f of bundle.featureTags(word, tags)) {
    if (!result.includes(f)) result.push(f);
  }

  return result;
}
