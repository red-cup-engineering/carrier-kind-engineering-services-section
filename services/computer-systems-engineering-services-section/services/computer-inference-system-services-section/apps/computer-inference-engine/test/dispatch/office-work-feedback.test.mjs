import { localInferenceWorkLotSource } from "../../src/dispatch/local-inference-work-lot-source.mjs";
import { executionConfigurationIdentity } from "../../src/dispatch/sen-carrier.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { appendDelivery, loadObservations } from "../../src/dispatch/expected-resolution-pricing.mjs";
import { recordAcceptedWorkInferenceOutcome } from "../../src/dispatch/accepted-work-outcome.mjs";
import { inferenceWorkLotSource, BOUNDED_INFERENCE_SERVICE_MODEL, METROPLAT_INFERENCE_MARKET_CUSTOMER, officeWorkInferenceTaskClass } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source";
import { executeAgencyWorkProvider } from "@red-cup-engineering/feltos/work/agency-work-provider";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";
import { journalEncounterStore } from "@red-cup-engineering/feltos/encounter/store";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { readCapabilityWitnesses } from "@red-cup-engineering/computer-system-engine/rpc/capability-claims";
import { describe } from "@red-cup-engineering/computer-system-engine/rpc/describe";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { createOperationCatalog } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const at = "2026-09-08T12:00:00.000Z";

function dispatchItem(cell, text, requirements, operations) {
  return Object.freeze({
    agent: "holder-fixture", scope: cell, state: "ready", status: "open",
    structural: { state: "ready", blockers: [] }, coordination: { state: "clear" }, conflicts: [], via: "office",
    passive: "provider-fixture", standing: "held", reasons: [], intent: "intent:fixture", work: "work:fixture",
    skill: "fixture-skill", closureKind: "inquiry", requiresCapabilities: requirements, method: "Use the declared fixture method.",
    receiverCondition: "An independent receiver checks the proposal.", text,
    delegation: { provider: "provider-fixture", authority: "holder-fixture", operations, effects: ["host-read"] },
  });
}

function fixture(root, source) {
  const packageName = "@test/office-work-feedback";
  const operations = Object.freeze([]);
  const catalog = createOperationCatalog(operations);
  const surface = Object.freeze({
    discovery: { package: packageName }, operations, catalog,
    capabilities: readCapabilityWitnesses([]), description: describe(catalog),
    authorize: authorizationFromStanding(new Map()),
  });
  const encounters = journalEncounterStore(root, { namespace: packageName, pollIntervalMs: 10 });
  const provider = inferenceProviderOperation("fixture-inference", source, encounters, encounterExecutionControl());
  const inference = witnessedInferenceEncounterPort({
    operation: provider, encounters, witness: journalRpcWitness(root, { namespace: packageName }),
    authorize: authorizationFromStanding(new Map([[provider.ref, "held"]])), now: () => at,
  });
  return { item: dispatchItem("work-item:feedback-fixture", "Produce an independently received finding.", [], []),
    options: { surface, dataRoot: root, rootName: packageName, workerId: "provider-fixture", provider: "fixture-inference",
      model: BOUNDED_INFERENCE_SERVICE_MODEL, inference, now: () => at, maxTurns: 2 } };
}

