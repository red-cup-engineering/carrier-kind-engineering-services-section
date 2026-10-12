// Extracted from typed-resource-catalog's own test/catalog.test.mjs: the one
// case that resolves a resource's canonical address, which needs the
// agentic-relation-engine writing module. classifyResource takes that module
// as an explicit options.writing dependency rather than an ambient import
// (see src/catalog.mjs), so only a caller that actually wants addressing —
// here, one that already sits beside agentic-relation-engine — supplies it.
import assert from "node:assert/strict";
import test from "node:test";
import * as writing from "@red-cup-engineering/agentic-relation-engine/writing";
import {
  CATALOG_PROFILE,
  classifyResource,
  compileCatalog,
} from "@red-cup-engineering/typed-resource-catalog";

const catalog = {
  profile: CATALOG_PROFILE,
  imports: ["urn:schema:external"],
  nodes: [
    { type: "resource", parent: null, recognize: { op: "true" }, corner: "bottom", rung: "identity" },
    {
      type: "source", parent: "resource", corner: "prose", rung: "identity",
      recognize: { op: "content-includes", value: "apex:obsmetrologia/articulating" },
      schema: { $id: "urn:schema:source", type: "object", properties: { peer: { $ref: "urn:schema:external" } } },
    },
    {
      type: "lean-reading", parent: "source", corner: "assertion", rung: "scott",
      recognize: { op: "content-includes", value: "inductive Articulating where" },
    },
    {
      type: "solidity-reading", parent: "source", corner: "assertion", rung: "identity",
      recognize: { op: "content-includes", value: "contract Articulating" },
    },
  ],
};

test("classification witnesses the restriction proof and its canonical path coordinate", () => {
  const compiled = compileCatalog(catalog, { closed: true });
  const receipt = classifyResource(compiled, {
    path: "/arbitrary/not-derived-from-extension.bin",
    content: "// apex:obsmetrologia/articulating\ninductive Articulating where",
  }, { addressRoot: "/typed", term: ["obsmetrologia", "articulating", "lean"], pathType: "rmn.json", writing });
  assert.equal(receipt.disposition, "classified");
  assert.equal(receipt.classification, "lean-reading");
  assert.deepEqual(receipt.proofPath.map((step) => step.type), ["resource", "source", "lean-reading"]);
  assert.ok(receipt.proofPath.every((step) => step.witnessed));
  assert.equal(receipt.pathReading.recoveredTerm, "obsmetrologia/articulating/lean");
});
