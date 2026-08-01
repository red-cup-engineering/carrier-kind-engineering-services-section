/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relation-model-notation` is the grammar of Relation
 * Model Notation.
 *
 * Types (Ty) and terms (Tm) as frozen-array JSON s-expressions, the
 * recursive JSON-Schema literals that admit those arrays, and the
 * structural de-Bruijn operations (rename, subst, inst). This is what RMN
 * notation is: no evaluation, no JSON bridge, no pre-built programs.
 *
 * Transcribed from metroplat's `src/lib/language/ast/index.mts`, behavior
 * preserved exactly. Deliberately does NOT port
 * `bilattice-charge.mts`'s rotated name-to-bits table — the source's own
 * comment says not to; this file carries the corrected
 * `Obsmetrologia`-ground-truth table only.
 */

export { TmSchema, TySchema } from "./schema.mjs";
export { isTerm } from "./validator.mjs";

// ── type exports (documentation only — see types.mjs) ──────────────────────

// ── type constructors ───────────────────────────────────────────────────────

/** Constructors for the finite RMN type grammar. */
export const ty = {
  base: () => Object.freeze(["base"]),
  arrow: (domain, codomain) => Object.freeze(["arrow", domain, codomain]),
  prod: (left, right) => Object.freeze(["prod", left, right]),
  unit: () => Object.freeze(["unit"]),
  list: (element) => Object.freeze(["list", element]),
};

const generatorNames = ["specialization", "converse", "subjectProjection", "objectProjection"];

/** Recognize a generator-encoded mark and recover its name, the inverse of `tm.generator`. */
export function generatorNameOfTerm(term) {
  return term[0] === "mark" && generatorNames.includes(term[1])
    ? term[1]
    : undefined;
}

// ── term constructors ─────────────────────────────────────────────────────────

/**
 * Charge (Belnap FOUR) is `Articulating.Corner` in Lean — its own four-point object,
 * not built from two independent booleans (`RelBool` is the derived party: the
 * truth-axis embedding `b ↦ ofSlots(b, ¬b)` of a PRE-EXISTING `Charge`, per
 * `Obsmetrologia/Language/Positing/RelBool.lean`). Mirroring that direction here: charge
 * is four distinguished `mark`s (Corner has no more structure than four opaque atoms
 * do), and `bool` is derived as the two of those four marks that lie on the truth axis
 * — not the other way around.
 *
 * The (name, truth-bit, falsity-bit) table below is `Obsmetrologia/Articulation/
 * Articulating/Cell.lean`'s `Corner.ofStatus`/`toStatus` — confirmed ground truth over
 * metroplat's `bilattice-charge.mts`'s `chargeCoordinatesByName`, which assigns the
 * same four bit-pairs to a ROTATED set of names (its join/meet/negate *formulas*
 * still match Lean's; only its name↔bits table is off). Do not port that table here.
 */
const chargeBits = {
  unknown: [false, false],
  held: [true, false],
  denied: [false, true],
  contested: [true, true],
};
const chargeNames = Object.keys(chargeBits);

const nameOfBits = (truth, falsity) =>
  chargeNames.find((name) => chargeBits[name][0] === truth && chargeBits[name][1] === falsity);

/** Recognize a charge-encoded mark and recover its name, the inverse of `tm.charge`. */
export function chargeNameOfTerm(term) {
  return term[0] === "mark" && chargeNames.includes(term[1])
    ? term[1]
    : undefined;
}

/**
 * `bool`/`cond` are not primitives beyond `mark` either, but unlike the charge-lattice
 * ops they cannot be pure `lam`/`app` composition: `charge` is now an opaque atom (a
 * `mark`), and application only dispatches on a literal `lam`, never on which atom you
 * hold. `cond` is the LISP move — the `eq`/`cond` pair alongside `car`/`cdr`/`cons` in
 * McCarthy's seven elementary functions, not derivable from them. `coincide` (already
 * in this grammar) is this system's `eq`; `cond` stays a primitive reduction rule that
 * dispatches by comparing the (fully reduced) test against the two boolean marks.
 */
function chargeCase(subject, branch) {
  function go(remaining) {
    const [name, ...rest] = remaining;
    if (name === undefined) throw new TypeError("chargeCase: no charge names to dispatch over");
    if (rest.length === 0) return branch(name);
    return tm.cond(tm.coincide(subject, tm.charge(name)), branch(name), go(rest));
  }
  return go(chargeNames);
}

/** Recognize a boolean-charge mark (`held` = true, `denied` = false — Lean's `tTop`/`tBot`). */
export function boolOfTerm(term) {
  const name = chargeNameOfTerm(term);
  if (name === "held") return true;
  if (name === "denied") return false;
  return undefined;
}

export const tm = {
  var: (index) => {
    if (!Number.isInteger(index) || index < 0) throw new TypeError(`tm.var: de-Bruijn index must be a natural number: ${index}`);
    return Object.freeze(["var", index]);
  },
  lam: (body) => Object.freeze(["lam", body]),
  app: (fn, arg) => Object.freeze(["app", fn, arg]),
  pair: (left, right) => Object.freeze(["pair", left, right]),
  fst: (value) => Object.freeze(["fst", value]),
  snd: (value) => Object.freeze(["snd", value]),
  star: () => Object.freeze(["star"]),
  mark: (surface) => Object.freeze(["mark", surface]),
  /** A charge is one of four distinguished marks — Corner's own name, not a pair of bits. */
  charge: (name) => tm.mark(name),
  /** `true`/`false` are the truth-axis charges: Lean's `Charge.tTop = active`, `tBot = stable`. */
  bool: (value) => tm.charge(value ? "held" : "denied"),
  /**
   * `RelBool.fromCharge c := Charge.pos c` — the forgetful projection reading a charge's
   * positive/truth-bit slot, total over all four corners (unlike `boolOfTerm`, which only
   * recognizes the two charges already sitting on the truth axis). Lean keeps `truthAxis`
   * (`tm.bool`, embedding) and `fromCharge` (this, projecting) as two distinct operations —
   * a round-trip through the term layer deshrouding a plain boolean into its full charge is
   * not lossy in the direction that matters; `fromCharge` is how a caller who wants the
   * collapsed boolean view back gets it, explicitly, rather than the layer hiding the charge.
   */
  fromCharge: (value) => chargeCase(value, (name) => tm.bool(chargeBits[name][0])),
  /** One of the four predication-site generator morphisms (converse/subjectProjection/
   *  objectProjection/specialization) — a bare distinguishable atom with no algebra
   *  defined over it in this grammar, so a mark. */
  generator: (name) => tm.mark(name),
  /** Knowledge/truth order swap: `ofSlots a.neg a.pos` in `Charge.negate`, dispatched by mark. */
  negate: (value) => chargeCase(value, (name) => {
    const [truth, falsity] = chargeBits[name];
    return tm.charge(nameOfBits(falsity, truth));
  }),
  /** Swap and complement: `Charge.conflate`'s `ofSlots ¬a.neg ¬a.pos`. */
  conflate: (value) => chargeCase(value, (name) => {
    const [truth, falsity] = chargeBits[name];
    return tm.charge(nameOfBits(!falsity, !truth));
  }),
  /** Complement only (negate ∘ conflate): `ofSlots ¬a.pos ¬a.neg`. */
  negConf: (value) => chargeCase(value, (name) => {
    const [truth, falsity] = chargeBits[name];
    return tm.charge(nameOfBits(!truth, !falsity));
  }),
  /** Knowledge join: componentwise OR — `Charge.joinK`. */
  joinK: (left, right) => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt || rt, lf || rf));
  })),
  /** Knowledge meet: componentwise AND — `Charge.meetK`. */
  meetK: (left, right) => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt && rt, lf && rf));
  })),
  /** Truth join: truth side OR, falsity side AND — `Charge.joinT`. */
  joinT: (left, right) => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt || rt, lf && rf));
  })),
  /** Truth meet: truth side AND, falsity side OR — `Charge.meetT`. */
  meetT: (left, right) => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt && rt, lf || rf));
  })),
  /** Knowledge order `left ≤_k right` — `Charge.leK`. */
  leK: (left, right) => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.bool((!lt || rt) && (!lf || rf));
  })),
  /** Truth order `left ≤_t right` — `Charge.leT`. */
  leT: (left, right) => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.bool((!lt || rt) && (!rf || lf));
  })),
  /** `settleOverValue(chargeJoinVClosure(target), seed) = joinKnowledgeValue(target, seed)`,
   *  unfolded — exactly `joinK`, not a distinct operation. `joinK` is commutative, so
   *  argument order doesn't even matter here. */
  settle: (target, seed) => tm.joinK(target, seed),
  /**
   * An assoc-list search over `fold` — the object's entries are `pair(mark(key), value)`
   * spine elements; `coincide` compares keys, `cond` picks. A missing key folds to
   * `mark("null")`, not a stuck redex.
   */
  field: (key, object) => tm.fold(
    tm.lam(tm.lam(tm.cond(
      tm.coincide(tm.fst(tm.var(0)), tm.mark(JSON.stringify(key))),
      tm.snd(tm.var(0)),
      tm.var(1),
    ))),
    tm.mark(JSON.stringify(null)),
    object,
  ),
  /** Prepend one element to an array term's spine — O(1), no `fold`: just a `pair` in
   *  front of the existing spine, reusing `array`'s OWN tag (`fst`) rather than a
   *  freshly hardcoded mark. This and `reverseArray` are the two array-combination
   *  primitives this kernel has; `append` (below) is not a third — there is no general
   *  two-arbitrary-list concatenation law in Obsmetrologia's proven math for it to
   *  answer to, so it is only ever the call-site composition of these two. */
  consArray: (elem, array) => tm.pair(tm.fst(array), tm.pair(elem, tm.snd(array))),
  /** Reverse an array term — the one real `fold` either of these needs. */
  reverseArray: (array) => tm.pair(
    tm.fst(array),
    tm.fold(tm.lam(tm.lam(tm.pair(tm.var(0), tm.var(1)))), tm.star(), array),
  ),
  /**
   * Concatenate two array terms, `left` then `right` in order — not a third kernel
   * primitive with its own `fold` shape (metroplat's own kernel comment: no
   * `Cell`/`Valuation`/`Charge`/`Articulating` law anywhere concatenates two lists,
   * so there is nothing for a dedicated opcode to be sound against), but exactly the
   * call-site composition its comment prescribes: `reverseArray(left)` once, then a
   * single `fold` that `consArray`s each of its elements onto `right`. Reversed-left
   * yields left's elements last-to-first, so consing them onto `right` in that order
   * rebuilds left's original order in front of right; the result carries `right`'s
   * tag, since `right` is the accumulator being grown.
   */
  append: (left, right) => tm.fold(
    tm.lam(tm.lam(tm.consArray(tm.var(0), tm.var(1)))),
    right,
    tm.reverseArray(left),
  ),
  coincide: (left, right) => Object.freeze(["coincide", left, right]),
  /** The `eq`/`cond` elementary pair (McCarthy): dispatch by comparing an opaque mark. */
  cond: (test, then, otherwise) => Object.freeze(["cond", test, then, otherwise]),
  /** Left fold over an array-encoded list: `fold f init [x₀..xₙ] = f (… (f init x₀) …) xₙ`,
   *  with `f` a curried `λacc.λelem.…`. The one structural recursion. */
  fold: (combine, init, list) => Object.freeze(["fold", combine, init, list]),
};

// ── structural operations ─────────────────────────────────────────────────────

export function rename(rho, term) {
  switch (term[0]) {
    case "var": return tm.var(rho(term[1]));
    case "lam": return tm.lam(rename((index) => index === 0 ? 0 : rho(index - 1) + 1, term[1]));
    case "app": return tm.app(rename(rho, term[1]), rename(rho, term[2]));
    case "pair": return tm.pair(rename(rho, term[1]), rename(rho, term[2]));
    case "fst": return tm.fst(rename(rho, term[1]));
    case "snd": return tm.snd(rename(rho, term[1]));
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "coincide": return tm.coincide(rename(rho, term[1]), rename(rho, term[2]));
    case "cond": return tm.cond(rename(rho, term[1]), rename(rho, term[2]), rename(rho, term[3]));
    case "fold": return tm.fold(rename(rho, term[1]), rename(rho, term[2]), rename(rho, term[3]));
    default: throw new TypeError(`rename: not a term: ${JSON.stringify(term)}`);
  }
}

export function subst(sigma, term) {
  switch (term[0]) {
    case "var": return sigma(term[1]);
    case "lam": return tm.lam(subst((index) => index === 0 ? tm.var(0) : rename((n) => n + 1, sigma(index - 1)), term[1]));
    case "app": return tm.app(subst(sigma, term[1]), subst(sigma, term[2]));
    case "pair": return tm.pair(subst(sigma, term[1]), subst(sigma, term[2]));
    case "fst": return tm.fst(subst(sigma, term[1]));
    case "snd": return tm.snd(subst(sigma, term[1]));
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "coincide": return tm.coincide(subst(sigma, term[1]), subst(sigma, term[2]));
    case "cond": return tm.cond(subst(sigma, term[1]), subst(sigma, term[2]), subst(sigma, term[3]));
    case "fold": return tm.fold(subst(sigma, term[1]), subst(sigma, term[2]), subst(sigma, term[3]));
    default: throw new TypeError(`subst: not a term: ${JSON.stringify(term)}`);
  }
}

export function inst(body, value) {
  return subst((index) => index === 0 ? value : tm.var(index - 1), body);
}
