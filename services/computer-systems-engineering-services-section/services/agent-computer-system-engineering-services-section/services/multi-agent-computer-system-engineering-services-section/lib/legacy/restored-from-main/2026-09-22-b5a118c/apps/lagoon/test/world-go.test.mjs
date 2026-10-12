// world-go.test — exercises scripts/world-go.mjs against a synthetic trace written to a tmp file
// (never the real data/state/world.eavt).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { constituteEntity, appendEavt, readEavtFile, relate } from "@red-cup-engineering/eavt";
import { go } from "../scripts/world-go.mjs";

function withTrace(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "lagoon-world-go-test-"));
  const tracePath = path.join(dir, "world.eavt");
  try {
    return fn(tracePath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedPlaces(tracePath) {
  const riverbed = constituteEntity({ kind: "place", attributes: { name: "riverbed" }, t: 1 });
  const meadow = constituteEntity({ kind: "place", attributes: { name: "meadow" }, t: 2 });
  const pebble = constituteEntity({ kind: "thing", attributes: { name: "pebble" }, t: 3 });
  appendEavt(tracePath, riverbed.genesisRow);
  appendEavt(tracePath, meadow.genesisRow);
  appendEavt(tracePath, pebble.genesisRow);
  return { riverbed, meadow, pebble };
}

test("go appends a located-in row naming the destination's resolved address", () => {
  withTrace((tracePath) => {
    const { meadow, pebble } = seedPlaces(tracePath);
    const result = go(tracePath, pebble.address, "meadow", 10);

    assert.equal(result.actor, pebble.address);
    assert.equal(result.place, "meadow");
    assert.equal(result.address, meadow.address);
    assert.deepEqual(result.row, { e: pebble.address, a: "located-in", v: meadow.address, t: 10 });

    const rows = readEavtFile(tracePath);
    assert.deepEqual(relate(rows, "located-in", meadow.address), [pebble.address]);
  });
});

test("go never edits or retracts a prior located-in row — both survive as separate witnesses", () => {
  withTrace((tracePath) => {
    const { riverbed, meadow, pebble } = seedPlaces(tracePath);
    go(tracePath, pebble.address, "riverbed", 10);
    go(tracePath, pebble.address, "meadow", 11);

    const rows = readEavtFile(tracePath);
    const locatedInRows = rows.filter((r) => r.e === pebble.address && r.a === "located-in");
    assert.equal(locatedInRows.length, 2, "both located-in witnesses remain in the trace, append-only");
    assert.deepEqual(
      locatedInRows.map((r) => r.v),
      [riverbed.address, meadow.address],
    );
  });
});

test("go throws when the named place has never been constituted", () => {
  withTrace((tracePath) => {
    const { pebble } = seedPlaces(tracePath);
    assert.throws(() => go(tracePath, pebble.address, "no-such-place", 10), TypeError);
  });
});
