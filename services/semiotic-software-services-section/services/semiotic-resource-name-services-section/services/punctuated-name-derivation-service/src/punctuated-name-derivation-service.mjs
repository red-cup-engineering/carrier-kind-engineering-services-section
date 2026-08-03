import { checkTy, inferTy } from "@red-cup-engineering/relation-model-notation-typing";

// derivePunctuatedName — a Three Dots and a Dash SRN surface -> the RMN term it denotes.
//
// The firm's naming law: SRN is a readable path surface which compiles to
// typed RMN claim material; it is not itself content identity. This implements the paper's
// grammar (2026-07-04-research-on-three-dots-and-a-dash-categorical-kind-
// namespacing.md) — Expr ::= Atom | Expr '.' Atom | Expr ':' Atom | Expr '-'
// Atom, '.'=generation, ':'=witness, '-'=obstruction, '_'=escape — by
// building the RMN (Relation Model Notation) Tm term the name denotes,
// rather than a bespoke step-list codomain. See README.md for the full
// account; the essential points:
//
//   bare atom A       -> ["mark", A]
//   E <mark> B (step) -> ["pair", termOf(E), ["pair", ["mark", relation], ["mark", B]]]
//
// where relation is "generation" | "witness" | "obstruction". Only `mark`
// and `pair` are used, so the mark alphabet stays the sole carrier of
// meaning; the relation mark and the atom mark sit at a fixed tree position
// (the inner pair's left and right child), so tree position — not string
// content — disambiguates a relation tag from an atom that happens to be
// spelled the same as one.
//
// Both constructors this function ever emits are already normal forms under
// this language's own reduction relation (eval/index.mts: step(mark) = []
// unconditionally, and step(pair) only produces a reduct when a child does)
// — so a term built purely from mark/pair has no redex anywhere, and is
// therefore its own unique, byte-identical normal form on every call. This
// makes derivePunctuatedName total and its output canonical by
// construction, not merely by convention.
//
// §8's escape hatch is checked first and unconditionally: a name containing
// '_' anywhere makes no categorical claim at all, regardless of what
// dot/colon/dash structure the rest of the string might otherwise have.
//
// One call this file has to make that the paper leaves informal: Atom's
// character class. §2 gives Σ only by example (plain lowercase identifiers)
// and never gives Atom a formal regular-expression definition. Since '.',
// ':', '-', and '_' are all already claimed by the convention itself, the
// only non-arbitrary reading is that Atom is a maximal run of ASCII
// alphanumerics — anything else outside those four marks is a grammar
// violation. This is also exactly what makes the paper's own worked example
// parse the way its prose says it does: "order.payment:receipt-delay" must
// split as (order.payment:receipt)-delay, never treating "receipt-delay" as
// one atom, which only holds if '-' can never occur inside an atom.

const ATOM_CHAR = /[A-Za-z0-9]/u;
const RELATION_OF_MARK = { ".": "generation", ":": "witness", "-": "obstruction" };
const MARK_OF_RELATION = { generation: ".", witness: ":", obstruction: "-" };

function readAtom(name, index) {
  let i = index;
  while (i < name.length && ATOM_CHAR.test(name[i])) i += 1;
  return i === index ? null : { atom: name.slice(index, i), next: i };
}

/**
 * @param {string} name
 * @returns {readonly unknown[] | {claim: "none"} | {ok: false, rule: string, position: number, message: string}}
 */
export function derivePunctuatedName(name) {
  if (typeof name !== "string") {
    return { ok: false, rule: "namestring", position: 0, message: "name must be a string" };
  }
  if (name.length === 0) {
    return { ok: false, rule: "Atom", position: 0, message: "name must not be empty" };
  }
  // §8: presence of '_' anywhere makes no categorical claim, unconditionally.
  if (name.includes("_")) {
    return { claim: "none" };
  }

  const first = readAtom(name, 0);
  if (first === null) {
    return { ok: false, rule: "Atom", position: 0, message: `expected an atom at position 0, found ${JSON.stringify(name[0])}` };
  }

  let term = ["mark", first.atom];
  let i = first.next;

  while (i < name.length) {
    const mark = name[i];
    const relation = RELATION_OF_MARK[mark];
    if (relation === undefined) {
      return { ok: false, rule: "Expr", position: i, message: `expected one of '.', ':', '-' at position ${i}, found ${JSON.stringify(mark)}` };
    }
    const after = readAtom(name, i + 1);
    if (after === null) {
      return { ok: false, rule: "Atom", position: i + 1, message: `expected an atom after '${mark}' at position ${i + 1}` };
    }
    term = ["pair",
      term,
      ["pair", ["mark", relation], ["mark", after.atom]],
    ];
    i = after.next;
  }

  return term;
}

/**
 * Infer and check the exact split RMN type induced by an SRN path term.
 * This is syntax-directed: marks inhabit `base`; pairs inhabit the product
 * of their two child types. It performs no type translation.
 */
export function inferSemioticResourceNameType(term) {
  const semanticType = inferTy([], term);
  if (semanticType === null || !checkTy([], term, semanticType)) {
    throw new TypeError("SRN path must be a closed, typed split RMN term");
  }
  return semanticType;
}

/** Canonical SRN spelling for code that names the boundary by its semantic role. */
export const readSemioticResourceName = derivePunctuatedName;

function isMarkTerm(term) {
  return Array.isArray(term)
    && term.length === 2
    && term[0] === "mark"
    && typeof term[1] === "string";
}

function isPairTerm(term) {
  return Array.isArray(term) && term.length === 3 && term[0] === "pair";
}

function renderAtom(term) {
  if (!isMarkTerm(term) || term[1].length === 0 || [...term[1]].some((character) => !ATOM_CHAR.test(character))) {
    throw new TypeError('SRN atom must be ["mark", nonempty ASCII alphanumeric string]');
  }
  return term[1];
}

/**
 * Render an RMN term in the Three Dots and a Dash path sublanguage back to its
 * unique SRN surface. General RMN terms and non-round-trippable atom marks are
 * refused instead of being given a lossy spelling.
 */
export function renderSemioticResourceName(term) {
  if (isMarkTerm(term)) return renderAtom(term);
  if (!isPairTerm(term) || !isPairTerm(term[2])) {
    throw new TypeError("term is not in the Three Dots and a Dash RMN path sublanguage");
  }

  const relationTerm = term[2][1];
  const atomTerm = term[2][2];
  if (!isMarkTerm(relationTerm)) {
    throw new TypeError("SRN relation slot must be an RMN mark");
  }
  const punctuation = MARK_OF_RELATION[relationTerm[1]];
  if (punctuation === undefined) {
    throw new TypeError(`unknown SRN relation ${JSON.stringify(relationTerm[1])}`);
  }

  return `${renderSemioticResourceName(term[1])}${punctuation}${renderAtom(atomTerm)}`;
}
