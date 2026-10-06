import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationsManifoldGraphOf, operationsManifoldOf } from "@red-cup-engineering/computer-system-engine/rpc/manifold";

function discoveryOf(bins) {
  return { kind: "test.discovery", package: "test-package", protocol: "mcp", bins, resources: [], prompts: [] };
}

describe("operations manifold local edges", () => {
  it("reports a plain codomain-domain edge, and an empty rejectedEdges, when no endpoint carries a contract", () => {
    const bins = [
      { name: "produce", codomainSchema: { $ref: "carrier/x" } },
      { name: "consume", domainSchema: { $ref: "carrier/x" } },
    ];
    const manifold = operationsManifoldOf(discoveryOf(bins));
    assert.deepEqual(manifold.extrema.edges, [{ from: "produce", to: "consume", carrier: "carrier/x", relation: "codomain-domain" }]);
    assert.deepEqual(manifold.extrema.rejectedEdges, []);
    assert.equal(manifold.utterances.some((u) => u.claim === "operations-manifold.composition-report"), false);
  });

  it("reports a schema-contract-composition edge and a composition-report fact when both endpoints carry a contract", () => {
    const bins = [
      {
        name: "produce",
        codomainSchema: { $ref: "carrier/x" },
        contract: { contract: { id: "producer.contract" }, reading: "potential" },
      },
      {
        name: "consume",
        domainSchema: { $ref: "carrier/x" },
        contract: { contract: { id: "consumer.contract" }, reading: "potential" },
      },
    ];
    const manifold = operationsManifoldOf(discoveryOf(bins));
    assert.deepEqual(manifold.extrema.edges, [{
      from: "produce",
      to: "consume",
      carrier: "carrier/x",
      relation: "schema-contract-composition",
      contractComposition: { producer: "producer.contract", producerReading: "potential", consumer: "consumer.contract", consumerReading: "potential" },
      ok: true,
    }]);
    assert.deepEqual(manifold.extrema.rejectedEdges, []);
    const report = manifold.utterances.find((u) => u.claim === "operations-manifold.composition-report");
    assert.notEqual(report, undefined);
    assert.deepEqual(report.token.object, { producer: "producer.contract", producerReading: "potential", consumer: "consumer.contract", consumerReading: "potential" });
  });
});

describe("operations manifold graph", () => {
  it("relates two package manifolds by shared carrier identity", () => {
    const upstream = operationsManifoldOf(discoveryOf([{ name: "produce", codomainSchema: { $ref: "carrier/shared" } }]));
    const upstreamPackage = { ...upstream, package: "upstream" };
    const downstream = operationsManifoldOf(discoveryOf([{ name: "consume", domainSchema: { $ref: "carrier/shared" } }]));
    const downstreamPackage = { ...downstream, package: "downstream" };
    const graph = operationsManifoldGraphOf([upstreamPackage, downstreamPackage]);
    assert.deepEqual(graph.edges, [{
      fromPackage: "upstream",
      from: "produce",
      toPackage: "downstream",
      to: "consume",
      carrier: "carrier/shared",
      relation: "codomain-domain",
    }]);
  });
});
