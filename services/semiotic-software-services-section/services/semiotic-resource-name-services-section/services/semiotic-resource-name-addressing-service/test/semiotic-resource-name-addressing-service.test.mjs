import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import {
  addressSemioticResourceName,
  admitSemioticResourceNameAddress,
  assertSemioticResourceNameAddress,
  verifySemioticResourceNameAddress,
} from "../src/semiotic-resource-name-addressing-service.mjs";

test("addresses the released path vector as an immutable token/claim coordinate", () => {
  const addressed = addressSemioticResourceName("order.payment:receipt-delay");

  assert.deepEqual(addressed, {
    surface: "order.payment:receipt-delay",
    token: "ni:///sha-256;wbI_c8-hYBJ-3cIwesZg_SunN_rN4grgll4OffwuLGA",
    claim: {
      semanticType: ["prod", ["prod", ["prod", ["base"], ["prod", ["base"], ["base"]]], ["prod", ["base"], ["base"]]], ["prod", ["base"], ["base"]]],
      term: ["pair", ["pair", ["pair", ["mark", "order"], ["pair", ["mark", "generation"], ["mark", "payment"]]], ["pair", ["mark", "witness"], ["mark", "receipt"]]], ["pair", ["mark", "obstruction"], ["mark", "delay"]]],
    },
  });
  assert.equal(Object.isFrozen(addressed), true);
  assert.equal(Object.isFrozen(addressed.claim), true);
  assert.equal(verifySemioticResourceNameAddress(addressed), true);
});

test("punctuation changes the visible path claim and its opaque commitment", () => {
  const generated = addressSemioticResourceName("order.payment");
  const witnessed = addressSemioticResourceName("order:payment");
  const obstructed = addressSemioticResourceName("order-payment");

  assert.notEqual(generated.token, witnessed.token);
  assert.notEqual(witnessed.token, obstructed.token);
  assert.notDeepEqual(generated.claim.term, witnessed.claim.term);
});

test("refuses any surface, claim, or token mismatch without decoding the token", () => {
  const addressed = addressSemioticResourceName("order.payment");
  const alternate = addressSemioticResourceName("order:payment");

  assert.throws(
    () => assertSemioticResourceNameAddress({ ...addressed, surface: alternate.surface }),
    (error) => error instanceof TypeError && error.code === "srn-address-mismatch",
  );
  assert.throws(
    () => assertSemioticResourceNameAddress({ ...addressed, claim: alternate.claim }),
    (error) => error instanceof TypeError && error.code === "srn-address-mismatch",
  );
  assert.throws(
    () => assertSemioticResourceNameAddress({ ...addressed, token: alternate.token }),
    (error) => error instanceof TypeError && error.code === "srn-address-mismatch",
  );
  assert.equal(verifySemioticResourceNameAddress({ ...addressed, token: alternate.token }), false);
});

test("refuses underscore escapes and malformed path surfaces", () => {
  assert.throws(
    () => addressSemioticResourceName("order_payment"),
    (error) => error instanceof TypeError && error.code === "srn-claim-absent",
  );
  assert.throws(
    () => addressSemioticResourceName("order?payment"),
    (error) => error instanceof TypeError && error.code === "malformed-semiotic-resource-name",
  );
});

test("admits canonical normalized-envelope bytes only when their surface and token agree", () => {
  const addressed = addressSemioticResourceName("order.payment:receipt-delay");
  const identified = identifyNormalizedSemanticContent({
    objectKind: "semiotic-resource-name.path-claim",
    semanticType: addressed.claim.semanticType,
    term: addressed.claim.term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  const admitted = admitSemioticResourceNameAddress({
    surface: addressed.surface,
    bytes: identified.bytes,
    token: addressed.token,
  });

  assert.deepEqual(admitted, addressed);
  assert.throws(
    () => admitSemioticResourceNameAddress({
      surface: "order:payment",
      bytes: identified.bytes,
      token: addressed.token,
    }),
    (error) => error instanceof TypeError && error.code === "srn-address-mismatch",
  );

  const alternate = addressSemioticResourceName("order.payment:receipt-wait");
  assert.throws(
    () => admitSemioticResourceNameAddress({
      surface: addressed.surface,
      bytes: identified.bytes,
      token: alternate.token,
    }),
    /token does not commit/u,
  );

  const driftedBytes = new Uint8Array(identified.bytes);
  driftedBytes[driftedBytes.length - 1] ^= 1;
  assert.throws(
    () => admitSemioticResourceNameAddress({
      surface: addressed.surface,
      bytes: driftedBytes,
      token: addressed.token,
    }),
  );
});
