import assert from "node:assert/strict";
import test from "node:test";

import { catalogNodeWorkspaceSources, decodeReceiptRmn, receiptRmn } from "../src/index.mjs";

const resource = (path, manifest) => ({ path, content: JSON.stringify(manifest) });

test("projects admitted workspace manifests as canonical package loci, dependency edges, and CHL proof paths", () => {
  const receipt = catalogNodeWorkspaceSources({ resources: [
    resource("services/provider/package.json", { name: "@test/provider", version: "2.0.0" }),
    resource("sites/gui/package.json", {
      name: "@test/gui", version: "1.0.0",
      dependencies: { "@test/provider": "workspace:*", external: "3.0.0" },
      devDependencies: { "@test/tool": "workspace:*" },
    }),
    resource("services/tool/package.json", { name: "@test/tool", version: "1.0.0" }),
  ] });

  assert.equal(receipt.type, "NodeWorkspaceSourceCatalogReceipt");
  assert.deepEqual(receipt.denominator, { type: "admitted-package-manifest-set", count: 3 });
  assert.deepEqual(receipt.packages.map(({ name }) => name), ["@test/gui", "@test/provider", "@test/tool"]);
  assert.deepEqual(receipt.packages[0].proofPath.map(({ type, witnessed }) => ({ type, witnessed })), [
    { type: "resource", witnessed: true },
    { type: "node-package-manifest", witnessed: true },
  ]);
  assert.deepEqual(receipt.relations, [
    { type: "node-package-dependency", consumer: "@test/gui", provider: "@test/provider", requested: "workspace:*", role: "runtime", optional: false, scope: "workspace", selected: "2.0.0" },
    { type: "node-package-dependency", consumer: "@test/gui", provider: "@test/tool", requested: "workspace:*", role: "development", optional: false, scope: "workspace", selected: "1.0.0" },
    { type: "node-package-dependency", consumer: "@test/gui", provider: "external", requested: "3.0.0", role: "runtime", optional: false, scope: "external", selected: null },
  ]);
  assert.deepEqual(decodeReceiptRmn(receiptRmn(receipt).bytes), receipt);
});

test("knowledge carrier identity is order-independent while contingent truth readings remain explicit", () => {
  const first = resource("a/package.json", { name: "a", version: "1.0.0", optionalDependencies: { absent: "1.0.0" } });
  const second = resource("b/package.json", { name: "b", version: "1.0.0", peerDependencies: { a: "^1" } });
  const left = catalogNodeWorkspaceSources({ resources: [first, second] });
  const right = catalogNodeWorkspaceSources({ resources: [second, first] });
  assert.equal(left.id, right.id);
  assert.deepEqual(left.relations.find(({ provider }) => provider === "absent"), {
    type: "node-package-dependency", consumer: "a", provider: "absent", requested: "1.0.0", role: "runtime", optional: true, scope: "external", selected: null,
  });
});

test("refuses ambiguous workspace identity and paths outside the admitted territory", () => {
  assert.throws(() => catalogNodeWorkspaceSources({ resources: [
    resource("a/package.json", { name: "same", version: "1.0.0" }),
    resource("b/package.json", { name: "same", version: "2.0.0" }),
  ] }), /duplicated/u);
  assert.throws(() => catalogNodeWorkspaceSources({ resources: [resource("../package.json", { name: "escape", version: "1.0.0" })] }), /escapes/u);
});
