import assert from "node:assert/strict";
import test from "node:test";
import { delegatedOperationResourceContract, agencyWorkDelegatedContract } from "../src/work/schema.mjs";
import { agentWorkReadoutCollector } from "../src/work/readout.mjs";

const resource = { ref: "ni:commit", verb: "duty-worktree-commit", installed: true, available: true,
  sourceRepository: "git@github.com:example/source.git", repository: "/owner", workspace: "/worktree", scope: "work-item:a" };

test("delegated source resources and packet use the same strict contract", () => {
  assert.deepEqual(delegatedOperationResourceContract.assert(resource), resource);
  for (const bad of [{ ...resource, workspace: 42 }, { ...resource, sourceRefusal: "" }, { ...resource, inventedGrant: true }])
    assert.throws(() => delegatedOperationResourceContract.assert(bad));
  const packet = { kind: "metroplat.work.agency-work-delegated", at: "2026-10-04", providers: ["worker"], duties: [{
    scope: "work-item:a", holder: "worker", provider: "worker", intent: "intent", subject: "original", work: "work", skill: "skill",
    method: "method", receiverCondition: "independent receipt", operations: [resource.ref], effects: [], resources: [resource],
  }] };
  agencyWorkDelegatedContract.assert(packet);
  assert.throws(() => agencyWorkDelegatedContract.assert({ ...packet, duties: [{ ...packet.duties[0], resources: [{ ...resource, workspace: 42 }] }] }));
  delegatedOperationResourceContract.assert({ ...resource, available: false, sourceRefusal: "configured source unavailable" });
});

test("canonical original source custody survives after the scope is discharged", () => {
  const collector = agentWorkReadoutCollector();
  const scope = "work-item:source";
  collector.push([scope, { cell: scope, reading: "unknown" }, { boundary: { role: "obligation", text: "source", source: "structured-work-intent:source", subject: "original", evidence: ["producer:worker"], sourceRepository: resource.sourceRepository } }], "original", { id: "opening", core: { causes: [] } });
  collector.push([scope, { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }], "original", { id: "receipt", core: { causes: ["opening"] } });
  assert.equal(collector.obligationOf(scope).sourceRepository, resource.sourceRepository);
  assert.equal(collector.obligationOf(scope).witness, "opening");
  assert.equal(collector.obligationOf("work-item:absent"), undefined);
});
