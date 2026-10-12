import assert from "node:assert/strict";
import test from "node:test";

import {
  affirmsCustody,
  custodyStanding,
  deniesCustody,
} from "../../src/cells/custody.mjs";

const CUSTODIAN = "office:custodian";
const SCOPE = "resource:fixture";

test("no matching custody assertion is unknown", () => {
  const reading = custodyStanding([], CUSTODIAN, SCOPE);
  assert.equal(reading.value, "unknown");
  assert.deepEqual(reading.affirmations, []);
  assert.deepEqual(reading.denials, []);
});

test("affirmation and denial occupy the FOUR custody lattice", () => {
  const affirm = affirmsCustody(
    "issuer:a",
    CUSTODIAN,
    SCOPE,
    "2026-10-05T22:00:00.000Z",
    ["receipt:a"],
  );
  const deny = deniesCustody(
    "issuer:b",
    CUSTODIAN,
    SCOPE,
    "2026-10-05T22:01:00.000Z",
    ["receipt:b"],
  );

  assert.equal(custodyStanding([affirm], CUSTODIAN, SCOPE).value, "held");
  assert.equal(custodyStanding([deny], CUSTODIAN, SCOPE).value, "denied");
  assert.equal(custodyStanding([affirm, deny], CUSTODIAN, SCOPE).value, "contested");
});

test("custody evidence is exact to custodian and scope", () => {
  const assertion = affirmsCustody(
    "issuer:a",
    CUSTODIAN,
    SCOPE,
    "2026-10-05T22:00:00.000Z",
  );

  assert.equal(custodyStanding([assertion], "office:other", SCOPE).value, "unknown");
  assert.equal(custodyStanding([assertion], CUSTODIAN, "resource:other").value, "unknown");
});

test("custody assertions are content-addressed source facts", () => {
  const left = affirmsCustody(
    "issuer:a",
    CUSTODIAN,
    SCOPE,
    "2026-10-05T22:00:00.000Z",
    ["receipt:a"],
  );
  const same = affirmsCustody(
    "issuer:a",
    CUSTODIAN,
    SCOPE,
    "2026-10-05T22:00:00.000Z",
    ["receipt:a"],
  );
  const later = affirmsCustody(
    "issuer:a",
    CUSTODIAN,
    SCOPE,
    "2026-10-05T22:02:00.000Z",
    ["receipt:a"],
  );

  assert.equal(left.id, same.id);
  assert.notEqual(left.id, later.id);
});
