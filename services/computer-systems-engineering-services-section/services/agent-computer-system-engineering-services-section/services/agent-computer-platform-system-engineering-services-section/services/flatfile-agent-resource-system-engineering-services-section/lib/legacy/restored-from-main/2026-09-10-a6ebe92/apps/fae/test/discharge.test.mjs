import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DELTA_CLOSURE,
  DischargeState,
  PAIR,
  PARTITION,
  SIGMA_CLOSURE,
  deltaHolds,
  discharge,
  sigmaHolds,
} from "../src/kernel/discharge.mjs";
import { FOUR, joinKnowledge } from "../src/kernel/four.mjs";
import { correctionRecord, office, statusEvent } from "../src/kernel/record-types.mjs";
import { makeWitness } from "../src/kernel/witness.mjs";

const VECTORS_PATH = new URL("../../../lib/conformance/discharge-vectors.json", import.meta.url);
const { cases } = JSON.parse(readFileSync(VECTORS_PATH, "utf8"));

const ELEMENTS = [FOUR.neither, FOUR.true, FOUR.false, FOUR.both];

function eqFour(a, b) {
  return a.positiveEvidence === b.positiveEvidence && a.negativeEvidence === b.negativeEvidence;
}

function leqK(a, b) {
  return eqFour(joinKnowledge(a, b), b);
}

function isMonotone(f) {
  return ELEMENTS.every((a) => ELEMENTS.every((b) => !leqK(a, b) || leqK(f(a), f(b))));
}

function isClosure(f) {
  if (!isMonotone(f)) return false;
  return ELEMENTS.every((x) => leqK(x, f(x)) && eqFour(f(f(x)), f(x)));
}

// -- the synthetic four-state fixture: discharge reaches all four states --

for (const testCase of cases) {
  test(`fixture ${testCase.name}: discharges to the expected state`, () => {
    const result = discharge(testCase.record, testCase.records, testCase.witnesses);
    assert.equal(result, DischargeState[testCase.expected.toUpperCase()]);
  });
}

test("fixture covers all four states", () => {
  assert.deepEqual(
    new Set(cases.map((c) => c.expected)),
    new Set(["operative", "sat_shadow", "tr_shadow", "free_shadow"]),
  );
});

test("discharge never returns a boolean", () => {
  const testCase = cases[0];
  const result = discharge(testCase.record, testCase.records, testCase.witnesses);
  assert.equal(typeof result, "string");
  assert.notEqual(typeof result, "boolean");
});

// -- closure-law properties: sigma_t/Delta_t are genuine closures --------

test("sigma closure is a genuine closure operator", () => {
  assert.equal(isClosure(SIGMA_CLOSURE), true);
});

test("delta closure is a genuine closure operator", () => {
  assert.equal(isClosure(DELTA_CLOSURE), true);
});

test("sigma closure is idempotent and extensive on every element", () => {
  for (const element of ELEMENTS) {
    const once = SIGMA_CLOSURE(element);
    const twice = SIGMA_CLOSURE(once);
    assert.equal(leqK(element, once), true);
    assert.equal(eqFour(once, twice), true);
  }
});

test("delta closure is idempotent and extensive on every element", () => {
  for (const element of ELEMENTS) {
    const once = DELTA_CLOSURE(element);
    const twice = DELTA_CLOSURE(once);
    assert.equal(leqK(element, once), true);
    assert.equal(eqFour(once, twice), true);
  }
});

// -- the commuting square -------------------------------------------------

test("the commuting square holds on the fars fiber", () => {
  assert.equal(PAIR.commutes(ELEMENTS, eqFour), true);
});

test("the commuting square holds pointwise", () => {
  for (const element of ELEMENTS) {
    const [left, right] = PAIR.square(element);
    assert.equal(eqFour(left, right), true);
  }
});

// -- the nuclear quartet's partition matches institution.md's H*_t -------

test("stable corner is exactly the double fixed point", () => {
  assert.equal(PARTITION.stable.length, 1);
  assert.equal(eqFour(PARTITION.stable[0], FOUR.both), true);
});

test("absurd corner is the whole free carrier", () => {
  assert.equal(PARTITION.absurd.length, ELEMENTS.length);
  for (const element of ELEMENTS) {
    assert.ok(PARTITION.absurd.some((x) => eqFour(x, element)));
  }
});

// -- sigmaHolds / deltaHolds: unit coverage on hand-built records ---------

test("sigmaHolds is true when citations resolve", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const event = statusEvent({ target: clerk.id, transition: "revocation" });
  assert.equal(sigmaHolds(event, [clerk], []), true);
});

test("sigmaHolds is false when a citation is dangling", () => {
  const event = statusEvent({ target: `ni:///sha-256;${"A".repeat(43)}`, transition: "revocation" });
  assert.equal(sigmaHolds(event, [], []), false);
});

test("sigmaHolds is false when the record itself fails to validate", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const event = statusEvent({ target: clerk.id, transition: "revocation" });
  const tampered = { ...event, transition: "not-a-real-transition" };
  assert.equal(sigmaHolds(tampered, [clerk], []), false);
});

test("deltaHolds is true for a terminal status event", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const event = statusEvent({ target: clerk.id, transition: "expiry" });
  assert.equal(deltaHolds(event, [clerk], []), true);
});

test("deltaHolds is false for a non-terminal status event", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const event = statusEvent({ target: clerk.id, transition: "suspension" });
  assert.equal(deltaHolds(event, [clerk], []), false);
});

test("deltaHolds requires a declared successor to resolve", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const prior = statusEvent({ target: clerk.id, transition: "suspension" });
  const supersession = statusEvent({
    target: clerk.id,
    transition: "supersession",
    successor: `ni:///sha-256;${"A".repeat(43)}`,
  });
  assert.equal(deltaHolds(supersession, [clerk, prior], []), false);
});

test("deltaHolds is true for a recorded correction replacement", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const replacement = office({ slug: "clerk-v2", scope: "corpus" });
  const correction = correctionRecord({ target: clerk.id, replacement: replacement.id, reason: "r" });
  assert.equal(deltaHolds(correction, [clerk, replacement], []), true);
});

test("deltaHolds is false for an unrecorded correction replacement", () => {
  const clerk = office({ slug: "clerk", scope: "corpus" });
  const correction = correctionRecord({ target: clerk.id, replacement: `ni:///sha-256;${"A".repeat(43)}`, reason: "r" });
  assert.equal(deltaHolds(correction, [clerk], []), false);
});

test("deltaHolds falls back to the wit-chain-closed default path", () => {
  const archivist = office({ slug: "archivist", scope: "corpus" });
  const positive = makeWitness({
    operator: "dispatch",
    target: archivist.id,
    details: {},
    timestamp: "2026-08-19T00:00:00Z",
    kind: "guard",
    four_before: [false, false],
    four_after: [true, false],
    channel: "governance",
  });
  const negative = makeWitness({
    operator: "dispatch",
    target: archivist.id,
    details: {},
    timestamp: "2026-08-19T00:00:01Z",
    kind: "guard",
    four_before: [false, false],
    four_after: [false, true],
    channel: "governance",
  });
  assert.equal(deltaHolds(archivist, [], [positive, negative]), true);
  assert.equal(deltaHolds(archivist, [], [positive]), false);
  assert.equal(deltaHolds(archivist, [], []), false);
});
