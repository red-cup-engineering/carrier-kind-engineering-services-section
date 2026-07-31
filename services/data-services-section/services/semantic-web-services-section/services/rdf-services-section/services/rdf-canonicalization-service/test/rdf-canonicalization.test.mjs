import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeNQuads } from "../src/rdf-canonicalization.mjs";

// This test requires the `rdf-canonize` npm dependency declared in this
// package's package.json to actually be installed. This checkout does not
// install dependencies (see the mission note against modifying/installing
// into the source package); if `rdf-canonize` is not resolvable from this
// package's node_modules chain, this test fails at import time with
// ERR_MODULE_NOT_FOUND rather than faking a pass. That failure is the
// correct, honest report: blocked on install, not a canonicalization bug.

test("canonicalizes a single-quad N-Quads graph under RDFC-1.0 (identity case)", async () => {
  const input = '<https://example.test/s> <https://example.test/p> "o" <https://example.test/g> .\n';
  const output = await canonicalizeNQuads(input);
  // A single ground (no blank nodes) quad is already in RDFC-1.0 canonical
  // form: canonicalization only renames blank nodes and reorders
  // statements, neither of which applies here.
  assert.equal(output, input);
});

test("canonicalizes two statements into RDFC-1.0's sorted N-Quads order", async () => {
  const input =
    '<https://example.test/s> <https://example.test/p2> "second" <https://example.test/g> .\n' +
    '<https://example.test/s> <https://example.test/p1> "first" <https://example.test/g> .\n';
  const expected =
    '<https://example.test/s> <https://example.test/p1> "first" <https://example.test/g> .\n' +
    '<https://example.test/s> <https://example.test/p2> "second" <https://example.test/g> .\n';
  const output = await canonicalizeNQuads(input);
  assert.equal(output, expected);
});
