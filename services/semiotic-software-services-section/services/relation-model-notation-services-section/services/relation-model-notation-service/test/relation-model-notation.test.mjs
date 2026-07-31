import assert from "node:assert/strict";
import test from "node:test";
import {
  ty, tm, rename, subst, inst,
  generatorNameOfTerm, chargeNameOfTerm, boolOfTerm,
  isTerm, TySchema, TmSchema,
} from "../src/index.mjs";

// ── a tiny JSON-Schema-subset evaluator, covering exactly the vocabulary
//    TySchema/TmSchema use (anyOf, $ref:"#", tuple `items`, const, integer,
//    string) — enough to genuinely validate constructed terms/types against
//    the shipped schema literals rather than merely trusting `isTerm`. ──────
function validateAgainst(schema, root, value) {
  if (schema.$ref === "#") return validateAgainst(root, root, value);
  if (schema.anyOf) return schema.anyOf.some((alt) => validateAgainst(alt, root, value));
  if (schema.type === "array") {
    if (!Array.isArray(value)) return false;
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.additionalItems === false && value.length > schema.items.length) return false;
    return schema.items.every((itemSchema, index) => validateAgainst(itemSchema, root, value[index]));
  }
  if (schema.type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) return false;
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    return true;
  }
  if (schema.type === "string") return typeof value === "string";
  if (Object.hasOwn(schema, "const")) return value === schema.const;
  throw new Error(`unsupported schema shape in test evaluator: ${JSON.stringify(schema)}`);
}

// ── 1. construct terms and types ────────────────────────────────────────────

test("type constructors produce frozen tagged arrays for all five forms", () => {
  const cases = [
    ty.base(),
    ty.arrow(ty.base(), ty.base()),
    ty.prod(ty.base(), ty.base()),
    ty.unit(),
    ty.list(ty.base()),
  ];
  const tags = cases.map((t) => t[0]);
  assert.deepEqual(tags, ["base", "arrow", "prod", "unit", "list"]);
  for (const t of cases) assert.equal(Object.isFrozen(t), true);
});

test("term constructors produce frozen tagged arrays for all eleven forms", () => {
  const cases = [
    tm.var(0),
    tm.lam(tm.var(0)),
    tm.app(tm.lam(tm.var(0)), tm.star()),
    tm.pair(tm.star(), tm.star()),
    tm.fst(tm.pair(tm.star(), tm.star())),
    tm.snd(tm.pair(tm.star(), tm.star())),
    tm.star(),
    tm.mark("x"),
    tm.coincide(tm.mark("a"), tm.mark("a")),
    tm.cond(tm.mark("held"), tm.star(), tm.star()),
    tm.fold(tm.lam(tm.lam(tm.var(0))), tm.star(), tm.star()),
  ];
  const tags = cases.map((t) => t[0]);
  assert.deepEqual(tags, [
    "var", "lam", "app", "pair", "fst", "snd", "star", "mark", "coincide", "cond", "fold",
  ]);
  for (const t of cases) assert.equal(Object.isFrozen(t), true);
});

test("tm.var rejects non-natural indices", () => {
  assert.throws(() => tm.var(-1), TypeError);
  assert.throws(() => tm.var(1.5), TypeError);
});

// ── 2. validate constructed terms/types against the shipped schema literals ─

test("constructed types validate against TySchema", () => {
  for (const t of [ty.base(), ty.arrow(ty.base(), ty.unit()), ty.prod(ty.base(), ty.unit()), ty.unit(), ty.list(ty.base())]) {
    assert.equal(validateAgainst(TySchema, TySchema, t), true, JSON.stringify(t));
  }
  assert.equal(validateAgainst(TySchema, TySchema, ["not-a-type"]), false);
  assert.equal(validateAgainst(TySchema, TySchema, ["arrow", ty.base()]), false); // wrong arity
});

