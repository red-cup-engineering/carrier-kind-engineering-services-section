/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation` is the grammar of Relation
 * Model Notation.
 *
 * Types (Ty) and terms (Tm) as frozen-array JSON s-expressions, the
 * recursive JSON-Schema literals that admit those arrays, and the
 * structural de-Bruijn operations (rename, subst, inst). This is what SEN
 * notation is: no evaluation, no JSON bridge, no pre-built programs.
 *
 * The four readings and every operation on them are FOUR's (the data layer's four).
 */

export { TmSchema, TySchema } from "./notation/schema.mjs";
export { isTerm } from "./notation/validator.mjs";
export { SEN_FORMS } from "./notation/forms.mjs";
import { SEN_FORMS, SEN_TYPE_FORMS } from "./notation/forms.mjs";
import { isReading, readingFamilies, sidesOfReading, conflateReading, knowledgeJoinReading, knowledgeLeqReading, knowledgeMeetReading, negateReading, truthJoinReading, truthLeqReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// ── type exports (documentation only — see types.mjs) ──────────────────────

// ── type constructors ───────────────────────────────────────────────────────

/** Constructors for the finite SEN type grammar. */
export const ty = {
  base: () => Object.freeze(["base"]),
  arrow: (domain, codomain) => Object.freeze(["arrow", domain, codomain]),
  prod: (left, right) => Object.freeze(["prod", left, right]),
  unit: () => Object.freeze(["unit"]),
  list: (element) => Object.freeze(["list", element]),
  empty: () => Object.freeze(["empty"]),
  sum: (left, right) => Object.freeze(["sum", left, right]),
};

const generatorNames = [
  "specialization",
  "converse",
  "subjectProjection",
  "objectProjection",
];

/** Recognize a generator-encoded mark and recover its name, the inverse of `tm.generator`. */
export function generatorNameOfTerm(term) {
  return term[0] === "mark" && generatorNames.includes(term[1])
    ? term[1]
    : undefined;
}

// ── term constructors ─────────────────────────────────────────────────────────

/**
 * A reading is one of the four points of FOUR, the evidence bilattice, carried as a
 * distinguished mark (type base) named in FOUR's extremal family (unknown, held,
 * denied, contested). The grammar owns only the marks and the `cond` dispatch over them;
 * every table (negation, conflation, joins, meets, orders) is FOUR's, looked up
 * when a term is built, so SEN and JavaScript compute one bilattice.
 */
const readingNames = readingFamilies.extremal;
const isReadingName = (value) => isReading(value, "extremal");

/** Recognize a reading — one of the four distinguished marks — and recover its name. */
export function readingOfTerm(term) {
  if (!Array.isArray(term) || term[0] !== "mark" || !isReadingName(term[1])) return undefined;
  return term[1];
}

/**
 * `cond` is the finite branch form. It reduces only on the two truth-axis
 * readings, so unknown and contested remain explicitly non-reduced predicates.
 */
function readingCase(subject, branch) {
  function go(remaining) {
    const [name, ...rest] = remaining;
    if (name === undefined)
      throw new TypeError("readingCase: no reading names to dispatch over");
    if (rest.length === 0) return branch(name);
    return tm.cond(
      tm.coincide(subject, tm.reading(name)),
      branch(name),
      go(rest),
    );
  }
  return go(readingNames);
}

/** Dispatch a binary operation over both operands' readings. */
const onReadings = (left, right, branch) => readingCase(left, (l) => readingCase(right, (r) => branch(l, r)));

/** Recognize a truth-axis reading (`held` = true, `denied` = false). */
export function boolOfTerm(term) {
  const name = readingOfTerm(term);
  if (name === "held") return true;
  if (name === "denied") return false;
  return undefined;
}

export const tm = {
  var: (index) => {
    if (!Number.isInteger(index) || index < 0)
      throw new TypeError(
        `tm.var: de-Bruijn index must be a natural number: ${index}`,
      );
    return Object.freeze(["var", index]);
  },
  lam: (body) => Object.freeze(["lam", body]),
  app: (fn, arg) => Object.freeze(["app", fn, arg]),
  pair: (left, right) => Object.freeze(["pair", left, right]),
  fst: (value) => Object.freeze(["fst", value]),
  snd: (value) => Object.freeze(["snd", value]),
  star: () => Object.freeze(["star"]),
  mark: (surface) => Object.freeze(["mark", surface]),
  /** Construct exactly one of the four readings: a distinguished mark, type base. */
  reading: (name) => {
    if (!isReadingName(name))
      throw new TypeError(`tm.reading: unknown reading ${String(name)}`);
    return Object.freeze(["mark", name]);
  },
  /** `true`/`false` are the truth-axis readings, held and denied. */
  bool: (value) => {
    if (typeof value !== "boolean")
      throw new TypeError(`tm.bool: expected boolean, got ${typeof value}`);
    return tm.reading(value ? "held" : "denied");
  },
  /** Whether a reading is told for: its for-side as a truth-axis boolean, total over all four
   *  readings (unlike `boolOfTerm`, which recognizes only held and denied). */
  toldFor: (value) => readingCase(value, (name) => tm.bool(sidesOfReading(name)[0])),
  /** One of the four predication-site generator morphisms (converse/subjectProjection/
   *  objectProjection/specialization) — a bare distinguishable atom with no algebra
   *  defined over it in this grammar, so a mark. */
  generator: (name) => tm.mark(name),
  /** Negation: FOUR's side swap. */
  negate: (value) => readingCase(value, (name) => tm.reading(negateReading(name))),
  /** Conflation: FOUR's complemented swap. */
  conflate: (value) => readingCase(value, (name) => tm.reading(conflateReading(name))),
  /** Complement only (negation after conflation). */
  negConf: (value) => readingCase(value, (name) => tm.reading(negateReading(conflateReading(name)))),
  joinK: (left, right) => onReadings(left, right, (l, r) => tm.reading(knowledgeJoinReading(l, r))),
  meetK: (left, right) => onReadings(left, right, (l, r) => tm.reading(knowledgeMeetReading(l, r))),
  joinT: (left, right) => onReadings(left, right, (l, r) => tm.reading(truthJoinReading(l, r))),
  meetT: (left, right) => onReadings(left, right, (l, r) => tm.reading(truthMeetReading(l, r))),
  leK: (left, right) => onReadings(left, right, (l, r) => tm.bool(knowledgeLeqReading(l, r))),
  leT: (left, right) => onReadings(left, right, (l, r) => tm.bool(truthLeqReading(l, r))),
  /**
   * An assoc-list search over `fold` — the object's entries are `pair(mark(key), value)`
   * spine elements; `coincide` compares keys, `cond` picks. A missing key folds to
   * `mark("null")`, not a stuck redex.
   */
  field: (key, object) =>
    tm.fold(
      tm.lam(
        tm.lam(
          tm.cond(
            tm.coincide(tm.fst(tm.var(0)), tm.mark(JSON.stringify(key))),
            tm.snd(tm.var(0)),
            tm.var(1),
          ),
        ),
      ),
      tm.mark(JSON.stringify(null)),
      object,
    ),
  /** Prepend one element to an array term's spine — O(1), no `fold`: just a `pair` in
   *  front of the existing spine, reusing `array`'s OWN tag (`fst`) rather than a
   *  freshly hardcoded mark. This and `reverseArray` are the two array-combination
   *  primitives this kernel has; `append` (below) is not a third — there is no general
   *  two-arbitrary-list concatenation law in Obsmetrologia's proven math for it to
   *  answer to, so it is only ever the call-site composition of these two. */
  consArray: (elem, array) =>
    tm.pair(tm.fst(array), tm.pair(elem, tm.snd(array))),
  /** Reverse an array term — the one real `fold` either of these needs. */
  reverseArray: (array) =>
    tm.pair(
      tm.fst(array),
      tm.fold(tm.lam(tm.lam(tm.pair(tm.var(0), tm.var(1)))), tm.star(), array),
    ),
  /**
   * Concatenate two array terms, `left` then `right` in order — not a third kernel
   * primitive with its own `fold` shape (metroplat's own kernel comment: no
   * `Cell`/`Valuation`/bilattice/`Articulating` law anywhere concatenates two lists,
   * so there is nothing for a dedicated opcode to be sound against), but exactly the
   * call-site composition its comment prescribes: `reverseArray(left)` once, then a
   * single `fold` that `consArray`s each of its elements onto `right`. Reversed-left
   * yields left's elements last-to-first, so consing them onto `right` in that order
   * rebuilds left's original order in front of right; the result carries `right`'s
   * tag, since `right` is the accumulator being grown.
   */
  append: (left, right) =>
    tm.fold(
      tm.lam(tm.lam(tm.consArray(tm.var(0), tm.var(1)))),
      right,
      tm.reverseArray(left),
    ),
  coincide: (left, right) => Object.freeze(["coincide", left, right]),
  /** The `eq`/`cond` elementary pair (McCarthy): dispatch by comparing an opaque mark. */
  cond: (test, then, otherwise) =>
    Object.freeze(["cond", test, then, otherwise]),
  /** Left fold over an array-encoded list: `fold f init [x₀..xₙ] = f (… (f init x₀) …) xₙ`,
   *  with `f` a curried `λacc.λelem.…`. The one structural recursion. */
  fold: (combine, init, list) => Object.freeze(["fold", combine, init, list]),
  /** A δ-rule: the named host primitive applied to `arg` (JSON in, JSON out) once `arg` is a value. */
  prim: (name, arg) => {
    if (typeof name !== "string" || name === "") throw new TypeError("tm.prim: a primitive needs a name");
    return Object.freeze(["prim", name, arg]);
  },
  /** Left injection into a finite sum; the right summand remains explicit. */
  inl: (value, rightType) => Object.freeze(["inl", value, rightType]),
  /** Right injection into a finite sum; the left summand remains explicit. */
  inr: (leftType, value) => Object.freeze(["inr", leftType, value]),
  /** Eliminate a sum. Each branch is under one de Bruijn binder for its injection value. */
  case: (subject, whenLeft, whenRight) => Object.freeze(["case", subject, whenLeft, whenRight]),
  /** Eliminate an impossible empty value into the explicit target type. */
  abort: (subject, targetType) => Object.freeze(["abort", subject, targetType]),
};

// ── canonical grammar traversal and de Bruijn operations ────────────────────

function senFail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function senTagged(value, kind) {
  if (!Array.isArray(value) || typeof value[0] !== "string")
    senFail("malformed-sen", `${kind} must be a tagged SEN sequence`);
  return value;
}
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/u;
const EFFECT_KEYS = [
  "caller",
  "evidenceRoot",
  "measures",
  "outcome",
  "parent",
  "provider",
];

function exactKeys(value, keys) {
  return (
    value &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000")
  );
}

/** Admit one effect cell record; the term an effect carries is its JSON bridge term. */
export function validateEffectCell(cell) {
  if (!exactKeys(cell, EFFECT_KEYS))
    senFail(
      "malformed-effect",
      `effect cell must expose exactly ${EFFECT_KEYS.join(", ")}`,
    );
  if (
    !NI.test(cell.evidenceRoot) ||
    (cell.parent !== null && !NI.test(cell.parent))
  )
    senFail("malformed-effect", "effect identities must be SHA-256 ni URIs");
  if (!CAIP10.test(cell.caller) || !CAIP10.test(cell.provider))
    senFail(
      "malformed-effect",
      "caller and provider must be CAIP-10 account identifiers",
    );
  if (
    !exactKeys(cell.outcome, ["positiveEvidence", "negativeEvidence"]) ||
    !Object.values(cell.outcome).every((value) => typeof value === "boolean")
  )
    senFail("malformed-effect", "effect outcome must be a FOUR record");
  if (!Array.isArray(cell.measures))
    senFail("malformed-effect", "measures must be a typed measure sequence");
  const dimensions = new Set();
  for (const measure of cell.measures) {
    if (
      !exactKeys(measure, ["dimension", "quantity", "unit"]) ||
      ![measure.dimension, measure.quantity, measure.unit].every(
        (part) => typeof part === "string" && part.length > 0,
      )
    )
      senFail(
        "malformed-effect",
        "each measure requires dimension, quantity, and unit text",
      );
    if (!DECIMAL.test(measure.quantity) || dimensions.has(measure.dimension))
      senFail(
        "malformed-effect",
        `invalid or duplicate measure ${measure.dimension}`,
      );
    dimensions.add(measure.dimension);
  }
  return cell;
}

function validateAtom(constraint, value) {
  if (constraint === "natural" && Number.isInteger(value) && value >= 0) return;
  if (constraint === "text" && typeof value === "string") return;
  senFail("malformed-sen", `invalid SEN ${constraint} atom`);
}

export function validateSenType(type) {
  senTagged(type, "type");
  const form = SEN_TYPE_FORMS[type[0]];
  const arity = type.length === 1 + (form?.types?.length ?? 0);
  if (!form || !arity)
    senFail(
      "malformed-sen",
      `unknown or malformed SEN type ${JSON.stringify(type)}`,
    );
  for (const index of form.types ?? []) validateSenType(type[index]);
  return type;
}

export function validateSenTerm(term) {
  const pending = [term];
  while (pending.length > 0) {
    const current = pending.pop();
    senTagged(current, "term");
    const form = SEN_FORMS[current[0]];
    if (!form)
      senFail("malformed-sen", `unknown or malformed SEN term tag ${current[0]}`);
    const expected = 1 + Object.keys(form.atoms ?? {}).length + (form.terms?.length ?? 0) + (form.types?.length ?? 0);
    if (current.length !== expected) senFail("malformed-sen", `malformed SEN ${current[0]}`);
    for (const [index, constraint] of Object.entries(form.atoms ?? {})) validateAtom(constraint, current[index]);
    for (const index of form.types ?? []) validateSenType(current[index]);
    for (const index of [...(form.terms ?? [])].reverse()) pending.push(current[index]);
  }
  return term;
}

/** The sole binding-aware traversal used by validation consumers, substitution, and reduction. */
export function mapSenTerm(term, visit, depth = 0) {
  validateSenTerm(term);
  const go = (node, nodeDepth) => {
    const form = SEN_FORMS[node[0]],
      out = [...node];
    for (const index of form.terms ?? [])
      out[index] = go(
        node[index],
        nodeDepth + (form.binders?.includes(index) ? 1 : 0),
      );
    return visit(out, nodeDepth);
  };
  return go(term, depth);
}

/** Rebuild one term after mapping every immediate term-bearing child slot. */
export function mapSenImmediate(term, mapper) {
  const form = SEN_FORMS[term[0]],
    out = [...term];
  for (const index of form.terms ?? []) out[index] = mapper(term[index], index);
  return out;
}

/** Canonical structural values, independent of any JSON carrier lowering. */
export function isSenValue(term, depth = 0) {
  if (term[0] === "var") return term[1] < depth;
  const form = SEN_FORMS[term[0]];
  if (
    !form ||
    ["app", "fst", "snd", "coincide", "cond", "fold", "prim", "case", "abort"].includes(term[0])
  )
    return false;
  return (form.terms ?? []).every((index) => isSenValue(term[index], depth + (form.binders?.includes(index) ? 1 : 0)));
}

/** View an array-encoded list — `pair(mark(tag), spine)` with a `star`-ended
 * `pair` spine — as its head and the same-tagged tail. */
export function senListHeadTail(term) {
  if (term[0] === "pair" && term[1][0] === "mark") {
    const spine = term[2];
    if (spine[0] === "star") return "empty";
    if (spine[0] === "pair")
      return { head: spine[1], tail: ["pair", term[1], spine[2]] };
  }
  return undefined;
}

export function shiftSen(delta, cutoff, term) {
  return mapSenTerm(term, (node, depth) =>
    node[0] === "var" && node[1] >= cutoff + depth
      ? ["var", node[1] + delta]
      : node,
  );
}
export function substituteSen(index, replacement, term) {
  return mapSenTerm(term, (node, depth) =>
    node[0] === "var" && node[1] === index + depth
      ? shiftSen(depth, 0, replacement)
      : node,
  );
}
export function instantiateSen(body, value) {
  return shiftSen(-1, 0, substituteSen(0, shiftSen(1, 0, value), body));
}
export function rename(rho, term) {
  return mapSenTerm(term, (node, depth) =>
    node[0] !== "var" || node[1] < depth
      ? node
      : ["var", rho(node[1] - depth) + depth],
  );
}
export function subst(sigma, term) {
  return mapSenTerm(term, (node, depth) =>
    node[0] !== "var" || node[1] < depth
      ? node
      : shiftSen(depth, 0, sigma(node[1] - depth)),
  );
}
export function inst(body, value) {
  return subst((index) => (index === 0 ? value : tm.var(index - 1)), body);
}
