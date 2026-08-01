// derivePunctuatedName — a Three Dots and a Dash name -> the RMN term it denotes.
//
// The firm's naming law: an address IS a typed RMN term; a punctuated-name
// string is only a boundary codec for it. This implements the paper's
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

  let term = Object.freeze(["mark", first.atom]);
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
    term = Object.freeze([
      "pair",
      term,
      Object.freeze(["pair", Object.freeze(["mark", relation]), Object.freeze(["mark", after.atom])]),
    ]);
    i = after.next;
  }

  return term;
}
