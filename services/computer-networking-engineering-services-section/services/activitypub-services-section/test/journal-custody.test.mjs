import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createActivityPubJournalCustody } from "../src/journal-custody.mjs";
import { FlatfileMessageQueue } from "../src/flatfile-queue.mjs";
import { createActivityPubOutboxStore } from "../src/outbox-store.mjs";

const scratch = (t, name) => {
  const directory = mkdtempSync(path.join(tmpdir(), name));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};
const note = (n, extra = {}) => ({
  "@context": "https://www.w3.org/ns/activitystreams", type: "Create", id: `https://cold-red-gate.example/activities/${n}`,
  actor: "https://cold-red-gate.example/actors/metroplat", to: ["https://www.w3.org/ns/activitystreams#Public"],
  object: { type: "Note", id: `https://cold-red-gate.example/notes/${n}`, content: `status ${n}` }, ...extra,
});

test("journal custody keeps no SQL: a journal, a flat-file KV and nothing else", async (t) => {
  const stateDirectory = scratch(t, "ap-journal-");
  const custody = createActivityPubJournalCustody({ stateDirectory });
  assert.deepEqual(Object.keys(custody).sort(), ["followers", "inbox", "inboxIndex", "kv", "outbox", "root"]);
  await custody.inbox.retain({ recipient: "a", jsonLd: { type: "Create", id: "https://remote.example/x" } });
  await custody.kv.set(["k"], 1);
  assert.deepEqual(readdirSync(stateDirectory).sort(), ["journal", "kv"]);
  const files = readdirSync(stateDirectory, { recursive: true }).map(String);
  assert.ok(!files.some((file) => /sqlite|\.db$/u.test(file)), "no database file");
});

test("followers are told: a follow is held, an undo denied, and the reading folds them", async (t) => {
  const { followers, root } = createActivityPubJournalCustody({ stateDirectory: scratch(t, "ap-followers-") });
  await followers.add({ identifier: "alice", actorId: "https://remote.example/actors/bob", inboxId: "https://remote.example/actors/bob/inbox", sharedInboxId: "https://remote.example/inbox" });
  await followers.add({ identifier: "alice", actorId: "https://remote.example/actors/carol", inboxId: "https://remote.example/actors/carol/inbox" });
  await followers.add({ identifier: "someone-else", actorId: "https://remote.example/actors/bob", inboxId: "https://remote.example/actors/bob/inbox" });
  assert.equal(await followers.count({ identifier: "alice" }), 2);
  const listed = await followers.list({ identifier: "alice" });
  assert.equal(listed.items.find((item) => item.actorId.endsWith("bob")).sharedInboxId, "https://remote.example/inbox");
  assert.equal(listed.items.find((item) => item.actorId.endsWith("carol")).sharedInboxId, null);
  await followers.remove({ identifier: "alice", actorId: "https://remote.example/actors/bob" });
  assert.deepEqual((await followers.list({ identifier: "alice" })).items.map((item) => item.actorId), ["https://remote.example/actors/carol"]);
  assert.equal(await followers.count({ identifier: "someone-else" }), 1);
  await followers.add({ identifier: "alice", actorId: "https://remote.example/actors/bob", inboxId: "https://remote.example/actors/bob/inbox" });
  assert.equal(await followers.count({ identifier: "alice" }), 2, "re-following after an Undo is add-again");
  // Reopened from the journal alone, the reading is the same.
  const again = createActivityPubJournalCustody({ stateDirectory: path.dirname(root) });
  assert.equal(await again.followers.count({ identifier: "alice" }), 2);
});

