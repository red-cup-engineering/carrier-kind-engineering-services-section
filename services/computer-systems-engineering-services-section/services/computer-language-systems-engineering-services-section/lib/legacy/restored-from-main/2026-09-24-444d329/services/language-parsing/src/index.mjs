// index.ts — public API surface for @561-group/language-topology.
// Core pipeline: articulate → construe → descend → parse → render.
// Language-specific data lives entirely in CompiledBundle; all entry points require one.

// ── Types ─────────────────────────────────────────────────────────────────────

// ── Bundle ────────────────────────────────────────────────────────────────────
export { load } from "./bundle.mjs";

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
export { lemma } from "./lemmatizing.mjs";
export { conjugate, pluralize, indefiniteArticle } from "./inflecting.mjs";

// ── Core parse pipeline ───────────────────────────────────────────────────────
export { relate } from "./relating.mjs";

export { charge } from "./charging.mjs";

export { descend } from "./descending.mjs";
export { construe, wordsInSentence } from "./construing.mjs";
export { fold } from "./folding.mjs";

export { parse } from "./parsing.mjs";

// ── Rendering ─────────────────────────────────────────────────────────────────
export { default as render, renderArcs } from "./rendering.mjs";

// ── Semantics ─────────────────────────────────────────────────────────────────
export {
  roles, polarity, scope, temporal, presuppositions, logicalForm,
} from "./semantics/index.mjs";

// ── Higher analysis ──────────────────────────────────────────────────────────
export { DEFAULT_KB, lookup, linkEntity, link } from "./linking.mjs";
export { resolveReferences, refer } from "./referring.mjs";
export {
  hypernymGraph, synonymSets, hypernyms, synonymsOf,
  resolveToGraphWord, commonAncestor, similarity,
} from "./similarity.mjs";
export { cohomology } from "./cohomology.mjs";
export { grammaticality } from "./grammaticality.mjs";
