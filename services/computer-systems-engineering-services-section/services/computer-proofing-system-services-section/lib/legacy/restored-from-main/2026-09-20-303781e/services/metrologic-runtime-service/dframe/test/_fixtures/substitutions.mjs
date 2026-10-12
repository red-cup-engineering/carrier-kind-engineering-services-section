// substitutions.mjs — structural substitution fixtures over the FOUR-value alphabet.
//
// Five substitutions named by structural role. Each is primitive (some power of its matrix is
// strictly positive) and chosen to give coverage across: alphabet size (2–4 letters), matrix
// rank (full or collapsed), and orbit type under the d-frame gauge (exchange-mixed, self-dual,
// mixed). NO famous sequence names — the mathematical properties of these substitutions are
// computed by the tested code from these rules, not looked up from external corpora.
//
// The matrix M is DERIVED (abelianize), never injected — every test that needs a matrix gets it
// from here and trusts that `abelianize` is correct (which is separately verified by abelianize.test.mjs).

import { abelianize } from "@lenticule-science/metrologic/verdier/substitution";
import * as Z from "@lenticule-science/metrologic/number/integer";

// abelianize now yields a matrix of OUR integers; the fixtures expose M as a host-integer matrix (the
// boundary read every consumer here works in) by reading each entry back through Z.toInt.
const toInts = (M) => M.map((row) => row.map(Z.toInt));

const SPECS = {
  // 2-letter {t,f}: primitive, unimodular (det=1). Exchange-mixed orbit under negation.
  "two-a": { alphabet: ["t", "f"], rule: { t: ["t", "t", "f"], f: ["t", "f"] } },
  // 2-letter {t,f}: primitive, SINGULAR (det=0, rank=1). Exchange-mixed orbit.
  // Chosen to exercise the cohomology rank-collapse (Ab rank < letter count).
  "two-b": { alphabet: ["t", "f"], rule: { t: ["t", "f"], f: ["t", "f"] } },
  // 2-letter {top,bot}: primitive, unimodular (det=-1). Self-dual orbit (all firings are ⊤ or ⊥).
  // The only fixture whose orbit is self-dual under the composed duality.
  "two-sym": { alphabet: ["top", "bot"], rule: { top: ["top", "bot"], bot: ["top"] } },
  // 3-letter {t,f,top}: primitive, unimodular (det=1). Mixed orbit (truth + falsity + ⊤ firings).
  "three": { alphabet: ["t", "f", "top"], rule: { t: ["t", "t", "f"], f: ["t", "f", "top"], top: ["t"] } },
  // 4-letter {bot,t,f,top}: primitive, unimodular (det=-1). Mixed orbit (all four values present).
  // "top" is prolongable (top → [top,...]) for the closure-ordinal measurement.
  "four": { alphabet: ["bot", "t", "f", "top"], rule: { bot: ["t", "top"], t: ["bot", "f", "top"], f: ["t", "f"], top: ["top", "bot", "t", "f"] } },
};

export const EXAMPLES = Object.fromEntries(
  Object.entries(SPECS).map(([name, s]) => [name, { ...s, M: toInts(abelianize(s.rule, s.alphabet)) }]),
);

export const NAMES = Object.keys(EXAMPLES);

export const M = (name) => {
  const e = EXAMPLES[name];
  if (!e) throw new RangeError(`unknown substitution fixture: ${name}`);
  return e.M;
};
export const ALPHABET = (name) => EXAMPLES[name].alphabet;
export const RULE = (name) => EXAMPLES[name].rule;
