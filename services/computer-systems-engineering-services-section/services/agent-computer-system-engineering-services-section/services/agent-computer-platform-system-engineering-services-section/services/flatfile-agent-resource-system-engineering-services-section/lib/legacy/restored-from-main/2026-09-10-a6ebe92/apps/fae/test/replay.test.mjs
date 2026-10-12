import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { appendSeavt, logPathFor } from "../src/kernel/event-log.mjs";
import { FOUR, four } from "../src/kernel/four.mjs";
import { identity } from "../src/kernel/identity.mjs";
import { getRecord, putRecord } from "../src/kernel/record-store.mjs";
import { observation } from "../src/kernel/record-types.mjs";
import {
  CausalOrderViolation,
  CorruptedLogLineError,
  EMPTY_STATE,
  channelsOf,
  replayEventLog,
  serializeState,
} from "../src/kernel/replay.mjs";
import { seavt } from "../src/kernel/seavt.mjs";
import { makeWitness } from "../src/kernel/witness.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

function withTempRoot(fn) {
  const root = makeTempRoot("fars-replay-");
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function withTwoTempRoots(fn) {
  const a = makeTempRoot("fars-replay-a-");
  const b = makeTempRoot("fars-replay-b-");
  try {
    return fn(a, b);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
}

function witnessFixture({
  target,
  before_digest = null,
  after_digest = null,
  four_before,
  four_after,
  timestamp,
  operator = "fm_add",
  details = {},
  channel = "substrate",
}) {
  return makeWitness({
    operator,
    target,
    before_digest,
    after_digest,
    details,
    agent: "morgan",
    timestamp,
    kind: "mutation",
    four_before,
    four_after,
    channel,
  });
}

// Mirrors operator/edit.mjs's own gate-then-write tail (S5 steps 9-10):
// the SEAVT row lands in the composed journal, the witness's full body in
// the content-addressed record store keyed by the same id the row's v
// coordinate carries.
function appendWitness(root, witness) {
  appendSeavt(root, witness.channel, [seavt(witness.target, witness.operator, witness.id, witness.timestamp)], witness.timestamp);
  putRecord(root, witness);
}

// -- empty log ---------------------------------------------------------

test("replay of an empty log is the empty state", () => {
  withTempRoot((root) => {
    const state = replayEventLog(root);
    assert.deepEqual(state, EMPTY_STATE);
    assert.deepEqual(serializeState(state), serializeState(EMPTY_STATE));
  });
});

test("an unreadable log location is not silently projected as an empty log", () => {
  withTempRoot((root) => {
    mkdirSync(path.join(root, "data"), { recursive: true });
    writeFileSync(path.join(root, "data", "logs"), "not a directory", "utf8");
    assert.throws(() => replayEventLog(root), { code: "ENOTDIR" });
  });
});

// -- belief folding ------------------------------------------------------

test("belief folds independent targets separately", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "concepts/alpha.md",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
    });
    const w2 = witnessFixture({
      target: "concepts/beta.md",
      after_digest: "d2",
      four_before: [false, false],
      four_after: [false, true],
      timestamp: "2026-08-19T00:00:01Z",
    });
    appendWitness(root, w1);
    appendWitness(root, w2);
    const state = replayEventLog(root);
    assert.deepEqual(state.belief, { "concepts/alpha.md": FOUR.true, "concepts/beta.md": FOUR.false });
    assert.deepEqual(state.records, {});
  });
});

test("belief folds a target across two witnesses by knowledge join", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "x",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
    });
    const w2 = witnessFixture({
      target: "x",
      before_digest: "d1",
      after_digest: "d2",
      four_before: [true, false],
      four_after: [true, true],
      timestamp: "2026-08-19T00:00:01Z",
    });
    appendWitness(root, w1);
    appendWitness(root, w2);
    const state = replayEventLog(root);
    assert.deepEqual(state.belief, { x: FOUR.both });
  });
});

test("belief folds across channels", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "x",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
      channel: "substrate",
    });
    const w2 = witnessFixture({
      target: "y",
      after_digest: "d2",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:01Z",
      channel: "learning",
    });
    appendWitness(root, w1);
    appendWitness(root, w2);
    assert.deepEqual(channelsOf(root), ["learning", "substrate"]);
    const state = replayEventLog(root);
    assert.deepEqual(state.belief, { x: FOUR.true, y: FOUR.true });
  });
});

test("replay accepts an explicit channel subset", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "x",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
      channel: "substrate",
    });
    const w2 = witnessFixture({
      target: "y",
      after_digest: "d2",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:01Z",
      channel: "learning",
    });
    appendWitness(root, w1);
    appendWitness(root, w2);
    const state = replayEventLog(root, { channels: ["substrate"] });
    assert.deepEqual(state.belief, { x: FOUR.true });
  });
});

// -- record registry -----------------------------------------------------

