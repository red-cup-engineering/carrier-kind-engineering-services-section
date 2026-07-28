#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { handlePlatformNodeInduction } from "./platform-node-induction-service.mjs";
import { amend, attest, improve, operate, refuse, rollback, transact } from "../test/fixtures/platform-node-induction/settlement.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:platform-node-inducer";
const CUSTOMER = "urn:ame:pni-fresh-process-self-test-customer";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function identified(body) { return { id: `urn:${digest(body)}`, ...body }; }
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

function check(name, held) {
  if (!held) throw new Error(`${name} failed`);
  return { name, held: true };
}

export function verifyPlatformNodeInduction() {
  const checks = [];
  const contract = JSON.parse(readFileSync(join(ROOT, "content/contracts/platform-node-induction-service.json"), "utf8"));
  const offerings = JSON.parse(readFileSync(join(ROOT, "content/config/platform-node-induction-offerings.json"), "utf8"));
  const schema = JSON.parse(readFileSync(join(ROOT, "lib/schemas/platform-node-induction.schema.json"), "utf8"));
  const serviceSource = readFileSync(join(ROOT, "src/platform-node-induction-service.mjs"), "utf8");
  checks.push(check("contract-identity", contract.id === "platform-node-induction-service"));
  checks.push(check("schema-identity", schema.$id === "urn:schema:platform-node-induction:pni-001"));
  checks.push(check("service-carrier-present", serviceSource.includes("PlatformNodeInductionReadinessResult")));
  checks.push(check("test-only-terms", offerings.testOnly.mechanicallyTestOnly === true
    && offerings.testOnly.price.amount === 1 && offerings.testOnly.price.currency === "USD"));
  checks.push(check("production-disabled", offerings.production.enabled === false));
  checks.push(check("package-proposal-only", offerings.packageJsonProposal.mutationPerformed === false
    && offerings.packageJsonProposal.admissionReservedToRoot === true));

  const serviceDataRoot = mkdtempSync(join(tmpdir(), "pni-in-process-service-"));
  const at = "2026-07-19T04:00:00.000Z";
  let serviceEvidence;
  try {
    const demand = { type: "PlatformNodeInductionSolicitation", territory: ACTOR, offering: "testOnly",
      ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 }, foreignWriteAuthorized: false };
    const solicitation = { "@context": CONTEXT, id: "urn:test:pni-self-test-solicitation", type: "Offer", actor: CUSTOMER, target: ACTOR,
      object: { type: "ServiceSolicitation", sourceActivity: { id: "urn:test:pni-self-test-source", object: { attachment: [demand] } } } };
    const offered = handlePlatformNodeInduction({ operation: "solicit-service", source: solicitation, at, dataRoot: serviceDataRoot });
    checks.push(check("in-process-solicit", offered.status === 0 && offered.output.type === "Offer"));
    const capability = { type: "PlatformNodeInductionCapability", issuer: CUSTOMER, holder: ACTOR, invocationTarget: ACTOR,
      requestDigest: offered.output.object.requestDigest, offerDigest: digest(offered.output), effects: offered.output.object.terms.effects,
      singleUse: true, expiresAt: "2026-07-19T05:00:00.000Z" };
    const invocation = { "@context": CONTEXT, id: "urn:test:pni-self-test-invocation", type: "Accept", actor: CUSTOMER, target: ACTOR,
      inReplyTo: offered.output.id, object: { offer: offered.output, capability, providerFormationReceipt: providerReceipt() } };
    const invoked = handlePlatformNodeInduction({ operation: "invoke-service", source: invocation, at, dataRoot: serviceDataRoot });
    checks.push(check("in-process-invoke", invoked.status === 0 && invoked.output.object.type === "PlatformNodeInductionReadinessResult"));
    const replayed = handlePlatformNodeInduction({ operation: "invoke-service", source: invocation, at, dataRoot: serviceDataRoot });
    checks.push(check("in-process-replay-refusal", replayed.status === 2 && replayed.output.object.reason === "capability-replay"));
    const malformed = structuredClone(solicitation); malformed.object.sourceActivity.object.attachment[0].foreignWriteAuthorized = true;
    const refused = handlePlatformNodeInduction({ operation: "solicit-service", source: malformed, at, dataRoot: serviceDataRoot });
    checks.push(check("in-process-causal-refusal", refused.status === 2 && refused.output.object.reason === "foreign-write-authority-refused"
      && refused.output.object.prohibitedEffectsPerformed === false));
    const decision = { "@context": CONTEXT, id: "urn:test:pni-self-test-decision", type: "Accept", actor: CUSTOMER, target: ACTOR,
      object: { type: "PlatformNodeInductionCustomerDecision", result: invoked.output, resultDigest: digest(invoked.output), decision: "accept-usefulness" } };
    const accepted = handlePlatformNodeInduction({ operation: "accept-result", source: decision, at, dataRoot: serviceDataRoot });
    checks.push(check("in-process-accept", accepted.status === 0 && accepted.output.object.installation === false));
    serviceEvidence = { offered: offered.output.id, invoked: invoked.output.id, replayed: replayed.output.id,
      refused: refused.output.id, accepted: accepted.output.id };
  } finally {
    rmSync(serviceDataRoot, { recursive: true, force: true });
  }

  const fixtureRoot = mkdtempSync(join(tmpdir(), "pni-in-process-fixture-"));
  let fixtureEvidence;
  try {
    writeFileSync(join(fixtureRoot, "fixture-state.json"), JSON.stringify({ version: 1, amendments: [] }));
    const initial = operate(fixtureRoot);
    const refusal = refuse({ effect: "foreign-write" });
    const transaction = transact();
    const attestation = attest(fixtureRoot);
    const amendment = amend(fixtureRoot, { id: "fixture-amendment" });
    const improvement = improve(fixtureRoot);
    const restored = rollback(fixtureRoot, initial);
    fixtureEvidence = { initial, refusal, transaction, attestation, amendment, improvement, restored };
    checks.push(check("absent-root-fixture", refusal.refused === true && transaction.testOnly === true
      && transaction.externalSettlement === false && improvement.next.improved === true
      && JSON.stringify(restored) === JSON.stringify(initial)));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }

  return { type: "PlatformNodeInductionVerification", passed: true, checks, serviceEvidence, fixtureEvidence,
    fixtureEvidenceOnly: true, rootRuntimeImported: false, leaderPresent: false,
    subprocessAuthority: false, shellAuthority: false, networkAuthority: false, credentialsUsed: false,
    customerMutation: false, foreignMutation: false, externalSpend: 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || process.argv[2] !== "--self-test") throw new Error("exact --self-test invocation is required");
  process.stdout.write(`${JSON.stringify(verifyPlatformNodeInduction())}\n`);
}
