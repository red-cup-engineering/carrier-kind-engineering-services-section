import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { importActorKeyPairs } from "@red-cup-engineering/activitypub-services-section";
import { generateActorKeyMaterial } from "@red-cup-engineering/activitypub-services-section/keys";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { heldDeliveryResponse, heldDeliveryPage, heldFor, holdForPeer, catchUpOutcome, signedGetAs, signedRequestActor } from "../src/held-delivery.mjs";

async function loopbackNode(t, name, route = async () => undefined) {
  const root = await mkdtemp(join(tmpdir(), "held-journal-" + name + "-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  let local;
  let origin;
  const server = createServer(async (request, response) => {
    try {
      const web = new Request(new URL(request.url, origin), { method: request.method, headers: request.headers });
      const result = await route(web, local) ?? await local.provider.fetch(web);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  origin = "http://127.0.0.1:" + server.address().port;
  const keyPairs = await importActorKeyPairs(await generateActorKeyMaterial());
  const openProvider = () => createLocalActivityPubProvider({
    environment: {},
    origin, stateDirectory: join(root, "state"), queue: false, allowPrivateAddress: true,
    bearerToken: "ephemeral-held-delivery-test-only-token",
    actors: [{ identifier: "metroplat", actorName: name, summary: name, keyPairs }],
  });
  local = await openProvider();
  t.after(() => local.close());
  return { root, origin, actor: origin + "/actors/metroplat", get provider() { return local.provider; },
    async restart() {
      await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
      await local.close();
      local = await openProvider();
      await new Promise(resolve => server.listen(new URL(origin).port, "127.0.0.1", resolve));
    },
  };
}

test("journal-backed held delivery is served only to its real signed recipient and resumes once", { timeout: 30000 }, async t => {
  let config;
  const holder = await loopbackNode(t, "holder", (request, local) =>
    heldDeliveryResponse({ config, request, signerOf: signed => signedRequestActor(local.provider, signed) }));
  const colony = await loopbackNode(t, "colony");
  const stranger = await loopbackNode(t, "stranger");
  config = {
    publicBaseUrl: holder.origin, metroplatDataRoot: holder.root,
    activityPub: { instanceActor: { identifier: "metroplat" } },
    peerPresences: { [colony.actor]: "known-intermittent", [stranger.actor]: "known-intermittent" },
  };
  const activity = { id: holder.origin + "/activities/held-1", type: "Accept", actor: holder.actor, to: [colony.actor] };
  const held = holdForPeer({ dataRoot: holder.root, recipient: colony.actor, activity, at: "2026-10-10T12:00:00Z" });
  assert.equal(holdForPeer({ dataRoot: holder.root, recipient: colony.actor, activity }).id, held.id);
  const url = holder.actor + "/outbox?held-for=" + encodeURIComponent(colony.actor);
  const unsigned = await fetch(url, { headers: { accept: "application/activity+json" } });
  assert.equal(unsigned.status, 401);
  assert.equal(unsigned.headers.get("cache-control"), "private, no-store");
  await assert.rejects(signedGetAs(stranger.provider, "metroplat")(url), /HTTP 403/u);
  const get = signedGetAs(colony.provider, "metroplat");
  const page = await get(url);
  assert.deepEqual(page.orderedItems, [activity]);
  assert.ok(page.next.includes("after="));
  const unknown = new URL(page.next);
  unknown.searchParams.set("after", "held-v2." + "A".repeat(43));
  await assert.rejects(get(unknown.href), /HTTP 400/u);
  assert.deepEqual((await get(page.next)).orderedItems, []);
  const delayed = { ...activity, id: holder.origin + "/activities/later-admission-earlier-clock" };
  holdForPeer({ dataRoot: holder.root, recipient: colony.actor, activity: delayed, at: "2026-10-09T11:59:59Z" });
  const resumed = await get(page.next);
  assert.deepEqual(resumed.orderedItems, [delayed], "a real signed pull sees a newly admitted earlier-date witness");
  assert.deepEqual((await get(resumed.next)).orderedItems, []);
  config.peerPresences = {};
  await assert.rejects(get(url), /HTTP 403/u);
  for (const node of [holder, colony, stranger]) {
    const files = await readdir(node.root, { recursive: true });
    assert.equal(files.some(name => /\.sqlite(?:$|-)/u.test(name)), false, "no SQL database is created");
    assert.equal(files.some(name => /(?:^|\/)key\.json$|(?:^|\/)bearer-token$/u.test(name)), false, "test actor keys and tokens remain ephemeral");
  }
});


async function heldFixture(t) {
  const dataRoot = await mkdtemp(join(tmpdir(), "held-cursor-"));
  t.after(() => rm(dataRoot, { recursive: true, force: true }));
  const recipient = "https://recipient.invalid/actors/metroplat";
  const put = (id, at, to = recipient) => holdForPeer({ dataRoot, recipient: to, at,
    activity: { id: "https://holder.invalid/activities/" + id, actor: "https://holder.invalid/actors/metroplat", to: [to] } });
  const read = (after, limit) => heldDeliveryPage({ dataRoot, recipient, after, limit });
  return { dataRoot, recipient, put, read };
}

test("journal normalization cannot rehold received content, while changed content stays distinct", async t => {
  const { dataRoot, recipient, read } = await heldFixture(t);
  const activity = { id: "https://holder.invalid/activities/order", actor: "https://holder.invalid/actors/metroplat",
    to: [recipient], object: { z: "last", a: "first" } };
  const first = holdForPeer({ dataRoot, recipient, activity, at: "2026-10-10T12:00:00Z" });
  const page = read();
  assert.equal(page.items.length, 1);
  const normalized = { object: { a: "first", z: "last" }, to: [recipient], actor: activity.actor, id: activity.id };
  const replay = holdForPeer({ dataRoot, recipient, activity: normalized, at: "2026-10-11T12:00:00Z" });
  assert.equal(replay.id, first.id);
  assert.deepEqual(read(page.after).items, []);
  const changed = holdForPeer({ dataRoot, recipient, activity: { ...normalized, object: { a: "changed", z: "last" } } });
  assert.notEqual(changed.id, first.id);
  assert.deepEqual(read(page.after).items.map(row => row.id), [changed.id]);
});

test("admission cursors retain same-day clock rollback and safely replay legacy address cursors", async t => {
  const { dataRoot, recipient, put, read } = await heldFixture(t);
  const first = put("first", "2026-10-10T12:00:00Z");
  const initial = read();
  assert.deepEqual(initial.items.map(row => row.id), [first.id]);
  const second = put("second", "2026-10-10T11:59:59Z");
  const resumed = read(initial.after);
  assert.deepEqual(resumed.items.map(row => row.id), [second.id]);
  const empty = read(resumed.after);
  assert.deepEqual(empty.items, []);
  assert.equal(empty.after, resumed.after, "an unchanged frontier reuses its durable content identity");
  const historical = read(first.id);
  assert.equal(historical.reset, true);
  assert.deepEqual(new Set(historical.items.map(row => row.id)), new Set([first.id, second.id]));
  assert.ok(heldFor({ dataRoot, recipient, after: first.id }).some(row => row.id === second.id));
});

test("per-feed cursors see a new earlier day and later appends to an already-read earlier feed", async t => {
  const { put, read } = await heldFixture(t);
  put("today", "2026-10-10T12:00:00Z");
  const today = read();
  const yesterday = put("new-earlier-day", "2026-10-09T12:00:00Z");
  const earlier = read(today.after);
  assert.deepEqual(earlier.items.map(row => row.id), [yesterday.id]);
  const rollback = put("earlier-day-append", "2026-10-09T11:59:59Z");
  const appended = read(earlier.after);
  assert.deepEqual(appended.items.map(row => row.id), [rollback.id]);
  assert.deepEqual(read(appended.after).items, []);
});

test("fifty-item pages never acknowledge an unsent tail or another recipient's rows", async t => {
  const { dataRoot, recipient, put, read } = await heldFixture(t);
  const ids = [];
  for (let n = 0; n < 55; n += 1) ids.push(put("page-" + n, n % 2 ? "2026-10-10T11:00:00Z" : "2026-10-10T12:00:00Z").id);
  put("other", "2026-10-10T10:00:00Z", "https://other.invalid/actors/metroplat");
  const first = read();
  assert.equal(first.items.length, 50);
  assert.deepEqual(first.items.map(row => row.id), ids.slice(0, 50));
  const late = put("late-older-day", "2026-10-08T12:00:00Z");
  const second = read(first.after);
  assert.deepEqual(new Set(second.items.map(row => row.id)), new Set([late.id, ...ids.slice(50)]));
  assert.deepEqual(read(second.after).items, []);
  assert.throws(() => heldDeliveryPage({ dataRoot, recipient: "https://other.invalid/actors/metroplat", after: first.after }), /recipient/);
  assert.throws(() => read("held-v1.not-json"), /valid cursor/);
});


test("catch-up applies each failed recipient's presence, including mixed overrides", () => {
  const continuous = "https://continuous.invalid/actors/metroplat";
  const intermittent = "https://intermittent.invalid/actors/metroplat";
  const failed = { id: "move-1", why: "ECONNREFUSED", away: true };
  const result = peers => ({ shipped: [], failed: [failed], peers: peers.map(peer => ({ peer, shipped: 0, failed: [failed] })) });
  const config = { workPeerPresence: "known-intermittent", peerPresences: { [continuous]: "continuous" } };
  assert.throws(() => catchUpOutcome(result([continuous]), config), /not delivered/);
  assert.throws(() => catchUpOutcome(result([intermittent, continuous]), config), /not delivered/);
  assert.deepEqual(catchUpOutcome(result([intermittent]), config), { shipped: 0, held: 1, peer: "away" });
  assert.deepEqual(catchUpOutcome(result([intermittent]), { workPeerPresence: "continuous", peerPresences: { [intermittent]: "known-intermittent" } }), { shipped: 0, held: 1, peer: "away" });
  assert.throws(() => catchUpOutcome(result([]), config), /not delivered/, "unattributed failure cannot be excused");
  assert.throws(() => catchUpOutcome({ ...result([intermittent]), failed: [{ ...failed, away: false }] }, config), /not delivered/, "a refusal is never absence");
  assert.deepEqual(catchUpOutcome({ shipped: [], failed: [failed] }, "known-intermittent"), { shipped: 0, held: 1, peer: "away" }, "existing explicit single-peer policy remains compatible");
});


test("signed long-history continuation stays bounded through restart and earlier-feed admissions", { timeout: 60000 }, async t => {
  let config;
  const holder = await loopbackNode(t, "long-history-holder", (request, local) =>
    heldDeliveryResponse({ config, request, signerOf: signed => signedRequestActor(local.provider, signed) }));
  const colony = await loopbackNode(t, "long-history-colony");
  config = { publicBaseUrl: holder.origin, metroplatDataRoot: holder.root,
    activityPub: { instanceActor: { identifier: "metroplat" } }, peerPresences: { [colony.actor]: "known-intermittent" } };
  const journal = createSemanticRecordJournal({ root: holder.root, objectKind: "held-peer-delivery" });
  const expected = [];
  const put = (id, at) => {
    const activity = { id: holder.origin + "/activities/" + id, type: "Accept", actor: holder.actor, to: [colony.actor] };
    journal.record({ category: "held", recordedAt: at, record: { recipient: colony.actor, activity }, told: { for: true, against: false } });
    expected.push(activity.id);
  };
  for (let day = 0; day < 240; day += 1) put(String(day), new Date(Date.UTC(2026, 0, 1 + day)).toISOString());
  const get = signedGetAs(colony.provider, "metroplat");
  let url = holder.actor + "/outbox?held-for=" + encodeURIComponent(colony.actor);
  const received = [];
  for (let pageNumber = 0; pageNumber < 2; pageNumber += 1) {
    const page = await get(url);
    received.push(...page.orderedItems.map(activity => activity.id));
    url = page.next;
    assert.equal(new URL(url).searchParams.get("after").length, 51, "wire cursor has a fixed content-address length");
    assert.ok(Buffer.byteLength(url) < 512, "signed URL remains below normal Node header limits");
  }
  const cursor = new URL(url).searchParams.get("after");
  // A fresh process has no provider or journal caches. It reads the same durable continuation.
  const preload = process.execArgv.flatMap((arg, index) => arg === "--import" ? [arg, process.execArgv[index + 1]] : []);
  const child = spawnSync(process.execPath, [...preload, "--input-type=module", "--eval",
    'const { heldDeliveryPage } = await import(process.argv[1]); process.stdout.write(JSON.stringify(heldDeliveryPage(JSON.parse(process.argv[2]))));',
    new URL("../src/held-delivery.mjs", import.meta.url).href,
    JSON.stringify({ dataRoot: holder.root, recipient: colony.actor, after: cursor })],
    { encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: tmpdir() }, timeout: 30000 });
  assert.equal(child.status, 0, child.stderr);
  const afterRestart = JSON.parse(child.stdout);
  assert.deepEqual(afterRestart.items.map(row => row.activity.id), expected.slice(100, 150));
  await holder.restart();
  const resumed = await get(url);
  assert.deepEqual(resumed.orderedItems.map(activity => activity.id), expected.slice(100, 150), "signed provider restart recovers the same unacknowledged page");
  received.push(...resumed.orderedItems.map(activity => activity.id));
  url = resumed.next;
  put("new-earlier-feed", "2025-12-01T00:00:00Z");
  put("old-feed-later-append", "2026-01-01T00:00:01Z");
  let terminal = false;
  for (let pageNumber = 0; pageNumber < 5; pageNumber += 1) {
    assert.ok(Buffer.byteLength(url) < 512);
    const page = await get(url);
    if (page.orderedItems.length === 0) { terminal = true; break; }
    assert.ok(page.orderedItems.length <= 50);
    received.push(...page.orderedItems.map(activity => activity.id));
    url = page.next;
    assert.equal(new URL(url).searchParams.get("after").length, 51);
  }
  assert.equal(terminal, true);
  assert.equal(received.length, 242);
  assert.deepEqual(new Set(received), new Set(expected), "all long-history and earlier-feed deliveries arrive exactly once");
  await holder.restart();
  assert.deepEqual((await get(url)).orderedItems, [], "fully read continuation survives another provider restart");
});
