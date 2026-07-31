import assert from "node:assert/strict";
import test from "node:test";
import { iriTerm, literal } from "../../rdf-term-construction-service/src/rdf-terms.mjs";
import { buildNamedGraph } from "../../rdf-named-graph-construction-service/src/rdf-named-graph.mjs";
import { nquadLine, serializeNQuads } from "../src/n-quads.mjs";

test("nquadLine serializes a plain literal object, hand-computed", () => {
  const quad = {
    subject: "https://example.test/s",
    predicate: "https://example.test/p",
    object: { kind: "literal", value: "hello" },
    graph: "https://example.test/g",
  };
  assert.equal(
    nquadLine(quad),
    '<https://example.test/s> <https://example.test/p> "hello" <https://example.test/g> .',
  );
});

test("nquadLine serializes a language-tagged literal, hand-computed", () => {
  const quad = {
    subject: "https://example.test/s",
    predicate: "https://example.test/p",
    object: { kind: "literal", value: "bonjour", language: "fr" },
    graph: "https://example.test/g",
  };
  assert.equal(
    nquadLine(quad),
    '<https://example.test/s> <https://example.test/p> "bonjour"@fr <https://example.test/g> .',
  );
});

test("nquadLine serializes a datatyped literal, hand-computed", () => {
  const quad = {
    subject: "https://example.test/s",
    predicate: "https://example.test/p",
    object: { kind: "literal", value: "42", datatype: "http://www.w3.org/2001/XMLSchema#integer" },
    graph: "https://example.test/g",
  };
  assert.equal(
    nquadLine(quad),
    '<https://example.test/s> <https://example.test/p> "42"^^<http://www.w3.org/2001/XMLSchema#integer> <https://example.test/g> .',
  );
});

test("nquadLine serializes an IRI object, hand-computed", () => {
  const quad = {
    subject: "https://example.test/s",
    predicate: "https://example.test/p",
    object: { kind: "iri", value: "https://example.test/o" },
    graph: "https://example.test/g",
  };
  assert.equal(
    nquadLine(quad),
    "<https://example.test/s> <https://example.test/p> <https://example.test/o> <https://example.test/g> .",
  );
});

test("nquadLine escapes a literal containing a quote and a newline, hand-computed", () => {
  const quad = {
    subject: "https://example.test/s",
    predicate: "https://example.test/p",
    object: { kind: "literal", value: 'a "quoted"\nline' },
    graph: "https://example.test/g",
  };
  assert.equal(
    nquadLine(quad),
    '<https://example.test/s> <https://example.test/p> "a \\"quoted\\"\\nline" <https://example.test/g> .',
  );
});

test("serializeNQuads joins one line per quad with a trailing newline, byte-exact", () => {
  const record = buildNamedGraph(
    [
      { subject: "https://example.test/s", predicate: "https://example.test/p1", object: literal("hello") },
      {
        subject: "https://example.test/s",
        predicate: "https://example.test/p2",
        object: iriTerm("https://example.test/o"),
      },
    ],
    "https://example.test/g",
  );
  const expected =
    '<https://example.test/s> <https://example.test/p1> "hello" <https://example.test/g> .\n' +
    "<https://example.test/s> <https://example.test/p2> <https://example.test/o> <https://example.test/g> .\n";
  assert.equal(serializeNQuads(record), expected);
});

test("serializeNQuads refuses an empty quad set", () => {
  assert.throws(() => serializeNQuads([]), /requires at least one quad/);
});
