import assert from "node:assert/strict";
import test from "node:test";

import {
  identifyProofCoordinate,
  PROOF_COORDINATE_OBJECT_KIND,
  proofCoordinateTerm,
  settleAndIdentifyProofCoordinate,
} from "../lib/identity.mjs";
import {
  EMPTY_WITNESS_ROOT,
  IDENTITY_SETTLEMENT_PROFILE,
  RMN_NORMALIZATION_PROFILE,
  verifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

const request = Object.freeze({
  resourceType: "semiotic-atom",
  root: "root",
  target: "target",
  witnesses: Object.freeze([
    Object.freeze({ domain: "root", generator: "specialization", codomain: "target" }),
  ]),
});

test("an earned proof coordinate receives the normalized v2 semantic envelope", () => {
  const result = settleAndIdentifyProofCoordinate(request);
  assert.equal(result.ok, true);
  assert.match(result.identity.token, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u);
  assert.equal(result.identity.envelope.kind, "relation-model-notation.normalized-semantic-content");
  assert.equal(result.identity.envelope.version, 2);
  assert.equal(result.identity.envelope.objectKind, PROOF_COORDINATE_OBJECT_KIND);
  assert.equal(result.identity.envelope.normalizationProfile, RMN_NORMALIZATION_PROFILE);
  assert.equal(result.identity.envelope.settlementProfile, IDENTITY_SETTLEMENT_PROFILE);
  assert.equal(result.identity.envelope.witnessRoot, EMPTY_WITNESS_ROOT);
  assert.deepEqual(result.identity.envelope.settledBody, proofCoordinateTerm(result.coordinate));
  assert.equal(verifyNormalizedSemanticContent(result.identity.token, result.identity.envelope), true);
  assert.equal(identifyProofCoordinate(result.coordinate).token, result.identity.token);
  assert.equal(result.identity.id, result.identity.token);
  assert.equal(Object.hasOwn(result.identity, "value"), false);
});

test("an unearned coordinate receives no identity", () => {
  const result = settleAndIdentifyProofCoordinate({ ...request, witnesses: [] });
  assert.deepEqual(result, { ok: false, reason: "unearned-coordinate" });
  assert.equal(Object.hasOwn(result, "identity"), false);
});