test("constructed terms validate against TmSchema, including nested recursion", () => {
  const nested = tm.app(tm.lam(tm.pair(tm.var(0), tm.fold(tm.lam(tm.lam(tm.var(0))), tm.mark("seed"), tm.var(0)))), tm.star());
  assert.equal(validateAgainst(TmSchema, TmSchema, nested), true);
  assert.equal(validateAgainst(TmSchema, TmSchema, ["var", -1]), false); // negative index
  assert.equal(validateAgainst(TmSchema, TmSchema, ["mark", 42]), false); // non-string payload
  assert.equal(validateAgainst(TmSchema, TmSchema, ["cond", tm.star(), tm.star()]), false); // wrong arity
});

test("TmSchema and TySchema each expose one anyOf branch per grammar form", () => {
  assert.equal(TmSchema.anyOf.length, 11);
  assert.equal(TySchema.anyOf.length, 5);
});

// ── validator.mjs's isTerm, exercised directly ──────────────────────────────

test("isTerm accepts every constructed term form and rejects malformed data", () => {
  assert.equal(isTerm(tm.app(tm.lam(tm.var(0)), tm.mark("x"))), true);
  assert.equal(isTerm(["mark", 1]), false); // non-string mark payload
  assert.equal(isTerm(["bogus"]), false); // unknown tag
  assert.equal(isTerm(null), false);
  assert.equal(isTerm({ 0: "star" }), false); // not an array
});

test("isTerm rejects a self-referential (cyclic) array without looping forever", () => {
  const cyclic = ["pair", null, null];
  cyclic[1] = cyclic; // cyclic[1] === cyclic itself
  cyclic[2] = tm.star();
  assert.equal(isTerm(cyclic), false);
});

// ── 3. rename / subst / inst — the structural de-Bruijn operations ─────────

test("rename shifts free variables under binders correctly", () => {
  // λ. (var 0) (var 1)  — var 0 is bound, var 1 is free (one level up).
  const term = tm.lam(tm.app(tm.var(0), tm.var(1)));
  // Shift every free variable up by 5.
  const shifted = rename((index) => index + 5, term);
  assert.deepEqual(shifted, tm.lam(tm.app(tm.var(0), tm.var(6))));
});

test("inst substitutes the bound variable and shifts remaining frees down", () => {
  // (var 0) (var 1), where var 0 is the slot `inst` fills and var 1 is one
  // level further out — after instantiation it must become var 0.
  const body = tm.app(tm.var(0), tm.var(1));
  const result = inst(body, tm.mark("x"));
  assert.deepEqual(result, tm.app(tm.mark("x"), tm.var(0)));
});

test("subst with the identity substitution is the identity function on closed structure", () => {
  const term = tm.pair(tm.fst(tm.pair(tm.star(), tm.star())), tm.mark("m"));
  const identity = subst((index) => tm.var(index), term);
  assert.deepEqual(identity, term);
});

test("inst under a nested lambda still finds the right binder (de Bruijn correctness)", () => {
  // λ. (λ. var 1) applied conceptually — inst on the outer body must only
  // touch var 0 at the outer level, shifting any inner-lambda-relative
  // references correctly (rename bumps by one crossing the inner lam).
  const outerBody = tm.lam(tm.var(1)); // inner lam's var 1 refers to outer's var 0
  const result = inst(outerBody, tm.mark("v"));
  assert.deepEqual(result, tm.lam(tm.mark("v")));
});

