import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createActivityPubOutboxStore } from "../src/outbox-store.mjs";
import { createActivityPubJournalCustody } from "../src/journal-custody.mjs";
import { createLocalActivityPubProvider } from "../src/local-server.mjs";
import { deliverActivity, importActorKeyPairs } from "../src/provider.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";
import { extractSenActivity, projectSenActivity, senActivityObjectBytes } from "../src/sen-activity.mjs";
import { serveActivityPubProvider } from "../../../../computer-systems-engineering-services-section/services/computer-web-engineering-services-section/apps/activitypub-server/src/server.mjs";

const create = (actor, post, content = "fixture") => ({
  "@context": "https://www.w3.org/ns/activitystreams",
  id: actor + "/posts/" + post, type: "Create", actor,
  object: { id: actor + "/posts/" + post + "#note", type: "Note", attributedTo: actor, content },
});
const temporary = () => mkdtemp(path.join(tmpdir(), "activitypub-custody-"));
const json = async (url, token) => {
  const response = await fetch(url, { headers: { accept: "application/activity+json", ...(token === undefined ? {} : { authorization: "Bearer " + token }) } });
  assert.equal(response.status, 200);
  return response.json();
};

test("outgoing custody remains current across handles, immutable by id, and durable on reopen", async () => {
  const dir = await temporary();
  const stores = [];
  const outboxPath = path.join(dir, "nested", "authored.json");
  try {
    await assert.rejects(() => createActivityPubOutboxStore({}), /outboxPath/u);
    const first = await createActivityPubOutboxStore({ outboxPath });
    const second = await createActivityPubOutboxStore({ outboxPath });
    stores.push(first, second);
    const actor = "https://example.test/actors/fixture";
    const activity = create(actor, "one");
    assert.equal((await first.append(activity)).appended, true);
    assert.equal(second.count({ actorId: actor }), 1);
    assert.equal((await second.append(activity)).appended, false);
    await assert.rejects(() => second.append(create(actor, "one", "changed")), /immutable/u);
    await assert.rejects(() => first.append({ type: "Create" }), /string id/u);
    await assert.rejects(() => first.listOutbox({ cursor: "invalid" }), /cursor/u);
    await Promise.all(Array.from({ length: 8 }, (_, i) => stores[i % 2].append(create(actor, i))));
    assert.equal(second.count(), 9);
    assert.equal(second.count({ actorId: actor + "-other" }), 0);
    assert.equal(await second.get({ activityId: activity.id, actorId: actor + "-other" }), null);
    assert.equal((await second.get({ activityId: activity.id, actorId: actor })).id.href, activity.id);
    first.close(); second.close(); stores.length = 0;
    const reopened = await createActivityPubOutboxStore({ outboxPath });
    stores.push(reopened);
    assert.equal(reopened.count(), 9);
    assert.equal((await reopened.listOutbox()).items[0].id.href, actor + "/posts/7");
    await assert.rejects(() => readFile(outboxPath), { code: "ENOENT" });
  } finally {
    for (const store of stores) store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("authored JSON imports in display order and is never rewritten by publication", async () => {
  const dir = await temporary();
  const outboxPath = path.join(dir, "authored.json");
  const actor = "https://example.test/actors/fixture";
  const source = JSON.stringify([create(actor, "new"), create(actor, "old")]) + "\n";
  let store;
  try {
    await writeFile(outboxPath, source);
    store = await createActivityPubOutboxStore({ outboxPath });
    assert.deepEqual((await store.listOutbox()).items.map(a => a.id.href), [actor + "/posts/new", actor + "/posts/old"]);
    await store.append(create(actor, "later"));
    assert.equal(await readFile(outboxPath, "utf8"), source);
    store.close();
    store = await createActivityPubOutboxStore({ outboxPath });
    assert.equal(store.count(), 3);
    assert.equal((await store.listOutbox()).items[0].id.href, actor + "/posts/later");
  } finally {
    store?.close();
    await rm(dir, { recursive: true, force: true });
  }
});

async function fixtureNode(stateDirectory, names, arrivals = []) {
  let local;
  const running = await serveActivityPubProvider({
    provider: { origin: "http://127.0.0.1", fetch: request => local.provider.fetch(request) },
    port: 0,
  });
  const origin = "http://127.0.0.1:" + running.server.address().port;
  try {
    local = await createLocalActivityPubProvider({
      environment: {}, origin, stateDirectory,
      bearerToken: "fixture-token-".repeat(4), queue: false, allowPrivateAddress: true,
      actors: await Promise.all(names.map(async identifier => ({
        identifier, actorName: identifier, summary: "Protocol receiving fixture",
        keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()),
      }))),
      onActivity: arrival => arrivals.push(arrival),
    });
    return { ...local, origin, close: async () => { await running.close(); await local.close(); } };
  } catch (error) { await running.close(); throw error; }
}

test("native consumers publish, page actor-isolated history, retrieve old objects and deliver signed SEN", async () => {
  const dir = await temporary();
  const arrivals = [];
  let source, receiver;
  try {
    source = await fixtureNode(path.join(dir, "source"), ["source", "other"]);
    receiver = await fixtureNode(path.join(dir, "receiver"), ["receiver"], arrivals);
    const actor = source.origin + "/actors/source";
    const denied = await fetch(actor + "/outbox", { method: "POST", body: JSON.stringify(create(actor, 0)) });
    assert.equal(denied.status, 401);
    const published = await fetch(actor + "/outbox", {
      method: "POST", headers: { "content-type": "application/activity+json", authorization: "Bearer " + source.bearerToken },
      body: JSON.stringify(create(actor, 0)),
    });
    assert.equal(published.status, 201);
    for (let i = 1; i < 205; i++) await source.provider.publish(create(actor, i));
    const outbox = await json(actor + "/outbox");
    assert.equal(outbox.totalItems, 205);
    const behindProxy = await source.provider.fetch(new Request("http://proxy-internal.invalid/actors/source/outbox", {
      headers: { accept: "application/activity+json", authorization: "Bearer " + source.bearerToken },
    }));
    assert.equal(new URL((await behindProxy.json()).first).origin, source.origin);
    let page = await json(outbox.first);
    assert.equal(page.orderedItems.length, 100);
    const ids = page.orderedItems.map(a => a.id);
    page = await json(page.next);
    assert.equal(page.orderedItems.length, 100);
    ids.push(...page.orderedItems.map(a => a.id));
    page = await json(page.next);
    assert.equal(page.orderedItems.length, 5);
    ids.push(...page.orderedItems.map(a => a.id));
    assert.equal(page.next, undefined);
    assert.equal(new Set(ids).size, 205);
    assert.equal(ids.at(-1), actor + "/posts/0");
    assert.equal((await json(actor + "/posts/0")).id, actor + "/posts/0");
    assert.equal((await json(source.origin + "/actors/other/outbox")).totalItems, 0);
    const recipient = receiver.origin + "/actors/receiver";
    const bytes = senActivityObjectBytes({ objectKind: "fixture.custody", value: { fixture: "signed receiving" } });
    const activity = projectSenActivity({
      type: "Offer", origin: source.origin, identifier: "source", recipient,
      objectBytes: bytes, agentCard: source.origin + "/.well-known/agent-card.json",
    });
    await deliverActivity(source.provider, { activity, recipient, inbox: recipient + "/inbox" });
    assert.equal(arrivals.length, 1);
    assert.equal(arrivals[0].jsonLd.id, activity.id);
    assert.equal(arrivals[0].sender.actorId, actor);
    // Match the native host consumer: resolved signed sender owns scalar actor identity.
    assert.deepEqual(extractSenActivity({ ...arrivals[0].jsonLd, actor: arrivals[0].sender.actorId }, {
      expectedActor: actor, expectedRecipient: recipient, expectedAgentCard: source.origin + "/.well-known/agent-card.json",
    }).objectBytes, bytes);
    const incoming = createActivityPubJournalCustody({ stateDirectory: path.join(dir, "receiver") });
    assert.equal((await incoming.inbox.get(arrivals[0].settlement)).activity.id, activity.id);
    const custody = createActivityPubJournalCustody({ stateDirectory: path.join(dir, "source") });
    assert.equal(custody.outbox.count({ actorId: actor }), 206);
    assert.equal((await json(actor + "/outbox")).totalItems, 205);
    assert.equal((await json(actor + "/outbox", source.bearerToken)).totalItems, 206);
    assert.equal((await fetch(activity.id, { headers: { accept: "application/activity+json" } })).status, 404);
    assert.equal((await json(activity.id, source.bearerToken)).id, activity.id);
    assert.equal((await custody.outbox.get({ activityId: activity.id })).id.href, activity.id);
    await source.close(); source = undefined;
    assert.equal(createActivityPubJournalCustody({ stateDirectory: path.join(dir, "source") }).outbox.count({ actorId: actor }), 206);
  } finally {
    await source?.close(); await receiver?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
