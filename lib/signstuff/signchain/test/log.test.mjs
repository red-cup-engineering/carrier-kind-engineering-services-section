import assert from "node:assert/strict";
import test from "node:test";
import { TellingLog, telling } from "../src/log.mjs";

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
