#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  ACTOR,
  ADMISSION_RECEIPT,
  ADMIT_OPERATION,
  STAGING_RECEIPT,
  STAGE_OPERATION,
  contentRecord,
  digest,
  safeRelative,
  solicitOperation,
} from "./accepted-software-delivery-receiver.mjs";

export function verifyProtocolCarrier() {
  const source = readFileSync(new URL("./accepted-software-delivery-receiver.mjs", import.meta.url), "utf8");
  assert.equal(STAGE_OPERATION, "stage-accepted-software-delivery");
  assert.equal(ADMIT_OPERATION, "review-and-admit-staged-software-delivery");
  assert.notEqual(STAGING_RECEIPT, ADMISSION_RECEIPT);
  assert.match(source, /enforcing-mesh-scope\/scripts\/mesh-scope\.js/u);
  assert.match(source, /inspectMeshScope/u);
  assert.match(source, /admitEnterpriseInstall/u);
  assert.match(source, /revalidateEnterpriseInstall/u);
  assert.doesNotMatch(source, /statSync\(marker\)\.isFile/u);
  assert.equal(safeRelative("services/example/src/index.mjs"), true);
  for (const path of ["", ".", "..", "../x", "/x", "services//x", "services\\x", "services/./x", "services/../x", "services/x\0y"]) assert.equal(safeRelative(path), false);
  const core = { type: "StageAcceptedSoftwareDeliveryRequest", proposedProductId: "urn:sha256:a", proposedProductDigest: "sha256:b", artifactSetDigest: "sha256:c", customerDecisionId: "urn:sha256:d", customerDecisionReceiptId: "urn:sha256:e", receiverIdentity: ACTOR, targetServiceIdentity: "urn:ame:x", targetContract: "x", targetRoot: "services/x" };
  const offer = solicitOperation(STAGE_OPERATION, core, "urn:leader:emsenn", "2026-07-19T01:50:00.000Z");
  assert.equal(offer.requestDigest, digest(core));
  assert.equal(contentRecord({ type: "SelfTest", value: 1 }).id.startsWith("urn:sha256:"), true);
  return { type: "AcceptedSoftwareDeliveryReceiverVerification", passed: true, operations: [STAGE_OPERATION, ADMIT_OPERATION], receiptTypes: [STAGING_RECEIPT, ADMISSION_RECEIPT], classifierRestated: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--self-test")) throw new Error("--self-test is required");
  process.stdout.write(`${JSON.stringify(verifyProtocolCarrier())}\n`);
}
