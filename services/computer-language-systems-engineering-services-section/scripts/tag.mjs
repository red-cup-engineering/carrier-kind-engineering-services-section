// tag.mjs — the language-neutral tagging capability shared by every language
// fiber algebra (english, lakota, mandarin, tokipona, latin) over the
// language-neutral communicating substrate. A language's own bundle.mjs
// owns its lexicon/morphology/word-order (or case-feature/free-word-order,
// isolating-morphology, dictionary-segmentation, etc.) law; communicating
// owns Mark admission, articulation, charged settlement, roles and
// cohomology; this module is the mechanism each fiber shares in between:
// compile the bundle, tokenize, per-word POS tag, and run the full
// construe→descend→fold settlement pipeline to produce tagText's
// per-sentence parse+roles+cohomology.
import {
  admitCommunication,
  articulateCommunication,
  load,
  read,
  settle,
} from "@red-cup-engineering/communicating";

/**
 * Build a language fiber's tagging surface — { bundle, tagWordPos, tokenize,
 * tagText } — from its rawBundle.
 *
 * Pass { includeRoleBy: true } for a fiber whose rawBundle carries a roleBy
 * table it wants surfaced on tagText's returned summary alongside
 * meta/wordOrder (latin-language-algebra's free-word-order variation: case
 * features decide roles, so its bundle publishes the roleBy table tagText
 * hands back to callers; the other fibers have no such table and leave the
 * option off).
 */
export function createTag(rawBundle, { includeRoleBy = false } = {}) {
  /** The compiled fiber consumed by communicating's public readings. */
  const bundle = load(rawBundle);

  /** Real per-word POS tag, via the engine's own tag() (closed-class lexicon,
   * then open-class suffix morphology, floor = noun). Exposed standalone
   * because the original recovered parity test asserted against it directly. */
  function tagWordPos(word) {
    return read(word, bundle).parse.words[0]?.tags ?? [];
  }

  /** Tokenize on the engine's own tokenizer for this bundle — either the
   * Unicode-aware word tokenizer (word = a run of letters/marks/numbers
   * joined by ' / ʼ / ‐ / -), which naturally excludes sentence-terminating
   * punctuation, or, for a bundle with its own dictionary-based `segment`
   * hook, that hook instead — no separate strip-then-split step either way. */
  function tokenize(text) {
    return articulateCommunication(admitCommunication(text), bundle).spans
      .filter((s) => s.tier === "word")
      .map((s) => s.text);
  }

  /**
   * Parse `text` for real: articulate into sentence spans, run the full
   * construe→descend→fold pipeline on each sentence, and extract syntax-
   * derived semantic role frames (agent/patient/instrument/recipient/
   * location) via the shared engine's roles(). Returns one entry per
   * sentence found (or one entry for the whole text if no sentence
   * terminator was present).
   *
   * This is a real, deterministic function of (text, rawBundle) — byte-
   * identical in yields byte-identical out — computed by actually running
   * the settlement engine (not a flat per-word lookup).
   */
  function tagText(text) {
    const sentences = settle(text, bundle).readings.map(({ span: sentenceSpan }) => {
      const reading = read(sentenceSpan.text, bundle);
      const result = reading.parse;
      return {
        text: sentenceSpan.text,
        words: result.words.map((w) => ({ text: w.text, tags: w.tags, feats: w.feats, connected: w.connected, roles: w.roles })),
        arcs: result.arcs.map((a) => ({ rel: a.rel, head: a.headText, dependent: a.depText, status: a.status })),
        roles: reading.roles,
        tower: result.tower,
        cohomology: reading.cohomology,
      };
    });

    return {
      meta: rawBundle.meta,
      wordOrder: rawBundle.wordOrder,
      ...(includeRoleBy ? { roleBy: rawBundle.roleBy } : {}),
      sentences,
    };
  }

  return { bundle, tagWordPos, tokenize, tagText };
}
