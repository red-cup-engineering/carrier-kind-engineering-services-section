import assert from "node:assert/strict";
import test from "node:test";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { typedListItems, typedListTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import {
  admitRelationalValuePayload,
  decodeRelationalValue,
  encodeRelationalValue,
  relationalValueId,
  identifyRelationalValuePayload,
  verifyRelationalValuePayload,
} from "../src/relational-value.mjs";

const VECTOR_SOURCE = Object.freeze({ alpha: "é", zeta: Object.freeze([true, null, 7]) });
const VECTOR_TOKEN = "ni:///sha-256;cdzMmK_smdb8QlOItnfrciFlnK42RA28R-MyS5hJatc";

test("identifies and admits one canonical token/claim relational payload", () => {
  const identified = identifyRelationalValuePayload(VECTOR_SOURCE);
  assert.equal(identified.token, VECTOR_TOKEN);
  assert.equal(identified.token, makeNiUri(identified.bytes));
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
  const nodes = reorderedAscription[2][2];
  nodes[1] = typedListTerm(null, [...typedListItems(nodes[1])].reverse());
  const reorderedBytes = encodeCanonical(reorderedAscription);
  assert.throws(
    () => admitRelationalValuePayload({ bytes: reorderedBytes, token: makeNiUri(reorderedBytes) }),
    /graph carrier is not canonical/u,
  );
  assert.equal(verifyRelationalValuePayload({
    token: makeNiUri(reorderedBytes),
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

test("typed relational SEN is canonical and round-trips without JSON", () => {
  const source = { alpha: "é", decimals: [1e-7, -2.5e-8, 1.25, 1e21], zeta: [true, null, 7] };
  const encoded = encodeRelationalValue(source);
  const term = ["ascribe", encoded.type, encoded.term];
  assert.deepEqual(decodeRelationalValue(encoded.type, encoded.term), source);
  assert.deepEqual(decodeSemantic(semanticBytes(term)), term);
  assert.equal(relationalValueId(source), semanticId(term));
});
