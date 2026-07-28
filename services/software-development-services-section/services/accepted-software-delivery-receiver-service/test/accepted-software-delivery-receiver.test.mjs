import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import {
  ACTOR,
  ADMISSION_RECEIPT,
  ADMIT_EFFECTS,
  ADMIT_OPERATION,
  CORRECTION_ADMIT_EFFECTS,
  CORRECTION_ADMIT_OPERATION,
  CORRECTION_STAGE_EFFECTS,
  CORRECTION_STAGE_OPERATION,
  HUMAN_LEADER,
  InjectedCrash,
  ReceiverRefusal,
  SETTLEMENT,
  STAGING_RECEIPT,
  STAGE_EFFECTS,
  STAGE_OPERATION,
  contentRecord,
  digest,
  plateEvidence,
  reviewAndAdmitStagedSoftwareDelivery,
  reviewAndAdmitStagedSoftwareDeliveryCorrection,
  solicitOperation,
  solicitCorrectionOperation,
  stageAcceptedSoftwareDelivery,
  stageAcceptedSoftwareDeliveryCorrection,
} from "../src/accepted-software-delivery-receiver.mjs";

const NOW = "2026-07-19T01:50:00.000Z";
const EXPIRY = "2026-07-19T02:50:00.000Z";
const CUSTOMER = "urn:ame:leader-movement-team";

function reply(type, source, actor, target, object) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `urn:${digest({ type, source, object })}`,
    type,
    actor,
    target,
    inReplyTo: source,
    object,
  };
}

