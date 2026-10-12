// index.ts — public API surface for @emsenn/language-topology.
// Core pipeline: articulate → construe → descend → parse → render.
// Language-specific data lives entirely in CompiledBundle; all entry points require one.

// ── Types ─────────────────────────────────────────────────────────────────────

// The fiber compiler `load` lives in @emsenn/language-algebra; the codec
// surface re-binds it in @emsenn/language-codecs. The engine here consumes a
// CompiledBundle but does not own its construction.

// ── Charge helpers ────────────────────────────────────────────────────────────
export {
  BOTTOM, TRUE, FALSE, TOP,
  violation, compliant, bottom,
  status,
  joinKnowledge, meetKnowledge, negate, conflate,
  isTop, isBottom,
} from "./charge.mjs";

// ── Articulation ──────────────────────────────────────────────────────────────
export { articulate, span, ruleSpan, tokenize } from "./articulating.mjs";

// ── Per-token analysis ────────────────────────────────────────────────────────
export { tag } from "./tagging.mjs";
export { features } from "./featuring.mjs";
// morphology (conjugate/pluralize/indefiniteArticle/lemma) lives in
// @emsenn/language-algebra — import it from there directly.

// ── Core parse pipeline ───────────────────────────────────────────────────────
export { relate } from "./relating.mjs";

export { charge } from "./charging.mjs";

export { descend } from "./descending.mjs";
export { construe, wordsInSentence } from "./construing.mjs";
export { fold } from "./folding.mjs";

export { parse } from "./parsing.mjs";

// ── Cohomology ────────────────────────────────────────────────────────────────
// The obstruction to gluing local parses into one global settlement (H⁰/H¹).
export { cohomology } from "./cohomology.mjs";

// Layers that read a settled parse now live in their own packages:
//   render → @emsenn/language-codecs        (structure → surface)
//   semantics (roles, polarity, scope, tense, presupposition, logical form),
//   entity linking & reference → @emsenn/language-analysis
//   similarity → @emsenn/language-geometry
//   grammaticality → @emsenn/language-logic
