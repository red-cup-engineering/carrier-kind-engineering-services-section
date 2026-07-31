import assert from "node:assert/strict";
import test from "node:test";
import { iri, iriTerm, isTerm, literal } from "../src/rdf-terms.mjs";

test("iri accepts a well-formed absolute IRI", () => {
  assert.equal(iri("https://example.test/subject"), "https://example.test/subject");
});

test("iri refuses a blank-node label", () => {
  assert.throws(() => iri("_:b0"), /invalid RDF IRI/);
});

test("iri refuses control/delimiter characters and non-absolute values", () => {
  assert.throws(() => iri("https://example.test/a b"), /invalid RDF IRI/);
  assert.throws(() => iri("<https://example.test/>"), /invalid RDF IRI/);
  assert.throws(() => iri("not-a-uri"), /invalid RDF IRI/);
  assert.throws(() => iri(42), /invalid RDF IRI/);
});

test("iriTerm wraps a validated IRI as a frozen term", () => {
  const term = iriTerm("https://example.test/s");
  assert.deepEqual(term, { kind: "iri", value: "https://example.test/s" });
  assert.equal(Object.isFrozen(term), true);
});

test("literal refuses both datatype and language together", () => {
  assert.throws(
    () => literal("hi", { datatype: "http://www.w3.org/2001/XMLSchema#string", language: "en" }),
    /cannot have both datatype and language/,
  );
});

test("literal with only a language tag lowercases and validates it", () => {
  const term = literal("bonjour", { language: "FR-be" });
  assert.deepEqual(term, { kind: "literal", value: "bonjour", language: "fr-be" });
});

test("literal refuses a malformed language tag", () => {
  assert.throws(() => literal("hi", { language: "not a tag!" }), /invalid RDF language tag/);
});

test("literal with a datatype validates the datatype as an IRI", () => {
  const term = literal("42", { datatype: "http://www.w3.org/2001/XMLSchema#integer" });
  assert.deepEqual(term, {
    kind: "literal",
    value: "42",
    datatype: "http://www.w3.org/2001/XMLSchema#integer",
  });
  assert.throws(() => literal("42", { datatype: "_:b0" }), /invalid RDF IRI/);
});

test("literal with neither datatype nor language is a plain literal", () => {
  assert.deepEqual(literal("hello"), { kind: "literal", value: "hello" });
});

test("isTerm reports well-formedness of iri and literal terms", () => {
  assert.equal(isTerm(iriTerm("https://example.test/s")), true);
  assert.equal(isTerm(literal("hi", { language: "en" })), true);
  assert.equal(isTerm({ kind: "literal", value: "x", datatype: "d", language: "en" }), false);
  assert.equal(isTerm({ kind: "blank", value: "b0" }), false);
  assert.equal(isTerm(null), false);
});
