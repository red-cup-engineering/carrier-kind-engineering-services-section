import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { away, currentReading, heartbeat, notePeerRun, PEER_LIVENESS_KIND, projectLiveness, readingAt, suspicion, windowOf, witnessesIn } from "../src/peer-liveness.mjs";

// Obsmetrologia, predication-failure-detection-as-bilattice-modal-suspicion: the four suspicion
// levels are FOUR on alive(observer, peer); ⊥ until the threshold θ; transitions only move up the
// knowledge order; observers that disagree join to ⊤; a Boolean detector is a policy projection.

const A = "https://cold-red-gate.example";
const B = "https://bare-cedar-fog.example";
const PEER = "https://soft-grass-pebble.example/actors/hai-wenbo";
const at = (minutes) => new Date(Date.UTC(2026, 9, 10, 0, minutes)).toISOString();
const policy = { thresholdSeconds: 3600, windowSeconds: 300 };

function withJournal(run) {
  const root = mkdtempSync(path.join(tmpdir(), "peer-liveness-"));
  try { return run(createSemanticRecordJournal({ root, objectKind: PEER_LIVENESS_KIND })); }
  finally { rmSync(root, { recursive: true, force: true }); }
}
const awayRun = { shipped: 0, failed: [{ away: true }] };
const answeredRun = { shipped: 2, failed: [] };

test("a peer that is away below its threshold reads unknown, never denied", () => withJournal((journal) => {
  for (const minutes of [0, 10, 20, 50]) {
    const noted = notePeerRun(journal, { observer: A, peer: PEER, now: at(minutes), ...awayRun, ...policy });
    assert.equal(noted.reading, "unknown");
  }
  const kept = journal.query({ category: "heartbeat" });
  assert.ok(kept.length >= 4);
  assert.ok(kept.every(({ told }) => told.for === false && told.against === false), "away is kept told neither way (⊥)");
}));

test("past the threshold the peer reads denied, and a later heartbeat never lowers that window", () => withJournal((journal) => {
  notePeerRun(journal, { observer: A, peer: PEER, now: at(0), ...answeredRun, ...policy });
  assert.equal(notePeerRun(journal, { observer: A, peer: PEER, now: at(30), ...awayRun, ...policy }).reading, "held");
  const suspected = notePeerRun(journal, { observer: A, peer: PEER, now: at(65), ...awayRun, ...policy });
  assert.equal(suspected.reading, "denied");
  assert.equal(suspected.silentSeconds, 3900);
  const back = notePeerRun(journal, { observer: A, peer: PEER, now: at(90), ...answeredRun, ...policy });
  assert.equal(back.reading, "held", "a new window opens with the heartbeat");
  assert.equal(readingAt(witnessesIn(journal), PEER, windowOf(at(65), 300)), "denied", "the suspected window is not retracted");
}));

test("a heartbeat recorded late is evidence at its own window, not a retraction of a later suspicion", () => {
  const witnesses = [
    away({ observer: A, peer: PEER, at: at(0) }),
    { ...suspicion([away({ observer: A, peer: PEER, at: at(0) })], { observer: A, peer: PEER, now: at(70), ...policy }) },
  ];
  const late = heartbeat({ observer: A, peer: PEER, at: at(20) });
  const all = [...witnesses, late];
  assert.equal(readingAt(all, PEER, windowOf(at(70))), "denied");
  assert.equal(readingAt(all, PEER, windowOf(at(20))), "held");
});

test("a known-intermittent peer's silence stays unknown however long it lasts", () => withJournal((journal) => {
  notePeerRun(journal, { observer: A, peer: PEER, now: at(0), ...answeredRun, presence: "known-intermittent", ...policy });
  for (const minutes of [70, 600, 6000]) {
    const noted = notePeerRun(journal, { observer: A, peer: PEER, now: at(minutes), ...awayRun, presence: "known-intermittent", ...policy });
    assert.equal(noted.reading, "held", "its last told window stays its reading");
  }
  assert.ok(witnessesIn(journal).every((w) => w.side !== "against"), "no evidence against is ever written");
}));

test("two observers that disagree on one window join to contested (split-brain)", () => {
  const window = at(65);
  const fromA = suspicion([away({ observer: A, peer: PEER, at: at(0) })], { observer: A, peer: PEER, now: window, ...policy });
  const fromB = heartbeat({ observer: B, peer: PEER, at: at(66) });
  assert.equal(readingAt([fromA, fromB], PEER, windowOf(window)), "contested");
  assert.equal(currentReading([fromA, fromB], PEER), "contested");
});

test("a run with nothing to send observes nothing and fires nothing", () => withJournal((journal) => {
  notePeerRun(journal, { observer: A, peer: PEER, now: at(0), ...awayRun, ...policy });
  const idle = notePeerRun(journal, { observer: A, peer: PEER, now: at(500), shipped: 0, failed: [], ...policy });
  assert.equal(idle.reading, "unknown");
  assert.ok(witnessesIn(journal).every((w) => w.side === "none"));
}));

test("a refusal is an answer: the peer is alive, and trust is another matter", () => withJournal((journal) => {
  const noted = notePeerRun(journal, { observer: A, peer: PEER, now: at(0), shipped: 0, failed: [{ away: false }], ...policy });
  assert.equal(noted.reading, "held");
}));

test("a Boolean detector is a projection of the reading chosen by policy", () => {
  assert.equal(projectLiveness("unknown", "optimistic"), true);
  assert.equal(projectLiveness("unknown", "pessimistic"), false);
  assert.equal(projectLiveness("held", "pessimistic"), true);
  assert.equal(projectLiveness("denied", "optimistic"), false);
  assert.equal(projectLiveness("contested", "optimistic"), false);
  assert.throws(() => projectLiveness("unknown", "coin-flip"), /projection policy/u);
});
