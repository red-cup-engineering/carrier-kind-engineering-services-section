import { lemma } from "@red-cup-engineering/communicating/speaking/listening/algebra/morphology";
import { pluralize } from "@red-cup-engineering/communicating/speaking/listening/algebra/morphology";
import { indefiniteArticle } from "@red-cup-engineering/communicating/speaking/listening/algebra/morphology";
// language-engine/morphology.mjs — the generative word-form algebra.
// Mechanically ported (types stripped) from the recovered
// @lenticule-science/language-algebra/src/morphology.mts. Logic is unchanged.
//
// Inflection builds surface forms from lemmas (conjugate, pluralize, choose
// an article); lemmatization is its partial inverse (surface → lemma
// candidates). These are the nameable generators of the language's word
// algebra; they act over a compiled fiber (this engine's own compile.mjs
// `load()` output) and return forms, never parse structure.
//
// Ported this session (2026-07-23) for english-language-codecs's real
// recovered needs — the first time this module has been needed by any die
// under linguistics-services-section: latin-language-algebra's,
// lakota-language-algebra's, and tokipona-language-algebra's own recovered
// parity tests never called conjugate/pluralize/indefiniteArticle/lemma (see
// each die's own README "what's still stubbed" section), so it stayed
// unported until english-language-codecs's recovered src/realize.mts and
// src/section-from-text.mts genuinely import `conjugate` and `lemma` from
// @lenticule-science/language-algebra. `pluralize` and `indefiniteArticle` are ported
// here too (the whole recovered file, mechanically, matching the convention
// bundle.mjs transcription already uses) but neither is called by any real
// recovered generation-die code — see english-language-codecs/README.md.

// ── inflection (lemma → surface) ──────────────────────────────────────────

/** Conjugate a verb lemma to a surface form given tense/person/number.
 * Falls back to suffix rules, then the base form itself. */
export function conjugate(base, opts, bundle) {
  const lower = base.toLowerCase();
  const irreg = bundle.raw.morphology.irregularVerbs?.[lower];
  if (opts.tense === "past") {
    const pastForm = irreg?.["past"] ?? (lower.endsWith("e") ? lower + "d" : lower + "ed");
    return pastForm;
  }
  if (opts.tense === "present" && opts.person === 3 && opts.number === "sg") {
    const form3sg = irreg?.["3sg"];
    if (form3sg) return form3sg;
    // Default: add -s/-es
    if (/(?:s|sh|ch|x|z)$/.test(lower)) return lower + "es";
    if (/[^aeiou]y$/.test(lower)) return lower.slice(0, -1) + "ies";
    return lower + "s";
  }
  // base form
  return lower;
}

// ── lemmatization (surface → lemma) ────────────────────────────────────────

