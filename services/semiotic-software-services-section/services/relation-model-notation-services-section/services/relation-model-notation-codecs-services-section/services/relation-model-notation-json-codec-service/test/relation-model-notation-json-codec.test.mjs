import assert from "node:assert/strict";
import test from "node:test";
import { tm, ty } from "@red-cup-engineering/relation-model-notation";
import {
  arrayTag, objectTag,
  listTerm, termList,
  isValueTerm, arrayHeadTail,
  objectTerm, arrayTerm, stringTerm,
  projectField, objectTy, arrayTy,
  jsonToTerm, termToJson,
} from "../src/index.mjs";
// Every exported function below was originally differentially tested
// against the real, compiled metroplat build of the module this package
// ports — the load-bearing evidence that the port is behaviorally identical,
// not merely structurally similar. That evidence is preserved in this
// package's own commit history; metroplat has since been deleted, so these
// tests now assert the same hard-coded expected values directly instead of
// re-deriving them from a live comparison.

// ── 1. jsonToTerm / termToJson — round-trip battery, previously proven identical to the metroplat dist build ──

const sampleJsonValues = [
  // null
  null,
  // booleans
  true,
  false,
  // numbers: zero, negative zero, negative, large, fractional, exponent-scale
  0,
  -0,
  1,
  -1,
  3.14,
  -3.14,
  1e21,
  -1e21,
  Number.MAX_SAFE_INTEGER,
  -Number.MAX_SAFE_INTEGER,
  1e-7,
  123456789.987654321,
  // strings, including ones that happen to equal a charge-value-name
  "",
  "hello world",
  "unknown",
  "held",
  "denied",
  "contested",
  "Held", // near-miss casing — must NOT be treated as a charge name
  "null", // near-miss to the JSON literal — still a plain string
  // empty array / empty object
  [],
  {},
  // nested arrays
  [1, 2, 3],
  [[1, 2], [3, [4, 5]]],
  [null, true, false, "held", 42, { a: 1 }],
  // objects: sorted-as-given vs deliberately unsorted key input
  { a: 1, b: 2, c: 3 },
  { z: 1, a: 2, m: 3 },
  { b: { y: 1, x: 2 }, a: [3, 2, 1] },
  // deeply nested combination
  {
    list: [{ a: 1 }, { b: [1, 2, 3] }],
    flag: true,
    name: "held",
    nested: { deeper: { deepest: [1, [2, [3, { charge: "contested" }]]] } },
  },
];

// JSON numbers canonicalize -0 to 0; every other admitted distinction is
// retained at any depth.
function expectedRoundTrip(value) {
  if (Object.is(value, -0)) return 0;
  if (Array.isArray(value)) return value.map(expectedRoundTrip);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, expectedRoundTrip(v)]));
  }
  return value;
}

test("jsonToTerm / termToJson retains admitted JSON distinctions at any depth", () => {
  for (const value of sampleJsonValues) {
    const decoded = termToJson(jsonToTerm(value));
    assert.deepEqual(decoded, expectedRoundTrip(value), `round-trip mismatch for ${JSON.stringify(value)}`);
  }
});

test("jsonToTerm: a string equal to a charge-value-name decodes back to that string via termToJson, not a boolean", () => {
  for (const name of ["unknown", "held", "denied", "contested"]) {
    const mineTerm = jsonToTerm(name);
    assert.equal(termToJson(mineTerm), name);
  }
});

test("JSON booleans remain distinct from FOUR charge-name strings", () => {
  assert.equal(termToJson(jsonToTerm(true)), true);
  assert.equal(termToJson(jsonToTerm(false)), false);
  assert.notDeepEqual(jsonToTerm(true), jsonToTerm("held"));
  assert.notDeepEqual(jsonToTerm(false), jsonToTerm("denied"));
});

// ── 2. listTerm / termList ───────────────────────────────────────────────

test("listTerm: builds a right-nested pair spine terminated by star, for empty, singleton, and multi-element item lists", () => {
  assert.deepEqual(listTerm([]), tm.star());
  assert.deepEqual(listTerm([tm.mark("x")]), tm.pair(tm.mark("x"), tm.star()));
  assert.deepEqual(
    listTerm([tm.mark("a"), tm.mark("b"), tm.star()]),
    tm.pair(tm.mark("a"), tm.pair(tm.mark("b"), tm.pair(tm.star(), tm.star()))),
  );
});

