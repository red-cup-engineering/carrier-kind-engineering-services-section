import assert from "node:assert/strict";
import test from "node:test";
import { readUtteranceAsWorkRows } from "../scripts/read-utterance-as-work-rows.mjs";

test("a MUST requirement is necessary, horizon soon", () => {
  const result = readUtteranceAsWorkRows({
    utterance: { text: "Clients MUST retry with backoff.", source: "spec-example", ts: "2026-01-01T00:00:00Z" },
    priorRows: [],
    t: "t:example-1",
  });
  assert.equal(result.requirements, 1);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].a, "constituted");
  assert.equal(result.rows[1].v.modality, "necessary");
  assert.equal(result.rows[1].v.horizon, "soon");
  assert.equal(result.rows[1].v.count, 1);
});

test("a MUST NOT requirement is determined, horizon now", () => {
  const result = readUtteranceAsWorkRows({
    utterance: { text: "A password MUST NOT be logged in plaintext.", source: "spec-example", ts: "2026-01-01T00:00:00Z" },
    priorRows: [],
    t: "t:example-2",
  });
  assert.equal(result.rows[1].v.modality, "determined");
  assert.equal(result.rows[1].v.horizon, "now");
});

test("an OPTIONAL requirement is impossible-now, horizon eventually", () => {
  const result = readUtteranceAsWorkRows({
    utterance: { text: "Caching is OPTIONAL for read replicas.", source: "spec-example", ts: "2026-01-01T00:00:00Z" },
    priorRows: [],
    t: "t:example-4",
  });
  assert.equal(result.rows[1].v.modality, "impossible-now");
  assert.equal(result.rows[1].v.horizon, "eventually");
});

test("two prior matching rows raise the third occurrence's count to 3", () => {
  const priorRows = [
    { e: "utterance:priorplaceholder", a: "requiring", v: { force: "MUST", subject: "Clients", predicate: "retry", object: "with backoff", modality: "necessary", horizon: "soon", line: 1, count: 1 }, t: "t:prior-1" },
    { e: "utterance:priorplaceholder", a: "requiring", v: { force: "MUST", subject: "Clients", predicate: "retry", object: "with backoff", modality: "necessary", horizon: "soon", line: 1, count: 2 }, t: "t:prior-2" },
  ];
  const result = readUtteranceAsWorkRows({
    utterance: { text: "Clients MUST retry with backoff.", source: "spec-example", ts: "2026-01-01T00:00:00Z" },
    priorRows,
    t: "t:example-3",
  });
  assert.equal(result.rows[1].v.count, 3);
});

test("a multi-keyword sentence yields no requirement row but surfaces its refusal", () => {
  const result = readUtteranceAsWorkRows({
    utterance: { text: "Clients MUST validate input and SHOULD log errors.", source: "spec-example", ts: "2026-01-01T00:00:00Z" },
    priorRows: [],
    t: "t:example-5",
  });
  assert.equal(result.requirements, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.refusals.length, 1);
  assert.equal(result.refusals[0].reason, "more-than-one-key-word");
});

test("refuses a missing utterance text", () => {
  assert.throws(() => readUtteranceAsWorkRows({ utterance: {}, t: "t:x" }), /utterance.text is required/u);
});
