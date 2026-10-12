import assert from "node:assert/strict";
import test from "node:test";
import { assayPaymentRequirementSet, derivePaymentRequirementAssay, hasListedPaymentRequirementFailure } from "../src/payment-requirement-assay.mjs";
const row = { seller: "seller", url: "https://example.561.group/a", method: "GET", expectedAmountAtomicUsdc: "40000", network: "eip155:8453", assetUsdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a", listed: true };
const observation = { paymentRequired: { x402Version: 2, accepts: [{ network: row.network, asset: row.assetUsdc.toLowerCase(), amount: row.expectedAmountAtomicUsdc, payTo: row.payTo.toLowerCase() }] } };
test("matches only the declared network and asset", () => { assert.equal(derivePaymentRequirementAssay(row, { observation, latencyMs: 1 }).ok, true); assert.equal(derivePaymentRequirementAssay(row, { observation: { paymentRequired: { accepts: [{ ...observation.paymentRequired.accepts[0], asset: "0x0000000000000000000000000000000000000000" }] } }, latencyMs: 1 }).ok, false); });
test("refuses a matching asset on the wrong chain", async () => {
  const rows = await assayPaymentRequirementSet({ declaration: { rows: [row] }, network: "eip155:1", asset: row.assetUsdc, observe: async () => observation, now: () => 0 });
  assert.equal(rows[0].ok, false);
  assert.match(rows[0].reason, /expected network eip155:1/u);
});
test("assays declared GET and POST challenges without payment", async () => { let calls = 0; let postRequest; const rows = await assayPaymentRequirementSet({ declaration: { rows: [row, { ...row, method: "POST", body: { restingHr: 60 } }] }, observe: async (request) => { calls += 1; if (request.method === "POST") postRequest = request; return observation; }, now: () => 0 }); assert.equal(calls, 2); assert.equal(rows[0].ok, true); assert.equal(rows[1].ok, true); assert.deepEqual(postRequest, { resourceUrl: row.url, method: "POST", jsonBody: { restingHr: 60 } }); assert.equal(hasListedPaymentRequirementFailure({ rows: [row] }, [{ ok: false }]), true); });