test("termList: decodes a hand-built pair spine and the empty (star) spine, throwing on a malformed spine", () => {
  const wellFormed = tm.pair(tm.mark("a"), tm.pair(tm.mark("b"), tm.star()));
  assert.deepEqual(termList(wellFormed), [tm.mark("a"), tm.mark("b")]);
  assert.deepEqual(termList(tm.star()), []);

  const malformed = ["pair", ["mark", "a"], ["mark", "not-star-or-pair"]];
  assert.throws(() => termList(malformed), TypeError);
});

// ── 3. isValueTerm ───────────────────────────────────────────────────────

test("isValueTerm: true for mark/star and pairs of values, false for var/lam and pairs containing a non-value", () => {
  const cases = [
    [tm.mark("x"), true],
    [tm.star(), true],
    [tm.pair(tm.mark("a"), tm.star()), true],
    [tm.pair(tm.pair(tm.mark("a"), tm.star()), tm.mark("b")), true],
    [tm.var(0), false], // not a value term
    [tm.lam(tm.var(0)), false], // not a value term
    [tm.pair(tm.mark("a"), tm.var(0)), false], // pair containing a non-value
  ];
  for (const [t, expected] of cases) {
    assert.equal(isValueTerm(t), expected, `isValueTerm mismatch for ${JSON.stringify(t)}`);
  }
});

// ── 4. arrayHeadTail ─────────────────────────────────────────────────────

test("arrayHeadTail: destructures a tagged spine head-first, returns \"empty\" for an empty spine, and undefined for malformed input", () => {
  const nonEmptySpine = tm.pair(tm.mark(arrayTag), tm.pair(tm.mark("first"), tm.pair(tm.mark("second"), tm.star())));
  const notATaggedPair = tm.pair(tm.star(), tm.star()); // term[1] isn't a mark
  const notAPair = tm.mark("x");

  assert.equal(arrayHeadTail(tm.pair(tm.mark(arrayTag), tm.star())), "empty");
  assert.equal(arrayHeadTail(notATaggedPair), undefined);
  assert.equal(arrayHeadTail(notAPair), undefined);

  // walking the tail progressively must reproduce the remaining spine, one item at a time
  const step1 = arrayHeadTail(nonEmptySpine);
  assert.deepEqual(step1, {
    head: tm.mark("first"),
    tail: tm.pair(tm.mark(arrayTag), tm.pair(tm.mark("second"), tm.star())),
  });
  const step2 = arrayHeadTail(step1.tail);
  assert.deepEqual(step2, { head: tm.mark("second"), tail: tm.pair(tm.mark(arrayTag), tm.star()) });
  assert.equal(arrayHeadTail(step2.tail), "empty");
});

// ── 5. objectTerm / arrayTerm / stringTerm ──────────────────────────────

test("objectTerm: sorts entries deterministically regardless of input order, and round-trips through termToJson", () => {
  const shuffled = [
    ["z", jsonToTerm(1)],
    ["a", jsonToTerm(null)],
    ["m", jsonToTerm("x")],
  ];
  const sorted = [
    ["a", jsonToTerm(null)],
    ["m", jsonToTerm("x")],
    ["z", jsonToTerm(1)],
  ];
  assert.deepEqual(objectTerm(shuffled), objectTerm(sorted));
  assert.deepEqual(termToJson(objectTerm(shuffled)), { a: null, m: "x", z: 1 });
  assert.deepEqual(termToJson(objectTerm([])), {});
});

test("arrayTerm: round-trips through termToJson for empty and multi-item spines", () => {
  assert.deepEqual(termToJson(arrayTerm([])), []);
  const items = [jsonToTerm(1), jsonToTerm(2), jsonToTerm(null)];
  assert.deepEqual(termToJson(arrayTerm(items)), [1, 2, null]);
});

test("stringTerm builds the same tagged string carrier as jsonToTerm", () => {
  for (const value of ["", "hello", "held", "with \"quotes\" and \\backslashes\\"]) {
    assert.equal(termToJson(stringTerm(value)), value, `stringTerm round-trip mismatch for ${JSON.stringify(value)}`);
  }
});

