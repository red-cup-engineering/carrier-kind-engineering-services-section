// The outbox (ActivityPub 5.1) as an OrderedCollection of Create activities rebuilt from settled claims.
import test from "node:test";
import assert from "node:assert/strict";
import { activityFor, cellsToObject, objectFor, outboxCollection } from "../src/outbox-projection.mjs";

const ACTOR = "https://me.example/actors/me";
const cells = (...pairs) => pairs.map(([predicate, object]) => ({ predicate, object }));

test("affirmed cells reassemble one object; repeated predicates gather into arrays", () => {
  const o = cellsToObject("https://me.example/n/1", cells(["type", "Note"], ["content", "hi"], ["tag", "a"], ["tag", "b"]));
  assert.deepEqual(o, { id: "https://me.example/n/1", type: "Note", content: "hi", tag: ["a", "b"] });
  assert.equal(cellsToObject("https://me.example/n/2", cells(["content", "x"])).type, "Note", "Note when untyped");
});

test("objectFor types the result and attributes it to the actor", () => {
  const n = objectFor("https://me.example/n/1", { affirmed: cells(["content", "hi"], ["inReplyTo", "https://x.example/p"]) }, { attributedTo: ACTOR });
  assert.deepEqual([n.type, n.attributedTo, n.inReplyTo], ["Note", ACTOR, "https://x.example/p"]);
  const a = objectFor("https://me.example/a/1", { affirmed: cells(["type", "Article"], ["name", "Title"], ["content", "body"]) }, { attributedTo: ACTOR });
  assert.deepEqual([a.type, a.name], ["Article", "Title"]);
  assert.equal(objectFor("https://me.example/e/1", { affirmed: cells(["type", "Event"], ["name", "Party"]) }, { attributedTo: ACTOR }).type, "Event");
});

test("a contradicted subject is published as contested, with both sides' witnesses", () => {
  const algebra = { affirmed: cells(["content", "hi"]), contradicted: [{ predicate: "content", object: "gone", affirmedBy: ["a1"], deniedBy: ["d1"] }] };
  const create = activityFor("https://me.example/n/1", algebra, { actor: ACTOR });
  assert.equal(create.type, "Create");
  assert.equal(create._contested, true);
  assert.deepEqual(create._contradictions[0], { predicate: "content", object: "gone", affirmedBy: ["a1"], deniedBy: ["d1"] });
  assert.equal(activityFor("https://me.example/n/1", { affirmed: cells(["content", "hi"]) }, { actor: ACTOR })._contested, undefined);
  assert.throws(() => activityFor("https://me.example/n/1", {}, {}), /publishing actor/);
});

test("the outbox is an OrderedCollection, newest first, counting its items", () => {
  const algebras = { "https://me.example/n/1": { t: "2026-01-01", affirmed: cells(["content", "old"]) }, "https://me.example/n/2": { t: "2026-02-01", affirmed: cells(["content", "new"]) } };
  const c = outboxCollection({ id: `${ACTOR}/outbox`, actor: ACTOR, subjects: Object.keys(algebras), settle: (s) => algebras[s] });
  assert.deepEqual([c.type, c.totalItems], ["OrderedCollection", 2]);
  assert.deepEqual(c.orderedItems.map((i) => i.object.content), ["new", "old"]);
});
