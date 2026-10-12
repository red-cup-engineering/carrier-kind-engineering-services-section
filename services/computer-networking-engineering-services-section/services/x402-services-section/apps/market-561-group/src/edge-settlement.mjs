import { settlementWitness } from "../../../src/offer.mjs";

/** Persist one settlement's offer attribution in the edge market's private R2 bucket. */
export function edgeSettlementJournal(offers, env, { now, log = line => console.log(line) } = {}) {
  const witness = settlementWitness(offers, { env, log, ...(now ? { now } : {}) });
  return async function afterSettle(context) {
    if (context?.result?.success !== true) {
      log(JSON.stringify({ event: "market.x402-settlement-refused", network: context?.result?.network ?? null, transaction: context?.result?.transaction ?? null, reason: context?.result?.errorReason ?? "facilitator did not report successful settlement" }));
      return null;
    }
    const record = await witness(context);
    if (!env.MARKET_SETTLEMENTS) {
      log(JSON.stringify({ event: "market.x402-settlement-store-refused", reason: "MARKET_SETTLEMENTS is unbound" }));
      return record;
    }
    if (!/^eip155:[1-9][0-9]*$/u.test(record.network ?? "") || !/^0x[0-9a-f]{64}$/iu.test(record.transaction ?? "")) {
      log(JSON.stringify({ event: "market.x402-settlement-store-refused", reason: "settlement has no EVM transaction identity" }));
      return record;
    }
    const key = `settlements/${record.network}/${record.transaction.toLowerCase()}.json`;
    try {
      // If the facilitator retries a transaction, preserve its first witness.
      await env.MARKET_SETTLEMENTS.put(key, JSON.stringify(record), {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: { contentType: "application/json" },
      });
    } catch (error) {
      // The buyer's settled payment and result remain valid if storage fails.
      log(JSON.stringify({ event: "market.x402-settlement-store-refused", reason: error instanceof Error ? error.message : String(error), witnessId: record.witnessId ?? null }));
    }
    return record;
  };
}
