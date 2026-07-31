import { test } from "node:test";
import assert from "node:assert/strict";

import { entry, entryId, sameEntry, isEntry, asEntry, assertValidEntry } from "../src/index.mjs";

test("entry builds a plain e/a/v/t record with no charge and no trace", () => {
  const row = entry("urn:subject:1", "urn:rmn:predicate:observed", 42, "2026-07-31T00:00:00.000Z");
  assert.deepEqual(row, {
    e: "urn:subject:1",
    a: "urn:rmn:predicate:observed",
    v: 42,
    t: "2026-07-31T00:00:00.000Z",
  });
  assert.equal("charge" in row, false);
  assert.equal("trace" in row, false);
});

test("entry rejects a missing predicate", () => {
  assert.throws(() => entry("s", undefined, "v", "t"), /field "a" is required/);
});

test("entry rejects a non-JSON value", () => {
  assert.throws(() => entry("s", "p", () => {}, "t"), TypeError);
});

test("entry honors a supplied predicate validator", () => {
  const predicateIsValid = (p) => p === "urn:rmn:known-term";
  assert.throws(
    () => entry("s", "urn:rmn:unknown-term", "v", "t", { predicateIsValid }),
    /RMN-term check/,
  );
  const row = entry("s", "urn:rmn:known-term", "v", "t", { predicateIsValid });
  assert.equal(row.a, "urn:rmn:known-term");
});

test("entryId is deterministic and dedup-stable across tuple/object spelling", () => {
  const objectForm = entry("s", "p", "v", "t");
  const tupleForm = ["s", "p", "v", "t"];
  assert.equal(entryId(objectForm), entryId(tupleForm));
});

test("entryId differs when any field differs", () => {
  const a = entry("s", "p", "v", "t");
  const b = entry("s", "p", "v2", "t");
  assert.notEqual(entryId(a), entryId(b));
});

test("sameEntry compares by canonical content, not field order", () => {
  const a = { e: "s", a: "p", v: "v", t: "t" };
  const b = { t: "t", v: "v", a: "p", e: "s" };
  assert.equal(sameEntry(a, b), true);
});

test("isEntry / asEntry accept object and tuple spelling, reject malformed rows", () => {
  assert.equal(isEntry({ e: "s", a: "p", v: "v", t: "t" }), true);
  assert.equal(isEntry(["s", "p", "v", "t"]), true);
  assert.equal(isEntry({ e: "s", a: "p" }), false);
  assert.equal(isEntry(null), false);
  assert.deepEqual(asEntry(["s", "p", "v", "t"]), { e: "s", a: "p", v: "v", t: "t" });
  assert.throws(() => assertValidEntry(["s", "p", "v"]), /four/);
});
