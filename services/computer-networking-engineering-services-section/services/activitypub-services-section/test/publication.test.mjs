import assert from "node:assert/strict";
import test from "node:test";
import { MemoryKvStore } from "@fedify/fedify";
import { generateActorKeyMaterial } from "../src/keys.mjs";
import { importActorKeyPairs } from "../src/provider.mjs";
import { createPublicationActivityPubProvider, createPublicationOutbox, projectPublicationActivity } from "../src/publication.mjs";

const origin = "https://notes.example";
const identifier = "notes";
const publication = Object.freeze({ url: "https://notes.example/essays/living-web/", title: "A Living Web essay", content: "<p>A site can publish a document without becoming a social silo.</p>", summary: "A small publication test.", published: "2026-08-26T12:00:00Z", updated: "2026-08-26T13:00:00Z", tags: ["web", "living-web"] });

test("publication projection preserves canonical document identity and emits a public Create Article", () => {
  const activity = projectPublicationActivity(publication, { origin, identifier });
  assert.equal(activity.id, "https://notes.example/essays/living-web/#activitypub-create");
  assert.equal(activity.actor, "https://notes.example/actors/notes");
  assert.equal(activity.to, "https://www.w3.org/ns/activitystreams#Public");
  assert.equal(activity.object.type, "Article");
  assert.equal(activity.object.id, publication.url);
  assert.deepEqual(activity.object.tag, [{ type: "Hashtag", name: "#web" }, { type: "Hashtag", name: "#living-web" }]);
  assert.throws(() => projectPublicationActivity({ ...publication, url: "https://elsewhere.example/post" }, { origin, identifier }), /share the configured origin/u);
  assert.throws(() => projectPublicationActivity({ ...publication, activityId: "https://elsewhere.example/activity" }, { origin, identifier }), /activityId must share/u);
});

test("publication outbox accepts a generator-owned ordered list and has a defined first-page cursor rule", async () => {
  const outbox = createPublicationOutbox({ origin, identifier, listPublications: async () => [publication] });
  const first = await outbox.listOutbox({});
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].id.href, "https://notes.example/essays/living-web/#activitypub-create");
  assert.deepEqual(await outbox.listOutbox({ cursor: "later" }), { items: [] });
});

test("publication profile exposes federation discovery and refuses inbound delivery until a receiver is supplied", async () => {
  const provider = createPublicationActivityPubProvider({ origin, identifier, actorName: "Notes", summary: "A publication actor.", keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()), kv: new MemoryKvStore(), listPublications: async () => [publication] });
  const webfinger = await provider.fetch(new Request("https://notes.example/.well-known/webfinger?resource=acct:notes@notes.example", { headers: { accept: "application/jrd+json" } }));
  assert.equal(webfinger.status, 200);
  const actor = await provider.fetch(new Request("https://notes.example/actors/notes", { headers: { accept: "application/activity+json" } }));
  assert.equal((await actor.json()).outbox, "https://notes.example/actors/notes/outbox");
  const outbox = await provider.fetch(new Request("https://notes.example/actors/notes/outbox", { headers: { accept: "application/activity+json" } }));
  assert.equal((await outbox.json()).totalItems, 1);
  const refused = await provider.fetch(new Request("https://notes.example/actors/notes/inbox", { method: "POST", headers: { "content-type": "application/activity+json" }, body: "{}" }));
  assert.equal(refused.status, 405);
  assert.equal(refused.headers.get("allow"), "GET");
});
