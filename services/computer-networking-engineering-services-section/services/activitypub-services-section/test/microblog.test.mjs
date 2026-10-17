// A short note as a federated object: Create (ActivityPub 6.2), Update (6.3), Delete with a Tombstone (6.4).
import test from "node:test";
import assert from "node:assert/strict";
import { PUBLIC } from "../src/as2.mjs";
import { createActivity, deleteActivity, fieldsFromCells, joinUrl, normalizeNote, noteObject, reverseChronological, slugify, updateActivity } from "../src/microblog.mjs";

const ACTOR = "https://m.example/@alice";
const FOLLOWERS = `${ACTOR}/followers`;
const algebra = (subject, ...cells) => ({ subject, affirmed: cells.map(([predicate, object]) => ({ predicate, object })), denied: [{ predicate: "summary", object: "denied" }] });

test("only affirmed cells describe a note; repeatable predicates accumulate without duplicates", () => {
  const n = normalizeNote({ algebra: algebra("first-note", ["content", "hi"], ["tag", "a"], ["category", "a"], ["tag", "b"], ["date", "2026-01-02"], ["in-reply-to", "https://x.example/p"]) }, { baseUrl: "https://m.example", notePath: "notes" });
  assert.equal(n.id, "https://m.example/notes/first-note");
  assert.deepEqual([n.content, n.tags, n.published, n.inReplyTo], ["hi", ["a", "b"], "2026-01-02", "https://x.example/p"]);
  assert.equal(n.summary, undefined, "a denied cell is not surfaced as metadata");
  assert.equal(normalizeNote({ algebra: algebra("https://m.example/n/9", ["content", "x"]) }).id, "https://m.example/n/9");
  assert.throws(() => normalizeNote({}), /algebra/);
  assert.deepEqual(fieldsFromCells([{ predicate: "unknown", object: 1 }, { predicate: "body", object: "" }]), {});
});

test("slug and URL helpers", () => {
  assert.equal(slugify("Héllo, Wörld!"), "hello-world");
  assert.equal(joinUrl("https://m.example/", "/a/b"), "https://m.example/a/b");
});

test("the notes timeline is newest first, undated last, in a total order", () => {
  const mk = (subject, published) => normalizeNote({ algebra: algebra(subject, ...(published ? [["published", published]] : [])) });
  const ordered = reverseChronological([mk("b"), mk("old", "2026-01-01"), mk("a"), mk("new", "2026-03-01")]);
  assert.deepEqual(ordered.map((n) => n.subject), ["new", "old", "a", "b"]);
});

const canonical = normalizeNote({ algebra: algebra("n1", ["content", "raw"], ["published", "2026-01-02T03:04:05Z"], ["tag", "fedi"], ["summary", "cw"]), id: "https://m.example/notes/n1" });

test("the Note carries the published body, hashtag objects, and the permalink", () => {
  const n = noteObject({ ...canonical, url: "https://m.example/notes/n1.html" }, "<p>body</p>", { attributedTo: ACTOR });
  assert.deepEqual([n.type, n.content, n.attributedTo, n.url, n.summary], ["Note", "<p>body</p>", ACTOR, "https://m.example/notes/n1.html", "cw"]);
  assert.deepEqual(n.tag, [{ type: "Hashtag", name: "#fedi" }]);
});

test("Create is public with the followers on cc; its id derives from the note id", () => {
  const c = createActivity(canonical, "<p>body</p>", { actor: ACTOR, followers: FOLLOWERS });
  assert.deepEqual([c.type, c.id, c.actor, c.to, c.cc, c.published], ["Create", "https://m.example/notes/n1#create", ACTOR, [PUBLIC], [FOLLOWERS], "2026-01-02T03:04:05Z"]);
  assert.equal(c.object.attributedTo, ACTOR);
  assert.throws(() => createActivity(canonical, "x", {}), /actor/);
});

test("Update restates the note with the instant of the edit, and needs one", () => {
  const u = updateActivity(canonical, "<p>edited</p>", { actor: ACTOR, updated: "2026-02-02T00:00:00Z" });
  assert.deepEqual([u.type, u.object.updated, u.object.content, u.id], ["Update", "2026-02-02T00:00:00Z", "<p>edited</p>", "https://m.example/notes/n1#update-2026-02-02T00:00:00Z"]);
  assert.throws(() => updateActivity(canonical, "x", { actor: ACTOR }), /instant of the edit/);
});

test("Delete carries a Tombstone remembering the note's former type", () => {
  const d = deleteActivity(canonical, { actor: ACTOR, deleted: "2026-03-03T00:00:00Z" });
  assert.deepEqual([d.type, d.object.type, d.object.id, d.object.formerType, d.object.deleted], ["Delete", "Tombstone", canonical.id, "Note", "2026-03-03T00:00:00Z"]);
});
