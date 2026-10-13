import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { each, get, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { currentReading, keepWitness, witnessesIn, PEER_LIVENESS_KIND, PEER_LIVENESS_TYPE, PEER_LIVENESS_EVIDENCE_TYPE } from "../src/peer-liveness.mjs";

test("native EAVT custody shares the exact witness identity across opposing valuations", () => {
  const root = mkdtempSync(join(tmpdir(), "peer-native-receiving-"));
  try {
    const witness = { observer: "fixture", peer: "https://peer.example/actors/instance",
      at: "2026-10-03T00:00:00Z", window: "2026-10-03T00:00:00Z", why: "same observation" };
    assert.equal(PEER_LIVENESS_TYPE, PEER_LIVENESS_KIND);
    const id = keepWitness(root, { ...witness, side: "none" });
    assert.equal(get(root, PEER_LIVENESS_KIND, id).peer, witness.peer);
    assert.equal(currentReading(witnessesIn(root), witness.peer), "unknown");
    assert.equal(keepWitness(root, { ...witness, side: "for" }), id);
    assert.equal(currentReading(witnessesIn(root), witness.peer), "held");
    assert.equal(keepWitness(root, { ...witness, side: "against" }), id);
    assert.equal(currentReading(witnessesIn(root), witness.peer), "contested");
    assert.equal([...each(root, PEER_LIVENESS_KIND, { strict: true })].length, 1, "one immutable source witness");
    assert.equal([...each(root, PEER_LIVENESS_EVIDENCE_TYPE, { strict: true })].length, 3, "three independently told sides");
    assert.equal(keepWitness(root, { ...witness, side: "against" }), id);
    assert.equal([...each(root, PEER_LIVENESS_EVIDENCE_TYPE, { strict: true })].length, 3, "idempotent repeat");
    const other = { ...witness, peer: "https://other.example/actors/instance" };
    keepWitness(root, { ...other, side: "against" });
    assert.equal(currentReading(witnessesIn(root), other.peer), "denied");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the native store refuses an unconverted legacy layout instead of hiding old peer history", () => {
  const root = mkdtempSync(join(tmpdir(), "peer-native-legacy-"));
  try {
    mkdirSync(join(root,"data","journals"), {recursive:true});
    assert.throws(() => witnessesIn(root), /convert it first/);
    assert.throws(() => keepWitness(root, {observer:"o",peer:"p",at:"2026-10-03T00:00:00Z",side:"for"}), /convert it first/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("malformed valuations and missing original witness cannot masquerade as an alive peer", () => {
  const root = mkdtempSync(join(tmpdir(), "peer-native-incomplete-"));
  try {
    assert.throws(() => keepWitness(root, { side:"fake", peer:"peer", at:"2026-10-03T00:00:00Z"}), /sourced/);
    const first = keepWitness(root, {observer:"o",peer:"peer",at:"2026-10-03T00:00:00Z",window:"2026-10-03T00:00:00Z",side:"none"});
    assert.ok(first.startsWith("ni:///sha-256;"));
    put(root, PEER_LIVENESS_EVIDENCE_TYPE, {kind:"heartbeat",witness:"ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",side:"for",at:"2026-10-03T00:00:00Z"});
    assert.throws(() => witnessesIn(root), /no held source witness/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
