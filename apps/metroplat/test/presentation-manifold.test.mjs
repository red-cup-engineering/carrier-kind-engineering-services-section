import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { assembleDefaultService, assembleDefaultServiceMcp } from "@red-cup-engineering/metroplat/catalog";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { schemaReferenceIncidence, schemaSlotRef } from "@red-cup-engineering/metrologic/settling/schema/site";
import { readModuleTopology } from "@red-cup-engineering/computer-code-development-engine/monitoring/source-code/topology/service";
import * as serving from "@red-cup-engineering/metroplat/presentation/serving";
import { schemasOfOperations } from "@red-cup-engineering/computer-system-engine/rpc/operation";

test("schema incidence owns slot references below manifold and serving projections", () => {
  assert.equal(schemaSlotRef({ $ref: "metroplat/example" }), "metroplat/example");
  assert.equal(schemaSlotRef({ type: "object", properties: { nested: { $ref: "metroplat/nested" } } }), undefined);
  assert.equal("slotRef" in serving, false);

  const topology = readModuleTopology(process.cwd(), { sourceDirs: ["src/presentation"], maxFiles: 100 });
  const importsOf = (modulePath) => topology.modules.find((moduleEntry) => moduleEntry.path === modulePath)?.imports ?? [];
  assert.equal(importsOf("src/presentation/manifold.mts").includes("src/presentation/serving.mts"), false);
  assert.ok(importsOf("src/presentation/manifold.mts").includes("src/lib/schema/site.mts"));
  assert.ok(importsOf("src/presentation/serving.mts").includes("src/presentation/manifold.mts"));
});

