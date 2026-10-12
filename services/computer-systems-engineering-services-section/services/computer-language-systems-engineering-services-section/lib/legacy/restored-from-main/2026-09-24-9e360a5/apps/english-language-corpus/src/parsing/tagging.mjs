/**
 * english/tagging — assign part-of-speech tags to a word surface form, and the
 * tag-level readings those tags license.
 */
import { tokenize } from "./segments.mjs";
import { compileBundle } from "./bundle.mjs";
import { englishBundle } from "./lexicon.mjs";

/** Return POS tags for a word. Closed-class words return their class tags (a
 *  negator composes, e.g. "no" → neg+det); open-class words fall through
 *  morphology, defaulting to "noun". */
export function tag(word, bundle) {
  const lower = word.toLowerCase();
  const closed = bundle.closedClassTags(lower);
  if (closed.length > 0) return closed;
  if (/^\d[\d,.]*$/.test(word)) return ["num"];
  return bundle.morphologyTags(word);
}

/** The polarity of one claim utterance, read from its tagged words. */

  

let compiledEnglish;
function defaultEnglish() {
  if (compiledEnglish === undefined) compiledEnglish = compileBundle(englishBundle);
  return compiledEnglish;
}

/** A leading `!` or `-` is a wire-format negation glyph, not English — admitted
 *  here as host-format parsing, then the linguistic reading takes over. */
const SYMBOLIC_NEGATION_PREFIX = /^\s*[!-]\s*/u;

/**
 * Read a claim's polarity through the English lexicon: the claim is denied
 * when any of its words carries the `neg` closed-class tag, or when it opens
 * with a wire negation glyph. Contracted negation ("don't", "isn't") reads as
 * `neg` for free: `tokenize` (`articulating.mts`) splits the clitic "n't" into
 * its own word, and `n't` is a `negators` lexicon entry like any other. `base`
 * is the claim with negator words removed — two claims conflict-on-negation
 * exactly when their bases coincide and their polarities differ. A handful of
 * irregular modal contractions (can't, won't, shan't) leave a bare stem
 * fragment ("ca", "wo", "sha") in `base` once split — a known, narrow gap in
 * those three closed-class irregulars, not a general defect.
 */
export function claimPolarity(text, bundle = defaultEnglish()) {
  const glyph = SYMBOLIC_NEGATION_PREFIX.exec(text);
  const body = glyph === null ? text : text.slice(glyph[0].length);
  const bodyOffset = glyph === null ? 0 : glyph[0].length;
  const words = tokenize(body, bodyOffset);
  const negatorSpans = words.filter((word) => tag(word.text, bundle).includes("neg"));
  const denied = glyph !== null || negatorSpans.length > 0;

  let base = "";
  let cursor = bodyOffset;
  for (const span of negatorSpans) {
    if (span.start === null || span.end === null) continue;
    base += text.slice(cursor, span.start);
    cursor = span.end;
  }
  base += text.slice(cursor);
  base = base.replace(/\s+/gu, " ").trim();

  return Object.freeze({
    kind: "english.claim-polarity",
    polarity: denied ? "denied" : "affirmed",
    base,
    negators: Object.freeze([
      ...(glyph === null ? [] : [glyph[0].trim()]),
      ...negatorSpans.map((span) => span.text),
    ]),
  });
}
