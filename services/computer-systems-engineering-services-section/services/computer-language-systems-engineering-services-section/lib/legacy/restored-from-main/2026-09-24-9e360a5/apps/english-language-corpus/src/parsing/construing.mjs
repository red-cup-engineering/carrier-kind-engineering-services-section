/**
 * english/construing — tag words, propose arcs, and build kernel entries for one sentence.
 */

import { relate } from "./dependency.mjs";
import { tag } from "./tagging.mjs";

/** Build a stable word ID from a span. */
function wordId(s) {
  return `word@${s.start ?? "?"}${s.end !== null ? `-${s.end}` : ""}`;
}

/** Morphological features for a word given its POS tags. */
function features(word, tags, bundle) {
  const result = [];
  for (const f of bundle.numberFeatures(word, tags)) if (!result.includes(f)) result.push(f);
  const vf = bundle.verbForm(word, tags);
  if (vf !== null && !result.includes(vf)) result.push(vf);
  return result;
}

/** Construe a sentence's word-spans into a ConstrainedResult: tagged words, arc
 *  proposals, and kernel entries. */
export function construe(wordSpans, bundle) {
  const words = wordSpans
    .filter((s) => s.tier === "word")
    .map((s, i) => {
      const t = tag(s.text, bundle);
      const f = features(s.text, t, bundle);
      return { i, id: wordId(s), span: s, tags: t, feats: f };
    });

  const proposals = relate(words, bundle);
  const arcs = proposals.map((p) => p.arc);

  return { words, arcs };
}

/** Extract word-tier spans for a sentence from the articulation base. */
export function wordsInSentence(sentenceSpan, allSpans) {
  const { start: sStart, end: sEnd } = sentenceSpan;
  if (sStart === null || sEnd === null) return [];
  return allSpans.filter((s) => s.tier === "word" && s.start !== null && s.end !== null && s.start >= sStart && s.end <= sEnd);
}
