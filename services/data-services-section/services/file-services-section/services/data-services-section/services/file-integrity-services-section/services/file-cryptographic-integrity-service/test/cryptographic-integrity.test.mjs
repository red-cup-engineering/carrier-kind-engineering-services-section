import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex, timingSafeStringEqual } from "../src/index.mts";

test("recovered digest and constant-time equality operations remain stable", () => {
  assert.equal(sha256Hex("proof-path"), "aac5bb477e3e21450cc7a3869d61199fcf9f80a5679245a7cf34601520a5634a");
  assert.equal(timingSafeStringEqual("same", "same"), true);
  assert.equal(timingSafeStringEqual("same", "different"), false);
});
