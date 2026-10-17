// ActivityStreams 2.0 / ActivityPub document conformance: each case follows a requirement of
// https://www.w3.org/TR/activitystreams-core/, /activitystreams-vocabulary/ or /activitypub/.
import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVITY_TYPES, AS2_CONTEXT, PUBLIC, SECURITY_CONTEXT, activity, actor, article, isAS2, note, orderedCollection, orderedCollectionPage, person, tombstone } from "../src/as2.mjs";

test("objects carry the normative @context and type, public by default (Core 2.1, ActivityPub 5.6)", () => {
  const n = note({ id: "https://a.example/n/1", content: "<p>hi</p>", attributedTo: "https://a.example/u" });
  assert.equal(n["@context"], AS2_CONTEXT);
  assert.equal(n.type, "Note");
  assert.deepEqual(n.to, [PUBLIC]);
  assert.equal(n.mediaType, "text/html");
  assert.equal(PUBLIC, "https://www.w3.org/ns/activitystreams#Public");
  assert.equal(article({ name: "T", content: "c" }).type, "Article");
  assert.equal("summary" in note({ content: "x" }), false, "absent fields are pruned, never null");
});

test("ids must be absolute IRIs (Core 3.1)", () => {
  assert.throws(() => note({ id: "relative/path" }), /absolute IRI/);
  assert.throws(() => activity("Create", { id: 5, actor: "https://a.example/u", object: {} }), /IRI string/);
});

test("an actor requires inbox and outbox (ActivityPub 4.1) and a key adds the security context", () => {
  const base = { id: "https://a.example/u", inbox: "https://a.example/u/inbox", outbox: "https://a.example/u/outbox", preferredUsername: "u" };
  assert.equal(person(base).type, "Person");
  assert.equal(person(base)["@context"], AS2_CONTEXT);
  const keyed = person({ ...base, publicKeyPem: "PEM" });
  assert.deepEqual(keyed["@context"], [AS2_CONTEXT, SECURITY_CONTEXT]);
  assert.deepEqual(keyed.publicKey, { id: "https://a.example/u#main-key", owner: base.id, publicKeyPem: "PEM" });
  assert.throws(() => person({ id: base.id, inbox: base.inbox }), /outbox is required/);
  assert.throws(() => person({ ...base, inbox: undefined }), /inbox is required/);
  assert.throws(() => actor({ ...base, type: "Note" }), /unknown actor type/);
  assert.equal(actor({ ...base, type: "Service", sharedInbox: "https://a.example/inbox" }).endpoints.sharedInbox, "https://a.example/inbox");
});

test("every Activity subtype of the Vocabulary can be built; unknown types and missing parts are refused", () => {
  for (const type of ["Like", "Announce", "Undo", "Update", "Delete", "Reject", "Flag", "Add", "Remove", "TentativeAccept"]) assert.ok(ACTIVITY_TYPES.includes(type));
  const a = "https://a.example/u";
  assert.equal(activity("Like", { actor: a, object: "https://b.example/n" }).type, "Like");
  assert.throws(() => activity("Teleport", { actor: a, object: a }), /unknown activity type/);
  assert.throws(() => activity("Create", { object: {} }), /actor is required/);
  assert.throws(() => activity("Create", { actor: a }), /object is required/);
});

test("content activities default to Public; Follow, Accept and Undo are addressed by their author", () => {
  const a = "https://a.example/u";
  assert.deepEqual(activity("Create", { actor: a, object: {} }).to, [PUBLIC]);
  assert.equal(activity("Follow", { actor: a, object: "https://b.example/u" }).to, undefined);
  assert.deepEqual(activity("Follow", { actor: a, object: "https://b.example/u", to: "https://b.example/u" }).to, ["https://b.example/u"]);
  assert.throws(() => activity("Block", { actor: a, object: "https://b.example/u", to: [PUBLIC] }), /never addressed to Public/);
});

test("a Tombstone names the deleted object and what it was (Vocabulary: Tombstone)", () => {
  const t = tombstone("https://a.example/n/1", { formerType: "Note", deleted: "2026-01-01T00:00:00Z" });
  assert.deepEqual([t.type, t.formerType, t.deleted], ["Tombstone", "Note", "2026-01-01T00:00:00Z"]);
});

test("collections: an ordered collection counts its items; a page is partOf its collection (Core 5)", () => {
  const c = orderedCollection({ id: "https://a.example/outbox", orderedItems: [1, 2, 3] });
  assert.deepEqual([c.type, c.totalItems], ["OrderedCollection", 3]);
  const page = orderedCollectionPage({ id: "https://a.example/outbox?page=1", partOf: c.id, orderedItems: [1], next: "https://a.example/outbox?page=2" });
  assert.equal(page.type, "OrderedCollectionPage");
  assert.throws(() => orderedCollectionPage({ orderedItems: [] }), /partOf/);
  assert.throws(() => orderedCollectionPage({ partOf: c.id }), /orderedItems/);
});

test("isAS2: typed objects whose context, when present, names AS2", () => {
  assert.equal(isAS2({ type: "Note" }), true);
  assert.equal(isAS2({ "@context": AS2_CONTEXT, type: "Note" }), true);
  assert.equal(isAS2({ "@context": [AS2_CONTEXT, SECURITY_CONTEXT], type: ["Note", "Extra"] }), true);
  assert.equal(isAS2({ "@context": "https://example.net/other", type: "Note" }), false);
  for (const junk of [null, "x", [], {}, { type: "" }, { type: 5 }]) assert.equal(isAS2(junk), false);
});
