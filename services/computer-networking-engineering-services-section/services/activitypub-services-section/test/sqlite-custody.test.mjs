import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createActivityPubSqliteCustody } from "../src/sqlite-custody.mjs";

function customFieldMemoryDatabase() {
  return new DatabaseSync(":memory:");
}

test("SQLite custody exposes KV, immutable inbox custody, a local inbox scan, and follower storage", () => {
  const custody = createActivityPubSqliteCustody({ database: customFieldMemoryDatabase() });
  assert.deepEqual(Object.keys(custody).sort(), ["followers", "inbox", "inboxIndex", "kv"]);
  assert.equal(typeof custody.inbox.retain, "function");
  assert.equal(typeof custody.inboxIndex.list, "function");
  assert.equal(typeof custody.followers.add, "function");
  assert.equal(typeof custody.followers.remove, "function");
  assert.equal(typeof custody.followers.list, "function");
  assert.equal(typeof custody.followers.count, "function");
});

test("follower storage records, lists, counts, and removes by (identifier, actor), independent of other identifiers", async () => {
  const { followers } = createActivityPubSqliteCustody({ database: customFieldMemoryDatabase() });
  assert.equal(await followers.count({ identifier: "alice" }), 0);
  await followers.add({ identifier: "alice", actorId: "https://remote.example/actors/bob", inboxId: "https://remote.example/actors/bob/inbox", sharedInboxId: "https://remote.example/inbox" });
  await followers.add({ identifier: "alice", actorId: "https://remote.example/actors/carol", inboxId: "https://remote.example/actors/carol/inbox" });
  await followers.add({ identifier: "someone-else", actorId: "https://remote.example/actors/bob", inboxId: "https://remote.example/actors/bob/inbox" });
  assert.equal(await followers.count({ identifier: "alice" }), 2);
  assert.equal(await followers.count({ identifier: "someone-else" }), 1);
  const listed = await followers.list({ identifier: "alice" });
  assert.deepEqual(listed.items.map((item) => item.actorId).sort(), ["https://remote.example/actors/bob", "https://remote.example/actors/carol"]);
  const bob = listed.items.find((item) => item.actorId === "https://remote.example/actors/bob");
  assert.equal(bob.sharedInboxId, "https://remote.example/inbox");
  const carol = listed.items.find((item) => item.actorId === "https://remote.example/actors/carol");
  assert.equal(carol.sharedInboxId, null);

  await followers.remove({ identifier: "alice", actorId: "https://remote.example/actors/bob" });
  assert.equal(await followers.count({ identifier: "alice" }), 1);
  assert.equal(await followers.count({ identifier: "someone-else" }), 1);
  const afterRemoval = await followers.list({ identifier: "alice" });
  assert.deepEqual(afterRemoval.items.map((item) => item.actorId), ["https://remote.example/actors/carol"]);

  // re-following after an Undo is add-again, not an error
  await followers.add({ identifier: "alice", actorId: "https://remote.example/actors/bob", inboxId: "https://remote.example/actors/bob/inbox" });
  assert.equal(await followers.count({ identifier: "alice" }), 2);
});

test("KV get/set/delete round-trips and persists across reopening the same database file", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-sqlite-kv-"));
  const statePath = path.join(dir, "kv.sqlite");
  try {
    const first = createActivityPubSqliteCustody({ database: new DatabaseSync(statePath) });
    await first.kv.set(["actor", "codex"], { origin: "https://example.net" });
    assert.deepEqual(await first.kv.get(["actor", "codex"]), { origin: "https://example.net" });
    first.kv.db.close();

    const second = createActivityPubSqliteCustody({ database: new DatabaseSync(statePath) });
    assert.deepEqual(await second.kv.get(["actor", "codex"]), { origin: "https://example.net" });
    await second.kv.delete(["actor", "codex"]);
    assert.equal(await second.kv.get(["actor", "codex"]), undefined);
    second.kv.db.close();

    const third = createActivityPubSqliteCustody({ database: new DatabaseSync(statePath) });
    assert.equal(await third.kv.get(["actor", "codex"]), undefined);
    third.kv.db.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("retaining one verified arrival is content-addressed immutable custody", async () => {
  const inbox = createActivityPubSqliteCustody({ database: customFieldMemoryDatabase() }).inbox;
  const arrival = { recipient: "provider", jsonLd: { type: "Create", id: "https://remote.example/one", object: { id: "https://remote.example/object" } } };
  const receipt = await inbox.retain(arrival);
  assert.equal(receipt.type, "ActivityPubVerifiedArrivalReceipt");
  assert.match(receipt.bodySha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(await inbox.get(receipt), { activity: arrival.jsonLd, receipt });
});

test("the same verified arrival is deduplicated only when its immutable receipt bytes match", async () => {
  const inbox = createActivityPubSqliteCustody({ database: customFieldMemoryDatabase() }).inbox;
  const arrival = { recipient: "provider", jsonLd: { id: "https://remote.example/one", type: "Create" } };
  const first = await inbox.retain(arrival);
  const second = await inbox.retain({ recipient: "provider", jsonLd: { type: "Create", id: "https://remote.example/one" } });
  assert.deepEqual(second, first);
});

test("immutable custody refuses to overwrite a differing record at the same content address", async () => {
  const database = customFieldMemoryDatabase();
  const inbox = createActivityPubSqliteCustody({ database }).inbox;
  const arrival = { recipient: "provider", jsonLd: { id: "https://remote.example/one", type: "Create" } };
  const receipt = await inbox.retain(arrival);
  const key = database.prepare('UPDATE "activitypub_verified_arrivals" SET activity_json = ? WHERE content_sha256 = (SELECT content_sha256 FROM "activitypub_verified_arrivals" LIMIT 1)');
  key.run('{"tampered":true}');
  await assert.rejects(() => inbox.retain(arrival), /immutable ActivityPub custody record differs/u);
  void receipt;
});

test("the inbox scan lists retained arrivals in newest-first order with a working cursor", async () => {
  const inboxIndex = createActivityPubSqliteCustody({ database: customFieldMemoryDatabase() });
  for (let index = 1; index <= 3; index += 1) {
    await inboxIndex.inbox.retain({ recipient: "provider", jsonLd: { type: "Create", id: `https://remote.example/${index}` } });
  }
  const firstPage = await inboxIndex.inboxIndex.list({ limit: 2 });
  assert.equal(firstPage.totalItems, 3);
  assert.deepEqual(firstPage.items.map((item) => item.id), ["https://remote.example/3", "https://remote.example/2"]);
  assert.equal(typeof firstPage.nextCursor, "string");
  const secondPage = await inboxIndex.inboxIndex.list({ cursor: firstPage.nextCursor, limit: 2 });
  assert.deepEqual(secondPage.items.map((item) => item.id), ["https://remote.example/1"]);
  assert.equal(secondPage.nextCursor, undefined);
});
