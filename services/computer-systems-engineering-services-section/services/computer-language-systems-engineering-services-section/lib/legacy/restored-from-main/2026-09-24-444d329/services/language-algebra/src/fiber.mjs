// fiber.ts — the signature of a language as an algebraic fiber.
//
// A language bundle is the *generating data* of a language's algebra: its
// closed-class lexicon, its morphological rules, its pronoun/reference table,
// its attachment and segmentation parameters. The engine settles a sentence by
// running over this signature; generation runs the same signature backwards.
// Because it is pure data + lookup signatures (no structural/parse types), the
// fiber lives at the algebraic foundation, upstream of topology.

/** Compiled language bundle: raw data resolved into fast lookup functions. */

