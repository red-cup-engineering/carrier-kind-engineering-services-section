import assert from "node:assert/strict";
import test from "node:test";
import { TellingLog, telling, logOfSeavtRows } from "../src/log.mjs";
import { cell, witnessFor, witnessAgainst } from "@red-cup-engineering/signcell/cell";
import { seavtOfSignCell } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";

const decomposed = "ta\u0302che";
const composed = "tâche";
const marked = () => ({
  subject: { [decomposed]: decomposed },
  predicate: decomposed,
  object: [decomposed],
});
const equivalent = () => ({
  subject: { [composed]: composed },
  predicate: composed,
  object: [composed],
});

test("SignChain indexed queries are complete under SCA coincidence", () => {
  const log = new TellingLog();
  log.tell(marked(), { source: "alpha" });
  assert.equal(log.where({ subject: equivalent().subject }).length, 1);
  assert.equal(log.where({ predicate: equivalent().predicate }).length, 1);
  assert.equal(log.where({ object: equivalent().object }).length, 1);
  assert.equal(log.readingAt(equivalent()), "potential");
  log.deny(equivalent(), { source: "beta" });
  assert.equal(log.against({ subject: marked().subject }).length, 1);
  assert.equal(log.readingAt(marked()), "stable");
  const cells = log.cells(equivalent());
  assert.equal(cells.length, 1);
  assert.equal(cells[0].for.length, 1);
  assert.equal(cells[0].against.length, 1);
});

test("SignChain tellings keep original representatives and own provider input", () => {
  const at = marked(), witness = { payload: { text: decomposed }, observed: [1] };
  const log = new TellingLog().tell(at, witness);
  at.subject[decomposed] = "changed";
  at.object[0] = "changed";
  witness.payload.text = "changed";
  witness.observed.push(2);
  assert.deepEqual(log.rows[0].subject, { [decomposed]: decomposed });
  assert.deepEqual(log.rows[0].object, [decomposed]);
  assert.deepEqual(log.rows[0].witness, { payload: { text: decomposed }, observed: [1] });
  assert.equal(log.where({ subject: equivalent().subject }).length, 1);
  assert.equal(Object.isFrozen(log.rows[0].witness.payload), true);
  assert.throws(() => telling(marked(), undefined), /must carry a witness/);
});

test("native SEAVT rows form an SCA-witnessed SignChain with proper as-of filtration", () => {
  const t0 = "2026-10-12T13:00:00Z", t1 = "2026-10-12T13:01:00Z";
  const proposition = cell("BLK", { relation: "return", horizon: "5d" }, { valueAtomic: "500", decimals: 4 });
  const positive = witnessFor(proposition, { issuer: "filing", source: "ni:source:a" });
  const contested = witnessAgainst(positive, { issuer: "price-feed", source: "ni:source:b" });
  const early = seavtOfSignCell(positive, t0), late = seavtOfSignCell(contested, t1);
  const stream = [early, early, late];
  const whole = logOfSeavtRows(stream);
  assert.equal(whole.size, 2, "cumulative snapshots do not duplicate tellings");
  assert.equal(whole.readingAt(proposition), "stable");
  assert.deepEqual(whole.rows.map(row => row.observedAt), [t0, t1]);
  const before = logOfSeavtRows(stream, { asOf: t0 });
  assert.equal(before.size, 1);
  assert.equal(before.readingAt(proposition), "potential");
  assert.equal(logOfSeavtRows(stream, { asOf: "2026-10-12T12:59:59Z" }).size, 0);
  assert.throws(() => logOfSeavtRows([late, early]), /time-ordered/);
  assert.throws(() => logOfSeavtRows(stream, { asOf: "yesterday" }), /absolute timestamp/);
  assert.throws(() => logOfSeavtRows([
    seavtOfSignCell(cell("BLK", "future-return", "value", { value: "potential" }), t0)
  ]), /non-measured SignCell/);
});

test("as-of SignChain replay never interprets future SEAVT contents", () => {
  const t0 = "2026-10-12T13:00:00Z", t1 = "2026-10-12T14:00:00Z";
  const known = seavtOfSignCell(witnessFor(cell("asset", "claim", "value"), "source"), t0);
  const invalidFuture = { t: t1, e: ["not-a-term"], a: ["not-a-term"], v: ["not-a-term"] };
  const knownOnly = logOfSeavtRows([known], { asOf: t0 });
  const withFuture = logOfSeavtRows([known, invalidFuture], { asOf: t0 });
  assert.deepEqual(withFuture.rows, knownOnly.rows);
  assert.throws(() => logOfSeavtRows([known, invalidFuture]), /SEAVT|SEN|term/i);
});
