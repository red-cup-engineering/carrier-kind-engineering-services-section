import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { handlePlatformNodeInduction } from "../src/platform-node-induction-service.mjs";
import { amend, attest, improve, operate, refuse, rollback, transact } from "./fixtures/platform-node-induction/settlement.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const CUSTOMER = "urn:ame:pni-test-customer";
const ACTOR = "urn:ame:platform-node-inducer";
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const VERIFIER = join(ROOT, "src/verify-platform-node-induction-service.mjs");
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function identified(body) { return { id: `urn:${digest(body)}`, ...body }; }
function demand(overrides = {}) { return { type: "PlatformNodeInductionSolicitation", territory: ACTOR, offering: "testOnly",
  ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 }, foreignWriteAuthorized: false, ...overrides }; }
function solicitation(value = demand()) {
  return { "@context": CONTEXT, id: "urn:test:pni-solicitation", type: "Offer", actor: CUSTOMER, target: ACTOR,
    object: { type: "ServiceSolicitation", sourceActivity: { id: "urn:test:pni-source", object: { attachment: [value] } } } };
}
function run(op, input, root = mkdtempSync(join(tmpdir(), "pni-service-test-"))) {
  const result = handlePlatformNodeInduction({ operation: op, source: input, at: "2026-07-19T03:40:00.000Z", dataRoot: root });
  return { ...result, dataRoot: root, stderr: "" };
}
function providerReceipt() {
  return identified({ type: "ProviderFormationReceipt", bindings: {
    approval: "urn:sha256:cc15814d9e734f022f5e689ed596cc2a5b01e2c113cf54b703887076ee9298e2",
    providerGrant: "urn:sha256:05176398c409317099200325490b66bf2adcef8c1db50b73b638905e56852b03",
    lot: "urn:sha256:958cba77f95995ff9fbe2666b33bbd0da771e9d01bd56b22c9637c9f2e54fc07",
    bid: "urn:sha256:1a8c83493107fcd174b6ec1df2d84e3736604c257e22faa0bae78572832d4529",
    award: "urn:sha256:f55f44e7ca439213c43badfd4e2482a7e0bca52c22f4528d84e3813462029070"
  }, attributionScope: "fixture-non-production", evidenceOnly: true, cryptographicProvenanceClaimed: false,
  customerMutation: false, foreignMutation: false });
}
function invocation(offer, overrides = {}) {
  const capability = { type: "PlatformNodeInductionCapability", issuer: CUSTOMER, holder: ACTOR, invocationTarget: ACTOR,
    requestDigest: offer.object.requestDigest, offerDigest: digest(offer), effects: offer.object.terms.effects,
    singleUse: true, expiresAt: "2026-07-19T04:00:00.000Z" };
  return { "@context": CONTEXT, id: "urn:test:pni-invocation", type: "Accept", actor: CUSTOMER, target: ACTOR, inReplyTo: offer.id,
    object: { offer, capability, providerFormationReceipt: providerReceipt(), ...overrides } };
}

test("solicit, invoke, customer-decision, and replay boundaries hold", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "pni-flow-"));
  const offered = run("solicit-service", solicitation(), dataRoot);
  assert.equal(offered.status, 0, offered.stderr); assert.equal(offered.output.type, "Offer");
  assert.deepEqual(offered.output.object.terms.price, { amount: 1, currency: "USD" });
  assert.equal(offered.output.object.terms.mechanicallyTestOnly, true);
  const request = invocation(offered.output);
  const result = run("invoke-service", request, dataRoot);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.output.object.type, "PlatformNodeInductionReadinessResult");
  assert.equal(result.output.object.customerMutation, false);
  assert.deepEqual(result.output.object.fixtureEvidence.capabilities, ["operate", "refuse", "transact", "attest", "amend", "improve", "rollback"]);
  const replay = run("invoke-service", request, dataRoot);
  assert.equal(replay.status, 2); assert.equal(replay.output.object.reason, "capability-replay");
  const decision = { "@context": CONTEXT, id: "urn:test:pni-decision", type: "Accept", actor: CUSTOMER, target: ACTOR,
    object: { type: "PlatformNodeInductionCustomerDecision", result: result.output, resultDigest: digest(result.output), decision: "accept-usefulness" } };
  const accepted = run("accept-result", decision, dataRoot);
  assert.equal(accepted.status, 0, accepted.stderr); assert.equal(accepted.output.object.installation, false);
  const foreignDecision = structuredClone(decision); foreignDecision.actor = "urn:ame:foreign-customer";
  const foreignAccepted = run("accept-result", foreignDecision, dataRoot);
  assert.equal(foreignAccepted.status, 2); assert.equal(foreignAccepted.output.object.reason, "customer-decision-invalid");
});

