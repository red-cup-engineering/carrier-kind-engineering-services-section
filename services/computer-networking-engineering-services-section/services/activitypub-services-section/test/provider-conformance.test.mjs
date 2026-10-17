// The live provider against ActivityPub / WebFinger (RFC 7033) / NodeInfo 2.1 requirements.
import test from "node:test";
import assert from "node:assert/strict";
import { createActivityPubProvider, importActorKeyPairs } from "../src/provider.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";

const ORIGIN = "https://ap.example";
const ACTOR = `${ORIGIN}/actors/alice`;
const AS = "application/activity+json";
const keyPairs = await importActorKeyPairs(await generateActorKeyMaterial());

function provider(extra = {}) {
  const appended = [];
  const arrivals = [];
  const p = createActivityPubProvider({
    origin: ORIGIN, identifier: "alice", actorName: "Alice", summary: "a test actor", keyPairs,
    onActivity: async (arrival) => { arrivals.push(arrival); },
    listOutbox: async () => ({ items: [] }),
    authorizeInbox: async () => false,
    appendToOutbox: async (activity) => { appended.push(activity); return { appended: true }; },
    ...extra,
  });
  return { p, appended, arrivals };
}
const get = (p, path, accept = AS) => p.fetch(new Request(`${ORIGIN}${path}`, { headers: { accept } }));

test("WebFinger (RFC 7033): acct resource resolves to a self link of type activity+json; unknown is 404; missing resource is 400", async () => {
  const { p } = provider();
  const res = await get(p, "/.well-known/webfinger?resource=acct:alice@ap.example", "application/jrd+json");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /jrd\+json/);
  const jrd = await res.json();
  assert.equal(jrd.subject, "acct:alice@ap.example");
  assert.ok(jrd.links.some((l) => l.rel === "self" && l.type === AS && l.href === ACTOR));
  assert.equal((await get(p, "/.well-known/webfinger?resource=acct:nobody@ap.example")).status, 404);
  assert.equal((await get(p, "/.well-known/webfinger")).status, 400);
});

test("the actor document has inbox, outbox and a public key, and is served as ActivityStreams (ActivityPub 3.1, 4.1)", async () => {
  const { p } = provider();
  const res = await get(p, "/actors/alice");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /activity\+json|ld\+json/);
  const actor = await res.json();
  assert.equal(actor.id, ACTOR);
  assert.equal(actor.preferredUsername, "alice");
  assert.equal(actor.inbox, `${ACTOR}/inbox`);
  assert.equal(actor.outbox, `${ACTOR}/outbox`);
  assert.ok(actor.publicKey?.publicKeyPem);
  assert.equal((await get(p, "/actors/nobody")).status, 404);
});

test("the outbox is an OrderedCollection (ActivityPub 5.1)", async () => {
  const { p } = provider();
  const body = await (await get(p, "/actors/alice/outbox")).json();
  assert.equal(body.type, "OrderedCollection");
});

test("NodeInfo 2.1: discovery link and a document naming activitypub", async () => {
  const { p } = provider();
  const wellKnown = await (await get(p, "/.well-known/nodeinfo", "application/json")).json();
  assert.ok(wellKnown.links.some((l) => l.rel === "http://nodeinfo.diaspora.software/ns/schema/2.1" && l.href === `${ORIGIN}/nodeinfo/2.1`));
  const doc = await (await get(p, "/nodeinfo/2.1", "application/json")).json();
  assert.equal(doc.version, "2.1");
  assert.deepEqual(doc.protocols, ["activitypub"]);
  assert.equal(doc.openRegistrations, false);
});

test("an unsigned inbox delivery is refused and never reaches the arrival callback", async () => {
  const { p, arrivals } = provider();
  const res = await p.fetch(new Request(`${ACTOR}/inbox`, {
    method: "POST", headers: { "content-type": AS },
    body: JSON.stringify({ "@context": "https://www.w3.org/ns/activitystreams", id: "https://evil.example/a/1", type: "Create", actor: "https://evil.example/u", object: { type: "Note", content: "x" } }),
  }));
  assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}`);
  assert.equal(arrivals.length, 0);
});

test("publishing needs the operator's credential", async () => {
  const { p } = provider();
  const res = await p.fetch(new Request(`${ACTOR}/outbox`, { method: "POST", headers: { "content-type": AS }, body: "{}" }));
  assert.equal(res.status, 401);
});

const authorized = { authorizeInbox: async ({ request }) => request.headers.get("authorization") === "Bearer ok" };
const publish = (p, activity) => p.fetch(new Request(`${ACTOR}/outbox`, { method: "POST", headers: { "content-type": AS, authorization: "Bearer ok" }, body: JSON.stringify(activity) }));
const base = { "@context": "https://www.w3.org/ns/activitystreams", actor: ACTOR, to: ["https://www.w3.org/ns/activitystreams#Public"] };
const note = { id: `${ORIGIN}/notes/1`, type: "Note", attributedTo: ACTOR, content: "hi" };

test("an actor publishes Create, Update, Delete, Announce, Like and Undo (ActivityPub 6), each as its own activity", async () => {
  const { p, appended } = provider(authorized);
  const activities = [
    { ...base, id: `${ORIGIN}/a/1`, type: "Create", object: note },
    { ...base, id: `${ORIGIN}/a/2`, type: "Update", object: { ...note, content: "edited" } },
    { ...base, id: `${ORIGIN}/a/3`, type: "Delete", object: { id: note.id, type: "Tombstone", formerType: "Note" } },
    { ...base, id: `${ORIGIN}/a/4`, type: "Announce", object: "https://peer.example/notes/9" },
    { ...base, id: `${ORIGIN}/a/5`, type: "Like", object: "https://peer.example/notes/9" },
    { ...base, id: `${ORIGIN}/a/6`, type: "Undo", object: { id: `${ORIGIN}/a/5`, type: "Like", actor: ACTOR, object: "https://peer.example/notes/9" } },
  ];
  for (const activity of activities) assert.equal((await publish(p, activity)).status, 201, activity.type);
  assert.deepEqual(appended.map((a) => a.type), ["Create", "Update", "Delete", "Announce", "Like", "Undo"]);
});

test("an actor cannot publish as another actor, nor publish an activity type outside the C2S set", async () => {
  const { p, appended } = provider(authorized);
  assert.equal((await publish(p, { ...base, id: `${ORIGIN}/a/7`, type: "Create", actor: "https://evil.example/u", object: note })).status, 422);
  assert.equal((await publish(p, { ...base, id: `${ORIGIN}/a/8`, type: "Flag", object: "https://peer.example/notes/9" })).status, 422);
  assert.equal(appended.length, 0);
});
