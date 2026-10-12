import assert from "node:assert/strict";
import test from "node:test";
import { createSignClaim, conflateClaims } from "../src/articulation/predicating/positing/semantic-claim.mjs";

const ref = Object.freeze({ id: "ni:sha-256;source", type: "test.claim-source@1" });
const claim = charge => createSignClaim({ subject: ref, predicate: "rumor", object: ref, charge });
test("claim confluence preserves independent evidence using canonical charge values", () => {
  const positive = claim("potential");
  const negative = claim("active");
  assert.equal(positive.ok, true);
  assert.equal(negative.ok, true);
  assert.equal(conflateClaims(positive.value, negative.value).value.charge, "stable");
  assert.equal(conflateClaims(positive.value, positive.value).value.charge, "potential");
  assert.equal(conflateClaims(claim("absurd").value, negative.value).value.charge, "active");
  assert.equal(conflateClaims(positive.value, { ...negative.value, predicate: "another" }).ok, false);
  assert.equal(createSignClaim({ subject: { id: "not-an-ni", type: ref.type }, predicate: "rumor", object: ref, charge: "potential" }).ok, false);
  assert.equal(claim("true").ok, false);
});
