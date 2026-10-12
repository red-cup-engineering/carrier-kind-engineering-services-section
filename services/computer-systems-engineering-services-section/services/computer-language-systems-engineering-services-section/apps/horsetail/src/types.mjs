// types.mjs — the Horsetail AST: the Form vocabulary that the reader produces and the evaluator consumes.
// All variants are discriminated by a `kind` field.
// No runtime dependency.

/** A symbol reference: a name that resolves to a value via lexical scope. */

/** A point literal — self-evaluating: t [T,F], f [F,T], ⊥ [F,F], ⊤ [T,T]. */

/** A cell (parenthesized list): `(head arg…)` or `()`. */

/** A numeric literal — self-evaluating. */

/** A string literal — self-evaluating. */

/** Any syntactic form. Every variant has a `kind` discriminant for exhaustive narrowing. */

// ── constructors ──────────────────────────────────────────────────────────────

export const sym = (name) => ({ kind: "sym", name });
export const pointLit = (value) => ({ kind: "point-lit", value });
export const cell = (items) => ({ kind: "cell", items });
export const num = (value) => ({ kind: "num", value });
export const str = (value) => ({ kind: "str", value });
