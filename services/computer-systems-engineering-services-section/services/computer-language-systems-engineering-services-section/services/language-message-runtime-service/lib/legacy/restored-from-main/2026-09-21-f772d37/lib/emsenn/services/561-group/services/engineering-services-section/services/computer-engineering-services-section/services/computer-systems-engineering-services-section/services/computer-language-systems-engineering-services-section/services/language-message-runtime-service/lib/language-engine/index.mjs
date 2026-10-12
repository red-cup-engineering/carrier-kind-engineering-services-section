// language-engine/index.mjs — barrel surface for the ported real pipeline:
// the shared, language-agnostic settlement engine every linguistics-services-
// section language die (latin-language-algebra, lakota-language-algebra, ...)
// imports by relative path. Every function below runs over whatever
// CompiledBundle a language's own src/bundle.mjs supplies — nothing in this
// directory is Latin-specific or Lakota-specific; the language particulars
// live entirely in each die's own bundle data (lexicon, morphology,
// attachment directions, wordOrder, roleBy). Originally ported into
// latin-language-algebra/src/engine/ (types stripped, logic unchanged) from
// the recovered @lenticule-science/language-topology, @lenticule-science/language-algebra, and
// @lenticule-science/language-analysis packages, then factored out here so a second
// language die could reuse it without re-porting. Mirrors
// @lenticule-science/language-topology's own index.mts export list (minus what neither
// recovered language package's own parity test ever invoked: generation,
// similarity, grammaticality, entity linking, discourse reference — see each
// die's README "what's still not ported" section).
export { load } from "./compile.mjs";
export { articulate, span, ruleSpan, tokenize } from "./articulating.mjs";
export { tag } from "./tagging.mjs";
export { features } from "./featuring.mjs";
export { relate } from "./relating.mjs";
export { charge } from "./charging.mjs";
export { descend } from "./descending.mjs";
export { construe, wordsInSentence } from "./construing.mjs";
export { fold } from "./folding.mjs";
export { parse } from "./parsing.mjs";
export { cohomology } from "./cohomology.mjs";
export { roles } from "./roles.mjs";
export {
  BOTTOM, TOP, TRUE, FALSE,
  bottom, top, potential, active, violation, compliant,
  isBottom, isTop, isViolation, isCompliant,
  status, chargeStatus,
  joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  negate, conflate,
} from "./charge.mjs";
// morphology.mjs was added 2026-07-23 for english-language-codecs's real
// recovered generation needs (conjugate/lemma from
// @lenticule-science/language-algebra's morphology.mts) — no parsing die's
// own recovered parity test ever called it, so it stayed unported until a
// real recovered generation package needed it. See
// services/english-language-codecs/README.md. polarity/temporal were
// vendored alongside it from the same recovered
// @lenticule-science/language-analysis semantics modules, but the
// communicating faculty already owns that capability (it settles the same
// parse and needs the same readings) — imported from there now instead of
// a second copy.
export { conjugate, pluralize, indefiniteArticle, lemma } from "./morphology.mjs";
export { polarity, temporal } from "@red-cup-engineering/communicating/speaking/listening/understanding";
