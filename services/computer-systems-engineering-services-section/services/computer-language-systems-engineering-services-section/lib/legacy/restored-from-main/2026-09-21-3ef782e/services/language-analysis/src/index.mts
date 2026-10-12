/**
 * @emsenn/language-analysis — the analysis layer of language.
 *
 * What a settled parse *means*: semantic frames (roles, polarity, scope, tense,
 * presupposition, logical form) and discourse structure (entity linking,
 * reference resolution). Everything here reads topology's ParseResult and
 * produces measures and structures over it; it never re-settles the parse.
 */

// ── Semantics ─────────────────────────────────────────────────────────────────
export {
  roles, polarity, scope, temporal, presuppositions, logicalForm,
} from "./semantics/index.mjs";
export type {
  SemanticFrame,
  PolarityFrame,
  ScopeResult, Quantifier, ScopeReading,
  TemporalFrame, TenseValue, AspectValue, EvidentialValue,
  Presupposition, PresuppositionTrigger, TriggerKind,
  LogicalFormResult, LogicalFormReading, LogicalFormNode,
} from "./semantics/index.mjs";

// ── Discourse ─────────────────────────────────────────────────────────────────
export { DEFAULT_KB, lookup, linkEntity, link } from "./linking.mjs";
export { resolveReferences, refer } from "./referring.mjs";

// ── Output types ──────────────────────────────────────────────────────────────
export type {
  KnowledgeBaseEntity, LinkResult,
  ReferenceResolution, ReferenceResult,
} from "./types.mjs";
