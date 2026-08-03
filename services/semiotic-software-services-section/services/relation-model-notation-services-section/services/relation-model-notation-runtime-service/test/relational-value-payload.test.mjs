import assert from "node:assert/strict";
import test from "node:test";

import { encodeCanonical, rawNiUri } from "../src/canonical-cbor.mjs";
import {
  admitRelationalValuePayload,
  identifyRelationalValuePayload,
  verifyRelationalValuePayload,
} from "../src/relational-value.mjs";

const VECTOR_SOURCE = Object.freeze({ alpha: "é", zeta: Object.freeze([true, null, 7]) });
const VECTOR_TOKEN = "ni:///sha-256;Gm6qE9dhCq909qkgi2YBNx3gBa0g1V-3RWgopR0VnSc";

test("identifies and admits one canonical token/claim relational payload", () => {
  const identified = identifyRelationalValuePayload(VECTOR_SOURCE);
  assert.equal(identified.token, VECTOR_TOKEN);
  assert.equal(identified.token, rawNiUri(identified.bytes));
  assert.deepEqual(Object.keys(identified.claim).sort(), ["semanticType", "term"]);
  assert.equal(verifyRelationalValuePayload({ token: identified.token, claim: identified.claim }), true);

  const admitted = admitRelationalValuePayload({
    bytes: new Uint8Array(identified.bytes),
    token: identified.token,
  });
  assert.deepEqual(admitted.claim, identified.claim);
  assert.equal(Object.isFrozen(admitted.claim), true);
  assert.equal(Object.isFrozen(admitted.claim.semanticType), true);
  assert.equal(Object.isFrozen(admitted.claim.term), true);
});

test("refuses token mismatch and a reordered but graph-equivalent carrier", () => {
  const identified = identifyRelationalValuePayload(VECTOR_SOURCE);
  assert.throws(
    () => admitRelationalValuePayload({ bytes: identified.bytes, token: identifyRelationalValuePayload("other").token }),
    /token does not match/u,
  );

  const reorderedAscription = [
    "ascribe",
    identified.claim.semanticType,
    structuredClone(identified.claim.term),
  ];
  const nodes = reorderedAscription[2][2][1][2];
  nodes.reverse();
  const reorderedBytes = encodeCanonical(reorderedAscription);
  assert.throws(
    () => admitRelationalValuePayload({ bytes: reorderedBytes, token: rawNiUri(reorderedBytes) }),
    /graph carrier is not canonical/u,
  );
  assert.equal(verifyRelationalValuePayload({
    token: rawNiUri(reorderedBytes),
    claim: { semanticType: reorderedAscription[1], term: reorderedAscription[2] },
  }), false);
});

test("Buffer and Uint8Array values have one canonical payload identity", () => {
  const bufferPayload = identifyRelationalValuePayload(Buffer.from([0, 1, 255]));
  const typedArrayPayload = identifyRelationalValuePayload(new Uint8Array([0, 1, 255]));
  assert.equal(typedArrayPayload.token, bufferPayload.token);
  assert.deepEqual(typedArrayPayload.claim, bufferPayload.claim);
  assert.deepEqual(
    admitRelationalValuePayload({ bytes: typedArrayPayload.bytes, token: typedArrayPayload.token }).claim,
    typedArrayPayload.claim,
  );
});
