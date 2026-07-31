import assert from "node:assert/strict";
import test from "node:test";
import { iriTerm, literal } from "../../rdf-term-construction-service/src/rdf-terms.mjs";
import { buildNamedGraph } from "../src/rdf-named-graph.mjs";

test("builds a frozen quad-set record from statements and a graph name", () => {
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
  assert.equal(record.graph, "https://example.test/g");
  assert.equal(record.size, 2);
  assert.equal(record.quads.length, 2);
  assert.equal(record.quads[0].graph, "https://example.test/g");
  assert.equal(record.quads[1].object.kind, "iri");
});

test("the returned record and its quads are frozen", () => {
  const record = buildNamedGraph(
    [{ subject: "https://example.test/s", predicate: "https://example.test/p", object: literal("x") }],
    "https://example.test/g",
  );
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.quads), true);
  assert.equal(Object.isFrozen(record.quads[0]), true);
  assert.throws(() => {
    "use strict";
    record.size = 99;
  }, TypeError);
});

test("refuses an empty statement list", () => {
  assert.throws(() => buildNamedGraph([], "https://example.test/g"), /requires at least one statement/);
});

test("refuses a malformed graph name or statement term", () => {
  assert.throws(
    () => buildNamedGraph([{ subject: "https://example.test/s", predicate: "https://example.test/p", object: literal("x") }], "_:b0"),
    /invalid RDF IRI/,
  );
  assert.throws(
    () =>
      buildNamedGraph(
        [{ subject: "https://example.test/s", predicate: "https://example.test/p", object: { kind: "blank" } }],
        "https://example.test/g",
      ),
    /not a well-formed RDF term/,
  );
});
