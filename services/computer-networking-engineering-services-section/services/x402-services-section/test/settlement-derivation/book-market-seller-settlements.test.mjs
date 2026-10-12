import assert from "node:assert/strict";
import test from "node:test";
import { COMPILED_DECLARATIONS as declarations } from "../../apps/market-561-group/src/compiled-offers.mjs";
import { declareCatalog } from "../../src/offer.mjs";
import { corroborateMarketSellerSettlements, usdcOfAtomic } from "../../src/settlement-derivation/book-market-seller-settlements.mjs";
import { settlementWitnessGraphId } from "../../scripts/x402-settlement-witness-identity.mjs";
import { BASE_PUBLIC_EVM_PROVIDERS } from "@red-cup-engineering/ethereum-engineering-services-section/public-evm-read";

const NETWORK = "eip155:8453";
const ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TX = `0x${"ab".repeat(32)}`;
const PAYER = `0x${"12".repeat(20)}`;
const PAY_TO = `0x${"34".repeat(20)}`;
const topic = (address) => `0x${"0".repeat(24)}${address.slice(2)}`;

function fixture({ disagree = false } = {}) {
  const offer = declareCatalog(declarations).find((entry) => !entry.declaration.route.includes("{"));
  const amount = String(offer.amount);
  const witness = {
    version: 2, network: NETWORK, transaction: TX, payer: PAYER, payTo: PAY_TO, asset: ASSET, amount,
    recordedAt: "2026-09-26T12:00:00Z", gateway: offer.declaration.gateway,
    route: offer.declaration.route, method: offer.declaration.method,
    operation: offer.declaration.operation, sku: offer.sku,
    ledgerAccount: offer.ledgerAccount, offerDeclaration: offer.declaration,
    witnessId: settlementWitnessGraphId({ network: NETWORK, transaction: TX }),
  };
  const receipt = {
    transactionHash: TX, blockHash: `0x${"cd".repeat(32)}`, blockNumber: "0x1", status: "0x1",
    logs: [{ address: ASSET, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", topic(PAYER), topic(PAY_TO)], data: `0x${BigInt(amount).toString(16).padStart(64, "0")}`, logIndex: "0x0" }],
  };
  const encodedTerms = Buffer.from(JSON.stringify({ accepts: [{ scheme: "exact", network: NETWORK, asset: ASSET, payTo: PAY_TO }] })).toString("base64");
  const marketProbes = [];
  const fetchFixture = async (url, init = {}) => {
    if (String(url).startsWith("https://market.561.group/")) { marketProbes.push(url); return { status: 402, headers: { get: () => encodedTerms } }; }
    const request = JSON.parse(init.body);
    assert.equal(request.method, "eth_getTransactionReceipt");
    const result = disagree && url === BASE_PUBLIC_EVM_PROVIDERS[1].url ? { ...receipt, blockHash: `0x${"ef".repeat(32)}` } : receipt;
    return { ok: true, async json() { return { jsonrpc: "2.0", id: request.id, result }; } };
  };
  const client = {
    async list() { return { keys: [`settlements/${NETWORK}/${TX}.json`] }; },
    async get() { return { body: Buffer.from(JSON.stringify(witness)) }; },
  };
  return {
    offer, witness, receipt,
    marketProbes,
    options: {
      client, fetchImpl: fetchFixture,
      readBlockHeader: async () => [0, 1].map(() => ({ blockHash: receipt.blockHash, blockNumber: "1", blockTimestamp: "1790424000" })),
      environment: {}, now: () => new Date("2026-09-26T12:00:00Z"),
    },
  };
}

test("corroboration returns each settlement two providers agree on, attributed by its offer snapshot, and writes nothing", async () => {
  const f = fixture();
  const result = await corroborateMarketSellerSettlements(f.options);
  assert.equal(result.type, "X402SellerCorroboration");
  assert.equal(result.state, "current");
  assert.equal(result.confirmedCount, 1);
  assert.deepEqual(f.marketProbes, []);
  const [settlement] = result.settlements;
  assert.equal(settlement.attribution, "unresolved");
  assert.equal(settlement.attributionReason, "commercial-seller-unresolved");
  assert.equal(settlement.paymentConfirmed, true);
  assert.equal(settlement.requesterAccepted, null);
  assert.equal(settlement.revenueRecognized, false);
  assert.equal(settlement.payer, PAYER);
  assert.equal(settlement.sku, f.offer.sku);
  assert.equal(settlement.ledgerAccount, f.offer.ledgerAccount);
  assert.equal(settlement.amountUsdc, usdcOfAtomic(f.witness.amount));
  assert.equal(settlement.blockTime, "2026-09-26T12:00:00.000Z");
  assert.match(settlement.sourceId, /^evm:eip155:8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913:/u);
});

test("a legacy witness retains cash but cannot borrow ownership from the current catalog", async () => {
  const legacy = fixture();
  delete legacy.witness.offerDeclaration;
  const result = await corroborateMarketSellerSettlements(legacy.options);
  assert.equal(result.attributionRefusedCount, 1);
  assert.equal(result.settlements[0].attribution, "unresolved");
  assert.equal(result.settlements[0].ledgerAccount, null);
  assert.equal(result.settlements[0].paymentConfirmed, true);
});

test("a cash amount absent from the actual transfer or disagreeing providers is refused", async () => {
  const mismatch = fixture();
  mismatch.witness.amount = String(BigInt(mismatch.witness.amount) + 1n);
  const refused = await corroborateMarketSellerSettlements(mismatch.options);
  assert.equal(refused.settlements.length, 0);
  assert.ok(refused.refusals.some((item) => item.reason === "receipt-must-contain-exactly-one-matching-usdc-transfer"));
  const disagreement = fixture({ disagree: true });
  const refusedProvider = await corroborateMarketSellerSettlements(disagreement.options);
  assert.equal(refusedProvider.settlements.length, 0);
  assert.ok(refusedProvider.refusals.some((item) => item.reason === "receipt-provider-disagreement-or-failed-transaction"));
});

test("Base USDC atomic units read as exact decimal text", () => {
  assert.equal(usdcOfAtomic("10000"), "0.01");
  assert.equal(usdcOfAtomic("1000"), "0.001");
  assert.equal(usdcOfAtomic("2500000"), "2.5");
  assert.equal(usdcOfAtomic("3000000"), "3");
});
