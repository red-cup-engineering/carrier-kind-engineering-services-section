import assert from "node:assert/strict";
import test from "node:test";

import { matchMarkdownToken } from "../src/match-markdown-token.mjs";

const INDEX = Object.freeze([
  Object.freeze({
    path: "services/witness-journal-rdf-projection-service/README.md",
    frontmatter: Object.freeze({ title: "WitnessJournal RDF Projection", tags: Object.freeze(["rdf", "projection"]) }),
    headings: Object.freeze([Object.freeze({ title: "Overview" }), Object.freeze({ title: "WitnessJournal data flow" })]),
  }),
  Object.freeze({
    path: "services/other-service/README.md",
    frontmatter: null,
    headings: Object.freeze([Object.freeze({ title: "About" })]),
  }),
  Object.freeze({
    path: "services/glossary/rmn.md",
    frontmatter: Object.freeze({ name: "RMN", description: "an unrelated field mentioning RMN too" }),
    headings: Object.freeze([]),
  }),
]);

test("matches a title-like frontmatter key as frontmatter-title", () => {
  const matches = matchMarkdownToken({ token: "WitnessJournal", index: INDEX });
  const titleHit = matches.find((m) => m.path === "services/witness-journal-rdf-projection-service/README.md" && m.matchKind === "frontmatter-title");
  assert.ok(titleHit);
  assert.equal(titleHit.matchedText, "WitnessJournal RDF Projection");
});

test("matches a heading title as matchKind heading", () => {
  const matches = matchMarkdownToken({ token: "WitnessJournal", index: INDEX });
  const headingHit = matches.find((m) => m.matchKind === "heading");
  assert.ok(headingHit);
  assert.equal(headingHit.matchedText, "WitnessJournal data flow");
});

test("a non-title frontmatter field is tagged frontmatter-field", () => {
  const matches = matchMarkdownToken({ token: "RMN", index: INDEX });
  const nameHit = matches.find((m) => m.matchKind === "frontmatter-title");
  const fieldHit = matches.find((m) => m.matchKind === "frontmatter-field");
  assert.ok(nameHit);
  assert.equal(nameHit.matchedText, "RMN");
  assert.ok(fieldHit);
  assert.equal(fieldHit.matchedText, "an unrelated field mentioning RMN too");
});

test("frontmatter-title outranks frontmatter-field outranks heading, ties broken by path", () => {
  const matches = matchMarkdownToken({ token: "RMN", index: INDEX });
  const kinds = matches.map((m) => m.matchKind);
  assert.deepEqual(kinds, ["frontmatter-title", "frontmatter-field"]);
});

test("a document with frontmatter: null is skipped for frontmatter matching but still checked for headings", () => {
  const matches = matchMarkdownToken({ token: "About", index: INDEX });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].path, "services/other-service/README.md");
  assert.equal(matches[0].matchKind, "heading");
});

test("case-folded by default", () => {
  const matches = matchMarkdownToken({ token: "witnessJournal", index: INDEX });
  assert.ok(matches.length > 0);
});

test("case-sensitive option requires exact case", () => {
  const matches = matchMarkdownToken({ token: "witnessJournal", index: INDEX, options: { caseSensitive: true } });
  assert.equal(matches.length, 0);
});

test("returned records are frozen and carry only the settled fields", () => {
  const matches = matchMarkdownToken({ token: "WitnessJournal", index: INDEX });
  assert.ok(Object.isFrozen(matches));
  assert.ok(Object.isFrozen(matches[0]));
  assert.deepEqual(Object.keys(matches[0]).sort(), ["matchKind", "matchedText", "path", "score"]);
});

test("throws on an empty token", () => {
  assert.throws(() => matchMarkdownToken({ token: "", index: INDEX }), TypeError);
});

test("throws when index is not an array", () => {
  assert.throws(() => matchMarkdownToken({ token: "x", index: null }), TypeError);
});

test("no matches over an empty index", () => {
  assert.deepEqual(matchMarkdownToken({ token: "WitnessJournal", index: [] }), []);
});
