/**
 * @emsenn/language-logic — the constraint layer of language.
 *
 * Where topology asks "does this settle?", logic asks "is the settled thing
 * well-formed?". Grammaticality reads a settled parse and reports the hard
 * constraints it violates (forbidden heads, double determiners, stranded
 * prepositions, clauses with no root), separately from mere ambiguity.
 */
export { grammaticality } from "./grammaticality.mjs";

