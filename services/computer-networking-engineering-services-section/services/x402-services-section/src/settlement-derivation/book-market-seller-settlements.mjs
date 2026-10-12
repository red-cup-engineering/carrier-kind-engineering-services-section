import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createR2RestClient, r2RestConfiguration } from "@red-cup-engineering/cloudflare-r2-services-section/r2-rest";
import { BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS, createPublicEvmReadPool } from "@red-cup-engineering/ethereum-engineering-services-section/public-evm-read";
import { settlementWitnessGraphId } from "../../scripts/x402-settlement-witness-identity.mjs";
import { BASE_USDC } from "../market-observation/settlement.mjs";
import { declareCatalog, offerRequestPricingFromBytes } from "../offer.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const NETWORK = "eip155:8453";
const TX = /^0x[\da-f]{64}$/iu;
const ADDRESS = /^0x[\da-f]{40}$/iu;
const MAX_WITNESSES = 10_000, MAX_WITNESS_BYTES = 65_536, MAX_RECEIPT_BYTES = 1_048_576;

async function receiptJson(response) {
  if (!response.ok) throw new Error("receipt-provider-http-refusal");
  if (response.body) {
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > MAX_RECEIPT_BYTES) throw new Error("receipt-provider-byte-limit");
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  const value = await response.json();
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_RECEIPT_BYTES) throw new Error("receipt-provider-byte-limit");
  return value;
}

