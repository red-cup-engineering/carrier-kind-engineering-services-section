import assert from "node:assert/strict";
import test from "node:test";
import { enterpriseOperations } from "../src/enterprise/operations.mjs";

test("a shared contract reads its owner's signatures without unrelated enterprises", async () => {
  const reads = [];
  const registry = {
    enterprises: new Map(["owner", "participant", "unrelated"].map(id => [id, { id, kind: "node" }])),
    contracts: new Map([["shared", { id: "shared", type: "chain-group", enterprises: ["owner", "participant"], parties: ["seller"] }]]),
  };
  const store = { read(category, filter = {}) {
    reads.push({ category, ...filter });
    if (category !== "signature") return [];
    assert.equal(filter.enterprise, "owner");
    return [{ enterprise: "owner", contract: "shared", office: "seller", reading: "held", by: "signer", recordedAt: "2026-10-01T00:00:00Z" }];
  } };
  const read = enterpriseOperations({ dataRoot: "/unused" }, { agency: () => registry, store }).find(op => op.verb === "enterprise");
  const result = await read.execute({ enterprise: "participant" });
  assert.equal(result.contracts[0].standing, "in force");
  assert.deepEqual(reads.filter(row => row.category === "signature"), [{ category: "signature", enterprise: "owner" }]);
  reads.length = 0;
  assert.deepEqual((await read.execute({ enterprise: "unrelated" })).contracts, []);
  assert.equal(reads.some(row => row.category === "signature"), false);
});
