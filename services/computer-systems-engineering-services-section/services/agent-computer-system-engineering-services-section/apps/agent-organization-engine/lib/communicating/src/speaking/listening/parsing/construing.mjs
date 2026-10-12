

import { tag } from "./tagging.mjs";
import { features } from "./featuring.mjs";
import { relate } from "./relating.mjs";
import { tell } from "./telling.mjs";
import { span as makeSpan } from "./articulating.mjs";

/** Build a stable word ID from a span. */
function wordId(s) {
  return `word@${s.start ?? "?"}${s.end !== null ? `-${s.end}` : ""}`;
}

/** Construe a sentence span (and its word-spans from the articulation base) into a
 * ConstrainedResult: words with POS tags + features, arc proposals, and kernel entries. */
export function construe(
  sentenceSpan,
  wordSpans,
  bundle,
) {

  const words = wordSpans
    .filter((s) => s.tier === "word")
    .map((s, i) => {
      const t = tag(s.text, bundle, { sentenceInitial: i === 0 });
      const f = features(s.text, t, bundle);
      return {
        i,
        id: wordId(s),
        span: s,
        tags: t,
        feats: f,
      };
    });

  const proposals = relate(words, bundle);
  const arcs = proposals.map((p) => p.arc);

  const { entries, specialization, questions } = tell(words, arcs);

  return { words, arcs, entries, specialization, questions };
}

/** Helper: extract word-tier spans for a sentence from the articulate base. */
export function wordsInSentence(sentenceSpan, allSpans) {

  const { start: sStart, end: sEnd } = sentenceSpan;
  if (sStart === null || sEnd === null) return [];
  return allSpans.filter((s) => {
    if (s.tier !== "word") return false;
    if (s.start === null || s.end === null) return false;
    return s.start >= sStart && s.end <= sEnd;
  });
}

/**
 * Extract spans of a given tier fully contained in a sentence, from the
 * articulate base. Generalizes `wordsInSentence` to any tier (e.g. "quote").
 * @param sentenceSpan the sentence whose range spans must fall within
 * @param allSpans the full `ArticulateResult.spans` array to filter
 * @param tier the tier to select
 * @returns spans of `tier` with `start >= sentenceSpan.start` and `end <= sentenceSpan.end`
 */
export function spansInSentenceOfTier(sentenceSpan, allSpans, tier) {
  const { start: sStart, end: sEnd } = sentenceSpan;
  if (sStart === null || sEnd === null) return [];
  return allSpans.filter((s) => {
    if (s.tier !== tier) return false;
    if (s.start === null || s.end === null) return false;
    return s.start >= sStart && s.end <= sEnd;
  });
}
