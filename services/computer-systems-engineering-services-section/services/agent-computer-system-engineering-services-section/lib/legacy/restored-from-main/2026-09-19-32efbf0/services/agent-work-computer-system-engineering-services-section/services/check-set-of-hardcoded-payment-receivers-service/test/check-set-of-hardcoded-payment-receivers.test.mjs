import assert from "node:assert/strict";
import test from "node:test";
import { findHardcodedPaymentReceivers } from "../scripts/check-set-of-hardcoded-payment-receivers.mjs";

test("flags hardcoded receivers outside allowlist", () => {
  const result = findHardcodedPaymentReceivers({
    files: [{ path: "src/route.mjs", content: "const to = '0x1234567890123456789012345678901234567890';" }]
  });
  assert.equal(result.status, "violations-found");
  assert.equal(result.violations.length, 1);
});

test("ignores allowlisted paths by default", () => {
  const result = findHardcodedPaymentReceivers({
    files: [{ path: "data/records/x.mjs", content: "const to = '0x1234567890123456789012345678901234567890';" }]
  });
  assert.equal(result.status, "clean");
});

test("respects custom allowlist paths", () => {
  const result = findHardcodedPaymentReceivers({
    files: [{ path: "custom/path/x.mjs", content: "const to = '0x1234567890123456789012345678901234567890';" }],
    allowlistPaths: ["custom/path/"]
  });
  assert.equal(result.status, "clean");
});

test("throws when files array is missing", () => {
  assert.throws(() => findHardcodedPaymentReceivers({}), /files array is required/u);
});