test("objectTerm/arrayTerm/stringTerm compose consistently with jsonToTerm's own encoding", () => {
  const value = { b: "x", a: [1, 2] };
  const viaJsonToTerm = jsonToTerm(value);
  const viaBuilders = objectTerm([
    ["b", stringTerm("x")],
    ["a", arrayTerm([jsonToTerm(1), jsonToTerm(2)])],
  ]);
  assert.deepEqual(viaJsonToTerm, viaBuilders);
});

// ── 6. projectField ──────────────────────────────────────────────────────

// projectField returns an UNREDUCED fst/snd projection expression (see its
// doc comment: "fst/snd down objectTerm's own sorted spine"), not the
// field's value directly — this package has no evaluator dependency to
// normalize it, so this tiny structural reducer stands in for one. It only
// ever sees fst/snd applied to already-fully-built pair/mark/star data (no
// lam/app), so plain indexing is a complete, independent reduction — it does
// not reuse any of projectField's own index-finding/sorting logic, so it
// still catches a wrong-position bug.
function reduceFstSnd(term) {
  if (term[0] === "fst") return reduceFstSnd(term[1])[1];
  if (term[0] === "snd") return reduceFstSnd(term[1])[2];
  return term;
}

test("projectField: projects the correct field by position across every field, for both original and reversed fieldNames orderings", () => {
  const fieldNames = ["gamma", "alpha", "beta"];
  const object = objectTerm(fieldNames.map((name) => [name, tm.mark(name)]));
  const shuffled = [...fieldNames].reverse();

  for (const key of fieldNames) {
    assert.deepEqual(reduceFstSnd(projectField(fieldNames, key, object)), tm.mark(key));
    // shuffled fieldNames ordering must resolve to the same field regardless of list order
    assert.deepEqual(reduceFstSnd(projectField(shuffled, key, object)), tm.mark(key));
  }
});

test("projectField: throws for a key not in fieldNames", () => {
  const fieldNames = ["a", "b"];
  const object = objectTerm(fieldNames.map((name) => [name, tm.mark(name)]));
  assert.throws(() => projectField(fieldNames, "c", object), TypeError);
});

// ── 7. objectTy / arrayTy ────────────────────────────────────────────────

test("objectTy: builds a nested product type mirroring objectTerm's sorted field order, with base() as the default field type", () => {
  assert.deepEqual(
    objectTy(["b", "a"]),
    ty.prod(ty.base(), ty.prod(
      ty.prod(ty.base(), ty.base()),
      ty.prod(ty.prod(ty.base(), ty.base()), ty.unit()),
    )),
  );
  assert.deepEqual(objectTy([]), ty.prod(ty.base(), ty.unit()));

  const fieldTypes = { a: ty.unit(), b: ty.prod(ty.base(), ty.base()) };
  assert.deepEqual(
    objectTy(["b", "a"], fieldTypes),
    ty.prod(ty.base(), ty.prod(
      ty.prod(ty.base(), ty.unit()),
      ty.prod(ty.prod(ty.base(), ty.prod(ty.base(), ty.base())), ty.unit()),
    )),
  );
});

test("arrayTy: builds a nested product type positionally over item types, for empty and multi-item lists", () => {
  assert.deepEqual(arrayTy([]), ty.prod(ty.base(), ty.unit()));
  const itemTypes = [ty.base(), ty.unit(), ty.list(ty.base())];
  assert.deepEqual(
    arrayTy(itemTypes),
    ty.prod(ty.base(), ty.prod(ty.base(), ty.prod(ty.unit(), ty.prod(ty.list(ty.base()), ty.unit())))),
  );
});

// ── 8. objectTy/arrayTy positionally mirror projectField's own field order ──

test("objectTy's field order matches projectField's own traversal order (both sort fieldNames the same way)", () => {
  const fieldNames = ["c", "a", "b"];
  const object = objectTerm(fieldNames.map((name) => [name, jsonToTerm(name)]));
  // objectTy doesn't error and produces the same shape regardless of input
  // order, matching the sorted structure objectTerm built above.
  assert.deepEqual(objectTy(fieldNames), objectTy([...fieldNames].sort()));
  for (const key of fieldNames) {
    assert.deepEqual(reduceFstSnd(projectField(fieldNames, key, object)), jsonToTerm(key));
  }
});