test("schema reference incidence is explicit and broken local definitions do not validate loosely", () => {
  const target = schemaFrom({ $id: "metroplat/test/reference/target", type: "string" });
  const source = schemaFrom({
    $id: "metroplat/test/reference/source",
    type: "object",
    properties: {
      target: { $ref: "metroplat/test/reference/target" },
      local: { $ref: "#/$defs/present" },
      broken: { $ref: "#/$defs/missing" },
    },
    $defs: { present: { type: "integer" } },
  }, [target]);
  const incidence = schemaReferenceIncidence([source, target]);
  assert.deepEqual(incidence.unresolved.map(({ from, ref, scope }) => ({ from, ref, scope })), [{
    from: source.id,
    ref: "#/$defs/missing",
    scope: "local",
  }]);
  assert.equal(source.validate({ target: "value", local: 1, broken: "anything" }), false);
  assert.match(source.errors({ target: "value", local: 1, broken: "anything" }).join("; "), /unresolved schema reference #\/\$defs\/missing/u);

  const composed = schemaFrom({
    $id: "metroplat/test/reference/composed",
    type: "object",
    required: ["target"],
    properties: { target: { $ref: target.id } },
  }, [target]);
  assert.equal(composed.validate({ target: "value" }), true);
  assert.equal(composed.validate({ target: 1 }), false);

  const uncomposed = schemaFrom({
    $id: "metroplat/test/reference/uncomposed",
    type: "object",
    required: ["target"],
    properties: { target: { $ref: target.id } },
  });
  assert.equal(uncomposed.validate({ target: "value" }), false);
  assert.match(uncomposed.errors({ target: "value" }).join("; "), /unresolved schema reference/u);
});

test("schema compilation preserves instance-valued keywords and nested identifier scopes", () => {
  const literal = Object.freeze({ $id: "data-id", $ref: "data-ref", items: ["data-items"] });
  const contract = schemaFrom({
    $id: "metroplat/test/schema-projection/instance-values",
    type: "object",
    required: ["literal", "enumerated", "tuple", "scoped"],
    properties: {
      literal: { const: literal },
      enumerated: { enum: [literal] },
      tuple: { type: "array", items: [{ const: "left" }, { const: "right" }], minItems: 2, maxItems: 2, additionalItems: false },
      scoped: {
        $id: "scoped",
        type: "object",
        required: ["value"],
        properties: { value: { $ref: "#/$defs/value" } },
        $defs: { value: { const: "scoped" } },
      },
    },
    additionalProperties: false,
  });
  const candidate = { literal, enumerated: literal, tuple: ["left", "right"], scoped: { value: "scoped" } };
  assert.equal(contract.validate(candidate), true);
  assert.equal(contract.validate({ ...candidate, literal: { ...literal, items: ["corrupted"] } }), false);
  assert.equal(contract.validate({ ...candidate, tuple: ["left", "right", "extra"] }), false);
  assert.equal(contract.validate({ ...candidate, scoped: { value: "wrong" } }), false);
});

test("schema compilation projects draft-07 dependency schemas and preserves separate nested scopes", () => {
  const dependency = schemaFrom({
    $id: "metroplat/test/schema-projection/dependency",
    type: "object",
    required: ["dependent"],
    properties: { dependent: { const: true } },
    $defs: { flag: { type: "boolean" } },
  });
  const contract = schemaFrom({
    $id: "metroplat/test/schema-projection/dependencies",
    type: "object",
    properties: {
      trigger: { type: "string" },
      flag: { $ref: `${dependency.id}#/$defs/flag` },
      first: { $id: "first/", type: "object", properties: { child: { $id: "child", type: "object", properties: { value: { $ref: "#/$defs/value" } }, $defs: { value: { const: "first" } } } } },
      second: { $id: "second/", type: "object", properties: { child: { $id: "child", type: "object", properties: { value: { $ref: "#/$defs/value" } }, $defs: { value: { const: "second" } } } } },
    },
    dependencies: { trigger: { $ref: dependency.id }, propertyList: ["trigger"] },
  }, [dependency]);
  assert.equal(contract.validate({ trigger: "go", dependent: true, flag: true, first: { child: { value: "first" } }, second: { child: { value: "second" } } }), true);
  assert.equal(contract.validate({ trigger: "go", dependent: false }), false);
  assert.equal(contract.validate({ trigger: "go", dependent: true, flag: "not-a-flag" }), false);
  const repeatedChild = { $id: "child", type: "object", required: ["value"], properties: { value: { $ref: "#/$defs/value" } }, $defs: { value: { type: "string" } } };
  const repeated = schemaFrom({
    $id: "metroplat/test/schema-projection/repeated-scope",
    type: "object",
    required: ["a", "b"],
    properties: { a: repeatedChild, b: repeatedChild },
  });
  assert.equal(repeated.validate({ a: { value: "first" }, b: { value: "second" } }), true);
  assert.equal(repeated.validate({ a: { value: "first" }, b: { value: 2 } }), false);
  assert.throws(() => schemaFrom({
    $id: "metroplat/test/schema-projection/duplicate-scope",
    type: "object",
    properties: {
      left: { $id: "child", type: "string" },
      right: { $id: "child", type: "number" },
    },
  }), /nested \$id/u);
});

test("the assembled operation schema universe is closed under its references", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-schema-incidence-"));
  try {
    const operations = assembleDefaultService({ packageRoot: process.cwd(), dataRoot }).operations;
    const incidence = schemaReferenceIncidence(schemasOfOperations(operations));
    assert.ok(incidence.schemas.length > 0);
    assert.deepEqual(incidence.unresolved, []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("operation schema projection includes explicitly composed reference targets", () => {
  const target = schemaFrom({ $id: "metroplat/test/operation-reference/target", type: "string" });
  const source = schemaFrom({
    $id: "metroplat/test/operation-reference/source",
    type: "object",
    required: ["target"],
    properties: { target: { $ref: target.id } },
  }, [target]);
  const operations = [{ domain: source, codomain: source }];
  assert.deepEqual(schemasOfOperations(operations).map((contract) => contract.id), [source.id, target.id]);
  assert.deepEqual(schemaReferenceIncidence(schemasOfOperations(operations)).unresolved, []);
});

function assertSingleOperationCut(assembly) {
  assert.strictEqual(assembly.operations, assembly.catalog.operations);
  const assembled = new Set(assembly.operations);
  assert.equal(assembly.apex.operations.length, assembly.operations.length);
  for (const operation of assembly.apex.operations) assert.ok(assembled.has(operation));

  const mounted = assembly.mounts.flatMap((mount) => mount.induced.operations);
  assert.equal(mounted.length, assembly.operations.length);
  for (const operation of mounted) assert.ok(assembled.has(operation));
}

test("default service catalog, mounts, and apex share one operation cut", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-service-assembly-"));
  try {
    assertSingleOperationCut(assembleDefaultService({ dataRoot }));
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("MCP assembly settles and mounts its descriptor-aware LSP operation", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-service-assembly-"));
  try {
    const assembly = assembleDefaultServiceMcp({ dataRoot });
    assertSingleOperationCut(assembly);
    const lsp = assembly.operations.find((operation) => operation.verb === "metroplat-lsp");
    assert.ok(lsp);
    assert.ok(assembly.mounts.some((mount) => mount.induced.operations.includes(lsp)));
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
