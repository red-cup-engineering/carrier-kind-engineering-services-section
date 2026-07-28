import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { startRwilProviderProcess } from "@emsenn/rwil-rdf-services/test-provider";

const SERVICE = resolve(import.meta.dirname, "../src/contract-state-report-infographic.mjs");
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:state-report-infographic-service";
const CUSTOMER = "urn:ame:state-report-consumer-benchmark";
let rwil;
test.before(async () => { rwil = await startRwilProviderProcess(); });
test.after(async () => { await rwil.close(); });

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().filter((key) => value[key] !== undefined)
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
function digest(value) {
  return "sha256:" + createHash("sha256").update(canonical(value)).digest("hex");
}

const packet = {
  type: "HarmoniousUnionDeltaPacket",
  period: "2026-07-18T23:00:00Z/PT1H",
  claims: [
    { settlement: "urn:ame:bare-cedar-fog", label: "local-interface", state: "held" },
    { settlement: "urn:ame:cold-red-gate", label: "peer-observation", state: "unknown" },
  ],
};
function request(overrides = {}) {
  return {
    type: "StateReportInfographicRequest",
    packet,
    deliveryMode: "proposal-pending-customer-decision",
    customerMutationAuthorized: false,
    acceptanceChecks: [{
      type: "StateReportInfographicCheck",
      assertion: "held-out replay preserves deterministic SVG and PNG binding",
    }],
    ceilings: { maximumOutputBytes: 8 * 1024 * 1024 },
    ...overrides,
  };
}
function solicitation(value = request()) {
  const sourceActivity = {
    "@context": CONTEXT,
    id: "urn:test:state-report-source",
    type: "Create",
    actor: CUSTOMER,
    target: ACTOR,
    object: { type: "Note", attachment: [value] },
  };
  return {
    "@context": CONTEXT,
    id: "urn:test:state-report-solicitation",
    type: "Offer",
    actor: CUSTOMER,
    target: ACTOR,
    object: { type: "ServiceSolicitation", sourceActivity },
  };
}
function run(operation, input, dataRoot) {
  const execution = spawnSync(process.execPath, [
    SERVICE, "--operation", operation, "--now", "2026-07-18T23:40:00.000Z",
  ], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, STATE_REPORT_INFOGRAPHIC_DATA_ROOT: dataRoot, RWIL_RDF_AGENT: rwil.agentCardUrl },
    timeout: 30000,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    ...execution,
    output: execution.stdout.trim() ? JSON.parse(execution.stdout) : null,
  };
}

test("a customer can hire the accepted software as a bounded rendering service", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "state-report-service-test-"));
  const offered = run("solicit-service", solicitation(), dataRoot);
  assert.equal(offered.status, 0, offered.stderr);
  assert.equal(offered.output.object.type, "StateReportInfographicOffer");
  const capability = {
    type: "PurposeBoundCapability",
    issuer: CUSTOMER,
    holder: ACTOR,
    invocationTarget: ACTOR,
    requestDigest: offered.output.object.requestDigest,
    providerOfferDigest: digest(offered.output),
    singleUse: true,
    effects: offered.output.object.effects,
    expiresAt: "2026-07-19T00:00:00.000Z",
  };
  const invocation = {
    "@context": CONTEXT,
    id: "urn:test:state-report-invocation",
    type: "Accept",
    actor: CUSTOMER,
    target: ACTOR,
    object: {
      type: "ServiceContract",
      contract: "state-report-infographic",
      offer: offered.output,
      capability,
    },
  };
  const delivered = run("invoke-service", invocation, dataRoot);
  assert.equal(delivered.status, 0, delivered.stderr + "\n" + delivered.stdout);
  assert.equal(delivered.output.object.type, "ProposedStateReportInfographicProduct");
  assert.equal(delivered.output.object.customerMutation, false);
  assert.equal(delivered.output.object.foreignMutation, false);
  assert.equal(delivered.output.object.pendingCustomerDecision, true);
  assert.equal(delivered.output.object.pngBoundToSvgDigest, delivered.output.object.svgDigest);
  assert.match(delivered.output.object.svg, /version="1\.2"/u);
  assert.match(delivered.output.object.svg, /baseProfile="tiny"/u);

  const replay = run("invoke-service", invocation, dataRoot);
  assert.equal(replay.status, 2);
  assert.match(replay.output.object.detail, /already consumed/u);

  const decision = {
    "@context": CONTEXT,
    id: "urn:test:state-report-decision",
    type: "Accept",
    actor: CUSTOMER,
    target: ACTOR,
    object: {
      type: "StateReportInfographicCustomerDecision",
      proposedProduct: delivered.output,
      proposedProductDigest: digest(delivered.output),
      checks: [{ id: "replay", passed: true }],
    },
  };
  const receipt = run("accept-result", decision, dataRoot);
  assert.equal(receipt.status, 0, receipt.stderr);
  assert.equal(receipt.output.object.decision, "Accept");
  assert.equal(receipt.output.object.customer, CUSTOMER);
});

test("caller-selected implementation controls are refused before an offer", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "state-report-service-refusal-"));
  const result = run("solicit-service", solicitation(request({ command: "render arbitrary bytes" })), dataRoot);
  assert.equal(result.status, 2);
  assert.equal(result.output.object.code, "state-report-infographic-refused");
  assert.match(result.output.object.detail, /caller-selected command/u);
});
