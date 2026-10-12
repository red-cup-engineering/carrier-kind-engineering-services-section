import assert from "node:assert/strict";
import test from "node:test";

import { VerifyError, SettleError } from "@x402/core/types";

import { assayX402Facilitator } from "../src/facilitator-assay.mjs";

const NETWORK = "eip155:8453";
const SIGNER = "0xc6699d2aaDA6c36Dfea5C248DD70f9CB0235cB63";

function payaiShapedClient({ verifyOutcome, settleOutcome, recipientMismatchOutcome } = {}) {
  return {
    async getSupported() {
      return {
        kinds: [
          { x402Version: 1, scheme: "exact", network: "base" },
          { x402Version: 2, scheme: "exact", network: NETWORK },
        ],
        extensions: ["bazaar"],
        signers: { "eip155:*": [SIGNER] },
      };
    },
    async verify(payload) {
      const outcome = payload?.accepted !== undefined ? recipientMismatchOutcome : verifyOutcome;
      if (outcome?.throw) throw outcome.throw;
      return outcome ?? { isValid: false, invalidReason: "invalid_payment_requirements" };
    },
    async settle() {
      if (settleOutcome?.throw) throw settleOutcome.throw;
      return settleOutcome ?? { success: false, errorReason: "invalid_payment_requirements", transaction: "", network: NETWORK };
    },
  };
}

function rpcFetch({ code = "0x", balance = "0x0", nonce = "0x0" } = {}) {
  return async (_url, init) => {
    const batch = JSON.parse(init.body);
    const byMethod = { eth_getCode: code, eth_getBalance: balance, eth_getTransactionCount: nonce };
    const results = batch.map((entry) => ({ id: entry.id, result: byMethod[entry.method] }));
    return new Response(JSON.stringify(results), { status: 200 });
  };
}

test("qualifies a facilitator that declares the required kind and refuses malformed payloads in protocol shape", async () => {
  const client = payaiShapedClient({
    verifyOutcome: { throw: new VerifyError(400, { invalidReason: "invalid_payment_requirements" }) },
    settleOutcome: { throw: new SettleError(400, { errorReason: "invalid_payment_requirements" }) },
    recipientMismatchOutcome: { throw: new VerifyError(200, { invalidReason: "invalid_exact_evm_signature" }) },
  });
  const result = await assayX402Facilitator({
    facilitatorUrl: "https://facilitator.example",
    network: NETWORK,
    fetchImpl: rpcFetch(),
    clientFactory: () => client,
  });
  assert.equal(result.qualified, true);
  assert.deepEqual(result.problems, []);
  assert.equal(result.supported.hasRequiredKind, true);
  assert.equal(result.malformedVerify.conformant, true);
  assert.equal(result.malformedSettle.conformant, true);
  assert.equal(result.recipientMismatchVerify.critical, false);
  assert.equal(result.signerReputation[0].address, SIGNER);
  assert.equal(result.signerReputation[0].isContract, false);
});

test("disqualifies a facilitator whose /supported omits the required v2 exact kind", async () => {
  const client = payaiShapedClient();
  client.getSupported = async () => ({
    kinds: [{ x402Version: 1, scheme: "exact", network: "base" }],
    extensions: [],
    signers: {},
  });
  const result = await assayX402Facilitator({
    facilitatorUrl: "https://facilitator.example",
    network: NETWORK,
    fetchImpl: rpcFetch(),
    clientFactory: () => client,
  });
  assert.equal(result.qualified, false);
  assert.equal(result.supported.hasRequiredKind, false);
  assert.match(result.problems.join(";"), /does not declare/u);
});

test("disqualifies a facilitator that crashes on a malformed payload instead of refusing it structurally", async () => {
  const client = payaiShapedClient({
    verifyOutcome: { throw: new Error("Facilitator verify failed (500): <!DOCTYPE html>...") },
    settleOutcome: { throw: new Error("Facilitator settle failed (500): <!DOCTYPE html>...") },
    recipientMismatchOutcome: { throw: new VerifyError(200, { invalidReason: "invalid_exact_evm_signature" }) },
  });
  const result = await assayX402Facilitator({
    facilitatorUrl: "https://facilitator.example",
    network: NETWORK,
    fetchImpl: rpcFetch(),
    clientFactory: () => client,
  });
  assert.equal(result.qualified, false);
  assert.equal(result.malformedVerify.conformant, false);
  assert.equal(result.malformedVerify.mode, "unstructured-failure");
  assert.equal(result.malformedSettle.conformant, false);
});

test("flags a critical exact-scheme boundary violation when the facilitator would accept a recipient-mismatched probe", async () => {
  const client = payaiShapedClient({
    verifyOutcome: { throw: new VerifyError(400, { invalidReason: "invalid_payment_requirements" }) },
    settleOutcome: { throw: new SettleError(400, { errorReason: "invalid_payment_requirements" }) },
    recipientMismatchOutcome: { isValid: true, payer: "0x000000000000000000000000000000000000dEaD" },
  });
  const result = await assayX402Facilitator({
    facilitatorUrl: "https://facilitator.example",
    network: NETWORK,
    fetchImpl: rpcFetch(),
    clientFactory: () => client,
  });
  assert.equal(result.qualified, false);
  assert.equal(result.recipientMismatchVerify.critical, true);
  assert.match(result.problems.join(";"), /exact-scheme boundary violation/u);
});

test("reports a signer that is a deployed contract from the RPC batch", async () => {
  const client = payaiShapedClient({
    verifyOutcome: { throw: new VerifyError(400, { invalidReason: "invalid_payment_requirements" }) },
    settleOutcome: { throw: new SettleError(400, { errorReason: "invalid_payment_requirements" }) },
    recipientMismatchOutcome: { throw: new VerifyError(200, { invalidReason: "invalid_exact_evm_signature" }) },
  });
  const result = await assayX402Facilitator({
    facilitatorUrl: "https://facilitator.example",
    network: NETWORK,
    fetchImpl: rpcFetch({ code: "0x6080604052", balance: "0x2386f26fc10000", nonce: "0x5" }),
    clientFactory: () => client,
  });
  assert.equal(result.signerReputation[0].isContract, true);
  assert.equal(result.signerReputation[0].transactionCount, 5);
  assert.equal(result.signerReputation[0].basescanUrl, `https://basescan.org/address/${SIGNER}`);
});

test("refuses a non-HTTPS facilitator URL and a non-CAIP-2 network before probing", async () => {
  await assert.rejects(assayX402Facilitator({ facilitatorUrl: "http://facilitator.example" }), /credential-free HTTPS/u);
  await assert.rejects(
    assayX402Facilitator({ facilitatorUrl: "https://facilitator.example", network: "base" }),
    /CAIP-2/u,
  );
});
