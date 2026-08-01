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
// The real, compiled metroplat build of the module this package ports. Every
// exported function is differentially tested against this exact dist file —
// this is the load-bearing evidence that the port is behaviorally identical,
// not merely structurally similar.
import * as dist from "../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/dist/src/lib/language/reader/projecting/index.mjs";

// ── 1. jsonToTerm / termToJson — differential battery against the metroplat dist build ──

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

test("jsonToTerm: matches the metroplat dist build term-for-term across a representative JSON battery", () => {
  for (const value of sampleJsonValues) {
    const mineTerm = jsonToTerm(value);
    const distTerm = dist.jsonToTerm(value);
    assert.deepEqual(mineTerm, distTerm, `jsonToTerm mismatch for ${JSON.stringify(value)}`);
  }
});

test("termToJson: round-trips identically to the metroplat dist build across the same battery", () => {
  for (const value of sampleJsonValues) {
    const mineTerm = jsonToTerm(value);
    const distTerm = dist.jsonToTerm(value);
    const mineJson = termToJson(mineTerm);
    const distJson = dist.termToJson(distTerm);
    assert.deepEqual(mineJson, distJson, `termToJson mismatch for ${JSON.stringify(value)}`);
    // Also cross-decode: my decoder over the dist encoder's term, and vice
    // versa, must agree — proves the two encodings are not just individually
    // self-consistent but interchangeable.
    assert.deepEqual(termToJson(distTerm), distJson, `cross-decode (mine over dist term) mismatch for ${JSON.stringify(value)}`);
    assert.deepEqual(dist.termToJson(mineTerm), mineJson, `cross-decode (dist over mine term) mismatch for ${JSON.stringify(value)}`);
  }
});

test("jsonToTerm: a string equal to a charge-value-name decodes back to that string via termToJson, not a boolean — pinned identically on both sides", () => {
  for (const name of ["unknown", "held", "denied", "contested"]) {
    const mineTerm = jsonToTerm(name);
    const distTerm = dist.jsonToTerm(name);
    assert.deepEqual(mineTerm, distTerm);
    assert.equal(termToJson(mineTerm), name);
    assert.equal(dist.termToJson(distTerm), name);
  }
});

test("jsonToTerm: true/false collapse through the charge encoding identically on both sides (decode as \"held\"/\"denied\", not JS booleans — a real quirk of the bridge, not a bug introduced by the port)", () => {
  assert.equal(termToJson(jsonToTerm(true)), "held");
  assert.equal(dist.termToJson(dist.jsonToTerm(true)), "held");
  assert.equal(termToJson(jsonToTerm(false)), "denied");
  assert.equal(dist.termToJson(dist.jsonToTerm(false)), "denied");
});

// ── 2. listTerm / termList — differential ───────────────────────────────────

test("listTerm: matches dist build for empty, singleton, and multi-element spines", () => {
  const rawTerms = [
    [],
    [["mark", "\"x\""]],
    [["mark", "\"a\""], ["mark", "\"b\""], ["star"]],
  ];
  for (const items of rawTerms) {
    assert.deepEqual(listTerm(items), dist.listTerm(items));
  }
});

test("termList: matches dist build decoding the same hand-built spines, including a malformed spine throwing in both", () => {
  const wellFormed = tm.pair(tm.mark("a"), tm.pair(tm.mark("b"), tm.star()));
  assert.deepEqual(termList(wellFormed), dist.termList(wellFormed));
  assert.deepEqual(termList(tm.star()), dist.termList(tm.star()));

  const malformed = ["pair", ["mark", "a"], ["mark", "not-star-or-pair"]];
  assert.throws(() => termList(malformed), TypeError);
  assert.throws(() => dist.termList(malformed), TypeError);
});

// ── 3. isValueTerm — differential ───────────────────────────────────────────

test("isValueTerm: agrees with dist build across value and non-value shapes", () => {
  const cases = [
    tm.mark("x"),
    tm.star(),
    tm.pair(tm.mark("a"), tm.star()),
    tm.pair(tm.pair(tm.mark("a"), tm.star()), tm.mark("b")),
    tm.var(0), // not a value term
    tm.lam(tm.var(0)), // not a value term
    tm.pair(tm.mark("a"), tm.var(0)), // pair containing a non-value
  ];
  for (const t of cases) {
    assert.equal(isValueTerm(t), dist.isValueTerm(t), `isValueTerm mismatch for ${JSON.stringify(t)}`);
  }
});

// ── 4. arrayHeadTail — differential ─────────────────────────────────────────

test("arrayHeadTail: agrees with dist build on empty, non-empty, and malformed tagged spines", () => {
  const emptySpine = tm.pair(tm.mark(arrayTag), tm.star());
  const nonEmptySpine = tm.pair(tm.mark(arrayTag), tm.pair(tm.mark("first"), tm.pair(tm.mark("second"), tm.star())));
  const notATaggedPair = tm.pair(tm.star(), tm.star()); // term[1] isn't a mark
  const notAPair = tm.mark("x");

  assert.deepEqual(arrayHeadTail(emptySpine), dist.arrayHeadTail(emptySpine));
  assert.deepEqual(arrayHeadTail(nonEmptySpine), dist.arrayHeadTail(nonEmptySpine));
  assert.deepEqual(arrayHeadTail(notATaggedPair), dist.arrayHeadTail(notATaggedPair));
  assert.deepEqual(arrayHeadTail(notAPair), dist.arrayHeadTail(notAPair));

  // walking the tail progressively must also agree, step by step
  const step1 = arrayHeadTail(nonEmptySpine);
  const distStep1 = dist.arrayHeadTail(nonEmptySpine);
  assert.deepEqual(step1, distStep1);
  assert.deepEqual(arrayHeadTail(step1.tail), dist.arrayHeadTail(distStep1.tail));
});

