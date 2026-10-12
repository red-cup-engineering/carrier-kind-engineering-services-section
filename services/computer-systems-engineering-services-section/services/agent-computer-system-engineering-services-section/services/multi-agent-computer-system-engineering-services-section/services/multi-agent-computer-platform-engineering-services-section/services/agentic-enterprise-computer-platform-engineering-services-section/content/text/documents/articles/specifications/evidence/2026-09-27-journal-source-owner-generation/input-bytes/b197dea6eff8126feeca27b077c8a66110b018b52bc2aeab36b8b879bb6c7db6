/**
 * @packageDocumentation
 *
 * Plain documentation module for the Semiotic Expression Notation term and type
 * grammar. Transcribed from metroplat's `src/lib/language/ast/types.mts`,
 * which carried only TypeScript type aliases (no runtime code) — this file
 * carries the same shapes as JSDoc typedefs so tooling and readers still
 * have one place the grammar's shape is written down, even in plain JS.
 *
 * Seven types: base, arrow, prod, unit, list, empty, sum.
 * Fifteen term forms: var, lam, app, pair, fst, snd, star, mark, coincide,
 * cond, fold, inl, inr, case, abort.
 */

/**
 * @typedef {"specialization" | "converse" | "subjectProjection" | "objectProjection"} GeneratorName
 * The four relational generators, each encoded as a distinguished `mark`.
 */

/**
 * @typedef {"unknown" | "held" | "denied" | "contested"} ReadingName
 * The four plain-English charges (Belnap FOUR / Obsmetrologia's
 * `Articulating.Corner`), each encoded as a canonical `four`. `bool` is
 * derived from the truth-axis pair (`held`/`denied`), not the reverse.
 */

/**
 * @typedef {["base"]
 *   | ["arrow", Ty, Ty]
 *   | ["prod", Ty, Ty]
 *   | ["unit"]
 *   | ["list", Ty]
 *   | ["empty"]
 *   | ["sum", Ty, Ty]} Ty
 * The seven-form type grammar (simply-typed lambda calculus with products,
 * unit, lists, empty, and sums).
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
 *   | ["fold", Tm, Tm, Tm]
 *   | ["inl", Tm, Ty]
 *   | ["inr", Ty, Tm]
 *   | ["case", Tm, Tm, Tm]
 *   | ["abort", Tm, Ty]} Tm
 * The fifteen-form term grammar, de-Bruijn indexed, frozen-array JSON
 * s-expressions.
 */

export {};
