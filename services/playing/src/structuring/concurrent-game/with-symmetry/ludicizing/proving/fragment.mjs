/**
 * The linear-logic fragment lattice — the poset of $*$-autonomous sub-theories
 * of $\mathbf{CGS}$.
 *
 * Corpus theorem (predication-typed-subtheory-lattice-is-linear-logic-fragment-lattice.md):
 *
 *   $$\mathrm{MLL} \subset \mathrm{MALL} \subset \{\mathrm{ILL}, \mathrm{CLL}\} \subset \mathrm{LL}$$
 *
 * "This lattice is fully classified. Each inclusion is a full $*$-autonomous
 * embedding." The braces are load-bearing: **ILL and CLL are incomparable** —
 * neither $\mathrm{ILL} \le \mathrm{CLL}$ nor $\mathrm{CLL} \le \mathrm{ILL}$.
 * This poset is therefore NOT a chain. We carry the covering relation explicitly
 * and close it reflexively/transitively.
 *
 * Classifying which fragment a proposition lives in: the `Proposition` carrier of
 * this package is CLASSICAL (it has $\parr$ and an involutive `dualProp`), so the
 * connective-subset classifier ranges over the classical chain
 * $\mathrm{MLL} \to \mathrm{MALL} \to \mathrm{CLL} \to \mathrm{LL}$ (the corpus's
 * `⊂` is $*$-autonomous embedding, not connective containment — MLL has $\parr$,
 * which ILL lacks, so MLL ⊄ ILL as connective sets). ILL is represented in the
 * poset for completeness as the intuitionistic sibling (no $\parr$, no $?$) and
 * is documented as not a target of the classical classifier.
 */
import { connectivesOf } from "./proposition.mjs";

const fragments = Object.freeze({
  MLL: Object.freeze({ kind: "game.logic.fragment", name: "MLL" }),
  MALL: Object.freeze({ kind: "game.logic.fragment", name: "MALL" }),
  ILL: Object.freeze({ kind: "game.logic.fragment", name: "ILL" }),
  CLL: Object.freeze({ kind: "game.logic.fragment", name: "CLL" }),
  LL: Object.freeze({ kind: "game.logic.fragment", name: "LL" }),
});

export const fragment = (name) => fragments[name];
export const fragmentNames = () =>
  Object.freeze(["MLL", "MALL", "ILL", "CLL", "LL"]);
export const allFragments = () => fragmentNames().map(fragment);

/**
 * The covering (Hasse) edges of the fragment poset: MLL ⋖ MALL, MALL ⋖ ILL,
 * MALL ⋖ CLL, ILL ⋖ LL, CLL ⋖ LL. Crucially there is NO edge between ILL and
 * CLL in either direction — they are the two incomparable middle nodes.
 */
const coverings = Object.freeze([
  Object.freeze(["MLL", "MALL"]),
  Object.freeze(["MALL", "ILL"]),
  Object.freeze(["MALL", "CLL"]),
  Object.freeze(["ILL", "LL"]),
  Object.freeze(["CLL", "LL"]),
]);

export const fragmentCoverings = () => coverings;

/**
 * The fragment lattice as an explicit finite poset carrier: the five fragment
 * elements together with the covering (Hasse) edges of the embedding order. The
 * full $\le$ is recovered by `fragmentLeq` (reflexive-transitive closure); the
 * carrier records exactly the corpus poset MLL ⋖ MALL ⋖ {ILL, CLL} ⋖ LL with
 * ILL and CLL incomparable.
 */

export function fragmentPoset() {
  return Object.freeze({
    kind: "game.logic.fragmentPoset",
    elements: Object.freeze(allFragments()),
    coverings,
  });
}

export function isFragmentPoset(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.logic.fragmentPoset" && Array.isArray(candidate.elements) && Array.isArray(candidate.coverings);
}

/**
 * The reflexive-transitive closure of the covering relation: `fragmentLeq(a, b)`
 * holds iff $a$ embeds (as a $*$-autonomous sub-theory) into $b$. Computed by
 * reachability over `coverings`, so the incomparability of ILL and CLL is exact.
 */
export function fragmentLeq(lower, upper) {
  if (lower === upper) return true;
  const reached = [lower];
  for (let index = 0; index < reached.length; index += 1) {
    const at = reached[index];
    for (const [from, to] of coverings) {
      if (from === at && !reached.includes(to)) {
        if (to === upper) return true;
        reached.push(to);
      }
    }
  }
  return false;
}

/** Whether two fragments are comparable in the poset (one embeds into the other). */
export const fragmentsComparable = (left, right) =>
  fragmentLeq(left, right) || fragmentLeq(right, left);

/**
 * The connectives admitted by each fragment of the CLASSICAL chain. Atoms and
 * the multiplicatives live in MLL; the additives are added at MALL; the
 * exponentials at CLL; LL admits everything. (ILL is intentionally absent — it is
 * the intuitionistic sibling without $\parr$/$?$, not a node of this classifier.)
 */
function admittedConnectives(name) {
  // Shifts (↑/↓) are the Andreoli polarity-change operators of the focused/polarized
  // presentation; they manage phase boundaries throughout the hierarchy, so they are
  // admitted from MLL up (carried with the multiplicative core, not a separate tier).
  const multiplicatives = ["atom", "tensor", "par", "one", "bottom", "up", "down"];
  const additives = ["with", "plus", "top", "zero"];
  const exponentials = ["ofCourse", "whyNot"];
  switch (name) {
    case "MLL":
      return Object.freeze([...multiplicatives]);
    case "MALL":
      return Object.freeze([...multiplicatives, ...additives]);
    case "CLL":
    case "LL":
      return Object.freeze([...multiplicatives, ...additives, ...exponentials]);
    case "ILL":
      return null;
  }
}

/**
 * Witness/obstruction that proposition $p$ lives in fragment $F$: $p$ is in $F$
 * iff every connective it uses is admitted by $F$. ILL is never a target (it is
 * not on the classical chain this carrier inhabits); asking for it yields an
 * obstruction naming the reason.
 */
export function inFragment(p, name) {
  const used = connectivesOf(p);
  const admitted = admittedConnectives(name);
  if (admitted === null) {
    return Object.freeze({
      kind: "game.logic.inFragment-obstruction",
      proposition: p,
      fragment: fragment(name),
      used,
      forbidden: used,
      reason: "ILL is the intuitionistic sibling (no par, no why-not); classical propositions are classified on the MLL<MALL<CLL<LL chain",
    });
  }
  const forbidden = Object.freeze(used.filter((connective) => !admitted.includes(connective)));
  return forbidden.length === 0
    ? Object.freeze({
      kind: "game.logic.inFragment:witness",
      proposition: p,
      fragment: fragment(name),
      used,
    })
    : Object.freeze({
      kind: "game.logic.inFragment-obstruction",
      proposition: p,
      fragment: fragment(name),
      used,
      forbidden,
      reason: `proposition uses connectives not admitted by ${name}: ${forbidden.join(", ")}`,
    });
}

export const isInFragment = (p, name) =>
  inFragment(p, name).kind === "game.logic.inFragment:witness";

/**
 * The least fragment of the classical chain containing $p$ — the tightest
 * $*$-autonomous sub-theory it inhabits. Returns the first of MLL, MALL, CLL, LL
 * (in embedding order) that admits every connective of $p$.
 */
export function classifyFragment(p) {
  const chain = ["MLL", "MALL", "CLL", "LL"];
  for (const name of chain) {
    if (isInFragment(p, name)) return fragment(name);
  }
  return fragment("LL");
}

export function isFragment(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.logic.fragment" && fragmentNames().includes(candidate.name);
}
