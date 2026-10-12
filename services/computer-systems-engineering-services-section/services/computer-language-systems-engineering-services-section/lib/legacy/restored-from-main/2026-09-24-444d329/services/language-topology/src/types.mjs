// types.ts — the core vocabulary of language-parsing/syntaxis.
// Every span is offset-true: span.text === original[span.start:span.end].
// Every charge is a bilattice four-value; unmentioned cells default to ⊥.

// ── Spans ─────────────────────────────────────────────────────────────────────

/** A text span: a tier, its absolute byte offsets (null for synthesized rule-spans), and its text. */

/** Containment edge: child is nested inside parent in the tier hierarchy. */

/** Sequence edge: span follows prev in reading order within the same tier. */

/** The result of articulating a text: the 2-D base of containment + sequence edges. */

// ── Parse intermediate ────────────────────────────────────────────────────────

/** A word in a sentence, as seen during construal. */

/** A dependency arc proposal (before settling). */

/** A kernel cell entry: one (subject, predicate[, object]) triple with its initial charge. */

/** A specialization edge on predicates: source ⊢ target (charges propagate upward). */

/** A question posed about a word: what predicate is being asked, on what surface text. */

/** Intermediate result of construing a sentence. */

// ── Descent ───────────────────────────────────────────────────────────────────

/** The settled descent API: read charges by address. Unmentioned cells return ⊥. */

// ── Parse output ──────────────────────────────────────────────────────────────

// Entity-linking and reference outputs (KnowledgeBaseEntity, LinkResult,
// ReferenceResolution, ReferenceResult) moved to @emsenn/language-analysis.

// GrammaticalityViolation / GrammaticalityResult moved to @emsenn/language-logic.

// ── Language bundle types ─────────────────────────────────────────────────────
// The fiber signature lives in @emsenn/language-algebra (the generators a
// language is parameterized by). Re-exported here so the engine's internal and
// external consumers can still reach it through the topology surface.

