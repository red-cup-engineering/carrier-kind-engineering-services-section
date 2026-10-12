/**
 * english/construing — tag words, propose arcs, and build kernel entries for one sentence.
 */
import type { CompiledBundle } from "./bundle.mts";
import { relate } from "./dependency.mts";
import { tag } from "./tagging.mts";
import type { Arc, ConstrainedResult, Span, Word } from "./types.mts";

/** Build a stable word ID from a span. */
function wordId(s: Span): string {
  return `word@${s.start ?? "?"}${s.end !== null ? `-${s.end}` : ""}`;
}

/** Morphological features for a word given its POS tags. */
function features(word: string, tags: readonly string[], bundle: CompiledBundle): readonly string[] {
  const result: string[] = [];
  for (const f of bundle.numberFeatures(word, tags)) if (!result.includes(f)) result.push(f);
  const vf = bundle.verbForm(word, tags);
  if (vf !== null && !result.includes(vf)) result.push(vf);
  return result;
}

/** Construe a sentence's word-spans into a ConstrainedResult: tagged words, arc
 *  proposals, and kernel entries. */
export function construe(wordSpans: readonly Span[], bundle: CompiledBundle): ConstrainedResult {
  const words: Word[] = wordSpans
    .filter((s) => s.tier === "word")
    .map((s, i) => {
      const t = tag(s.text, bundle);
      const f = features(s.text, t, bundle);
      return { i, id: wordId(s), span: s, tags: t, feats: f };
    });

  const proposals = relate(words, bundle);
  const arcs: Arc[] = proposals.map((p) => p.arc);

  return { words, arcs };
}

/** Extract word-tier spans for a sentence from the articulation base. */
export function wordsInSentence(sentenceSpan: Span, allSpans: readonly Span[]): readonly Span[] {
  const { start: sStart, end: sEnd } = sentenceSpan;
  if (sStart === null || sEnd === null) return [];
  return allSpans.filter((s) => s.tier === "word" && s.start !== null && s.end !== null && s.start >= sStart && s.end <= sEnd);
}
