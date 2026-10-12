// world-say.test — exercises scripts/world-say.mjs against a synthetic trace written to a tmp
// file (never the real data/state/world.eavt).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { constituteEntity, appendEavt, readEavtFile, fold, entityAddress } from "@red-cup-engineering/eavt";
import { say } from "../scripts/world-say.mjs";

function withTrace(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "lagoon-world-say-test-"));
  const tracePath = path.join(dir, "world.eavt");
  try {
    return fn(tracePath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedSpeakerAndPlace(tracePath) {
  const riverbed = constituteEntity({ kind: "place", attributes: { name: "riverbed" }, t: 1 });
  const inhabitant = constituteEntity({ kind: "session", attributes: { name: "test-session" }, t: 2 });
  appendEavt(tracePath, riverbed.genesisRow);
  appendEavt(tracePath, inhabitant.genesisRow);
  return { riverbed, inhabitant };
}

test("say constitutes an utterance and attributes it to its speaker and place", () => {
  withTrace((tracePath) => {
    const { riverbed, inhabitant } = seedSpeakerAndPlace(tracePath);
    const result = say(tracePath, inhabitant.address, "riverbed", "hello", 10);

    assert.ok(result.address.startsWith("utterance:"));
    assert.equal(result.place, "riverbed");
    assert.equal(result.genesisRow.e, result.address);
    assert.deepEqual(result.genesisRow.v, { text: "hello" });
    assert.deepEqual(result.spokenByRow, { e: result.address, a: "spoken-by", v: inhabitant.address, t: 10 });
    assert.deepEqual(result.spokenAtRow, { e: result.address, a: "spoken-at", v: riverbed.address, t: 10 });

    // the genesis row's own address verifies against its own content (the sketch-lane law).
    assert.equal(entityAddress(result.genesisRow), result.address);

    const rows = readEavtFile(tracePath);
    const folded = fold(result.address, rows, {});
    const spokenBy = folded.fiber.find((c) => c.predicate === "spoken-by");
    const spokenAt = folded.fiber.find((c) => c.predicate === "spoken-at");
    assert.equal(spokenBy.object, inhabitant.address);
    assert.equal(spokenAt.object, riverbed.address);
  });
});

test("say appends the genesis row and both attribution rows durably, in one call", () => {
  withTrace((tracePath) => {
    const { inhabitant } = seedSpeakerAndPlace(tracePath);
    const before = readEavtFile(tracePath).length;
    say(tracePath, inhabitant.address, "riverbed", "hello again", 11);
    const after = readEavtFile(tracePath).length;
    assert.equal(after - before, 3, "genesis + spoken-by + spoken-at, three appended rows");
  });
});

test("say throws when the named place has never been constituted", () => {
  withTrace((tracePath) => {
    const { inhabitant } = seedSpeakerAndPlace(tracePath);
    assert.throws(() => say(tracePath, inhabitant.address, "no-such-place", "hello", 10), TypeError);
  });
});
