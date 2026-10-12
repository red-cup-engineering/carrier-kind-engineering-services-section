import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { outcomeJournal, proposalResources } from "@red-cup-engineering/organizing/enterprise";
import { BOUNDED_INFERENCE_SERVICE_MODEL, METROPLAT_INFERENCE_MARKET_CUSTOMER, officeWorkInferenceTaskClass } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source";
import { workInferenceCoordinate } from "@red-cup-engineering/computer-inference-engine/dispatch/work-inference-coordinate";
import { enterpriseAgencyWorkOptions } from "../src/agency-work.mjs";

// Fixture seeding uses the exact owner module imported by workInferenceCoordinate.
// No replacement export map, copied pricing implementation or mocked lookup is used.
const pricingModule = new URL("./expected-resolution-pricing.mjs",
  import.meta.resolve("@red-cup-engineering/computer-inference-engine/dispatch/work-inference-coordinate"));
const { appendDelivery, loadDeliveries, loadObservations } = await import(pricingModule);

// These are synthetic, already-received inputs to the genuine host callback.
// They do not claim native admission, independent office authority or deployment.
const WORK_PROVIDER = "urn:synthetic:host-work-provider";
const WORK = "host-optional-coordinate";
const ORIGIN_OFFICE = "synthetic-producing-office";
const RECEIVING_OFFICE = "synthetic-receiving-office";
const AT = "2026-10-10T12:00:00.000Z";
const BOOK = "pricing-book.journal";

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "host-optional-coordinate-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dataRoot = path.join(root, "host");
  const pricingRoot = path.join(root, "pricing");
  const reference = {
    workLot: "urn:synthetic:work-lot",
    provider: "urn:synthetic:inference-provider",
    taskClass: officeWorkInferenceTaskClass(WORK),
    selectedOffer: "urn:synthetic:inference-offer",
    receipt: "urn:synthetic:inference-receipt",
    receiver: METROPLAT_INFERENCE_MARKET_CUSTOMER,
  };
  const registered = appendDelivery(reference, { dataRoot: pricingRoot });
  const readback = loadDeliveries({ dataRoot: pricingRoot });
  assert.deepEqual(readback, [registered], "the genuine pricing journal must retain the fixture delivery");
  for (const [field, value] of Object.entries(reference)) assert.equal(readback[0][field], value, field);
  const proposal = {
    work: WORK,
    receipt: "urn:synthetic:work-receipt",
    subject: "urn:synthetic:work-subject",
    scope: "urn:synthetic:work-scope",
    skill: "synthetic-work-skill",
    producer: { id: WORK_PROVIDER, revision: "synthetic-worker-revision" },
    execution: "urn:synthetic:original-execution",
    origin: {
      kind: "office-service", office: ORIGIN_OFFICE,
      session: "synthetic-producing-session", model: BOUNDED_INFERENCE_SERVICE_MODEL,
      invocation: "urn:synthetic:work-invocation",
    },
    providerEvidence: ["urn:synthetic:original-execution", reference.receipt],
    result: { kind: "skill-result", value: { inferenceDelivery: reference } },
    resources: [{ resource: "input-tokens", unit: "token", amount: "900",
      carrier: BOUNDED_INFERENCE_SERVICE_MODEL }],
  };
  const discharge = {
    decision: "accepted", text: "Synthetic already-received work.",
    result: proposal.result, evidence: ["urn:synthetic:receiving-evidence"],
  };
  const errors = t.mock.method(console, "error", () => {});
  const binding = defaultFilesystemBinding(dataRoot);
  const options = enterpriseAgencyWorkOptions({
    identity: { id: "synthetic-outcome-host" }, dataRoot,
    // Explicit workBinding suppresses the host's capability/session admission branches.
    workBinding: binding,
    processConfig: { firmPoolRoot: root },
    environment: {
      METROPLAT_REPOSITORY_ROOT: root,
      METROPLAT_INFERENCE_RECEIVER: "off",
      METROPLAT_AGENT_WORKER_ID: WORK_PROVIDER,
      // A model is required: without it workerId is undefined and lookup exits early.
      METROPLAT_AGENT_WORKER_MODEL: BOUNDED_INFERENCE_SERVICE_MODEL,
      METROPLAT_INFERENCE_SOURCE: "inference-work-lot.market",
      // This source validates configuration at construction; requests occur only when
      // its async iterator is consumed. This callback-only fixture never invokes it.
      METROPLAT_INFERENCE_MARKET_AGENT_CARD: "https://host-outcome-fixture.invalid/.well-known/agent-card.json",
      EXPECTED_RESOLUTION_PRICING_ROOT: pricingRoot,
    },
    operationOf: () => undefined,
    operationSurface: () => ({ operations: [] }),
  });
  assert.ok(options.agencyWorkProviders.includes(WORK_PROVIDER));
  assert.equal(typeof options.onWorkDischarged, "function");
  assert.equal(errors.mock.callCount(), 0);
  const journal = outcomeJournal(dataRoot, { dedupe: "day" });
  assert.deepEqual(journal.read(), []);
  return {
    root, dataRoot, pricingRoot, reference, proposal, discharge, errors, journal,
    lookup: () => workInferenceCoordinate({ proposal, pricingRoot, workProvider: WORK_PROVIDER }),
    tell: () => options.onWorkDischarged({ proposal, discharge, office: RECEIVING_OFFICE, at: AT }),
  };
}

