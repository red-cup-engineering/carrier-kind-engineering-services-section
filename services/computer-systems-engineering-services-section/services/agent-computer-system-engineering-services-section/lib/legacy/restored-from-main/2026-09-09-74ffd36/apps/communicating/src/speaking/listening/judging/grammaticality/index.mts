/**
 * @red-cup-engineering/communicating/speaking/listening/judging/grammaticality — the constraint layer of language.
 *
 * Where parsing asks "does this settle?", grammaticality asks "is the settled
 * thing well-formed?". Grammaticality reads a settled parse and reports the hard
 * constraints it violates (forbidden heads, double determiners, stranded
 * prepositions, clauses with no root), separately from mere ambiguity.
 */
export { grammaticality } from "@lenticule-science/communicating/speaking/listening/judging/grammaticality";
export type { GrammaticalityResult, GrammaticalityViolation } from "@lenticule-science/communicating/speaking/listening/judging/grammaticality";