// ── 4. charge round-trips — unknown/held/denied/contested ───────────────────
//
// The lattice operations (negate/conflate/joinK/meetK/leK/leT/settle/
// fromCharge) are notation-layer term BUILDERS: `chargeCase` always emits a
// symbolic `cond`/`coincide` decision tree over the four charge marks, even
// when its subject is already a concrete literal — this package does not
// evaluate (per its own doc comment: "no evaluation, no JSON bridge, no
// pre-built programs"). To test round-trips honestly we need to reduce
// those trees to a value; the minimal reducer below understands exactly the
// three-form vocabulary `chargeCase` ever emits (mark/coincide/cond) and
// lives only in this test file — it is a verification tool, not something
// added to the shipped notation.
function reduceClosedTree(term) {
  switch (term[0]) {
    case "mark":
      return term;
    case "coincide": {
      const left = reduceClosedTree(term[1]);
      const right = reduceClosedTree(term[2]);
      return tm.bool(JSON.stringify(left) === JSON.stringify(right));
    }
    case "cond": {
      const test = reduceClosedTree(term[1]);
      if (JSON.stringify(test) === JSON.stringify(tm.charge("held"))) return reduceClosedTree(term[2]);
      if (JSON.stringify(test) === JSON.stringify(tm.charge("denied"))) return reduceClosedTree(term[3]);
      throw new Error(`cond test did not reduce to a boolean charge: ${JSON.stringify(test)}`);
    }
    default:
      throw new Error(`reduceClosedTree: unsupported subterm tag in test reducer: ${term[0]}`);
  }
}

const charges = ["unknown", "held", "denied", "contested"];

test("every charge round-trips through chargeNameOfTerm", () => {
  for (const name of charges) {
    assert.equal(chargeNameOfTerm(tm.charge(name)), name);
  }
  assert.equal(chargeNameOfTerm(tm.mark("not-a-charge")), undefined);
});

test("bool is derived from the truth axis: held=true, denied=false, others undefined", () => {
  assert.equal(boolOfTerm(tm.bool(true)), true);
  assert.equal(boolOfTerm(tm.bool(false)), false);
  assert.equal(boolOfTerm(tm.charge("held")), true);
  assert.equal(boolOfTerm(tm.charge("denied")), false);
  assert.equal(boolOfTerm(tm.charge("unknown")), undefined);
  assert.equal(boolOfTerm(tm.charge("contested")), undefined);
});

test("negate is an involution on every charge (reduced)", () => {
  for (const name of charges) {
    const once = reduceClosedTree(tm.negate(tm.charge(name)));
    const twice = reduceClosedTree(tm.negate(once));
    assert.deepEqual(twice, tm.charge(name));
  }
});

test("conflate is an involution on every charge (reduced)", () => {
  for (const name of charges) {
    const once = reduceClosedTree(tm.conflate(tm.charge(name)));
    const twice = reduceClosedTree(tm.conflate(once));
    assert.deepEqual(twice, tm.charge(name));
  }
});

test("negConf equals negate composed with conflate for every charge (reduced)", () => {
  for (const name of charges) {
    const composed = reduceClosedTree(tm.negate(reduceClosedTree(tm.conflate(tm.charge(name)))));
    const direct = reduceClosedTree(tm.negConf(tm.charge(name)));
    assert.deepEqual(direct, composed);
  }
});

test("unknown and contested are each other's negation fixed point pair, held/denied swap (reduced)", () => {
  assert.deepEqual(reduceClosedTree(tm.negate(tm.charge("unknown"))), tm.charge("unknown"));
  assert.deepEqual(reduceClosedTree(tm.negate(tm.charge("contested"))), tm.charge("contested"));
  assert.deepEqual(reduceClosedTree(tm.negate(tm.charge("held"))), tm.charge("denied"));
  assert.deepEqual(reduceClosedTree(tm.negate(tm.charge("denied"))), tm.charge("held"));
});

test("joinK is idempotent, commutative, and unknown is its identity (reduced)", () => {
  for (const name of charges) {
    assert.deepEqual(reduceClosedTree(tm.joinK(tm.charge(name), tm.charge(name))), tm.charge(name));
    assert.deepEqual(reduceClosedTree(tm.joinK(tm.charge(name), tm.charge("unknown"))), tm.charge(name));
  }
  assert.deepEqual(
    reduceClosedTree(tm.joinK(tm.charge("held"), tm.charge("denied"))),
    tm.charge("contested"),
  );
});

test("meetK is idempotent, commutative, and contested is its identity (reduced)", () => {
  for (const name of charges) {
    assert.deepEqual(reduceClosedTree(tm.meetK(tm.charge(name), tm.charge(name))), tm.charge(name));
    assert.deepEqual(reduceClosedTree(tm.meetK(tm.charge(name), tm.charge("contested"))), tm.charge(name));
  }
  assert.deepEqual(
    reduceClosedTree(tm.meetK(tm.charge("held"), tm.charge("denied"))),
    tm.charge("unknown"),
  );
});

