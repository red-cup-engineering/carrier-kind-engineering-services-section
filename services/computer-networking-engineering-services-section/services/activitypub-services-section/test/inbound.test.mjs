// Paraconsistent federation: inbound activities are witnessed claims, never last-writer-wins.
// Behaviour follows ActivityPub 7 (inbox delivery, 202) and the side effects of Create, Update,
// Delete and Undo (section 7 and 6.x side effects); the settle is the Belnap knowledge join.
import test from "node:test";
import assert from "node:assert/strict";
import { createRelationWeb } from "@red-cup-engineering/eavt-services-section/relation-web";
import { activityObservation, activityToClaims, citationOf, objectToClaims, receiveInbound, settleObservations, subjectOf } from "../src/inbound.mjs";

const A = "https://peer.example/users/a";
const B = "https://other.example/users/b";
const OBJ = "https://peer.example/notes/1";
const create = { "@context": "https://www.w3.org/ns/activitystreams", id: "https://peer.example/a/1", type: "Create", actor: A, object: { id: OBJ, type: "Note", content: "hello" } };
const del = { id: "https://other.example/d/1", type: "Delete", actor: B, object: { id: OBJ, type: "Tombstone", content: "hello" } };

test("the witness of an activity is its id, else actor@published", () => {
  assert.equal(citationOf(create), "https://peer.example/a/1");
  assert.equal(citationOf({ type: "Create", actor: A, published: "2026-01-01T00:00:00Z" }), `${A}@2026-01-01T00:00:00Z`);
  assert.equal(subjectOf(create), OBJ);
  assert.deepEqual(objectToClaims({ id: OBJ, "@context": "x", type: "Note", content: "hello" }), { type: "Note", content: "hello" });
});

test("Create and Update affirm; Delete denies; Undo inverts the wrapped activity", () => {
  assert.equal(activityToClaims(create).polarity, "for");
  assert.equal(activityToClaims({ ...create, type: "Update", id: "u" }).polarity, "for");
  assert.equal(activityToClaims(del).polarity, "against");
  assert.deepEqual(activityToClaims({ id: "d", type: "Delete", actor: A, object: OBJ }).claims, { exists: true });
  const undoDelete = activityToClaims({ id: "u1", type: "Undo", actor: B, object: { ...del } });
  assert.equal(undoDelete.polarity, "for");
  assert.equal(undoDelete.subject, OBJ);
  assert.equal(activityToClaims({ id: "u2", type: "Undo", actor: A, object: create }).polarity, "against");
});

test("Follow, Accept, Like and Announce are membership claims on the actor; Undo/Reject of a Follow withdraws it", () => {
  const follow = { id: "f1", type: "Follow", actor: A, object: B };
  assert.deepEqual(activityToClaims(follow), { subject: A, polarity: "for", claims: { follows: B }, citation: "f1", activityType: "Follow" });
  assert.deepEqual(activityToClaims({ id: "l", type: "Like", actor: A, object: OBJ }).claims, { likes: OBJ });
  assert.deepEqual(activityToClaims({ id: "s", type: "Announce", actor: A, object: OBJ }).claims, { announces: OBJ });
  assert.deepEqual(activityToClaims({ id: "ac", type: "Accept", actor: B, object: follow }).claims, { accepted: "f1" });
  const undo = activityToClaims({ id: "uf", type: "Undo", actor: A, object: follow });
  assert.deepEqual([undo.subject, undo.polarity, undo.claims], [A, "against", { follows: B }]);
  const reject = activityToClaims({ id: "rj", type: "Reject", actor: B, object: follow });
  assert.deepEqual([reject.subject, reject.polarity], [A, "against"]);
});

test("unplaceable activities are refused with a reason, never silently dropped", () => {
  assert.equal(activityToClaims({ type: "Create" }), null);
  assert.equal(activityToClaims({ type: "Move", actor: A, object: B }), null);
  assert.equal(activityToClaims("nope"), null);
  const refused = activityObservation({ type: "Create", actor: A });
  assert.equal(refused.admission.status, "refused");
  assert.equal(refused.relations.length, 0);
  assert.equal(receiveInbound("x").status, 400);
  assert.equal(receiveInbound({ type: "Create", actor: A }).status, 400);
});

test("an inbox POST of a placeable activity is 202 and yields an observation of its claims", () => {
  const r = receiveInbound(create, { inbox: "https://me.example/inbox", receivedAt: "2026-01-01T00:00:00Z" });
  assert.equal(r.status, 202);
  assert.deepEqual(r.observation.relations.map((x) => [x.subject, x.predicate, x.object, x.polarity]), [[OBJ, "type", "Note", "for"], [OBJ, "content", "hello", "for"]]);
  assert.equal(r.observation.relations[0].evidence.activity, "https://peer.example/a/1");
});

const settled = (activities) => {
  const web = createRelationWeb();
  for (const activity of activities) web.observe(activityObservation(activity));
  return settleObservations(web.query());
};

test("THESIS: a Create and a Delete of the same cell settle to contradicted, keeping both witnesses", () => {
  const s = settled([create, del]);
  const content = s.contradicted.find((c) => c.predicate === "content");
  assert.deepEqual(content.affirmedBy, ["https://peer.example/a/1"]);
  assert.deepEqual(content.deniedBy, ["https://other.example/d/1"]);
  assert.equal(s.contradicted.length, 1, "only the shared cell conflicts");
  assert.deepEqual([s.affirmed[0].object, s.denied[0].object], ["Note", "Tombstone"], "the differing type cells stay as told");
});

test("THESIS: the settle is order-independent, associative and idempotent", () => {
  const undo = { id: "u9", type: "Undo", actor: B, object: del };
  const orders = [[create, del, undo], [undo, del, create], [del, create, undo, create]];
  const results = orders.map((o) => JSON.stringify(settled(o)));
  assert.equal(new Set(results).size, 1);
  // a Create then a Delete then an Undo of the Delete: told for twice and against once -> still contested, not erased
  assert.ok(JSON.parse(results[0]).contradicted.length > 0);
});

test("an uncontested Delete is denied and an uncontested Create affirmed", () => {
  assert.equal(settled([create]).affirmed.length, 2);
  assert.equal(settled([del]).denied.length, 2);
});

test("replaying the same delivery is idempotent in the relation web", () => {
  const web = createRelationWeb();
  assert.equal(web.observe(activityObservation(create)).admitted, true);
  assert.equal(web.observe(activityObservation(create)).duplicate, true);
});