function onlyOutcome({ journal, proposal }) {
  const outcomes = journal.read();
  assert.equal(outcomes.length, 1, "the real host callback must append exactly one outcome");
  const [outcome] = outcomes;
  assert.equal(outcome.source, "work-discharge");
  assert.equal(outcome.lot, proposal.subject);
  assert.equal(outcome.delivery, proposal.receipt);
  assert.equal(outcome.provider, ORIGIN_OFFICE);
  assert.equal(outcome.judge, RECEIVING_OFFICE);
  assert.equal(outcome.verdict, "accepted");
  assert.equal(outcome.at, AT);
  assert.equal(outcome.carrier, BOUNDED_INFERENCE_SERVICE_MODEL);
  assert.equal(outcome.skill, proposal.skill);
  assert.deepEqual(outcome.player, {
    by: ORIGIN_OFFICE, bearer: WORK_PROVIDER, hand: "synthetic-producing-session",
  });
  assert.deepEqual(outcome.evidence, [proposal.receipt, "urn:synthetic:receiving-evidence"]);
  assert.deepEqual(outcome.resources, proposalResources(proposal));
  return outcome;
}

test("the real host callback retains a healthy registered inference coordinate", (t) => {
  const context = fixture(t);
  const { reference } = context;
  const expected = {
    provider: reference.provider, offer: reference.selectedOffer,
    taskClass: reference.taskClass, receipt: reference.receipt,
  };
  assert.deepEqual(context.lookup(), expected);
  assert.doesNotThrow(context.tell);
  assert.deepEqual(onlyOutcome(context).market, expected);
  assert.equal(context.errors.mock.callCount(), 0);
  assert.equal(loadDeliveries({ dataRoot: context.pricingRoot }).length, 1);
  assert.deepEqual(loadObservations({ dataRoot: context.pricingRoot }), []);
});

test("the real host callback records the received outcome when pricing lookup throws", (t) => {
  const context = fixture(t);
  const pricingBook = path.join(context.pricingRoot, BOOK);
  rmSync(pricingBook, { recursive: true });
  const malformed = "not a journal\n";
  writeFileSync(pricingBook, malformed);
  // Same proposal, worker and pricing root as the callback: prove no earlier gate
  // masks the failing genuine lookup before testing the host's continuation.
  assert.throws(context.lookup);
  assert.doesNotThrow(context.tell);
  assert.equal(Object.hasOwn(onlyOutcome(context), "market"), false);
  assert.equal(context.errors.mock.callCount(), 1);
  assert.equal(context.errors.mock.calls[0].arguments[0],
    "[work-discharge] inference coordinate remains unlinked:");
  assert.equal(readFileSync(pricingBook, "utf8"), malformed);
});