function loadR2Environment(environment) {
  const loaded = { ...environment };
  // Local daily invocation may not be launched from a shell with the credential file loaded.
  // Read only the R2 connection variables; never emit the file or their values. A released node
  // carries no credentials: use only its explicitly configured credential path or
  // configured source root. Importing the module never discovers a laptop workspace.
  try {
    const secretFile = environment.X402_SECRETS_FILE ?? (environment.METROPLAT_REPOSITORY_ROOT ? join(environment.METROPLAT_REPOSITORY_ROOT, ".env") : null);
    if (!secretFile) return loaded;
    const envText = readFileSync(secretFile, "utf8");
    for (const name of ["API_KEY_CLOUDFLARE_R2_EDIT", "CLOUDFLARE_ACCOUNT_ID", "X402_PAY_TO", "X402_ASSET", "X402_NETWORK"]) {
      if (!loaded[name]) {
        const match = envText.match(new RegExp(`^${name}=(.*)$`, "mu"));
        if (match) loaded[name] = match[1].replace(/^['"]|['"]$/gu, "");
      }
    }
  } catch { /* Missing local secret material means no booking this cycle. */ }
  return loaded;
}

function addressTopic(value) { return `0x${"0".repeat(24)}${value.slice(2).toLowerCase()}`; }
function integerValue(value) { if (typeof value !== "string" || !/^(?:0x[\da-f]+|[0-9]+)$/iu.test(value)) throw new TypeError("invalid integer in chain evidence"); return BigInt(value); }
function parseTransferLogs(receipt, witness) {
  if (!Array.isArray(receipt?.logs)) return [];
  return receipt.logs.filter((log) => log?.address?.toLowerCase() === witness.asset.toLowerCase()
    && log?.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC
    && log?.topics?.[1]?.toLowerCase() === addressTopic(witness.payer)
    && log?.topics?.[2]?.toLowerCase() === addressTopic(witness.payTo)
    && /^0x[\da-f]{64}$/iu.test(log?.data ?? "")
    && BigInt(log.data).toString() === witness.amount);
}

/** Validate a seller record against two provider reads of the actual Base receipt. */
export async function confirmSellerWitness(witness, { readReceipt }) {
  const refuse = (reason) => ({ ok: false, reason, transaction: witness?.transaction ?? null });
  if (!witness || witness.network !== NETWORK || !TX.test(witness.transaction ?? "") || !ADDRESS.test(witness.payer ?? "")
    || !ADDRESS.test(witness.payTo ?? "") || witness.asset?.toLowerCase() !== BASE_USDC.toLowerCase()
    || !/^[1-9][0-9]*$/u.test(witness.amount ?? "") || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u.test(witness.recordedAt ?? "")) return refuse("invalid-witness-fields");
  const expectedId = settlementWitnessGraphId({ network: witness.network, transaction: witness.transaction });
  if (witness.witnessId !== expectedId) return refuse("witness-id-mismatch");
  let offer = null, attributionReason = null;
  if (witness.version !== 2 || !witness.offerDeclaration || typeof witness.method !== "string" || typeof witness.ledgerAccount !== "string") {
    attributionReason = "seller-offer-snapshot-required";
  } else {
    try {
      [offer] = declareCatalog([witness.offerDeclaration]);
      if (offer.declaration.gateway !== witness.gateway || offer.declaration.operation !== witness.operation
          || offer.declaration.route !== witness.route || offer.declaration.method !== witness.method || offer.sku !== witness.sku
          || offer.ledgerAccount !== witness.ledgerAccount) throw new TypeError("seller-offer-snapshot-identity-mismatch");
      const pricing = offerRequestPricingFromBytes(offer.declaration, witness.pricingBasis?.canonicalInputBytes);
      if (pricing.amountAtomic !== witness.amount || (offer.declaration.requestPricing &&
          (canonicalJson(pricing) !== canonicalJson(witness.pricingBasis) || witness.quotedAmountAtomic !== pricing.amountAtomic))) {
        throw new TypeError("seller-price-does-not-match-transaction-time-tariff");
      }
      if (offer.declaration.seller && (canonicalJson(offer.declaration.seller) !== canonicalJson(witness.seller) ||
          witness.book?.enterprise !== offer.declaration.seller.enterprise || witness.book?.account !== offer.ledgerAccount)) {
        throw new TypeError("seller-book-snapshot-identity-mismatch");
      }
      if (!offer.declaration.seller) attributionReason = "commercial-seller-unresolved";
    } catch (error) { offer = null; attributionReason = error.message; }
  }
  const receipts = await readReceipt(witness.transaction);
  if (!Array.isArray(receipts) || receipts.length < 2) return refuse("two-provider-receipts-required");
  const [a, b] = receipts;
  const stable = (r) => JSON.stringify({ transactionHash: r?.transactionHash?.toLowerCase(), blockHash: r?.blockHash?.toLowerCase(), blockNumber: r?.blockNumber, status: r?.status, logs: parseTransferLogs(r, witness).map((log) => ({ address: log.address.toLowerCase(), topics: log.topics.map((topic) => topic.toLowerCase()), data: log.data.toLowerCase(), logIndex: log.logIndex })) });
  if (!a || !b || stable(a) !== stable(b) || a.transactionHash?.toLowerCase() !== witness.transaction.toLowerCase() || a.status !== "0x1"
    || !TX.test(a.blockHash ?? "") || !/^0x[\da-f]+$/iu.test(a.blockNumber ?? "")) return refuse("receipt-provider-disagreement-or-failed-transaction");
  const transfers = parseTransferLogs(a, witness);
  if (transfers.length !== 1) return refuse("receipt-must-contain-exactly-one-matching-usdc-transfer");
  return { ok: true, paymentConfirmed: true, offer, attributionReason, receipt: a, transfer: transfers[0] };

}

const ATOMIC_DECIMALS = 6n;
/** A Base USDC amount in atomic units (6 decimals) as exact decimal text. */
export function usdcOfAtomic(atomic) {
  const value = BigInt(atomic);
  const whole = value / 10n ** ATOMIC_DECIMALS;
  const fraction = (value % 10n ** ATOMIC_DECIMALS).toString().padStart(Number(ATOMIC_DECIMALS), "0").replace(/0+$/u, "");
  return fraction === "" ? whole.toString() : `${whole}.${fraction}`;
}

/** The settlement's one identity across stores: network, asset, receiver, transaction and the transfer's log index. */
export function sellerSettlementSourceId(settlement) {
  return `evm:${NETWORK}:${settlement.asset.toLowerCase()}:${settlement.receiver.toLowerCase()}:${settlement.transactionHash.toLowerCase()}:${BigInt(settlement.logIndex).toString()}`;
}

/** Read private seller claims and independently corroborate cash. A transfer is not
 * delivery, acceptance or revenue. Transaction-time attribution may remain unresolved;
 * current catalogue entries never rewrite an old sale's owner or price. */
export async function corroborateMarketSellerSettlements({ environment = process.env, now = () => new Date(), client, fetchImpl = fetch, readReceipt, readBlockHeader } = {}) {
  const observedAt = now().toISOString();
  const summary = { type: "X402SellerCorroboration", version: 3, observedAt, state: "unavailable", witnessCount: 0, receiptVerifiedCount: 0, confirmedCount: 0, attributionRefusedCount: 0, refusedCount: 0, refusals: [], settlements: [] };
  try {
    const env = loadR2Environment(environment);
    if (!client) {
      if (!env.API_KEY_CLOUDFLARE_R2_EDIT || !env.CLOUDFLARE_ACCOUNT_ID) throw new Error("R2 credentials unavailable");
      client = createR2RestClient({ ...r2RestConfiguration({ ...env, CLOUDFLARE_R2_BUCKET: "market-561-group-settlements" }), bucket: "market-561-group-settlements" });
    }
    let keys = [], cursor; const cursors = new Set();
    do {
      if (cursors.size >= 100 || cursors.has(cursor ?? "")) throw new Error("seller-witness-pagination-incomplete");
      cursors.add(cursor ?? "");
      const page = await client.list("settlements/", cursor);
      keys.push(...page.keys.filter((key) => /^settlements\/eip155:8453\/0x[\da-f]{64}\.json$/iu.test(key)));
      if (keys.length > MAX_WITNESSES) throw new Error("seller-witness-observation-limit");
      cursor = page.continuationToken;
    } while (cursor);
    keys = [...new Set(keys)];
    summary.witnessCount = keys.length;
    if (keys.length === 0) summary.state = "current-empty";
    else {
      const pool = readReceipt && readBlockHeader ? null : createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN, providers: BASE_PUBLIC_EVM_PROVIDERS });
      let receiptProviderIds = [];
      const receiptReader = readReceipt ?? (async (hash) => {
        // A transaction receipt has no block argument, so it cannot use the
        // pool's fixed-block request adapter. Its containing canonical block
        // and chain are independently verified by the public read pool below.
        const observations = await Promise.all(BASE_PUBLIC_EVM_PROVIDERS.map(async (provider) => {
          try {
            const response = await fetchImpl(provider.url, {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash] }),
              signal: AbortSignal.timeout(10_000),
            });
            const result = await receiptJson(response);
            return response.ok && !result.error && Object.hasOwn(result, "result") && result.result !== null
              ? { providerId: provider.id, receipt: result.result } : null;
          } catch { return null; }
        }));
        const confirmed = observations.filter(Boolean).slice(0, 2);
        receiptProviderIds = confirmed.map((value) => value.providerId);
        return confirmed.map((value) => value.receipt);
      });
      for (const key of keys) {
        try {
          const object = await client.get(key);
          if (!object) { summary.refusals.push({ key, reason: "witness-disappeared" }); continue; }
          if (object.body.byteLength > MAX_WITNESS_BYTES) throw new Error("seller-witness-byte-limit");
          const witness = JSON.parse(Buffer.from(object.body).toString("utf8"));
          const checked = await confirmSellerWitness(witness, { readReceipt: receiptReader });
          if (!checked.ok) { summary.refusals.push({ key, reason: checked.reason }); continue; }
          const logIndex = checked.transfer.logIndex;
          const headerProviders = readBlockHeader ? [] : receiptProviderIds;
          const headers = readBlockHeader ? await readBlockHeader(checked.receipt.blockHash) : await Promise.all(headerProviders.map(async (providerId) => {
            const result = await pool.readBlockHeader({ block: { blockNumber: BigInt(checked.receipt.blockNumber) }, providerIds: [providerId] });
            return result.value;
          }));
          const [headerA, headerB] = headers;
          if (!headerA || !headerB || !/^0x[\da-f]{64}$/iu.test(headerA.blockHash ?? "") || !/^0x[\da-f]{64}$/iu.test(headerB.blockHash ?? "")
            || !/^(?:0x[\da-f]+|[0-9]+)$/iu.test(headerA.blockNumber ?? "") || !/^(?:0x[\da-f]+|[0-9]+)$/iu.test(headerB.blockNumber ?? "")
            || !/^(?:0x[\da-f]+|[0-9]+)$/iu.test(headerA.blockTimestamp ?? "") || !/^(?:0x[\da-f]+|[0-9]+)$/iu.test(headerB.blockTimestamp ?? "")
            || headerA.blockHash?.toLowerCase() !== headerB.blockHash?.toLowerCase() || headerA.blockHash?.toLowerCase() !== checked.receipt.blockHash.toLowerCase()
            || integerValue(headerA.blockNumber) !== integerValue(headerB.blockNumber) || integerValue(headerA.blockNumber) !== integerValue(checked.receipt.blockNumber)
            || headerA.blockTimestamp !== headerB.blockTimestamp || typeof headerA.blockTimestamp !== "string") { summary.refusals.push({ key, reason: "block-header-provider-disagreement" }); continue; }
          const blockTime = new Date(Number(integerValue(headerA.blockTimestamp)) * 1000).toISOString();
          summary.receiptVerifiedCount += 1;
          const declaration = checked.offer?.declaration;
          const seller = checked.attributionReason === null ? declaration?.seller ?? null : null;
          if (!seller) summary.attributionRefusedCount += 1;
          summary.confirmedCount += 1;
          const settlement = {
            transactionHash: witness.transaction.toLowerCase(), logIndex: BigInt(logIndex).toString(), network: witness.network,
            asset: witness.asset.toLowerCase(), payer: witness.payer.toLowerCase(), receiver: witness.payTo.toLowerCase(),
            amount: witness.amount, amountUsdc: usdcOfAtomic(witness.amount), blockTime,
            gateway: witness.gateway, operation: witness.operation, route: witness.route, ...(typeof witness.method === "string" ? { method: witness.method } : {}), sku: witness.sku,
            section: declaration?.section ?? null, ledgerAccount: checked.offer?.ledgerAccount ?? null,
            seller, book: seller ? { enterprise: seller.enterprise, account: checked.offer.ledgerAccount } : null,
            attribution: seller ? "transaction-time-snapshot" : "unresolved", attributionReason: checked.attributionReason,
            paymentConfirmed: true, revenueRecognized: false, requesterAccepted: null,
            quotedAmountAtomic: witness.quotedAmountAtomic ?? null, pricingBasis: witness.pricingBasis ?? null,
            deliveryObservation: witness.deliveryObservation ?? null,
            witnessId: witness.witnessId, evidenceId: `evm:${NETWORK}:tx:${witness.transaction.toLowerCase()}`,
          };
          summary.settlements.push(Object.freeze({ ...settlement, sourceId: sellerSettlementSourceId(settlement) }));
        } catch (error) { summary.refusals.push({ key, reason: error instanceof Error ? error.message : String(error) }); }
      }
      summary.state = summary.refusals.length ? (summary.confirmedCount ? "partially-corroborated" : "records-refused") : "current";
    }
  } catch (error) {
    summary.state = "unavailable";
    summary.refusals.push({ reason: error instanceof Error ? error.message : String(error) });
  }
  summary.refusedCount = summary.refusals.length;
  return Object.freeze(summary);
}