function appendRecord(root, category, wrapper) {
  const path = join(root, category, "2026", "07", "19", `2026-07-19-${category}.jsonl`);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(wrapper)}\n`);
}

function artifact(targetPath, text) {
  const bytesBase64 = Buffer.from(text).toString("base64");
  return { sourcePath: `provider/${targetPath}`, targetPath, digest: digest(bytesBase64), byteLength: Buffer.byteLength(text), bytesBase64 };
}

function meshCarrierSpy() {
  const issued = new WeakSet();
  const inspectMeshScope = ({ authorityRoot, subject }) => ({ authorityRoot, subject, inside: true, boundaries: [], deepestOwner: null, snapshot: { carrier: "test-export-seam", authorityRoot, subject } });
  const admitEnterpriseInstall = (request) => {
    if (!["list", "install", "reinstall", "clean"].includes(request.operation) || !["apply", "dry-run"].includes(request.mode)) throw new Error("test carrier received an operation outside the adopted mesh vocabulary");
    const canonicalRequest = Object.freeze({ authorityRoot: request.authorityRoot, sourceEnterprise: request.sourceEnterprise, targetNode: request.targetNode, installer: request.installer, operation: request.operation, mode: request.mode });
    const requestSha256 = createHash("sha256").update(JSON.stringify(canonicalRequest)).digest("hex");
    const admission = Object.freeze({ kind: "enterprise-install-admission", request: canonicalRequest, requestSha256, snapshot: Object.freeze({ source: inspectMeshScope({ authorityRoot: request.authorityRoot, subject: request.sourceEnterprise }).snapshot, target: inspectMeshScope({ authorityRoot: request.authorityRoot, subject: request.targetNode }).snapshot }) });
    issued.add(admission);
    return admission;
  };
  const revalidateEnterpriseInstall = (admission) => {
    if (!issued.has(admission)) throw new Error("test admission was not issued by export-seam spy");
    return admission;
  };
  return { inspectMeshScope, admitEnterpriseInstall, revalidateEnterpriseInstall };
}

function fixture(targetRoot = "services/example-receiver-fixture") {
  const root = mkdtempSync(join(tmpdir(), "accepted-delivery-protocol-"));
  const authorityRoot = join(root, "sdss");
  const recordRoot = join(authorityRoot, "data", "records");
  const dataRoot = join(authorityRoot, "services", "accepted-software-delivery-receiver-service", "data");
  mkdirSync(join(authorityRoot, ".git"), { recursive: true });
  mkdirSync(join(authorityRoot, "services"), { recursive: true });
  mkdirSync(recordRoot, { recursive: true });
  const artifacts = [
    artifact(`${targetRoot}/package.json`, "{\"type\":\"module\"}\n"),
    artifact(`${targetRoot}/src/index.mjs`, "export const answer = 42;\n"),
  ];
  const productObject = {
    type: "ProposedSoftwareDevelopmentProduct",
    contract: "software-development-service",
    purpose: "develop-software-artifact",
    targetSettlement: SETTLEMENT,
    implementationBundle: "fixture-v1",
    artifacts,
    acceptanceExecutions: [{ runner: "node-test", arguments: [`${targetRoot}/test/example.test.mjs`], passed: true }],
    customerMutation: false,
    foreignMutation: false,
    pendingCustomerDecision: true,
  };
  const product = reply("Accept", "urn:test:development-invocation", SETTLEMENT, CUSTOMER, productObject);
  const proposedProductDigest = digest(product);
  const decision = reply("Accept", product.id, CUSTOMER, SETTLEMENT, {
    type: "SoftwareDevelopmentCustomerDecision",
    proposedProduct: product,
    proposedProductDigest,
    checks: { exactByteReplay: true },
    customerUsefulness: true,
    installation: false,
  });
  const receipt = reply("Accept", decision.id, SETTLEMENT, CUSTOMER, {
    type: "CustomerDecisionReceipt",
    contract: "software-development-service",
    proposedProduct: product.id,
    decision: "Accept",
    checks: decision.object.checks,
    customer: CUSTOMER,
    providerDoesNotOverrideDecision: true,
  });
  appendRecord(recordRoot, "deliveries", { delivery: product });
  appendRecord(recordRoot, "customer-decisions", { decision, receipt });
  const core = {
    type: "StageAcceptedSoftwareDeliveryRequest",
    proposedProductId: product.id,
    proposedProductDigest,
    artifactSetDigest: digest(artifacts.map(({ bytesBase64: _bytes, ...descriptor }) => descriptor)),
    customerDecisionId: decision.id,
    customerDecisionReceiptId: receipt.id,
    receiverIdentity: ACTOR,
    targetServiceIdentity: `urn:ame:${basename(targetRoot)}`,
    targetContract: basename(targetRoot),
    targetRoot,
  };
  const operationOffer = solicitOperation(STAGE_OPERATION, core, HUMAN_LEADER, NOW);
  const stagingCapability = contentRecord({
    type: "AcceptedSoftwareDeliveryStagingCapability",
    issuedBy: HUMAN_LEADER,
    receiver: ACTOR,
    operation: STAGE_OPERATION,
    requestDigest: digest(core),
    offerDigest: digest(operationOffer),
    nonce: "stage-nonce-0001",
    issuedAt: NOW,
    expiresAt: EXPIRY,
    singleUse: true,
    scope: { targetSettlement: SETTLEMENT, targetServiceIdentity: core.targetServiceIdentity, targetContract: core.targetContract, targetRoot: core.targetRoot },
    effects: [...STAGE_EFFECTS],
  });
  return { root, authorityRoot, recordRoot, dataRoot, meshCarrier: meshCarrierSpy(), product, decision, receipt, stageRequest: { ...core, operationOffer, stagingCapability } };
}

function admissionRequest(stagingReceipt, nonce = "admission-nonce-0001") {
  const core = {
    type: "ReviewAndAdmitStagedSoftwareDeliveryRequest",
    stagingReceiptId: stagingReceipt.id,
    stagedTreeDigest: stagingReceipt.stagedTreeDigest,
    receiverIdentity: ACTOR,
    targetServiceIdentity: stagingReceipt.targetServiceIdentity,
    targetContract: stagingReceipt.targetContract,
    targetRoot: stagingReceipt.targetRoot,
  };
  const operationOffer = solicitOperation(ADMIT_OPERATION, core, HUMAN_LEADER, NOW);
  const admissionGrant = contentRecord({
    type: "SoftwareDeliveryAdmissionGrant",
    issuedBy: HUMAN_LEADER,
    receiver: ACTOR,
    operation: ADMIT_OPERATION,
    requestDigest: digest(core),
    offerDigest: digest(operationOffer),
    nonce,
    issuedAt: NOW,
    expiresAt: EXPIRY,
    singleUse: true,
    scope: { stagingReceiptId: core.stagingReceiptId, targetSettlement: SETTLEMENT, targetServiceIdentity: core.targetServiceIdentity, targetContract: core.targetContract, targetRoot: core.targetRoot },
    effects: [...ADMIT_EFFECTS],
  });
  return { ...core, operationOffer, admissionGrant };
}

function options(value, extra = {}) {
  return { authorityRoot: value.authorityRoot, recordRoot: value.recordRoot, dataRoot: value.dataRoot, meshCarrier: value.meshCarrier, now: NOW, ...extra };
}

async function correctionFixture({ declaredPlateDigest } = {}) {
  const value = fixture("services/correctable-fixture");
  const installed = await stageAcceptedSoftwareDelivery(value.stageRequest, options(value));
  await reviewAndAdmitStagedSoftwareDelivery(admissionRequest(installed), options(value));
  const targetRoot = value.stageRequest.targetRoot;
  const target = join(value.authorityRoot, targetRoot);
  mkdirSync(join(target, "data"), { recursive: true }); appendFileSync(join(target, "data/runtime.log"), "runtime bytes\n");
  mkdirSync(join(target, "node_modules/.bin"), { recursive: true }); symlinkSync("../../data/runtime.log", join(target, "node_modules/.bin/runtime"));
  const artifacts = [artifact(`${targetRoot}/package.json`, "{\"type\":\"module\"}\n"), artifact(`${targetRoot}/src/index.mjs`, "export const answer = 43;\n")];
  const raw = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const intendedPlateDigest = digest([{ name: "package.json", type: "file", digest: raw("{\"type\":\"module\"}\n"), byteLength: Buffer.byteLength("{\"type\":\"module\"}\n") }, { name: "src", type: "directory", digest: digest([{ path: "index.mjs", digest: raw("export const answer = 43;\n"), byteLength: Buffer.byteLength("export const answer = 43;\n") }]), files: [{ path: "index.mjs", digest: raw("export const answer = 43;\n"), byteLength: Buffer.byteLength("export const answer = 43;\n") }] }]);
  const product = reply("Accept", "urn:test:correction-invocation", SETTLEMENT, CUSTOMER, { type: "ProposedSoftwareDevelopmentProduct", contract: "software-development-service", purpose: "develop-software-artifact", targetSettlement: SETTLEMENT, artifacts, completeTargetPlate: true, completeTargetPlateDigest: declaredPlateDigest ?? intendedPlateDigest, customerMutation: false, foreignMutation: false, pendingCustomerDecision: true });
  const productDigest = digest(product);
  const decision = reply("Accept", product.id, CUSTOMER, SETTLEMENT, { type: "SoftwareDevelopmentCustomerDecision", proposedProduct: product, proposedProductDigest: productDigest, checks: { exactByteReplay: true }, customerUsefulness: true, installation: false });
  const receipt = reply("Accept", decision.id, SETTLEMENT, CUSTOMER, { type: "CustomerDecisionReceipt", contract: "software-development-service", proposedProduct: product.id, decision: "Accept", checks: decision.object.checks, customer: CUSTOMER, providerDoesNotOverrideDecision: true });
  appendRecord(value.recordRoot, "correction-deliveries", { delivery: product }); appendRecord(value.recordRoot, "correction-decisions", { decision, receipt });
  const priorPlateDigest = plateEvidence(target).plateDigest;
  const core = { type: "StageAcceptedSoftwareDeliveryCorrectionRequest", proposedProductId: product.id, proposedProductDigest: productDigest, artifactSetDigest: digest(artifacts.map(({ bytesBase64: _bytes, ...descriptor }) => descriptor)), intendedPlateDigest, priorPlateDigest, customerDecisionId: decision.id, customerDecisionReceiptId: receipt.id, receiverIdentity: ACTOR, targetServiceIdentity: `urn:ame:${basename(targetRoot)}`, targetContract: basename(targetRoot), targetRoot };
  const operationOffer = solicitCorrectionOperation(CORRECTION_STAGE_OPERATION, core, HUMAN_LEADER, NOW);
  const correctionStagingCapability = contentRecord({ type: "AcceptedSoftwareDeliveryCorrectionStagingCapability", issuedBy: HUMAN_LEADER, receiver: ACTOR, operation: CORRECTION_STAGE_OPERATION, requestDigest: digest(core), offerDigest: digest(operationOffer), nonce: "correction-stage-nonce", issuedAt: NOW, expiresAt: EXPIRY, singleUse: true, scope: { targetSettlement: SETTLEMENT, targetServiceIdentity: core.targetServiceIdentity, targetContract: core.targetContract, targetRoot, priorPlateDigest, intendedPlateDigest }, effects: [...CORRECTION_STAGE_EFFECTS] });
  return { ...value, correctionRequest: { ...core, operationOffer, correctionStagingCapability } };
}

function correctionAdmissionRequest(stageReceipt, nonce = "correction-admit-nonce") {
  const core = { type: "ReviewAndAdmitStagedSoftwareDeliveryCorrectionRequest", correctionStagingReceiptId: stageReceipt.id, replacementPlateDigest: stageReceipt.replacementPlateDigest, priorPlateDigest: stageReceipt.priorPlateDigest, receiverIdentity: ACTOR, targetServiceIdentity: stageReceipt.targetServiceIdentity, targetContract: stageReceipt.targetContract, targetRoot: stageReceipt.targetRoot };
  const operationOffer = solicitCorrectionOperation(CORRECTION_ADMIT_OPERATION, core, HUMAN_LEADER, NOW);
  return { ...core, operationOffer, correctionAdmissionGrant: contentRecord({ type: "SoftwareDeliveryCorrectionAdmissionGrant", issuedBy: HUMAN_LEADER, receiver: ACTOR, operation: CORRECTION_ADMIT_OPERATION, requestDigest: digest(core), offerDigest: digest(operationOffer), nonce, issuedAt: NOW, expiresAt: EXPIRY, singleUse: true, scope: { correctionStagingReceiptId: core.correctionStagingReceiptId, targetSettlement: SETTLEMENT, targetServiceIdentity: core.targetServiceIdentity, targetContract: core.targetContract, targetRoot: core.targetRoot, priorPlateDigest: core.priorPlateDigest, replacementPlateDigest: core.replacementPlateDigest }, effects: [...CORRECTION_ADMIT_EFFECTS] }) };
}

function allRecords(root) {
  const values = [];
  function walk(path) {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith(".jsonl")) values.push(...readFileSync(child, "utf8").split("\n").filter(Boolean).map(JSON.parse));
    }
  }
  walk(root);
  return values;
}

test("acceptance alone produces neither staging nor admission", () => {
  const value = fixture();
  assert.equal(existsSync(value.dataRoot), false);
  assert.equal(existsSync(join(value.authorityRoot, value.stageRequest.targetRoot)), false);
  assert.equal(value.decision.object.customerUsefulness, true);
  assert.equal(value.decision.object.installation, false);
});

test("the two operations are separately offered, separately authorized, and produce distinct receipts", async () => {
  const value = fixture();
  const stageReceipt = await stageAcceptedSoftwareDelivery(value.stageRequest, options(value));
  assert.equal(stageReceipt.type, STAGING_RECEIPT);
  assert.equal(existsSync(join(value.authorityRoot, value.stageRequest.targetRoot)), false, "staging is not admission");
  const admitRequest = admissionRequest(stageReceipt);
  assert.notEqual(digest(value.stageRequest.stagingCapability), digest(admitRequest.admissionGrant));
  assert.notEqual(value.stageRequest.operationOffer.id, admitRequest.operationOffer.id);
  const admissionReceipt = await reviewAndAdmitStagedSoftwareDelivery(admitRequest, options(value));
  assert.equal(admissionReceipt.type, ADMISSION_RECEIPT);
  assert.notEqual(stageReceipt.type, admissionReceipt.type);
  assert.equal(admissionReceipt.stagingReceipt, stageReceipt.id);
  assert.equal(existsSync(join(value.authorityRoot, value.stageRequest.targetRoot, "src/index.mjs")), true);
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(admitRequest, options(value)), (error) => error instanceof ReceiverRefusal && error.code === "authority-already-consumed");
});

test("exact local content IDs, acceptance linkage, artifact bytes, and target binding fail closed", async () => {
  const missing = fixture("services/missing");
  missing.stageRequest.proposedProductId = `urn:sha256:${"0".repeat(64)}`;
  await assert.rejects(() => stageAcceptedSoftwareDelivery(missing.stageRequest, options(missing)), (error) => error.code === "operation-offer-mismatch" || error.code === "local-record-absent");

  const duplicate = fixture("services/duplicate");
  appendRecord(duplicate.recordRoot, "duplicate-deliveries", { delivery: duplicate.product });
  await assert.rejects(() => stageAcceptedSoftwareDelivery(duplicate.stageRequest, options(duplicate)), (error) => error.code === "duplicate-local-record");

  const forged = fixture("services/forged");
  const path = join(forged.recordRoot, "customer-decisions", "2026", "07", "19", "2026-07-19-customer-decisions.jsonl");
  const wrapper = JSON.parse(readFileSync(path, "utf8").trim());
  wrapper.decision.object.customerUsefulness = false;
  appendFileSync(path, `${JSON.stringify(wrapper)}\n`);
  await assert.rejects(() => stageAcceptedSoftwareDelivery(forged.stageRequest, options(forged)), (error) => ["duplicate-local-record", "accepting-decision-chain-mismatch"].includes(error.code));

  const symlink = fixture("services/link/child");
  symlinkSync(join(symlink.root, "outside"), join(symlink.authorityRoot, "services", "link"));
  await assert.rejects(() => stageAcceptedSoftwareDelivery(symlink.stageRequest, options(symlink)), (error) => error.code === "symlink-path-refused");
  assert.equal(existsSync(join(symlink.root, "outside", "child")), false);
});

test("prepared staging recovers after candidate, authority, transition, publish, and commit crash points", async () => {
  for (const phase of ["stage-candidate-created", "stage-capability-prepared", "stage-transition-prepared", "stage-tree-published", "stage-transition-committed", "stage-receipt-appended"]) {
    const value = fixture(`services/stage-recovery-${phase}`);
    await assert.rejects(() => stageAcceptedSoftwareDelivery(value.stageRequest, options(value, { crashAt: phase })), (error) => error instanceof InjectedCrash && error.phase === phase);
    const receipt = await stageAcceptedSoftwareDelivery(value.stageRequest, options(value));
    assert.equal(receipt.type, STAGING_RECEIPT, phase);
    const records = allRecords(value.dataRoot);
    assert.equal(records.filter((record) => record.type === STAGING_RECEIPT).length, 1, phase);
    assert.equal(records.filter((record) => record.type === "AcceptedSoftwareDeliveryStageCommitted").length, 1, phase);
  }
});

test("prepared admission recovers after candidate, grant, transition, publish, commit, and receipt crash points", async () => {
  for (const phase of ["admission-candidate-created", "admission-grant-prepared", "admission-transition-prepared", "admission-target-published", "admission-transition-committed", "admission-receipt-appended"]) {
    const value = fixture(`services/admission-recovery-${phase}`);
    const stageReceipt = await stageAcceptedSoftwareDelivery(value.stageRequest, options(value));
    const request = admissionRequest(stageReceipt, `nonce-${phase}`);
    await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(request, options(value, { crashAt: phase })), (error) => error instanceof InjectedCrash && error.phase === phase);
    const receipt = await reviewAndAdmitStagedSoftwareDelivery(request, options(value));
    assert.equal(receipt.type, ADMISSION_RECEIPT, phase);
    assert.equal(existsSync(join(value.authorityRoot, request.targetRoot)), true, phase);
    const records = allRecords(value.dataRoot);
    assert.equal(records.filter((record) => record.type === ADMISSION_RECEIPT).length, 1, phase);
    assert.equal(records.filter((record) => record.type === "SoftwareDeliveryAdmissionCommitted").length, 1, phase);
  }
});

test("post-consumption crash recovery refuses replay after exactly one committed effect", async () => {
  const staged = fixture("services/stage-consumption-final");
  await assert.rejects(() => stageAcceptedSoftwareDelivery(staged.stageRequest, options(staged, { crashAt: "stage-capability-committed" })), (error) => error instanceof InjectedCrash && error.phase === "stage-capability-committed");
  await assert.rejects(() => stageAcceptedSoftwareDelivery(staged.stageRequest, options(staged)), (error) => error.code === "authority-already-consumed");
  assert.equal(allRecords(staged.dataRoot).filter((record) => record.type === STAGING_RECEIPT).length, 1);

  const admitted = fixture("services/admission-consumption-final");
  const stagingReceipt = await stageAcceptedSoftwareDelivery(admitted.stageRequest, options(admitted));
  const request = admissionRequest(stagingReceipt, "admit-final-nonce");
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(request, options(admitted, { crashAt: "admission-grant-committed" })), (error) => error instanceof InjectedCrash && error.phase === "admission-grant-committed");
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(request, options(admitted)), (error) => error.code === "authority-already-consumed");
  assert.equal(allRecords(admitted.dataRoot).filter((record) => record.type === ADMISSION_RECEIPT).length, 1);
});

test("concurrent replay admits at most one committed staging effect", async () => {
  const value = fixture("services/concurrent-stage");
  const settled = await Promise.allSettled([
    stageAcceptedSoftwareDelivery(value.stageRequest, options(value)),
    stageAcceptedSoftwareDelivery(value.stageRequest, options(value)),
  ]);
  assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(settled.filter((item) => item.status === "rejected").length, 1);
  assert.equal(allRecords(value.dataRoot).filter((record) => record.type === STAGING_RECEIPT).length, 1);
});

test("wrong receipt type, distinct-authority substitution, staged-byte drift, and pre-existing targets refuse", async () => {
  const value = fixture("services/admission-refusal");
  const stageReceipt = await stageAcceptedSoftwareDelivery(value.stageRequest, options(value));
  const request = admissionRequest(stageReceipt);
  const wrong = structuredClone(request);
  wrong.stagingReceiptId = contentRecord({ type: ADMISSION_RECEIPT, recordedAt: NOW }).id;
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(wrong, options(value)), (error) => ["operation-offer-mismatch", "local-record-absent"].includes(error.code));
  const substituted = structuredClone(request);
  substituted.admissionGrant = value.stageRequest.stagingCapability;
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(substituted, options(value)), (error) => error.code === "content-identity-mismatch" || error.code === "authority-mismatch");
  const stagedFile = join(value.dataRoot, stageReceipt.stagingDestination, "src/index.mjs");
  appendFileSync(stagedFile, "tamper");
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(request, options(value)), (error) => error.code === "staged-tree-drift");

  const existing = fixture("services/already-there");
  const existingReceipt = await stageAcceptedSoftwareDelivery(existing.stageRequest, options(existing));
  mkdirSync(join(existing.authorityRoot, existing.stageRequest.targetRoot), { recursive: true });
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDelivery(admissionRequest(existingReceipt), options(existing)), (error) => error.code === "create-only-destination-exists");
});

test("every runtime receipt and refusal surface preserves zero cross-boundary effects", async () => {
  const value = fixture("services/effects");
  const stageReceipt = await stageAcceptedSoftwareDelivery(value.stageRequest, options(value));
  const admissionReceipt = await reviewAndAdmitStagedSoftwareDelivery(admissionRequest(stageReceipt), options(value));
  for (const receipt of [stageReceipt, admissionReceipt]) {
    assert.equal(receipt.resourceReceipt.externalNetwork, false);
    assert.equal(receipt.resourceReceipt.externalSpend, 0);
    assert.equal(receipt.resourceReceipt.credentials, false);
    assert.equal(receipt.resourceReceipt.git, false);
    assert.equal(receipt.resourceReceipt.customerMutation, false);
    assert.equal(receipt.resourceReceipt.foreignMutation, false);
    assert.equal(receipt.resourceReceipt.ttiMutation, false);
    assert.equal(receipt.resourceReceipt.inferenceTokens.state, "unknown-not-zero");
  }
});

test("correction replaces a complete source plate while preserving real runtime roots", async () => {
  const value = await correctionFixture();
  const staged = await stageAcceptedSoftwareDeliveryCorrection(value.correctionRequest, options(value));
  const target = join(value.authorityRoot, value.correctionRequest.targetRoot);
  const runtimeInodes = ["data", "node_modules"].map((name) => ({ name, ...lstatSync(join(target, name)) })).map(({ name, dev, ino }) => ({ name, dev, ino }));
  const realCarrierOptions = options(value);
  delete realCarrierOptions.meshCarrier;
  const admitted = await reviewAndAdmitStagedSoftwareDeliveryCorrection(correctionAdmissionRequest(staged), realCarrierOptions);
  assert.equal(admitted.replacement, true); assert.equal(admitted.priorPlateDigest, staged.priorPlateDigest);
  assert.equal(admitted.displacedLivePlateRemoved, true);
  assert.equal(admitted.resourceReceipt.providerLocalMutation, true);
  assert.equal(readFileSync(join(value.authorityRoot, value.correctionRequest.targetRoot, "src/index.mjs"), "utf8"), "export const answer = 43;\n");
  assert.equal(readFileSync(join(value.authorityRoot, value.correctionRequest.targetRoot, "data/runtime.log"), "utf8"), "runtime bytes\n");
  assert.equal(existsSync(join(value.authorityRoot, value.correctionRequest.targetRoot, "node_modules/.bin/runtime")), true);
  assert.deepEqual(["data", "node_modules"].map((name) => ({ name, ...lstatSync(join(target, name)) })).map(({ name, dev, ino }) => ({ name, dev, ino })), runtimeInodes);
  assert.equal(readdirSync(join(value.authorityRoot, "services")).some((name) => name.startsWith(".accepted-delivery-receiver-")), false);
});

test("correction refuses target drift, incomplete artifacts, symlink targets, and grant replay", async () => {
  const drift = await correctionFixture(); appendFileSync(join(drift.authorityRoot, drift.correctionRequest.targetRoot, "src/index.mjs"), "drift");
  await assert.rejects(() => stageAcceptedSoftwareDeliveryCorrection(drift.correctionRequest, options(drift)), (error) => error.code === "correction-target-or-artifact-set-mismatch");
  const partial = await correctionFixture({ declaredPlateDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000" });
  await assert.rejects(() => stageAcceptedSoftwareDeliveryCorrection(partial.correctionRequest, options(partial)), (error) => error.code === "correction-target-or-artifact-set-mismatch");
  const replay = await correctionFixture(); const staged = await stageAcceptedSoftwareDeliveryCorrection(replay.correctionRequest, options(replay)); const request = correctionAdmissionRequest(staged); await reviewAndAdmitStagedSoftwareDeliveryCorrection(request, options(replay));
  await assert.rejects(() => reviewAndAdmitStagedSoftwareDeliveryCorrection(request, options(replay)), (error) => error.code === "authority-already-consumed");
});

test("concurrent correction replay commits one staging effect", async () => {
  const value = await correctionFixture();
  const settled = await Promise.allSettled([
    stageAcceptedSoftwareDeliveryCorrection(value.correctionRequest, options(value)),
    stageAcceptedSoftwareDeliveryCorrection(value.correctionRequest, options(value)),
  ]);
  assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(settled.filter((item) => item.status === "rejected").length, 1);
  assert.equal(allRecords(value.dataRoot).filter((record) => record.type === "AcceptedSoftwareDeliveryCorrectionStagingReceipt").length, 1);
});

test("correction staging and admission recover at every material prepared/publish boundary", async () => {
  for (const phase of ["correction-stage-candidate-created", "correction-stage-prepared", "correction-stage-published"]) {
    const value = await correctionFixture();
    await assert.rejects(() => stageAcceptedSoftwareDeliveryCorrection(value.correctionRequest, options(value, { crashAt: phase })), (error) => error instanceof InjectedCrash && error.phase === phase);
    const staged = await stageAcceptedSoftwareDeliveryCorrection(value.correctionRequest, options(value));
    assert.equal(staged.replacement, true, phase);
  }
  for (const phase of ["correction-admission-prepared", "correction-old-plate-displaced-0", "correction-old-plate-displaced-1", "correction-new-plate-published-0", "correction-new-plate-published-1", "correction-admission-committed", "correction-displaced-plate-removed", "correction-admission-receipt-appended"]) {
    const value = await correctionFixture();
    const staged = await stageAcceptedSoftwareDeliveryCorrection(value.correctionRequest, options(value));
    const request = correctionAdmissionRequest(staged, `nonce-${phase}`);
    await assert.rejects(() => reviewAndAdmitStagedSoftwareDeliveryCorrection(request, options(value, { crashAt: phase })), (error) => error instanceof InjectedCrash && error.phase === phase);
    const receipt = await reviewAndAdmitStagedSoftwareDeliveryCorrection(request, options(value));
    assert.equal(receipt.replacement, true, phase);
    assert.equal(readdirSync(join(value.authorityRoot, "services")).some((name) => name.startsWith(".accepted-delivery-receiver-")), false, phase);
  }
});
