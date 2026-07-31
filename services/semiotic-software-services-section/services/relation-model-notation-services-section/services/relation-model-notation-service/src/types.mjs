/**
 * @packageDocumentation
 *
 * Plain documentation module for the Relation Model Notation term and type
 * grammar. Transcribed from metroplat's `src/lib/language/ast/types.mts`,
 * which carried only TypeScript type aliases (no runtime code) — this file
 * carries the same shapes as JSDoc typedefs so tooling and readers still
 * have one place the grammar's shape is written down, even in plain JS.
 *
 * Five types: base, arrow, prod, unit, list.
 * Eleven term forms: var, lam, app, pair, fst, snd, star, mark, coincide,
 * cond, fold.
 */

/**
 * @typedef {"specialization" | "converse" | "subjectProjection" | "objectProjection"} GeneratorName
 * The four relational generators, each encoded as a distinguished `mark`.
 */

/**
 * @typedef {"unknown" | "held" | "denied" | "contested"} ChargeValueName
 * The four plain-English charges (Belnap FOUR / Obsmetrologia's
 * `Articulating.Corner`), each encoded as a distinguished `mark`. `bool` is
 * derived from the truth-axis pair (`held`/`denied`), not the reverse.
 */

/**
 * @typedef {["base"]
 *   | ["arrow", Ty, Ty]
 *   | ["prod", Ty, Ty]
 *   | ["unit"]
 *   | ["list", Ty]} Ty
 * The five-form type grammar (simply-typed lambda calculus with products,
 * unit, and lists).
 */

/**
 * @typedef {["var", number]
 *   | ["lam", Tm]
 *   | ["app", Tm, Tm]
 *   | ["pair", Tm, Tm]
 *   | ["fst", Tm]
 *   | ["snd", Tm]
 *   | ["star"]
 *   | ["mark", string]
 *   | ["coincide", Tm, Tm]
 *   | ["cond", Tm, Tm, Tm]
 *   | ["fold", Tm, Tm, Tm]} Tm
 * The eleven-form term grammar, de-Bruijn indexed, frozen-array JSON
 * s-expressions.
 */

export {};
