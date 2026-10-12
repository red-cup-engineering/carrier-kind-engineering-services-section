// language-engine/construing.mjs — parse a sentence span into its dependency
// structure. Mechanically ported (types stripped) from the recovered
// @lenticule-science/language-topology/src/construing.mts. Logic is unchanged.
// Orchestrates: tag → feature → relate → charge → produces ConstrainedResult.
// Language-specific decisions are driven entirely by the CompiledBundle.
import { tag } from "./tagging.mjs";
import { features } from "./featuring.mjs";
import { relate } from "./relating.mjs";
import { charge } from "./charging.mjs";

/** Build a stable word ID from a span. */
function wordId(s) {
  return `word@${s.start ?? "?"}${s.end !== null ? `-${s.end}` : ""}`;
}

/** Construe a sentence span (and its word-spans from the articulation base) into a
 * ConstrainedResult: words with POS tags + features, arc proposals, and kernel entries. */
export function construe(sentenceSpan, wordSpans, bundle) {
  // Build Word objects
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

  // Run attachment rules
  const proposals = relate(words, bundle);
  const arcs = proposals.map((p) => p.arc);

  // Lift to kernel entries
  const { entries, specialization, questions } = charge(words, arcs);

  return { words, arcs, entries, specialization, questions };
}