test("a record-creation witness registers the record", () => {
  withTempRoot((root) => {
    const guard = witnessFixture({
      target: "offices/librarian",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
      operator: "dispatch",
      channel: "governance",
    });
    appendWitness(root, guard);

    const record = observation({ accord: "memory", proposition: "alpha exists", witness_id: guard.id, agent: "morgan" });
    const creation = witnessFixture({
      target: record.id,
      after_digest: identity(record),
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:01Z",
      operator: "record_observation",
      details: { record },
      channel: "learning",
    });
    appendWitness(root, creation);

    const state = replayEventLog(root);
    assert.deepEqual(state.records, { [record.id]: record });
    assert.deepEqual(state.belief[record.id], FOUR.true);
    assert.deepEqual(state.belief["offices/librarian"], FOUR.true);
  });
});

// -- witness registry ------------------------------------------------------

test("replay indexes every witness it resolved, by its own id", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "x",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
    });
    const w2 = witnessFixture({
      target: "x",
      before_digest: "d1",
      after_digest: "d2",
      four_before: [true, false],
      four_after: [true, true],
      timestamp: "2026-08-19T00:00:01Z",
    });
    appendWitness(root, w1);
    appendWitness(root, w2);
    const state = replayEventLog(root);
    assert.deepEqual(Object.keys(state.witnesses).sort(), [w1.id, w2.id].sort());
    assert.deepEqual(state.witnesses[w1.id], w1);
    assert.deepEqual(state.witnesses[w2.id], w2);
  });
});

test("empty replay's witnesses index is empty, matching EMPTY_STATE", () => {
  withTempRoot((root) => {
    const state = replayEventLog(root);
    assert.deepEqual(state.witnesses, {});
    assert.deepEqual(state, EMPTY_STATE);
  });
});

test("serializeState folds the witness index into its canonical bytes", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "x",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
    });
    appendWitness(root, w1);
    const state = replayEventLog(root);
    const bytes = serializeState(state);
    const body = JSON.parse(bytes.toString("utf8"));
    assert.deepEqual(Object.keys(body.witnesses), [w1.id]);
    assert.equal(body.witnesses[w1.id].operator, "fm_add");
  });
});

test("record creation with a mismatched target is corrupted", () => {
  withTempRoot((root) => {
    const record = observation({ accord: "memory", proposition: "p", witness_id: identity("some other witness"), agent: "morgan" });
    const creation = witnessFixture({
      target: "not-the-record-id",
      after_digest: identity(record),
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
      details: { record },
    });
    appendWitness(root, creation);
    assert.throws(() => replayEventLog(root), { code: "corrupted-log-line", message: /witnesses the creation of/ });
  });
});

test("record creation with an invalid record body is corrupted", () => {
  withTempRoot((root) => {
    const badRecord = { type: "Observation", id: "ni:///sha-256;" + "a".repeat(43) };
    const creation = witnessFixture({
      target: badRecord.id,
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
      details: { record: badRecord },
    });
    appendWitness(root, creation);
    assert.throws(() => replayEventLog(root), { code: "corrupted-log-line", message: /invalid/ });
  });
});

// -- corrupted lines -------------------------------------------------------

test("a dangling witness reference is refused as corrupted", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    appendSeavt(root, "substrate", [seavt("x", "fm_add", "ni:///sha-256;" + "a".repeat(43), at)], at);
    assert.throws(() => replayEventLog(root), { code: "corrupted-log-line", message: /record store does not resolve/ });
  });
});

test("an SRN-grammar violation the composed reader refuses to parse is corrupted", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const file = logPathFor(root, "substrate", at);
    mkdirSync(path.dirname(file), { recursive: true });
    const line = { e: "not-valid-hex!!", a: "666d5f616464", v: "6162636465", t: at };
    writeFileSync(file, `${JSON.stringify(line)}\n`, "utf8");
    assert.throws(() => replayEventLog(root), CorruptedLogLineError);
  });
});

test("a witness with a tampered content identity is refused as corrupted", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const tampered = {
      type: "Witness",
      id: identity("a different body entirely"),
      operator: "fm_add",
      target: "x",
      before_digest: null,
      after_digest: null,
      details: {},
      agent: null,
      timestamp: at,
      kind: "mutation",
      four_before: [false, false],
      four_after: [true, false],
      channel: "substrate",
      conveys_authority: false,
    };
    putRecord(root, tampered);
    appendSeavt(root, "substrate", [seavt("x", "fm_add", tampered.id, at)], at);
    assert.throws(() => replayEventLog(root), { code: "corrupted-log-line", message: /content identity mismatch/ });
  });
});

test("a witness whose journal row disagrees with its own resolved content is corrupted", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const witness = witnessFixture({
      target: "x",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: at,
    });
    putRecord(root, witness);
    appendSeavt(root, "substrate", [seavt("not-x", witness.operator, witness.id, at)], at);
    assert.throws(() => replayEventLog(root), { code: "corrupted-log-line", message: /disagrees with witness/ });
    assert.equal(getRecord(root, witness.id).target, "x");
  });
});

// -- causal reordering -----------------------------------------------------

