import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const candidate = JSON.parse(readFileSync(
  new URL("../content/product-candidates/rendanheyi-business-philosophy-brief.json", import.meta.url),
  "utf8",
));

test("Rendanheyi is product inventory, not service law", () => {
  assert.equal(candidate.customerProduct.subject, "Rendanheyi as a business and management philosophy");
  assert.equal(candidate.seller, "urn:ame:topical-knowledge-cell-report-service");
  assert.equal(candidate.customerProduct.retailPrice.amountAtomic, "2000000");
  assert.equal(candidate.customerProduct.retailPrice.asset.symbol, "USDC");
  assert.equal(candidate.customerProduct.retailPrice.asset.network, "eip155:8453");
});

test("candidate cannot masquerade as a live cash product", () => {
  assert.equal(candidate.activationStatus, "candidate-not-for-sale");
  assert.equal(candidate.payoutAccount, null);
  assert.equal(candidate.cellManifest, null);
  assert.equal(candidate.notebookCustodyAssignment, null);
  assert.equal(candidate.unitEconomics.grossMarginAtomic, null);
  assert.ok(candidate.activationResidue.includes("authorized Base-mainnet payout account"));
  assert.ok(candidate.nonClaims.includes("a simulated settlement is not USDC"));
});

test("source material is exact demand on suppliers, not imported ambient content", () => {
  assert.equal(candidate.sourceDemand.length, 2);
  assert.ok(candidate.sourceDemand.every((item) => item.admittedReceipt === null));
  assert.match(candidate.sourceDemand[0].observedTreeDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(candidate.sourceDemand[1].observedContentDigest, /^sha256:[0-9a-f]{64}$/u);
});
