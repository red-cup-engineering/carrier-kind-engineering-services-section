import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { snapshotEngine } from "@red-cup-engineering/feltos/persistence";
import { STARTER_WORLD_GAME, starterWorldRuntime } from "@red-cup-engineering/feltos/starter-world";
import { openWorldStore, resolveWorldBackend } from "../src/world-store.mjs";
import { startFakeGcs } from "../src/fake-gcs.mjs";

// The fake GCS double never checks the Authorization header, so tests hand openWorldStore a
// plain fetch as its `request` implementation to bypass gcs-client's default token layer
// (which would otherwise try to reach the real, unreachable-in-this-sandbox metadata server).
const unauthenticatedRequest = (url, init) => fetch(url, init);

function withFakeGcs(bucket, opts = {}) {
  return async (t, run) => {
    const fake = await startFakeGcs(bucket);
    t.after(() => fake.close());
    const store = openWorldStore(
      { kind: "bucket", bucket, object: opts.object ?? "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
    );
    await run({ fake, store });
  };
}

test("resolveWorldBackend: neither var set -> none (in-memory only)", () => {
  assert.deepEqual(resolveWorldBackend({}), { kind: "none" });
});

test("resolveWorldBackend: FELTOS_SAVE alone -> file backend, path preserved verbatim", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_SAVE: "/tmp/world.json" }), { kind: "file", path: "/tmp/world.json" });
});

test("resolveWorldBackend: FELTOS_BUCKET set, no FELTOS_SAVE -> bucket backend, default object name", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "some-world-bucket" }), {
    kind: "bucket",
    bucket: "some-world-bucket",
    object: "world.json",
  });
});

test("resolveWorldBackend: both set -> bucket wins, FELTOS_SAVE becomes the object name (not a filesystem path)", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "some-world-bucket", FELTOS_SAVE: "saves/world.json" }), {
    kind: "bucket",
    bucket: "some-world-bucket",
    object: "saves/world.json",
  });
});

test("resolveWorldBackend: empty-string FELTOS_BUCKET treated as unset (falls through to file/none)", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "", FELTOS_SAVE: "/tmp/x.json" }), { kind: "file", path: "/tmp/x.json" });
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "" }), { kind: "none" });
});

test("openWorldStore(none) is null", () => {
  assert.equal(openWorldStore({ kind: "none" }), null);
});

test("file backend: save then load round-trips a real engine through actual disk, byte-exact snapshot", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "world-hosting-world-store-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "world.json");
  const store = openWorldStore({ kind: "file", path });
  assert.notEqual(store, null);

  let engine = createEngine(STARTER_WORLD_GAME);
  for (let i = 0; i < 20; i++) engine = step(engine, { runtime: starterWorldRuntime }).engine;
  const before = snapshotEngine(engine);

  await store.save(engine);
  const loaded = await store.load(() => {
    throw new Error("fallback should not run: the file was just written");
  });
  assert.deepEqual(snapshotEngine(loaded), before);
});

test("bucket backend: load() with no object yet calls the fallback, exactly like a fresh local save path", async (t) => {
  await withFakeGcs("test-bucket-fresh")(t, async ({ store }) => {
    let fallbackCalled = false;
    const engine = await store.load(() => {
      fallbackCalled = true;
      return createEngine(STARTER_WORLD_GAME);
    });
    assert.equal(fallbackCalled, true);
    assert.equal(engine.kind, "feltos.engine.v1");
  });
});

test("bucket backend: save then load round-trips a real, ticked engine through the network, byte-exact snapshot", async (t) => {
  await withFakeGcs("test-bucket-roundtrip")(t, async ({ fake, store }) => {
    let engine = createEngine(STARTER_WORLD_GAME);
    for (let i = 0; i < 50; i++) engine = step(engine, { runtime: starterWorldRuntime }).engine;
    const before = snapshotEngine(engine);

    await store.save(engine);
    assert.ok(fake.requestLog.some((line) => line.startsWith("POST ")), "save() must actually issue a write to the fake bucket");

    const loaded = await store.load(() => {
      throw new Error("fallback should not run: the object was just written");
    });
    assert.deepEqual(snapshotEngine(loaded), before);
  });
});

test("bucket backend: a corrupt stored object degrades to the caller's fallback, mirroring feltos's own loadEngine contract for local disk", async (t) => {
  await withFakeGcs("test-bucket-corrupt")(t, async ({ fake, store }) => {
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.json&ifGenerationMatch=0`, {
      method: "POST",
      body: "{ not valid json",
    });
    let fallbackCalled = false;
    const engine = await store.load(() => {
      fallbackCalled = true;
      return createEngine(STARTER_WORLD_GAME);
    });
    assert.equal(fallbackCalled, true);
    assert.equal(engine.kind, "feltos.engine.v1");
  });
});

test("bucket backend: two overlapping saves both succeed (412-retry loop), and the object ends up holding exactly one full, valid snapshot", async (t) => {
  await withFakeGcs("test-bucket-concurrent")(t, async ({ fake, store }) => {
    let engineA = createEngine(STARTER_WORLD_GAME);
    for (let i = 0; i < 5; i++) engineA = step(engineA, { runtime: starterWorldRuntime }).engine;
    let engineB = createEngine(STARTER_WORLD_GAME);
    for (let i = 0; i < 9; i++) engineB = step(engineB, { runtime: starterWorldRuntime }).engine;

    await Promise.all([store.save(engineA), store.save(engineB)]);
    assert.ok(fake.preconditionFailures >= 1, "a real 412 must have occurred for this to be a meaningful test of the retry loop");

    const loaded = await store.load(() => {
      throw new Error("fallback should not run: one of the two saves landed");
    });
    const loadedSnapshot = snapshotEngine(loaded);
    const isA = JSON.stringify(loadedSnapshot) === JSON.stringify(snapshotEngine(engineA));
    const isB = JSON.stringify(loadedSnapshot) === JSON.stringify(snapshotEngine(engineB));
    assert.ok(isA || isB, "the final object must be exactly one writer's complete, valid snapshot, not a mix of both");
  });
});