test("a verified arrival is immutable content-addressed custody, deduplicated, paged newest first", async (t) => {
  const { inbox, inboxIndex } = createActivityPubJournalCustody({ stateDirectory: scratch(t, "ap-inbox-") });
  const arrival = { recipient: "provider", jsonLd: { type: "Create", id: "https://remote.example/one", object: { id: "https://remote.example/object" } } };
  const receipt = await inbox.retain(arrival);
  assert.match(receipt.bodySha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(await inbox.get(receipt), { activity: arrival.jsonLd, receipt });
  assert.deepEqual(await inbox.retain({ recipient: "provider", jsonLd: { object: { id: "https://remote.example/object" }, id: "https://remote.example/one", type: "Create" } }), receipt);
  for (let index = 2; index <= 3; index += 1) await inbox.retain({ recipient: "provider", jsonLd: { type: "Create", id: `https://remote.example/${index}` } });
  const first = await inboxIndex.list({ limit: 2 });
  assert.equal(first.totalItems, 3);
  assert.deepEqual(first.items.map((item) => item.id), ["https://remote.example/3", "https://remote.example/2"]);
  const second = await inboxIndex.list({ cursor: first.nextCursor, limit: 2 });
  assert.deepEqual(second.items.map((item) => item.id), ["https://remote.example/one"]);
  assert.equal(second.nextCursor, undefined);
});

test("the outbox holds one immutable activity per id and reads public and per-actor pages", async (t) => {
  const { outbox } = createActivityPubJournalCustody({ stateDirectory: scratch(t, "ap-outbox-") });
  assert.equal((await outbox.append(note(1))).appended, true);
  assert.equal((await outbox.append(note(1))).appended, false);
  await assert.rejects(() => outbox.append(note(1, { object: { type: "Note", content: "other" } })), /different immutable content/u);
  await outbox.append(note(2, { to: ["https://remote.example/actors/bob"] }));
  assert.equal(outbox.count({}), 2);
  assert.equal(outbox.count({ publicOnly: true }), 1);
  const page = await outbox.listOutbox({ actorId: "https://cold-red-gate.example/actors/metroplat" });
  assert.deepEqual(page.items.map((item) => item.id.href), [note(2).id, note(1).id]);
  assert.equal((await outbox.get({ activityId: note(2).id, publicOnly: true })), null);
});

test("the KV store round-trips, expires, compares-and-swaps and lists by prefix across reopening", async (t) => {
  const stateDirectory = scratch(t, "ap-kv-");
  const { kv } = createActivityPubJournalCustody({ stateDirectory });
  await kv.set(["actor", "codex"], { origin: "https://example.net" });
  await kv.set(["expired"], 1, { ttl: 1 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const reopened = createActivityPubJournalCustody({ stateDirectory }).kv;
  assert.deepEqual(await reopened.get(["actor", "codex"]), { origin: "https://example.net" });
  assert.equal(await reopened.get(["expired"]), undefined);
  assert.equal(await reopened.cas(["actor", "codex"], { origin: "elsewhere" }, 2), false);
  assert.equal(await reopened.cas(["actor", "codex"], { origin: "https://example.net" }, 2), true);
  const listed = [];
  for await (const entry of reopened.list(["actor"])) listed.push(entry);
  assert.deepEqual(listed, [{ key: ["actor", "codex"], value: 2 }]);
  await reopened.delete(["actor", "codex"]);
  assert.equal(await kv.get(["actor", "codex"]), undefined);
});

test("queued deliveries are handed on in due order, once, and survive a restart", async (t) => {
  const directory = scratch(t, "ap-queue-");
  const first = new FlatfileMessageQueue({ directory, pollInterval: 20 });
  await first.enqueue({ n: 2 }, { delay: 30 });
  await first.enqueue({ n: 1 });
  assert.deepEqual(await first.getDepth(), { queued: 2, ready: 1, delayed: 1 });
  // A process that stops mid-handling leaves its message claimed; the next queue puts it back.
  const [due] = readdirSync(path.join(directory, "ready")).sort();
  renameSync(path.join(directory, "ready", due), path.join(directory, "claimed", due));
  const restarted = new FlatfileMessageQueue({ directory, pollInterval: 20 });
  const handled = [];
  const controller = new AbortController();
  const listening = restarted.listen(async (message) => { handled.push(message.n); if (handled.length === 2) controller.abort(); }, { signal: controller.signal });
  await listening;
  assert.deepEqual(handled, [1, 2]);
  assert.deepEqual(await restarted.getDepth(), { queued: 0, ready: 0, delayed: 0 });
});

test("a standalone outbox store appends to the journal and keeps authored JSON as input only", async (t) => {
  const directory = scratch(t, "ap-outbox-store-");
  const outboxPath = path.join(directory, "outbox.json");
  const store = await createActivityPubOutboxStore({ outboxPath });
  await store.append(note(1));
  await store.append(note(2));
  const reopened = await createActivityPubOutboxStore({ outboxPath });
  assert.equal(reopened.count({}), 2);
});