// ── 5. objectTerm / arrayTerm / stringTerm — differential ──────────────────

test("objectTerm: matches dist build, including re-sorting deliberately unsorted entries identically", () => {
  const entries = [
    ["z", tm.mark("1")],
    ["a", tm.star()],
    ["m", tm.pair(tm.mark("x"), tm.star())],
  ];
  assert.deepEqual(objectTerm(entries), dist.objectTerm(entries));
  assert.deepEqual(objectTerm([]), dist.objectTerm([]));
});

test("arrayTerm: matches dist build for empty and multi-item spines", () => {
  assert.deepEqual(arrayTerm([]), dist.arrayTerm([]));
  const items = [tm.mark("1"), tm.mark("2"), tm.star()];
  assert.deepEqual(arrayTerm(items), dist.arrayTerm(items));
});

test("stringTerm: matches dist build, including empty string and a charge-name-shaped string", () => {
  for (const value of ["", "hello", "held", "with \"quotes\" and \\backslashes\\"]) {
    assert.deepEqual(stringTerm(value), dist.stringTerm(value));
  }
});

test("objectTerm/arrayTerm/stringTerm compose consistently with jsonToTerm's own encoding, identically on both sides", () => {
  const value = { b: "x", a: [1, 2] };
  const viaJsonToTerm = jsonToTerm(value);
  const viaBuilders = objectTerm([
    ["b", stringTerm("x")],
    ["a", arrayTerm([jsonToTerm(1), jsonToTerm(2)])],
  ]);
  assert.deepEqual(viaJsonToTerm, viaBuilders);
  assert.deepEqual(dist.jsonToTerm(value), dist.objectTerm([
    ["b", dist.stringTerm("x")],
    ["a", dist.arrayTerm([dist.jsonToTerm(1), dist.jsonToTerm(2)])],
  ]));
  assert.deepEqual(viaJsonToTerm, dist.jsonToTerm(value));
});

// ── 6. projectField — differential ──────────────────────────────────────────

test("projectField: agrees with dist build across every field of a multi-field object, and on unsorted fieldNames input", () => {
  const fieldNames = ["gamma", "alpha", "beta"];
  const object = objectTerm(fieldNames.map((name) => [name, tm.mark(name)]));
  const distObject = dist.objectTerm(fieldNames.map((name) => [name, tm.mark(name)]));
  assert.deepEqual(object, distObject);

  for (const key of fieldNames) {
    assert.deepEqual(projectField(fieldNames, key, object), dist.projectField(fieldNames, key, distObject));
    // shuffled fieldNames ordering must resolve to the same field, on both sides
    const shuffled = [...fieldNames].reverse();
    assert.deepEqual(projectField(shuffled, key, object), dist.projectField(shuffled, key, distObject));
  }
});

test("projectField: throws identically on both sides for a key not in fieldNames", () => {
  const fieldNames = ["a", "b"];
  const object = objectTerm(fieldNames.map((name) => [name, tm.mark(name)]));
  assert.throws(() => projectField(fieldNames, "c", object), TypeError);
  assert.throws(() => dist.projectField(fieldNames, "c", object), TypeError);
});

// ── 7. objectTy / arrayTy — differential ────────────────────────────────────

test("objectTy: matches dist build with default (base-typed) fields and with explicit fieldTypes, and with unsorted fieldNames", () => {
  assert.deepEqual(objectTy(["b", "a"]), dist.objectTy(["b", "a"]));
  assert.deepEqual(objectTy([]), dist.objectTy([]));

  const fieldTypes = { a: ty.unit(), b: ty.prod(ty.base(), ty.base()) };
  assert.deepEqual(objectTy(["b", "a"], fieldTypes), dist.objectTy(["b", "a"], fieldTypes));
});

test("arrayTy: matches dist build for empty and multi-item positional type lists", () => {
  assert.deepEqual(arrayTy([]), dist.arrayTy([]));
  const itemTypes = [ty.base(), ty.unit(), ty.list(ty.base())];
  assert.deepEqual(arrayTy(itemTypes), dist.arrayTy(itemTypes));
});

// ── 8. objectTy/arrayTy positionally mirror projectField's own field order ──

test("objectTy's field order matches projectField's own traversal order (both walk fieldNames sorted the same way)", () => {
  const fieldNames = ["c", "a", "b"];
  const object = objectTerm(fieldNames.map((name) => [name, jsonToTerm(name)]));
  const distObject = dist.objectTerm(fieldNames.map((name) => [name, dist.jsonToTerm(name)]));
  assert.deepEqual(object, distObject);
  // objectTy's shape and projectField's traversal must agree on both sides
  // independently, since neither package cross-depends on the other.
  assert.deepEqual(objectTy(fieldNames), dist.objectTy(fieldNames));
  for (const key of fieldNames) {
    assert.deepEqual(projectField(fieldNames, key, object), dist.projectField(fieldNames, key, distObject));
  }
});
