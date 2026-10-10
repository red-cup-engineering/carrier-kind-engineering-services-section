#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  ACTOR,
  ADOPTED_MESH_CARRIER,
  ADOPTED_MESH_EXPORTS,
  ADMISSION_RECEIPT,
  ADMIT_OPERATION,
  CORRECTION_ADMISSION_RECEIPT,
  CORRECTION_ADMIT_EFFECTS,
  CORRECTION_ADMIT_OPERATION,
  CORRECTION_STAGING_RECEIPT,
  CORRECTION_STAGE_EFFECTS,
  CORRECTION_STAGE_OPERATION,
  STAGING_RECEIPT,
  STAGE_OPERATION,
  PRESERVED_RUNTIME_ROOTS,
  contentRecord,
  digest,
  safeRelative,
  solicitCorrectionOperation,
  solicitOperation,
} from "./accepted-software-delivery-receiver.mjs";

export function verifyProtocolCarrier() {
  const source = readFileSync(new URL("./accepted-software-delivery-receiver.mjs", import.meta.url), "utf8");
  assert.equal(STAGE_OPERATION, "stage-accepted-software-delivery");
  assert.equal(ADMIT_OPERATION, "review-and-admit-staged-software-delivery");
  assert.equal(CORRECTION_STAGE_OPERATION, "stage-accepted-software-delivery-correction");
  assert.equal(CORRECTION_ADMIT_OPERATION, "review-and-admit-staged-software-delivery-correction");
  assert.notEqual(STAGING_RECEIPT, ADMISSION_RECEIPT);
  assert.notEqual(CORRECTION_STAGING_RECEIPT, CORRECTION_ADMISSION_RECEIPT);
  assert.deepEqual(PRESERVED_RUNTIME_ROOTS, ["data", "node_modules"]);
  assert.deepEqual(CORRECTION_STAGE_EFFECTS, ["sdss-receiver-local-private-replacement-plate", "sdss-receiver-local-append-only-evidence", "sdss-existing-target-plate-snapshot"]);
  assert.deepEqual(CORRECTION_ADMIT_EFFECTS, ["sdss-local-crash-recoverable-plate-replacement", "sdss-receiver-local-append-only-evidence", "sdss-prior-plate-digest-preservation", "sdss-displaced-live-plate-removal"]);
  assert.equal(ADOPTED_MESH_CARRIER, "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/mesh-scope");
  assert.deepEqual(ADOPTED_MESH_EXPORTS, ["inspectMeshScope", "admitEnterpriseInstall", "revalidateEnterpriseInstall"]);
  assert.match(source, /await import\(ADOPTED_MESH_CARRIER\)/u);
  assert.match(source, /inspectMeshScope/u);
  assert.match(source, /admitEnterpriseInstall/u);
  assert.match(source, /revalidateEnterpriseInstall/u);
  assert.doesNotMatch(source, /statSync\(marker\)\.isFile/u);
  assert.doesNotMatch(source, /\.git[^\n]+isFile/u);
  assert.equal(safeRelative("services/example/src/index.mjs"), true);
  for (const path of ["", ".", "..", "../x", "/x", "services//x", "services\\x", "services/./x", "services/../x", "services/x\0y"]) assert.equal(safeRelative(path), false);
  const core = { type: "StageAcceptedSoftwareDeliveryRequest", proposedProductId: "urn:sha256:a", proposedProductDigest: "sha256:b", artifactSetDigest: "sha256:c", customerDecisionId: "urn:sha256:d", customerDecisionReceiptId: "urn:sha256:e", receiverIdentity: ACTOR, targetServiceIdentity: "urn:ame:x", targetContract: "x", targetRoot: "services/x" };
  const offer = solicitOperation(STAGE_OPERATION, core, "urn:leader:emsenn", "2026-07-19T01:50:00.000Z");
  assert.equal(offer.requestDigest, digest(core));
  const correctionCore = { ...core, type: "StageAcceptedSoftwareDeliveryCorrectionRequest", intendedPlateDigest: "sha256:f", priorPlateDigest: "sha256:g" };
  const correctionOffer = solicitCorrectionOperation(CORRECTION_STAGE_OPERATION, correctionCore, "urn:leader:emsenn", "2026-07-19T01:50:00.000Z");
  assert.equal(correctionOffer.requestDigest, digest(correctionCore));
  assert.match(source, /completeTargetPlateDigest !== request\.intendedPlateDigest/u);
  assert.match(source, /correction-old-plate-displaced-\$\{index\}/u);
  assert.match(source, /correction-new-plate-published-\$\{index\}/u);
  assert.match(source, /CorrectionAuthorityConsumptionPrepared/u);
  assert.match(source, /operation: "reinstall"/u);
  assert.match(source, /mode: "apply"/u);
  assert.match(source, /openSync\(lock, "wx", 0o600\)/u);
  assert.match(source, /authority-execution-in-progress/u);
  assert.match(source, /correction-displaced-plate-removed/u);
  assert.match(source, /rmSync\(prior, \{ recursive: true, force: true \}\)/u);
  assert.doesNotMatch(source, /completeTargetTree/u);
  assert.doesNotMatch(source, /sdss-local-atomic-target-replacement/u);
  assert.doesNotMatch(source, /request\.__dataRoot/u);
  assert.equal(contentRecord({ type: "SelfTest", value: 1 }).id.startsWith("urn:sha256:"), true);
  return {
    type: "AcceptedSoftwareDeliveryReceiverVerification",
    passed: true,
    operations: [STAGE_OPERATION, ADMIT_OPERATION, CORRECTION_STAGE_OPERATION, CORRECTION_ADMIT_OPERATION],
    receiptTypes: [STAGING_RECEIPT, ADMISSION_RECEIPT, CORRECTION_STAGING_RECEIPT, CORRECTION_ADMISSION_RECEIPT],
    classifierRestated: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--self-test")) throw new Error("--self-test is required");
  process.stdout.write(`${JSON.stringify(verifyProtocolCarrier())}\n`);
}
