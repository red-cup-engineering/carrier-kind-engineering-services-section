import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as joinPath } from "node:path";
import { gardenGame } from "../examples/garden.mjs";
import { createEngine, join, step, submit } from "../src/engine.mjs";
import { decodeSnapshot, encodeSnapshot, loadEngine, loadJsonSnapshot, saveEngine, saveJsonSnapshot, snapshotEngine } from "../src/persistence.mjs";
import { placeOf } from "../src/world.mjs";

function playedEngine() {
  let engine = join(createEngine(gardenGame), "alice");
  engine = submit(engine, { actor: "alice", command: "take lantern" });
  engine = step(engine).engine;
  engine = submit(engine, { actor: "alice", command: "go north" });
  return engine;
}

test("an engine round-trips exactly with its pending command frontier", () => {
  const engine = playedEngine();
  const restored = decodeSnapshot(encodeSnapshot(engine));
  assert.deepEqual(snapshotEngine(restored), snapshotEngine(engine));
  assert.equal(placeOf(restored.world, "lantern"), "alice");
  assert.equal(restored.queue[0].command, "go north");
});

test("downstream JSON snapshots replace atomically and reject non-JSON state", async () => {
  const directory = await mkdtemp(joinPath(tmpdir(), "fizzos-json-"));
  try {
    const path = joinPath(directory, "state.json");
    await saveJsonSnapshot(path, { tick: 3, actors: ["alice"] });
    assert.deepEqual(await loadJsonSnapshot(path), { tick: 3, actors: ["alice"] });
    await assert.rejects(saveJsonSnapshot(path, { bad: Number.NaN }), /finite/u);
    assert.deepEqual(await loadJsonSnapshot(path), { tick: 3, actors: ["alice"] }, "rejected state does not replace the prior snapshot");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("durable storage atomically replaces prior saves and corrupt data falls back", async () => {
  const directory = await mkdtemp(joinPath(tmpdir(), "fizzos-persistence-"));
  try {
    const path = joinPath(directory, "world.json");
    const fresh = join(createEngine(gardenGame), "alice");
    const played = playedEngine();
    await saveEngine(path, fresh);
    const first = await readFile(path, "utf8");
    await saveEngine(path, played);
    const second = await readFile(path, "utf8");
    assert.notEqual(first, second);
    assert.deepEqual(snapshotEngine(await loadEngine(path)), snapshotEngine(played));

    await writeFile(path, "not json", "utf8");
    assert.strictEqual(await loadEngine(path, { fallback: fresh }), fresh);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