test("all causal negative controls refuse before prohibited effects", () => {
  const cases = [
    [solicitation(demand({ territory: "urn:ame:foreign" })), "malformed-territory"],
    [solicitation(demand({ ceilings: { maximumFiles: 17, maximumBytes: 524288, maximumRuntimeMs: 120000 } })), "over-ceiling-demand"],
    [solicitation(demand({ foreignWriteAuthorized: true })), "foreign-write-authority-refused"],
    [solicitation(demand({ offering: "production" })), "production-activation-impossible"]
  ];
  for (const [input, reason] of cases) {
    const result = run("solicit-service", input);
    assert.equal(result.status, 2); assert.equal(result.output.object.reason, reason);
    assert.equal(result.output.object.prohibitedEffectsPerformed, false);
  }
  const offered = run("solicit-service", solicitation());
  const changed = structuredClone(offered.output); changed.object.terms.price.amount = 2;
  const changedTerms = run("invoke-service", invocation(changed));
  assert.equal(changedTerms.status, 2); assert.equal(changedTerms.output.object.reason, "offer-terms-changed");
  const changedEffects = structuredClone(offered.output); changedEffects.object.terms.effects = ["provider-local-readiness-fixture"];
  const changedEffectsResult = run("invoke-service", invocation(changedEffects));
  assert.equal(changedEffectsResult.status, 2); assert.equal(changedEffectsResult.output.object.reason, "offer-terms-changed");
  const changedVersion = structuredClone(offered.output); changedVersion.object.terms.termsVersion = "pni-001-forged-v2";
  const changedVersionResult = run("invoke-service", invocation(changedVersion));
  assert.equal(changedVersionResult.status, 2); assert.equal(changedVersionResult.output.object.reason, "offer-terms-changed");
  const forgedProvider = structuredClone(offered.output); forgedProvider.object.provider = "urn:ame:forged-provider";
  const forgedProviderResult = run("invoke-service", invocation(forgedProvider));
  assert.equal(forgedProviderResult.status, 2); assert.equal(forgedProviderResult.output.object.reason, "offer-terms-changed");
  const foreignTarget = structuredClone(offered.output); foreignTarget.target = "urn:ame:foreign-customer";
  const foreignTargetResult = run("invoke-service", invocation(foreignTarget));
  assert.equal(foreignTargetResult.status, 2); assert.equal(foreignTargetResult.output.object.reason, "offer-terms-changed");
  const absentReceipt = run("invoke-service", invocation(offered.output, { providerFormationReceipt: undefined }));
  assert.equal(absentReceipt.status, 2); assert.equal(absentReceipt.output.object.reason, "provider-formation-receipt-missing-or-invalid");
  const expired = invocation(offered.output); expired.object.capability.expiresAt = "2026-07-19T03:39:59.000Z";
  const expiredResult = run("invoke-service", expired);
  assert.equal(expiredResult.status, 2); assert.equal(expiredResult.output.object.reason, "capability-invalid-or-expired");
});

test("in-process absent-root fixture and package additions remain proposal data", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "pni-absent-root-fixture-"));
  let initial; let restored;
  try {
    writeFileSync(join(fixtureRoot, "fixture-state.json"), JSON.stringify({ version: 1, amendments: [] }));
    initial = operate(fixtureRoot);
    assert.equal(refuse({ effect: "foreign-write" }).refused, true);
    assert.equal(transact().externalSettlement, false);
    assert.match(attest(fixtureRoot).digest, /^sha256:[0-9a-f]{64}$/u);
    amend(fixtureRoot, { id: "fixture-amendment" });
    assert.equal(improve(fixtureRoot).next.improved, true);
    restored = rollback(fixtureRoot, initial);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
  assert.deepEqual(restored, initial);
  const config = JSON.parse(readFileSync(join(ROOT, "content/config/platform-node-induction-offerings.json"), "utf8"));
  assert.equal(config.packageJsonProposal.mutationPerformed, false);
  assert.equal(config.packageJsonProposal.admissionReservedToRoot, true);
  assert.equal(config.production.enabled, false);
  assert.deepEqual(config.production.requiredLeaderDecisionDigests, []);
});

test("verification is an exact provider-bound carrier with no subprocess or shell authority", () => {
  const source = readFileSync(VERIFIER, "utf8");
  assert.equal(source.includes("export function verifyPlatformNodeInduction()"), true);
  assert.equal(source.includes('process.argv[2] !== "--self-test"'), true);
  assert.equal(source.includes("subprocessAuthority: false"), true);
  assert.equal(source.includes("shellAuthority: false"), true);
});
