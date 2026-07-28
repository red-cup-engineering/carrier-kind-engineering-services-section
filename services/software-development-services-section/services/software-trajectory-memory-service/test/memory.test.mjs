import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { loadSettlementAccount, relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { admitCustomerTrajectoryFoldback, deriveInducedTrajectoryResolver, latestMissionCheckpoint, missionMemoryContext, recallTrajectories, TRAJECTORY_MEMORY_ROOT, TRAJECTORY_MEMORY_SETTLEMENT_CAIP2, trajectoryRecipeFingerprint } from "../src/memory.mjs";

const edit = { action: "edit", args: { path: "source.mjs", blocks: { search: "old", replace: "new" } }, reason: "provider wording is not executable law" };
const row = (id, action = edit, verified = true) => ({ type: "SoftwareMissionTrajectory", id, taskClass: "exact-repair", outcome: { verified, promotable: verified, selectedActions: [action] } });
const record = (body) => ({ id: semanticId(relationalRwilDocument(body)), ...body });

test("trajectory memory selects exactly the settlement chain advertised by its Actor face", () => {
  const account = loadSettlementAccount(TRAJECTORY_MEMORY_ROOT, { caip2: TRAJECTORY_MEMORY_SETTLEMENT_CAIP2 });
  assert.equal(TRAJECTORY_MEMORY_SETTLEMENT_CAIP2, "eip155:5615610");
  assert.equal(account.actor, "urn:ame:software-trajectory-memory-service");
  assert.equal(account.settlement, "eip155:5615610:0x4c684d1d810702fd3488caa60035b9e8e98bf199");
});

test("five exact verified trajectories induce one replayable deterministic resolver", () => {
  const rows = Array.from({ length: 5 }, (_, index) => row(`urn:witness:${index}`));
  const resolver = deriveInducedTrajectoryResolver(rows, "exact-repair");
  assert.equal(resolver.eligible, true);
  assert.equal(resolver.dominantCount, 5);
  assert.deepEqual(resolver.actions, [{ action: "edit", args: edit.args }]);
  assert.equal(resolver.resolverId, trajectoryRecipeFingerprint([edit]));
  assert.match(resolver.resolverId, /^ni:\/\/\/sha-256;/u);
});

test("recalled verified knowledge is a complete canonical carrier", () => {
  const knowledge = recallTrajectories("repair exact source", {
    dataRoot: "unused",
    rows: [{ ...row("urn:witness:canonical"), objective: "repair exact source" }],
  });
  assert.doesNotThrow(() => relationalRwilDocument(knowledge));
  assert.equal(knowledge[0].inferenceContacts, null);
});

test("shape-similar edits with different bytes do not falsely induce one script", () => {
  const rows = [
    ...Array.from({ length: 3 }, (_, index) => row(`urn:left:${index}`)),
    ...Array.from({ length: 2 }, (_, index) => row(`urn:right:${index}`, { ...edit, args: { ...edit.args, blocks: { search: "other", replace: "else" } } })),
  ];
  const resolver = deriveInducedTrajectoryResolver(rows, "exact-repair");
  assert.equal(resolver.eligible, false);
  assert.equal(resolver.dominantCount, 3);
});

test("distinct failure classes remain typed market-learning residue", () => {
  const schemaRows = [1, 2].map((index) => ({
    type: "SoftwareMissionTrajectory",
    id: `urn:failed:${index}`,
    objective: "repair signed ingress",
    finishedAt: `2026-07-24T00:00:0${index}.000Z`,
    outcome: { verified: false },
    processNode: {
      refusal: {
        type: "candidate-refused-by-schema-assay",
        provider: "urn:ame:small-provider",
        schemaAssay: `ni:///sha-256;assay-${index}`,
        problems: [index === 1 ? "$/args:required:must have required property 'blocks'" : "$:required:must have required property 'reason'"],
      },
      providers: [],
    },
  }));
  const transportRows = [1, 2, 3].map((index) => ({
    type: "SoftwareMissionTrajectory",
    id: `urn:transport:${index}`,
    objective: "repair signed ingress",
    taskClass: "signed-ingress-repair",
    outcome: { verified: false },
    processNode: { refusal: { type: "selected-provider-refused", settlementResidues: [{ provider: "urn:ame:transport-provider", reason: "HTTP 500 from provider ingress" }] }, providers: [] },
  }));
  const invalidAction = {
    type: "SoftwareMissionTrajectory",
    id: "urn:invalid-action:latest",
    objective: "repair signed ingress",
    taskClass: "signed-ingress-repair",
    finishedAt: "2026-07-24T00:01:00.000Z",
    outcome: { verified: false },
    processNode: { refusal: { type: "invalid-action-candidate", reason: "edit search is not present in the evolving current source" }, providers: ["urn:ame:small-provider"] },
  };
  for (const row of schemaRows) row.taskClass = "signed-ingress-repair";
  const unrelated = { ...transportRows[0], id: "urn:transport:unrelated", taskClass: "arithmetic-repair" };
  const knowledge = recallTrajectories("repair signed ingress", { dataRoot: "unused", taskClass: "signed-ingress-repair", rows: [...transportRows, ...schemaRows, invalidAction, unrelated] });
  const schema = knowledge.find((entry) => entry.dominantRefusal === "candidate-refused-by-schema-assay");
  const transport = knowledge.find((entry) => entry.dominantRefusal === "selected-provider-refused");
  assert.equal(schema.capabilityFormationRequired, true);
  assert.equal(Object.hasOwn(schema, "modelEscalationAllowed"), false);
  assert.equal(schema.strategy, "induce-deterministic-validator-or-translator");
  assert.deepEqual(schema.providers, ["urn:ame:small-provider"]);
  assert.deepEqual(schema.schemaAssays, ["ni:///sha-256;assay-1", "ni:///sha-256;assay-2"]);
  assert.deepEqual(schema.problems, ["$/args:required:must have required property 'blocks'", "$:required:must have required property 'reason'"]);
  assert.deepEqual(schema.latestProblems, ["$:required:must have required property 'reason'"]);
  assert.equal(schema.latestSchemaAssay, "ni:///sha-256;assay-2");
  assert.equal(schema.latestWitness, "urn:failed:2");
  assert.deepEqual(transport.reasons, ["HTTP 500 from provider ingress"]);
  assert.equal(transport.occurrences, 3);
  const invalid = knowledge.find((entry) => entry.dominantRefusal === "invalid-action-candidate");
  assert.deepEqual(invalid.latestReasons, ["edit search is not present in the evolving current source"]);
  assert.equal(invalid.latestWitness, "urn:invalid-action:latest");
});

test("checkpoint lookup resumes the latest state on the same immutable source only", () => {
  const rows = [
    { type: "SoftwareMissionCheckpoint", id: "urn:checkpoint:old", missionId: "urn:mission:1", sourceIdentity: "urn:source:1", ordinal: "1", recordedAt: "2026-07-26T00:02:00.000Z", changes: [] },
    { type: "SoftwareMissionCheckpoint", id: "urn:checkpoint:new", missionId: "urn:mission:1", sourceIdentity: "urn:source:1", ordinal: "2", recordedAt: "2026-07-26T00:01:00.000Z", changes: [{ path: "source.mjs" }] },
    { type: "SoftwareMissionCheckpoint", id: "urn:checkpoint:foreign", missionId: "urn:mission:1", sourceIdentity: "urn:source:2", ordinal: "3", recordedAt: "2026-07-26T00:00:00.000Z", changes: [] },
  ];
  assert.equal(latestMissionCheckpoint("urn:mission:1", "urn:source:1", { rows }).id, "urn:checkpoint:new");
  assert.equal(latestMissionCheckpoint("urn:mission:1", "urn:source:3", { rows }), null);
});

test("one mission context projection carries checkpoint, recall, resolver, and promotion", () => {
  const checkpoint = { type: "SoftwareMissionCheckpoint", id: "urn:checkpoint:context", missionId: "urn:mission:context", sourceIdentity: "urn:source:context", ordinal: "1" };
  const trajectory = { ...row("urn:witness:context"), objective: "repair exact source" };
  const context = missionMemoryContext("repair exact source", "exact-repair", checkpoint.missionId, checkpoint.sourceIdentity, { rows: [checkpoint, trajectory] });
  assert.equal(context.checkpoint.id, checkpoint.id);
  assert.equal(context.memories.length, 1);
  assert.deepEqual(context.resolver, context.promotion);
  assert.equal(context.resolver.eligible, true);
});

test("a proposal-only trajectory becomes promotable only through an exact customer foldback", async () => {
  const trajectory = { type: "SoftwareMissionTrajectory", id: "urn:trajectory:proposal", taskClass: "exact-repair", outcome: { verified: true, promotable: false, selectedActions: [edit], proposal: { proposalOnly: true, customerMutation: false, trajectoryFingerprint: "shape", trajectoryRecipeFingerprint: trajectoryRecipeFingerprint([edit]) } } };
  const customer = "urn:test:customer-board";
  const supplier = "urn:ame:free-compute-dev";
  const foldback = record({ type: "ImprovementFoldback", customer, supplier, candidate: "urn:candidate:1", acceptedAt: "2026-07-21T01:00:00.000Z", route: { supplierTrajectory: trajectory.id, executionProvider: "urn:ame:software-mission-execution-service", trajectoryFingerprint: "shape", trajectoryRecipeFingerprint: trajectory.outcome.proposal.trajectoryRecipeFingerprint }, customerReplay: [{ passed: true }], routePolicy: "enterprise-memory-pulse-only" });
  const decision = record({ type: "ImprovementCustomerDecision", customer, supplier, candidate: foldback.candidate, foldback: foldback.id, foldbackSnapshot: foldback, accepted: true });
  const activity = { "@context": "https://www.w3.org/ns/activitystreams", type: "Accept", actor: customer, target: supplier, object: decision };
  const appended = [];
  const admitted = await admitCustomerTrajectoryFoldback(activity, { expectedCustomer: customer, expectedSupplier: supplier, rows: [trajectory], append: async (value) => appended.push(value) });
  assert.equal(admitted.status, "admitted"); assert.equal(appended[0].trajectory, trajectory.id);
  assert.equal(deriveInducedTrajectoryResolver([trajectory], "exact-repair", { threshold: 1 }).eligible, false);
  assert.equal(deriveInducedTrajectoryResolver([trajectory, appended[0]], "exact-repair", { threshold: 1 }).eligible, true);
  await assert.rejects(() => admitCustomerTrajectoryFoldback({ ...activity, actor: "urn:foreign" }, { expectedCustomer: customer, expectedSupplier: supplier, rows: [trajectory], append: assert.fail }), /exact customer-authored/);
});
