import { recordWitnessJournalBatch, relationalWitnessJournalDocument } from "@red-cup-engineering/witness-journal-document-service";
import { settlementWitnessGraphId } from "../../../scripts/x402-settlement-witness-identity.mjs";
import { settlementWitness } from "../../../src/offer.mjs";

import { catalog } from "./market.mjs";

/**
 * The market's durable settlement journal: one `afterSettle` for every
 * offer. Each facilitator report is matched by the kernel's witness to the
 * declared catalog entry (gateway, operation, sku) and appended to the
 * hired witness-journal document provider under the shared graph identity.
 * The same transaction-time witness is retained by Node and edge receiving,
 * including the owner tariff and separately observed payment/delivery state.
 * Never the buyer's request or computed result; no revenue or acceptance is
 * inferred from a facilitator report.
 */

export function createSettlementJournal(env = process.env, dependencies = {}) {
  const agentUrl = env.WITNESS_JOURNAL_DOCUMENT_AGENT;
  const settlementAccount = env.X402_SETTLEMENT_ACCOUNT || env.X402_PAY_TO;
  if (!agentUrl) throw new Error("WITNESS_JOURNAL_DOCUMENT_AGENT must name the hired witness-journal document provider's Agent Card");
  if (!settlementAccount) throw new Error("X402_SETTLEMENT_ACCOUNT or X402_PAY_TO must identify the settlement account");

  const record = dependencies.record ?? recordWitnessJournalBatch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const attribute = settlementWitness(dependencies.offers ?? catalog(), { env: {}, now, log: dependencies.log ?? (() => {}) });

  return async function appendSettlement(context) {
    const attribution = await attribute(context);
    if (!attribution.transaction || !attribution.network) throw new Error("settled x402 context omitted network or transaction");
    const graph = settlementWitnessGraphId({ network: attribution.network, transaction: attribution.transaction });
    const assertions = [
      ["urn:x402:network", attribution.network],
      ["urn:x402:transaction", attribution.transaction],
      ["urn:x402:payer", attribution.payer ?? "undisclosed"],
      ["urn:x402:amount", attribution.amount],
      ["urn:emsenn:market:gateway", attribution.gateway],
      ["urn:emsenn:market:operation", attribution.operation ?? "undeclared"],
      ["urn:emsenn:market:sku", attribution.sku ?? "undeclared"],
      ["urn:prov:generatedAtTime", attribution.recordedAt],
      ...(attribution.seller ? [["urn:emsenn:market:seller-enterprise", attribution.seller.enterprise]] : []),
      ...(attribution.book ? [["urn:emsenn:market:seller-account", attribution.book.account]] : []),
      ...(attribution.quotedAmountAtomic ? [["urn:x402:quoted-amount", attribution.quotedAmountAtomic]] : []),
    ].filter(([, value]) => value !== null && value !== undefined).map(([predicate, value]) => ({ subject: graph, predicate, object: { kind: "literal", value: String(value) } }));
    return record({
      agentUrl,
      batch: {
        settlement: settlementAccount,
        graph,
        recordedAt: attribution.recordedAt,
        document: relationalWitnessJournalDocument({
          // Retain the transaction-time declaration and exact workload quote.
          // A gateway is routing, not a seller; absent ownership stays absent.
          ...attribution,
          type: "X402SettlementWitness",
          payment: { network: attribution.network, transaction: attribution.transaction,
            payer: attribution.payer ?? null, amount: attribution.amount === null ? null : String(attribution.amount) },
          paymentPayload: JSON.parse(JSON.stringify(context.paymentPayload ?? null)),
          reportedSettlement: JSON.parse(JSON.stringify(context.result ?? null)),
          acceptedPaymentRequirements: JSON.parse(JSON.stringify(context.requirements ?? null)),
          independentlyVerifiedTransfer: false,
          requesterAccepted: null,
        }),
        assertions,
      },
    });
  };
}