test("a before_digest contradicting the chain is refused", () => {
  withTempRoot((root) => {
    const w1 = witnessFixture({
      target: "x",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
    });
    const w2 = witnessFixture({
      target: "x",
      before_digest: "wrong-digest",
      after_digest: "d2",
      four_before: [true, false],
      four_after: [true, true],
      timestamp: "2026-08-19T00:00:01Z",
    });
    appendWitness(root, w1);
    appendWitness(root, w2);
    assert.throws(() => replayEventLog(root), { code: "causal-order-violation", message: /does not match/ });
    assert.throws(() => replayEventLog(root), CausalOrderViolation);
  });
});

test("the first witness for a target may have a before_digest", () => {
  withTempRoot((root) => {
    const w = witnessFixture({
      target: "x",
      before_digest: "pre-existing-content",
      after_digest: "d1",
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:00Z",
    });
    appendWitness(root, w);
    const state = replayEventLog(root);
    assert.deepEqual(state.belief, { x: FOUR.true });
  });
});

// -- determinism -------------------------------------------------------

function seedLog(root) {
  const w1 = witnessFixture({
    target: "concepts/alpha.md",
    after_digest: identity("alpha body"),
    four_before: [false, false],
    four_after: [true, false],
    timestamp: "2026-08-19T00:00:00Z",
    channel: "substrate",
  });
  appendWitness(root, w1);
  const w2 = witnessFixture({
    target: "concepts/alpha.md",
    before_digest: identity("alpha body"),
    after_digest: identity("alpha body v2"),
    four_before: [true, false],
    four_after: [true, true],
    timestamp: "2026-08-19T00:00:01Z",
    channel: "substrate",
  });
  appendWitness(root, w2);
  const w3 = witnessFixture({
    target: "concepts/beta.md",
    after_digest: identity("beta body"),
    four_before: [false, false],
    four_after: [false, true],
    timestamp: "2026-08-19T00:00:02Z",
    operator: "lesson",
    channel: "learning",
  });
  appendWitness(root, w3);
}

test("replaying the same log twice from empty state is byte-identical", () => {
  withTempRoot((root) => {
    seedLog(root);
    const first = replayEventLog(root);
    const second = replayEventLog(root);
    assert.deepEqual(first, second);
    assert.deepEqual(serializeState(first), serializeState(second));
  });
});

test("two independently seeded identical logs replay identically", () => {
  withTwoTempRoots((rootA, rootB) => {
    seedLog(rootA);
    seedLog(rootB);
    assert.deepEqual(serializeState(replayEventLog(rootA)), serializeState(replayEventLog(rootB)));
  });
});

// -- any legal witness sequence replays deterministically -----------------

// A small deterministic PRNG (mulberry32) stands in for hypothesis: fixed
// seed, so the sequences generated below are the same on every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TARGETS = ["p", "q", "r"];
const LEGAL_STEPS = { neither: ["true", "false"], true: ["both"], false: ["both"], both: [] };
const FOUR_BY_NAME = { neither: FOUR.neither, true: FOUR.true, false: FOUR.false, both: FOUR.both };

function bits(name) {
  return [FOUR_BY_NAME[name].positiveEvidence, FOUR_BY_NAME[name].negativeEvidence];
}

function legalWitnessSequence(rand, maxSteps) {
  const state = Object.fromEntries(TARGETS.map((t) => [t, "neither"]));
  const lastDigest = Object.fromEntries(TARGETS.map((t) => [t, null]));
  const witnesses = [];
  const steps = Math.floor(rand() * (maxSteps + 1));
  for (let tick = 0; tick < steps; tick += 1) {
    const available = TARGETS.filter((t) => LEGAL_STEPS[state[t]].length > 0);
    if (available.length === 0) break;
    const target = available[Math.floor(rand() * available.length)];
    const options = LEGAL_STEPS[state[target]];
    const nextName = options[Math.floor(rand() * options.length)];
    const afterDigest = identity({ target, tick });
    const witness = witnessFixture({
      target,
      before_digest: lastDigest[target],
      after_digest: afterDigest,
      four_before: bits(state[target]),
      four_after: bits(nextName),
      timestamp: `2026-08-19T00:${String(tick).padStart(2, "0")}:00Z`,
    });
    witnesses.push(witness);
    state[target] = nextName;
    lastDigest[target] = afterDigest;
  }
  return witnesses;
}

test("any legal witness sequence replays to the same state twice", () => {
  const rand = mulberry32(20260819);
  for (let i = 0; i < 40; i += 1) {
    withTwoTempRoots((rootA, rootB) => {
      const witnesses = legalWitnessSequence(rand, 12);
      for (const witness of witnesses) {
        appendWitness(rootA, witness);
        appendWitness(rootB, witness);
      }
      const first = replayEventLog(rootA);
      assert.deepEqual(serializeState(first), serializeState(replayEventLog(rootB)));
      assert.deepEqual(first, replayEventLog(rootA));
    });
  }
});
