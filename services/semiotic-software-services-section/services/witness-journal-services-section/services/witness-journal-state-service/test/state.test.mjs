import { test } from "node:test";
import assert from "node:assert/strict";

import { latestPerCell, situationWindow, reading } from "../src/index.mjs";

const entries = [
  { e: "urn:locus:1", a: "urn:rmn:status", v: "open", t: "2026-07-01T00:00:00.000Z" },
  { e: "urn:locus:1", a: "urn:rmn:status", v: "closed", t: "2026-07-02T00:00:00.000Z" },
  { e: "urn:locus:2", a: "urn:rmn:status", v: "open", t: "2026-07-01T00:00:00.000Z" },
];

test("latestPerCell picks the latest-by-time value per cell, one answer each", () => {
  const view = latestPerCell(entries);
  const keys = Object.keys(view);
  assert.equal(keys.length, 2, "two distinct e/a cells");
  const locus1 = Object.values(view).find((cell) => cell.e === "urn:locus:1");
  assert.equal(locus1.value, "closed");
  const locus2 = Object.values(view).find((cell) => cell.e === "urn:locus:2");
  assert.equal(locus2.value, "open");
});

test("latestPerCell result carries no charge field anywhere", () => {
  const view = latestPerCell(entries);
  for (const cell of Object.values(view)) {
    assert.equal("charge" in cell, false);
  }
});

test("situationWindow narrows by since/until against canonical time", () => {
  const windowed = situationWindow(entries, { since: "2026-07-02T00:00:00.000Z" });
  assert.equal(windowed.length, 1);
  assert.equal(windowed[0].v, "closed");
});

test("situationWindow narrows by an arbitrary filter predicate", () => {
  const windowed = situationWindow(entries, { filter: (row) => row.e === "urn:locus:2" });
  assert.equal(windowed.length, 1);
  assert.equal(windowed[0].e, "urn:locus:2");
});

test("reading over the full log shows a contested-locus cell, with no stored charge anywhere", () => {
  const result = reading(entries);
  const locus1 = Object.values(result).find((cell) => cell.e === "urn:locus:1");
  assert.equal(locus1.contested, true, "two distinct values were witnessed for this cell");
  assert.equal(locus1.values.length, 2);
  assert.equal(locus1.latest.value, "closed");

  const locus2 = Object.values(result).find((cell) => cell.e === "urn:locus:2");
  assert.equal(locus2.contested, false);

  // The Law: contradiction is situational, never a stored field. Assert
  // that nowhere in this reading does a "charge" key appear.
  for (const cell of Object.values(result)) {
    assert.equal("charge" in cell, false);
    for (const value of cell.values) assert.equal("charge" in value, false);
  }
});

test("the same cell stops being contested once the situation excludes the disagreement", () => {
  const narrowed = reading(entries, { since: "2026-07-02T00:00:00.000Z" });
  const locus1 = Object.values(narrowed).find((cell) => cell.e === "urn:locus:1");
  assert.equal(locus1.contested, false, "the situation admits only one witnessed value now");
  assert.equal(locus1.values.length, 1);
  assert.equal(locus1.values[0].value, "closed");
});

test("an empty situation window yields an empty reading", () => {
  const result = reading(entries, { filter: () => false });
  assert.deepEqual(result, {});
});
