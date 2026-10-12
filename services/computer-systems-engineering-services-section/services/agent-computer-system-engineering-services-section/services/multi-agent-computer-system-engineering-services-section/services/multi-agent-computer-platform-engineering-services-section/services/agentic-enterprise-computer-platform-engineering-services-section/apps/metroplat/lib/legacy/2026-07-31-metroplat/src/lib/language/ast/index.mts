/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/core/language/ast` is the grammar of Relation Model Notation.
 *
 * Types (Ty) and terms (Tm) as frozen-array JSON s-expressions, the recursive
 * JSON-Schema literals that admit those arrays, and the structural de-Bruijn
 * operations (rename, subst, inst). This is what RMN notation is: no
 * evaluation, no JSON bridge, no pre-built programs.
 *
 *
 * Product reading: this is the authored syntax and admission layer for
 * behavior-as-data. Use it when a morphism body needs to be a portable term
 * rather than a JavaScript closure. Validate syntax with `TySchema`/`TmSchema`,
 * manipulate open terms with `rename`/`subst`/`inst`, use
 * `@red-cup-engineering/metroplat/language` to reduce or type-check those terms, and use
 * `@red-cup-engineering/metroplat/core/language/projecting` to cross the JSON value boundary.
 */
import { type ChargeValueName } from "../../values/index.mts";
import type { GeneratorName, Tm, Ty } from "./types.mts";

export { TmSchema, TySchema } from "./schema.mts";
export { isTerm } from "./validator.mts";
export type { GeneratorName, Tm, Ty } from "./types.mts";

// ── type exports ──────────────────────────────────────────────────────────────

export type { ChargeValueName };

/** Constructors for the finite RMN type grammar. */
export const ty = {
  base: (): Ty => Object.freeze(["base"] as const),
  arrow: (domain: Ty, codomain: Ty): Ty => Object.freeze(["arrow", domain, codomain] as const),
  prod: (left: Ty, right: Ty): Ty => Object.freeze(["prod", left, right] as const),
  unit: (): Ty => Object.freeze(["unit"] as const),
  list: (element: Ty): Ty => Object.freeze(["list", element] as const),
} as const;

const generatorNames: readonly GeneratorName[] =
  ["specialization", "converse", "subjectProjection", "objectProjection"];

/** Recognize a generator-encoded mark and recover its name, the inverse of `tm.generator`. */
export function generatorNameOfTerm(term: Tm): GeneratorName | undefined {
  return term[0] === "mark" && (generatorNames as readonly string[]).includes(term[1])
    ? (term[1] as GeneratorName)
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
 * `core/calculus/predicating/positing/bilattice-charge.mts`'s `chargeCoordinatesByName`,
 * which assigns the same four bit-pairs to a ROTATED set of names (its join/meet/negate
 * *formulas* still match Lean's; only its name↔bits table is off). Do not port that
 * table here.
 */
const chargeBits: { readonly [name in ChargeValueName]: readonly [truth: boolean, falsity: boolean] } = {
  unknown: [false, false],
  held: [true, false],
  denied: [false, true],
  contested: [true, true],
};
const chargeNames = Object.keys(chargeBits) as readonly ChargeValueName[];

const nameOfBits = (truth: boolean, falsity: boolean): ChargeValueName =>
  chargeNames.find((name) => chargeBits[name][0] === truth && chargeBits[name][1] === falsity) as ChargeValueName;

/** Recognize a charge-encoded mark and recover its name, the inverse of `tm.charge`. */
export function chargeNameOfTerm(term: Tm): ChargeValueName | undefined {
  return term[0] === "mark" && (chargeNames as readonly string[]).includes(term[1])
    ? (term[1] as ChargeValueName)
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
function chargeCase(subject: Tm, branch: (name: ChargeValueName) => Tm): Tm {
  function go(remaining: readonly ChargeValueName[]): Tm {
    const [name, ...rest] = remaining;
    if (name === undefined) throw new TypeError("chargeCase: no charge names to dispatch over");
    if (rest.length === 0) return branch(name);
    return tm.cond(tm.coincide(subject, tm.charge(name)), branch(name), go(rest));
  }
  return go(chargeNames);
}

/** Recognize a boolean-charge mark (`held` = true, `denied` = false — Lean's `tTop`/`tBot`). */
export function boolOfTerm(term: Tm): boolean | undefined {
  const name = chargeNameOfTerm(term);
  if (name === "held") return true;
  if (name === "denied") return false;
  return undefined;
}

export const tm = {
  var: (index: number): Tm => {
    if (!Number.isInteger(index) || index < 0) throw new TypeError(`tm.var: de-Bruijn index must be a natural number: ${index}`);
    return Object.freeze(["var", index] as const);
  },
  lam: (body: Tm): Tm => Object.freeze(["lam", body] as const),
  app: (fn: Tm, arg: Tm): Tm => Object.freeze(["app", fn, arg] as const),
  pair: (left: Tm, right: Tm): Tm => Object.freeze(["pair", left, right] as const),
  fst: (value: Tm): Tm => Object.freeze(["fst", value] as const),
  snd: (value: Tm): Tm => Object.freeze(["snd", value] as const),
  star: (): Tm => Object.freeze(["star"] as const),
  mark: (surface: string): Tm => Object.freeze(["mark", surface] as const),
  /** A charge is one of four distinguished marks — Corner's own name, not a pair of bits. */
  charge: (name: ChargeValueName): Tm => tm.mark(name),
  /** `true`/`false` are the truth-axis charges: Lean's `Charge.tTop = active`, `tBot = stable`. */
  bool: (value: boolean): Tm => tm.charge(value ? "held" : "denied"),
  /**
   * `RelBool.fromCharge c := Charge.pos c` — the forgetful projection reading a charge's
   * positive/truth-bit slot, total over all four corners (unlike `boolOfTerm`, which only
   * recognizes the two charges already sitting on the truth axis). Lean keeps `truthAxis`
   * (`tm.bool`, embedding) and `fromCharge` (this, projecting) as two distinct operations —
   * a round-trip through the term layer deshrouding a plain boolean into its full charge is
   * not lossy in the direction that matters; `fromCharge` is how a caller who wants the
   * collapsed boolean view back gets it, explicitly, rather than the layer hiding the charge.
   */
  fromCharge: (value: Tm): Tm => chargeCase(value, (name) => tm.bool(chargeBits[name][0])),
  /** One of the four predication-site generator morphisms (converse/subjectProjection/
   *  objectProjection/specialization in `core/calculus/predicating/predication.mts`) — a bare
   *  distinguishable atom with no algebra defined over it in this grammar, so a mark. */
  generator: (name: GeneratorName): Tm => tm.mark(name),
  /** Knowledge/truth order swap: `ofSlots a.neg a.pos` in `Charge.negate`, dispatched by mark. */
  negate: (value: Tm): Tm => chargeCase(value, (name) => {
    const [truth, falsity] = chargeBits[name];
    return tm.charge(nameOfBits(falsity, truth));
  }),
  /** Swap and complement: `Charge.conflate`'s `ofSlots ¬a.neg ¬a.pos`. */
  conflate: (value: Tm): Tm => chargeCase(value, (name) => {
    const [truth, falsity] = chargeBits[name];
    return tm.charge(nameOfBits(!falsity, !truth));
  }),
  /** Complement only (negate ∘ conflate): `ofSlots ¬a.pos ¬a.neg`. */
  negConf: (value: Tm): Tm => chargeCase(value, (name) => {
    const [truth, falsity] = chargeBits[name];
    return tm.charge(nameOfBits(!truth, !falsity));
  }),
  /** Knowledge join: componentwise OR — `Charge.joinK`. */
  joinK: (left: Tm, right: Tm): Tm => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt || rt, lf || rf));
  })),
  /** Knowledge meet: componentwise AND — `Charge.meetK`. */
  meetK: (left: Tm, right: Tm): Tm => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt && rt, lf && rf));
  })),
  /** Truth join: truth side OR, falsity side AND — `Charge.joinT`. */
  joinT: (left: Tm, right: Tm): Tm => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt || rt, lf && rf));
  })),
  /** Truth meet: truth side AND, falsity side OR — `Charge.meetT`. */
  meetT: (left: Tm, right: Tm): Tm => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.charge(nameOfBits(lt && rt, lf || rf));
  })),
  /** Knowledge order `left ≤_k right` — `Charge.leK`. */
  leK: (left: Tm, right: Tm): Tm => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.bool((!lt || rt) && (!lf || rf));
  })),
  /** Truth order `left ≤_t right` — `Charge.leT`. */
  leT: (left: Tm, right: Tm): Tm => chargeCase(left, (ln) => chargeCase(right, (rn) => {
    const [lt, lf] = chargeBits[ln]; const [rt, rf] = chargeBits[rn];
    return tm.bool((!lt || rt) && (!rf || lf));
  })),
  /** `settleOverValue(chargeJoinVClosure(target), seed) = joinKnowledgeValue(target, seed)`
   *  (`core/closure/value-category.mts`'s `settleOverValue`/`chargeJoinVClosure`, unfolded) —
   *  exactly `joinK`, not a distinct operation. `joinK` is commutative, so argument order
   *  doesn't even matter here. */
  settle: (target: Tm, seed: Tm): Tm => tm.joinK(target, seed),
  /**
   * An assoc-list search over `fold` — the object's entries are `pair(mark(key), value)`
   * spine elements (`evaluators/projecting`'s object encoding); `coincide` compares keys,
   * `cond` picks. The tag string is `evaluators/projecting`'s `objectTag`, duplicated as a
   * literal here rather than imported: `core/language/index.mts` is upstream of `evaluators/`, so
   * it cannot depend on it. A missing key folds to `mark("null")`, not a stuck redex — the
   * one observable behavior change from the retired opcode, which stayed unreduced forever.
   */
  field: (key: string, object: Tm): Tm => tm.fold(
    tm.lam(tm.lam(tm.cond(
      tm.coincide(tm.fst(tm.var(0)), tm.mark(JSON.stringify(key))),
      tm.snd(tm.var(0)),
      tm.var(1),
    ))),
    tm.mark(JSON.stringify(null)),
    object,
  ),
  /** Prepend one element to an array term's spine — O(1), no `fold`: just a
   *  `pair` in front of the existing spine, reusing `array`'s OWN tag (`fst`)
   *  rather than a freshly hardcoded mark — the tag mark must be
   *  `canonical`-encoded to decode correctly as a final result (`arrayTerm`
   *  already encodes it that way), and reusing the input's is simpler and
   *  safer than re-deriving that encoding here.
   *
   *  This and `reverseArray` are the ONLY array-combination primitives this
   *  kernel has — there is no general two-arbitrary-list concatenation
   *  (`append`), because none exists in Obsmetrologia's proven math (checked:
   *  no `Cell`/`Valuation`/`Charge`/`Articulating` law anywhere concatenates
   *  two lists; the one hit for `++` in `Obsmetrologia/Language/` is inside
   *  tactic-automation code, not a proof) and no real evaluator use in this
   *  package needed it either — every site was either "collect one new
   *  element per `fold` step" (a `snoc`: `consArray(elem, acc)` inside the
   *  fold, `reverseArray` once at the end) or, where two independently-built
   *  lists genuinely must combine, `reverseArray(left)` once followed by a single fold consing each
   *  element onto `right` — i.e. `append(left, right)` IS expressible this
   *  way when actually needed, but as a call-site composition of these two
   *  primitives, not as its own kernel primitive with its own (unsound,
   *  dependent-length) `fold` shape. */
  consArray: (elem: Tm, array: Tm): Tm => tm.pair(tm.fst(array), tm.pair(elem, tm.snd(array))),
  /** Reverse an array term — the one real `fold` either of these needs. */
  reverseArray: (array: Tm): Tm => tm.pair(
    tm.fst(array),
    tm.fold(tm.lam(tm.lam(tm.pair(tm.var(0), tm.var(1)))), tm.star(), array),
  ),
  coincide: (left: Tm, right: Tm): Tm => Object.freeze(["coincide", left, right] as const),
  /** The `eq`/`cond` elementary pair (McCarthy): dispatch by comparing an opaque mark. */
  cond: (test: Tm, then: Tm, otherwise: Tm): Tm => Object.freeze(["cond", test, then, otherwise] as const),
  /** Left fold over an array-encoded list: `fold f init [x₀..xₙ] = f (… (f init x₀) …) xₙ`,
   *  with `f` a curried `λacc.λelem.…`. The one structural recursion (over `Articulating`). */
  fold: (combine: Tm, init: Tm, list: Tm): Tm => Object.freeze(["fold", combine, init, list] as const),
} as const;

// ── structural operations ─────────────────────────────────────────────────────

export function rename(rho: (index: number) => number, term: Tm): Tm {
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
  }
}

export function subst(sigma: (index: number) => Tm, term: Tm): Tm {
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
  }
}

export function inst(body: Tm, value: Tm): Tm {
  return subst((index) => index === 0 ? value : tm.var(index - 1), body);
}
