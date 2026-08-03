import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG_PROFILE,
  auditCatalog,
  classifyResource,
  compileCatalog,
  receiptRmn,
  decodeReceiptRmn,
} from "../src/index.mjs";

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
  }, { addressRoot: "/typed", term: ["obsmetrologia", "articulating", "lean"], pathType: "rmn.json" });
  assert.equal(receipt.disposition, "classified");
  assert.equal(receipt.classification, "lean-reading");
  assert.deepEqual(receipt.proofPath.map((step) => step.type), ["resource", "source", "lean-reading"]);
  assert.ok(receipt.proofPath.every((step) => step.witnessed));
  assert.equal(receipt.pathReading.recoveredTerm, "obsmetrologia/articulating/lean");
});

test("equal-depth incomparable recognizers remain ambiguous", () => {
  const ambiguous = structuredClone(catalog);
  ambiguous.nodes.push({
    type: "another-lean-reading", parent: "source", corner: "assertion", rung: "identity",
    recognize: { op: "content-includes", value: "inductive Articulating where" },
  });
  const receipt = classifyResource(compileCatalog(ambiguous), {
    path: "/x", content: "apex:obsmetrologia/articulating inductive Articulating where",
  });
  assert.equal(receipt.disposition, "ambiguous");
  assert.deepEqual(receipt.candidates, ["another-lean-reading", "lean-reading"]);
  assert.deepEqual(receipt.proofPath, []);
});

test("closed mode refuses unresolved schema references", () => {
  const open = structuredClone(catalog);
  open.imports = [];
  const audit = auditCatalog(open);
  assert.equal(audit.closed, false);
  assert.deepEqual(audit.obligations, [{ kind: "unresolved-schema-reference", type: "source", ref: "urn:schema:external" }]);
  assert.throws(() => compileCatalog(open, { closed: true }), /catalog is not closed.*unresolved-schema-reference/u);
});

test("classification receipt has a reversible typed RMN Mark face", () => {
  const receipt = classifyResource(compileCatalog(catalog), { path: "/x", content: "nothing" });
  const projected = receiptRmn(receipt);
  assert.equal(projected.mediaType, "application/rmn+cbor");
  assert.deepEqual(decodeReceiptRmn(projected.bytes), receipt);
});

test("equal bytes at different proof paths remain distinct resources", () => {
  const compiled = compileCatalog(catalog);
  const content = "apex:obsmetrologia/articulating inductive Articulating where";
  const local = classifyResource(compiled, { path: "/tmp/one/Articulating.lean", content });
  const cloud = classifyResource(compiled, { path: "repo://info/obsmetrologia/Articulating.lean", content });
  assert.notEqual(local.resource, cloud.resource);
  assert.notEqual(local.id, cloud.id);
  assert.equal(local.contentIdentity, cloud.contentIdentity);
  assert.equal(local.resourcePath, "/tmp/one/Articulating.lean");
  assert.equal(cloud.resourcePath, "repo://info/obsmetrologia/Articulating.lean");
});

test("resource and catalog inputs are deliberately bounded", () => {
  assert.throws(
    () => classifyResource(compileCatalog(catalog), { path: "repo://too-large", content: "x".repeat(1_048_577) }),
    /resource.content exceeds 1048576 UTF-8 bytes/u,
  );
  const oversized = structuredClone(catalog);
  oversized.nodes = Array.from({ length: 257 }, (_, index) => ({ type: `resource-${index}`, parent: null, recognize: { op: "true" } }));
  assert.throws(() => compileCatalog(oversized), /catalog.nodes must contain 1 to 256 nodes/u);
});