for (const lane of ["network", "local"]) test(`${lane} terminal delivery survives witnessed execution and receiving feedback addresses it once`, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-receiving-feedback-"));
  try {
    const work = "fixture-office-work";
    const receipt = `ni:///sha-256;${"E".repeat(43)}`;
    const requestNi = `ni:///sha-256;${"F".repeat(43)}`;
    const resultNi = `ni:///sha-256;${"G".repeat(43)}`;
    const configuration = { provider: "urn:fixture:inference-provider", model: "fixture/model" };
    const configurationIdentity = executionConfigurationIdentity(configuration);
    const deliver = async (request, mismatch = false) => {
      const delivery = {
        workLot: request.workLotId, provider: configuration.provider,
        taskClass: request.taskClass, selectedOffer: "urn:fixture:offer",
        receipt, receiver: request.customer, configuration, configurationIdentity,
      };
      appendDelivery(delivery, { dataRoot: root });
      return {
        ...delivery, workLot: mismatch ? "urn:fixture:other-lot" : delivery.workLot,
        receipt: { id: receipt }, outcome: "candidate-pending-customer-acceptance",
        integrationAccepted: false, model: "fixture/model",
        candidate: { id: "fixture-chat", object: "chat.completion", created: 1, model: "fixture/model", choices: [{ index: 0, message: { role: "assistant", content: "Finding for independent receipt." }, finish_reason: "stop" }] },
      };
    };
    const sourceOf = (mismatch = false) => lane === "local"
      ? localInferenceWorkLotSource({ now: () => at, dispatch: (request) => deliver(request, mismatch) })
      : inferenceWorkLotSource({
        agentUrl: "http://127.0.0.1:8800/.well-known/agent-card.json", desiredUse: "fixture-office-inquiry", purpose: "demonstrate independently received office inference", now: () => at,
        request: async ({ request }) => ({ exchange: { inputNi: requestNi }, resultNi,
          provider: { account: "urn:fixture:market" }, result: await deliver(request, mismatch) }),
      });
    const setup = fixture(root, sourceOf());
    const item = { ...setup.item, work };
    const outcome = await executeAgencyWorkProvider(item, { ...setup.options, model: BOUNDED_INFERENCE_SERVICE_MODEL });
    assert.equal(outcome.result.kind, "skill-result", JSON.stringify(outcome));
    assert.equal(outcome.result.value.inferenceDelivery.receipt, receipt);
    assert.equal(outcome.result.value.inferenceDelivery.taskClass, officeWorkInferenceTaskClass(work));
    assert.ok(outcome.providerEvidence.includes(receipt));
    assert.notEqual(receipt, resultNi, "delivery is distinct from exchange custody");
    assert.equal(loadObservations({ dataRoot: root }).length, 0, "delivery and execution cannot accept their own product");

    // Exercise the post-admission projection, whose caller separately enforces
    // the independent receiver gate. This fixture is not a production discharge.
    const projection = {
      proposal: { ...outcome, work }, discharge: { id: "fixture-independent-discharge" },
      pricingRoot: root, workProvider: setup.options.workerId, customer: METROPLAT_INFERENCE_MARKET_CUSTOMER,
    };
    const citationOnly = { ...projection, proposal: { ...projection.proposal, result: { kind: "skill-result", value: { output: "citation only" } } } };
    assert.equal(await recordAcceptedWorkInferenceOutcome(citationOnly), 0);
    const wrongDelivery = { ...projection, proposal: { ...projection.proposal, result: { kind: "skill-result", value: { ...outcome.result.value, inferenceDelivery: { ...outcome.result.value.inferenceDelivery, workLot: "urn:fixture:other-lot" } } } } };
    assert.equal(await recordAcceptedWorkInferenceOutcome(wrongDelivery), 0);
    assert.equal(await recordAcceptedWorkInferenceOutcome(projection), 1);
    assert.equal(await recordAcceptedWorkInferenceOutcome(projection), 0, "replayed independent receipt does not duplicate feedback");
    const malformed = await executeAgencyWorkProvider({ ...item, scope: "work-item:malformed-feedback-fixture" }, { ...setup.options, inference: fixture(root, sourceOf(true)).options.inference });
    assert.equal(malformed.result.kind, "skill-error", "a delivery bound to another lot cannot become a finding");
    const [observed] = loadObservations({ dataRoot: root });
    assert.equal(observed.outcome, "accepted");
    assert.equal(observed.receipt, receipt);
    assert.equal(observed.taskClass, officeWorkInferenceTaskClass(work));
    assert.equal(observed.evidence, "work-discharge:fixture-independent-discharge");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
