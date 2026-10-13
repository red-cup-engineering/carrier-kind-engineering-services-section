import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { currentReading, keepWitness, witnessesIn, PEER_LIVENESS_KIND, PEER_LIVENESS_TYPE } from "../src/peer-liveness.mjs";

test("one semantic witness told both ways remains contested through either public call form", () => {
  const root = mkdtempSync(join(tmpdir(), "peer-semantic-receiving-"));
  try {
    const journal = createSemanticRecordJournal({ root, objectKind: PEER_LIVENESS_KIND });
    const witness = { observer: "fixture", peer: "https://peer.example/actors/instance", at: "2026-10-03T00:00:00Z", window: "2026-10-03T00:00:00Z", why: "same observation" };
    assert.equal(PEER_LIVENESS_TYPE, PEER_LIVENESS_KIND);
    keepWitness(root, { ...witness, side: "none" });
    assert.equal(currentReading(witnessesIn(journal), witness.peer), "unknown");
    keepWitness(journal, { ...witness, side: "for" });
    assert.equal(currentReading(witnessesIn(root), witness.peer), "held");
    keepWitness(root, { ...witness, side: "against" });
    const rows = journal.query({ category: "heartbeat" });
    assert.equal(new Set(rows.map(row => row.id)).size, 1, "same witness content keeps one semantic identity");
    assert.ok(rows.some(row => row.told.for) && rows.some(row => row.told.against));
    assert.equal(currentReading(witnessesIn(journal), witness.peer), "contested");
    assert.equal(currentReading(witnessesIn(root), witness.peer), "contested");
    const joined = { ...witness, peer: "https://joined.example/actors/instance" };
    journal.record({ category: "heartbeat", recordedAt: joined.at, record: joined, told: { for: true, against: true } });
    assert.equal(currentReading(witnessesIn(root), joined.peer), "contested", "a genuinely joined semantic row preserves both sides");
    const denied = { ...witness, peer: "https://other.example/actors/instance" };
    keepWitness(root, { ...denied, side: "against" });
    assert.equal(currentReading(witnessesIn(journal), denied.peer), "denied");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
