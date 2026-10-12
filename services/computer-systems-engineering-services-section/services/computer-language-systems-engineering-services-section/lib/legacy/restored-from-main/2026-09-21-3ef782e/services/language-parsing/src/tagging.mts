// tagging.ts — assign part-of-speech tags to a word using a compiled bundle.
// Closed-class words win (function words take ONLY their class).
// Open-class tags come from bundle morphology suffix rules.
// "noun" is the floor: every non-closed, non-matching word is a noun.
import type { CompiledBundle } from "./types.mjs";

/** Return POS tags for a word. May return multiple tags (ambiguous open-class words).
 * Closed-class words return exactly one tag; open-class may return multiple. */
export function tag(word: string, bundle: CompiledBundle, opts?: { sentenceInitial?: boolean }): readonly string[] {
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
