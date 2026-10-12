// language-engine/polarity.mjs — extract negation, modality, and polarity
// from a parse. Mechanically ported (types stripped) from the recovered
// @lenticule-science/language-analysis/src/semantics/polarity.mts. Logic is unchanged.
// Uses the bilattice: affirmative → t, negated → f, modalized → ⊥
// (potential, not asserted).
//
// Ported this session (2026-07-23) for english-language-codecs's real
// recovered sectionFromText(), which imports `polarity` from
// @lenticule-science/language-analysis — the first die under linguistics-services-
// section to need it; no parsing die's own recovered parity test ever called
// it.

const NEGATORS = new Set(["not", "n't", "never", "no", "neither", "nor"]);
const MODALS = new Set(["can", "could", "may", "might", "must", "shall", "should", "will", "would"]);

/** Extract polarity and modality from a parse result. */
export function polarity(result) {
  const frames = [];
  const verbs = result.words.filter((w) => w.tags.includes("verb"));

  for (const verb of verbs) {
    // Check for negation in same clause (within sentence)
    const negated = result.words.some(
      (w) => NEGATORS.has(w.text.toLowerCase()) && Math.abs(w.i - verb.i) <= 3,
    );

    // Check for modal auxiliary in same clause
    const modalWord = result.words.find(
      (w) => MODALS.has(w.text.toLowerCase()) && Math.abs(w.i - verb.i) <= 2,
    );
    const modal = modalWord?.text.toLowerCase() ?? null;

    // Compute asserted charge
    let asserted;
    if (modal !== null) {
      asserted = "absurd"; // not yet asserted; epistemic void
    } else if (negated) {
      asserted = "active"; // negative — denied
    } else {
      asserted = "potential"; // positive — asserted
    }

    frames.push({ verb: verb.text, negated, modal, asserted });
  }

  return frames;
}
