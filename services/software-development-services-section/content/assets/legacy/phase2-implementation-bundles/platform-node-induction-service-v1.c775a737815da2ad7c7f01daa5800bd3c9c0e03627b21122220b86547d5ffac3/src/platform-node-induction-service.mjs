#!/usr/bin/env node

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:platform-node-inducer";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(readFileSync(join(ROOT, "content/config/platform-node-induction-offerings.json"), "utf8"));
const EFFECTS = ["provider-local-readiness-fixture", "provider-local-append-only-evidence", "proposal-only-result"];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function identify(body) { return { id: `urn:${digest(body)}`, ...body }; }
function withoutId(value) { const { id: _id, ...body } = value ?? {}; return body; }
function contentValid(value) { return value?.id === `urn:${digest(withoutId(value))}`; }
function now() { const index = process.argv.indexOf("--now"); return index >= 0 ? process.argv[index + 1] : new Date().toISOString(); }
function operation() { const index = process.argv.indexOf("--operation"); return index >= 0 ? process.argv[index + 1] : "solicit-service"; }
function defaultDataRoot() { return resolve(process.env.PNI_DATA_ROOT ?? join(ROOT, "data/platform-node-induction-service")); }
function append(dataRoot, type, record) {
  const at = record.recordedAt ?? record.published; const [year, month, day] = at.slice(0, 10).split("-");
  const path = join(dataRoot, type, year, month, day, `${at.slice(0, 10)}-platform-node-induction-service-${type}.jsonl`);
  mkdirSync(dirname(path), { recursive: true }); appendFileSync(path, `${JSON.stringify(record)}\n`, { mode: 0o600 });
}
function records(dataRoot, type) {
  const root = join(dataRoot, type); const output = [];
  function walk(path) { let entries; try { entries = readdirSync(path, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) { const child = join(path, entry.name); if (entry.isDirectory()) walk(child); else if (entry.name.endsWith(".jsonl")) output.push(...readFileSync(child, "utf8").split("\n").filter(Boolean).map(JSON.parse)); } }
  walk(root); return output;
}
function activity(type, source, object, at) {
  return identify({ "@context": CONTEXT, type, actor: ACTOR, target: source?.actor ?? "urn:ame:unidentified", inReplyTo: source?.id ?? null, object, published: at });
}
function outcome(value, status = 0) { return { status, output: value }; }
function refuse(dataRoot, source, reason, at, detail = {}) {
  const result = activity("Reject", source, { type: "PlatformNodeInductionRefusal", reason, detail, prohibitedEffectsPerformed: false,
    customerMutation: false, foreignMutation: false, externalSpend: 0 }, at);
  append(dataRoot, "refusals", result); return outcome(result, 2);
}
function demandFrom(source) {
  const entries = source?.object?.sourceActivity?.object?.attachment ?? source?.object?.attachment ?? [];
  return (Array.isArray(entries) ? entries : [entries]).find((item) => item?.type === "PlatformNodeInductionSolicitation");
}
function validCeilings(value) {
  return Number.isInteger(value?.maximumFiles) && value.maximumFiles > 0 && value.maximumFiles <= 16
    && Number.isInteger(value?.maximumBytes) && value.maximumBytes > 0 && value.maximumBytes <= 524288
    && Number.isInteger(value?.maximumRuntimeMs) && value.maximumRuntimeMs > 0 && value.maximumRuntimeMs <= 120000;
}
function solicitation(dataRoot, source, at) {
  const demand = demandFrom(source);
  if (source?.["@context"] !== CONTEXT || source?.type !== "Offer" || source?.target !== ACTOR || source?.object?.type !== "ServiceSolicitation") return refuse(dataRoot, source, "malformed-solicitation", at);
  if (demand?.territory !== CONFIG.territory) return refuse(dataRoot, source, "malformed-territory", at);
  if (demand?.foreignWriteAuthorized !== false) return refuse(dataRoot, source, "foreign-write-authority-refused", at);
  if (!validCeilings(demand?.ceilings)) return refuse(dataRoot, source, "over-ceiling-demand", at);
  if (!["testOnly", "production"].includes(demand?.offering)) return refuse(dataRoot, source, "unsupported-offering", at);
  if (demand.offering === "production" || CONFIG.production.enabled !== false) return refuse(dataRoot, source, "production-activation-impossible", at);
  const terms = { offering: CONFIG.testOnly.id, price: CONFIG.testOnly.price, termsVersion: CONFIG.testOnly.termsVersion,
    mechanicallyTestOnly: true, ceilings: demand.ceilings, effects: EFFECTS, customerMutation: false, foreignMutation: false };
  const object = { type: "PlatformNodeInductionOffer", commission: CONFIG.commission, customer: source.actor,
    configuration: CONFIG.id, solicitation: source.id, sourceActivity: source.object.sourceActivity.id,
    requestDigest: digest(demand), demand, terms, termsDigest: digest(terms), provider: ACTOR, operation: "invoke-service" };
  const result = activity("Offer", source, object, at); append(dataRoot, "offers", result); return outcome(result);
}
function capabilityValid(candidate, offerActivity, offer, at) {
  return candidate?.type === "PlatformNodeInductionCapability" && candidate.issuer === offer.customer
    && candidate.holder === ACTOR && candidate.invocationTarget === ACTOR && candidate.requestDigest === offer.requestDigest
    && candidate.offerDigest === digest(offerActivity) && canonical(candidate.effects) === canonical(EFFECTS)
    && candidate.singleUse === true && Date.parse(candidate.expiresAt) >= Date.parse(at);
}
function receiptValid(receipt) {
  const required = CONFIG.providerFormationReceiptBindings;
  return receipt?.type === "ProviderFormationReceipt" && contentValid(receipt)
    && Object.entries(required).every(([key, value]) => receipt.bindings?.[key] === value)
    && receipt.attributionScope === "fixture-non-production" && receipt.evidenceOnly === true
    && receipt.cryptographicProvenanceClaimed === false
    && receipt.customerMutation === false && receipt.foreignMutation === false;
}
function offerTermsValid(source, offerActivity, offer) {
  const expectedTerms = { offering: CONFIG.testOnly.id, price: CONFIG.testOnly.price,
    termsVersion: CONFIG.testOnly.termsVersion, mechanicallyTestOnly: true, ceilings: offer?.demand?.ceilings,
    effects: EFFECTS, customerMutation: false, foreignMutation: false };
  return source?.actor === offer?.customer && source?.inReplyTo === offerActivity?.id
    && offerActivity?.actor === ACTOR && offerActivity?.target === source?.actor
    && offerActivity?.inReplyTo === offer?.solicitation
    && offer?.provider === ACTOR && offer?.customer === source?.actor
    && offer?.commission === CONFIG.commission && offer?.configuration === CONFIG.id
    && offer?.operation === "invoke-service" && typeof offer?.sourceActivity === "string"
    && offer?.requestDigest === digest(offer?.demand)
    && offer?.termsDigest === digest(offer?.terms)
    && canonical(offer?.terms) === canonical(expectedTerms);
}
function invoke(dataRoot, source, at) {
  const offerActivity = source?.object?.offer; const offer = offerActivity?.object; const capability = source?.object?.capability;
  if (source?.type !== "Accept" || source?.target !== ACTOR || offerActivity?.type !== "Offer"
      || !contentValid(offerActivity) || offer?.type !== "PlatformNodeInductionOffer"
      || !offerTermsValid(source, offerActivity, offer)) {
    return refuse(dataRoot, source, "offer-terms-changed", at);
  }
  if (!capabilityValid(capability, offerActivity, offer, at)) return refuse(dataRoot, source, "capability-invalid-or-expired", at);
  const capabilityDigest = digest(capability);
  if (records(dataRoot, "operations").some((record) => record.capabilityDigest === capabilityDigest)) return refuse(dataRoot, source, "capability-replay", at);
  if (!receiptValid(source.object.providerFormationReceipt)) return refuse(dataRoot, source, "provider-formation-receipt-missing-or-invalid", at);
  const operationRecord = identify({ type: "PlatformNodeInductionOperation", recordedAt: at, invocation: source.id,
    capabilityDigest, offerDigest: digest(offerActivity), providerFormationReceipt: source.object.providerFormationReceipt.id,
    customerMutation: false, foreignMutation: false });
  append(dataRoot, "operations", operationRecord);
  const fixtureEvidence = { type: "FutureHandoverFixtureEvidence", capabilities: ["operate", "refuse", "transact", "attest", "amend", "improve", "rollback"],
    freshProcessRequired: true, importsRootRuntime: false, evidenceOnly: true };
  const transaction = identify({ type: "TestOnlyTransactionReceipt", amount: 1, currency: "USD", mechanicallyTestOnly: true,
    externalSettlement: false, externalSpend: 0, recordedAt: at });
  const resources = { type: "ResourceReceipt", interactiveInferenceAndCoordination: "unknown-not-zero", localCompute: "unknown-not-zero",
    externalSpend: 0, externalContact: false, network: false, credentialsUsed: false, customerMutation: false, foreignMutation: false };
  const result = activity("Accept", source, { type: "PlatformNodeInductionReadinessResult", commission: CONFIG.commission,
    requestDigest: offer.requestDigest, offerDigest: digest(offerActivity), providerFormationReceipt: source.object.providerFormationReceipt.id,
    fixtureEvidence, testOnlyTransactionReceipt: transaction, resourceReceipt: resources, customerMutation: false, foreignMutation: false,
    pendingCustomerDecision: true, nonclaims: ["external customer outcome", "root admission", "production activation", "independent certification"] }, at);
  append(dataRoot, "results", result); return outcome(result);
}
function acceptResult(dataRoot, source, at) {
  const decision = source?.object; const result = decision?.result;
  if (!["Accept", "Reject"].includes(source?.type) || source?.target !== ACTOR
      || decision?.type !== "PlatformNodeInductionCustomerDecision" || !contentValid(result)
      || result?.object?.type !== "PlatformNodeInductionReadinessResult" || decision.resultDigest !== digest(result)
      || source.actor !== result.target
      || !["accept-usefulness", "reject-usefulness"].includes(decision.decision)) return refuse(dataRoot, source, "customer-decision-invalid", at);
  const receipt = activity("Accept", source, { type: "PlatformNodeInductionCustomerDecisionReceipt", result: result.id,
    decision: decision.decision, customerOwnsUsefulnessDecision: true, installation: false, admission: false }, at);
  append(dataRoot, "decisions", receipt); return outcome(receipt);
}

export function handlePlatformNodeInduction({ operation: selectedOperation = "solicit-service", source = {}, at = new Date().toISOString(), dataRoot = defaultDataRoot() } = {}) {
  const root = resolve(dataRoot);
  if (selectedOperation === "solicit-service") return solicitation(root, source, at);
  if (selectedOperation === "invoke-service") return invoke(root, source, at);
  if (selectedOperation === "accept-result") return acceptResult(root, source, at);
  return refuse(root, source, "unsupported-operation", at, { operation: selectedOperation });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input; try { input = JSON.parse(readFileSync(0, "utf8")); } catch { input = {}; }
  const result = handlePlatformNodeInduction({ operation: operation(), source: input, at: now() });
  process.stdout.write(`${JSON.stringify(result.output)}\n`);
  process.exitCode = result.status;
}