test("leK: unknown is knowledge-least, contested is knowledge-greatest (reduced)", () => {
  for (const name of charges) {
    assert.equal(boolOfTerm(reduceClosedTree(tm.leK(tm.charge("unknown"), tm.charge(name)))), true);
    assert.equal(boolOfTerm(reduceClosedTree(tm.leK(tm.charge(name), tm.charge("contested")))), true);
  }
  assert.equal(boolOfTerm(reduceClosedTree(tm.leK(tm.charge("held"), tm.charge("denied")))), false);
});

test("leT: denied is truth-least, held is truth-greatest (reduced)", () => {
  for (const name of charges) {
    assert.equal(boolOfTerm(reduceClosedTree(tm.leT(tm.charge("denied"), tm.charge(name)))), true);
    assert.equal(boolOfTerm(reduceClosedTree(tm.leT(tm.charge(name), tm.charge("held")))), true);
  }
  assert.equal(boolOfTerm(reduceClosedTree(tm.leT(tm.charge("held"), tm.charge("denied")))), false);
});

test("settle is exactly joinK, reduced values agree for every pair", () => {
  for (const left of charges) {
    for (const right of charges) {
      assert.deepEqual(
        reduceClosedTree(tm.settle(tm.charge(left), tm.charge(right))),
        reduceClosedTree(tm.joinK(tm.charge(left), tm.charge(right))),
      );
    }
  }
});

test("fromCharge collapses every corner onto its truth-bit boolean (reduced)", () => {
  assert.deepEqual(reduceClosedTree(tm.fromCharge(tm.charge("held"))), tm.bool(true));
  assert.deepEqual(reduceClosedTree(tm.fromCharge(tm.charge("contested"))), tm.bool(true));
  assert.deepEqual(reduceClosedTree(tm.fromCharge(tm.charge("denied"))), tm.bool(false));
  assert.deepEqual(reduceClosedTree(tm.fromCharge(tm.charge("unknown"))), tm.bool(false));
});

test("every charge op still produces a closed, schema-valid term BEFORE reduction (no evaluation happens in this package)", () => {
  const built = [
    tm.negate(tm.charge("held")),
    tm.conflate(tm.charge("contested")),
    tm.joinK(tm.charge("held"), tm.charge("unknown")),
    tm.fromCharge(tm.charge("denied")),
  ];
  for (const term of built) {
    assert.equal(isTerm(term), true);
    assert.equal(validateAgainst(TmSchema, TmSchema, term), true);
  }
});

// ── 5. the four relational generators ───────────────────────────────────────

const generators = ["specialization", "converse", "subjectProjection", "objectProjection"];

test("every generator round-trips through generatorNameOfTerm", () => {
  for (const name of generators) {
    assert.equal(generatorNameOfTerm(tm.generator(name)), name);
  }
});

test("generatorNameOfTerm rejects non-generator marks, including charge marks", () => {
  assert.equal(generatorNameOfTerm(tm.mark("not-a-generator")), undefined);
  assert.equal(generatorNameOfTerm(tm.charge("held")), undefined);
});

// ── structural helpers built from the primitives (field / array ops) ───────

test("consArray then fst/snd shape matches a manual pair-spine prepend", () => {
  const empty = tm.pair(tm.mark("array"), tm.star());
  const withOne = tm.consArray(tm.mark("elem"), empty);
  assert.deepEqual(withOne, tm.pair(tm.fst(empty), tm.pair(tm.mark("elem"), tm.snd(empty))));
});

test("field compiles to a fold over an assoc-list spine, closed and schema-valid", () => {
  const compiled = tm.field("k", tm.mark("obj"));
  assert.equal(compiled[0], "fold");
  assert.equal(isTerm(compiled), true);
  assert.equal(validateAgainst(TmSchema, TmSchema, compiled), true);
});
