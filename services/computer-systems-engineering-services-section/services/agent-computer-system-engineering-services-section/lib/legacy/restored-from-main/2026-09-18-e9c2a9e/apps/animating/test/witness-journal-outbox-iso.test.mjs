/**
 * WitnessJournal ⇄ WMAP — the outbox IS the log.
 *
 * Proof of the WitnessJournal note's headline (cooler than WASM/ActivityPub): an agent's AS2
 * `outbox` and an EAVT witness `log` are two CHANNEL-CODES of one information source.
 * The claim is NOT "you can convert one format to the other" (that is just two
 * formats); it is that the conversion is a structure-preserving isomorphism — lossless
 * AND merge-commuting AND conflict-preserving — verified here against the REAL
 * witness-journal machinery (`appendEntries`, `reading`) and the REAL across-face
 * reader (`answer`). (Repointed off relating's src/ledger to the witness-journal
 * seats — the dissolution's ledger-class capability move; relating's coherence
 * kernel, a different capability, stayed in relating.)
 *
 * The functor: F = activityCell (Activity → EAVT witness), G = activityFromCell.
 *
 * L1  round-trip / lossless channel:        G ∘ F = id on canonical activities.
 * L2  surprisal-dedup:                      a repeated witness is 0 bits (idempotent append).
 * L3  ⊤-preservation:                       assert + Undo is held as ⊤ on BOTH channels.
 * L4  the bulk merge-square + the seam:     state's distinct standings = the time-forgotten
 *                                           merge partition; the log is a strict time-refinement.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { activityCell, activityFromCell, standingKey, answer } from "../dist/index.mjs";
import { appendEntries } from "@red-cup-engineering/witness-journal-log-service";
import { reading as journalReading } from "@red-cup-engineering/witness-journal-state-service";
import { canonical } from "@red-cup-engineering/computer-data-engine/json";

// A canonical outbox activity, minted through G so it is exactly the wire form the
// agent's outbox leg emits (type ∈ {Create, Undo}, Note object, optional published).
const mk = (actor, claim, { deny = false, published } = {}) =>
  activityFromCell({ e: actor, a: claim, v: deny ? "deny" : "assert", t: published ?? "" });

const ACTOR = "https://dev.bare-cedar-fog.emsenn.net/agents/claude";
const tempRoots = [];
// witness-journal-log-service dates every write under <root>/data/logs/YYYY/MM/DD/
// off the row's own witness time; a bare tempdir is the journal's custody root.
const tempRoot = () => {
  const dir = mkdtempSync(join(tmpdir(), "witness-journal-iso-"));
  tempRoots.push(dir);
  return dir;
};
test.after(() => { for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true }); });

// ── L1: the channel is lossless — G ∘ F = id (round-trip on canonical activities) ──
test("L1 round-trip: the outbox⇄log channel loses nothing (G ∘ F = id)", () => {
  const activities = [
    mk(ACTOR, "the-sky|blue"),
    mk(ACTOR, "the-sky|blue", { deny: true }),
    mk(ACTOR, "the-grass|green", { published: "2026-06-25T00:00:00Z" }),
    mk("https://other.example/agents/ada", "pi|three", { deny: true, published: "2026-01-01" }),
  ];
  for (const a of activities) {
    assert.deepEqual(activityFromCell(activityCell(a)), a, "an activity must survive the round trip through its witness");
  }
});

// ── L2: a repeated witness carries zero bits (surprisal law = the ledger's dedup) ──
test("L2 surprisal-dedup: re-witnessing the same act is 0 bits (idempotent append)", () => {
  const root = tempRoot();
  const row = activityCell(mk(ACTOR, "the-sky|blue", { published: "t1" }));
  assert.equal(appendEntries(root, "outbox", [row], row.t).appended, 1, "first witness is new information");
  assert.equal(appendEntries(root, "outbox", [row], row.t).appended, 0, "the identical witness adds nothing");
});

// ── L3: conflict is held as ⊤ on BOTH channels (paraconsistent, no witness dropped) ──
test("L3 ⊤-preservation: assert + Undo is held as ⊤ on the outbox AND the log", () => {
  const claim = "the-sky|blue";
  const asserted = mk(ACTOR, claim);
  const undone = mk(ACTOR, claim, { deny: true });

  // WMAP channel: the across-face reader sees a held contradiction (knows-both = ⊤).
  assert.equal(answer([asserted, undone], claim), "stable", "the outbox reads assert+Undo as ⊤");

  // WitnessJournal channel: a witness-journal reading over the whole (unwindowed) situation
  // retains every distinct value it saw for the cell — nothing is dropped to reach
  // a verdict, and the reading marks the cell contested rather than picking a side.
  const log = [activityCell(asserted), activityCell(undone)];
  const view = journalReading(log); // no situation supplied ⇒ the widest possible reading
  const cell = view[canonical([ACTOR, claim])];
  assert.deepEqual(cell.values.map((v) => v.value).sort(), ["assert", "deny"], "the log holds both witnesses — ⊤, no drop");
  assert.equal(cell.contested, true, "held disagreement reads as a contested reading, not a dropped one");
});

// ── L4: the merge-square commutes at the bulk, and the time-seam is real ──
test("L4 bulk merge-square + seam: state's standings = the time-forgotten merge partition", () => {
  // Two acts identical in (who, polarity, what) but witnessed at DIFFERENT times.
  const a1 = mk(ACTOR, "x|y", { published: "t1" });
  const a2 = mk(ACTOR, "x|y", { published: "t2" });

  // SEAM — the log distinguishes them (entryId carries time): both rows are new.
  const root = tempRoot();
  const row1 = activityCell(a1);
  const row2 = activityCell(a2);
  const n1 = appendEntries(root, "f", [row1], row1.t).appended;
  const n2 = appendEntries(root, "f", [row2], row2.t).appended;
  assert.equal(n1 + n2, 2, "the log keeps time-distinct re-witnesses — it is the richer source");

  // …but their merge identity (time-forgotten) collapses to ONE standing.
  assert.equal(standingKey(row1), standingKey(row2), "merge forgets time");

  // SQUARE — over a mixed batch, the state reading's distinct standings equal exactly
  // the merge partition (organizing's mergeActivities dedup, specified by standingKey).
  const batch = [
    a1, a2,
    mk(ACTOR, "x|y", { deny: true }),
    mk(ACTOR, "the-sky|blue"),
    mk("https://other.example/agents/ada", "x|y"),
  ];
  const log = batch.map((a) => activityCell(a));
  const view = journalReading(log);

  const standingsFromState = new Set();
  for (const cell of Object.values(view)) {
    for (const { value } of cell.values) standingsFromState.add(`${cell.e}|${value}|${cell.a}`);
  }
  const standingsFromMerge = new Set(log.map(standingKey));

  assert.deepEqual(standingsFromState, standingsFromMerge, "the square commutes at the bulk: state ≅ merged outbox");
  assert.equal(standingsFromMerge.size, 4, "5 timed witnesses collapse to 4 standings (a1,a2 share one)");
});
