

/** Closed-class auxiliary lemmas ("will", "shall") that mark future time
 * reference, out of the wider modal-auxiliary set ("may", "might", "could",
 * "would", "should", "will", "shall") the bundle's aux lexicon already carries. */
const FUTURE_AUX_LEMMAS = new Set(["will", "shall"]);

/** Read the modality of one sentence: hedge, future-marking, and auxiliary
 * surface tokens found among its words, in reading order. `hedges` reads the
 * optional `bundle.hedges` list; `future`/`auxiliaries` read the closed-class
 * aux lexicon the bundle already carries (tag "aux"). */
export function modalityFromWords(words, bundle) {
  const auxiliaries = [];
  const future = [];
  for (const w of words) {
    if (!w.tags.includes("aux")) continue;
    auxiliaries.push(w.span.text);
    if (FUTURE_AUX_LEMMAS.has(w.span.text.toLowerCase())) future.push(w.span.text);
  }

  const hedgeList = bundle.hedges ?? [];
  const hedges = [];
  if (hedgeList.length > 0) {
    const hedgeSet = new Set(hedgeList.map((h) => h.toLowerCase()));
    for (const w of words) {
      if (hedgeSet.has(w.span.text.toLowerCase())) hedges.push(w.span.text);
    }
  }

  return Object.freeze({
    hedges: Object.freeze(hedges),
    future: Object.freeze(future),
    auxiliaries: Object.freeze(auxiliaries),
  });
}
