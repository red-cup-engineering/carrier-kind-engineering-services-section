#!/usr/bin/env node
import { settlementWitnessGraphId } from "../../scripts/x402-settlement-witness-identity.mjs";
import { parseDecimal } from "@red-cup-engineering/computer-data-engineering-services-section/number/decimal-string";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-operation-engineering-services-section/operation";

const RESOURCE_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TRANSFER_FIELDS = ["from", "to", "amount", "asset", "memo", "block", "transactionId", "timestamp"];

function fail(message) {
  throw new TypeError(`settle-hbd-purchase: ${message}`);
}

function renderTransaction(date, narration, postings) {
  const lines = [`${date} * "${narration}"`];
  for (const posting of postings) lines.push(`  ${posting.account}  ${posting.amount} ${posting.commodity}`);
  return `${lines.join("\n")}\n`;
}

// Beancount requires every account-path component to begin with a capital letter or digit
// (verified empirically against bean-check 3.2.3); this capitalizes only the first character
// of a dynamic segment (sellerAccount, resourceId) for the account path, leaving hyphens and
// the rest of the value untouched, and leaving the raw lowercase value itself unchanged
// everywhere else in the returned record.
function capitalizeAccountComponent(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

/**
 * Settles one verified hbd-transfer x402 payment into a witness record and a Beancount double-entry transaction directive with capitalized account-path components, reusing the house settlement-witness identity and exact-decimal primitives; performs no filesystem or network access itself, leaving the actual journal write to its caller.
 * @param {object} request A record with `verification` (a verified HbdPaymentVerification record), `resource` ({id, price}), `sellerAccount`, and `date` (YYYY-MM-DD).
 * @returns {object} An HbdPurchaseSettlement record: type, version, witnessRecord, beancount ({date, narration, postings, text}).
 * @throws {TypeError} When the verification is not verified, a required transfer field is missing, the price or seller does not match the verified transfer, or `resource.id`/`date` is malformed.
 */
export function settleHbdPurchase(request) {
  const verification = request?.verification;
  if (verification?.status !== "verified") fail("verification.status must be verified");
  const transfer = verification.transfer;
  for (const field of TRANSFER_FIELDS) {
    if (transfer?.[field] === undefined || transfer[field] === null) fail(`verification.transfer.${field} is required`);
  }
  const resource = request?.resource;
  if (typeof resource?.id !== "string" || !RESOURCE_ID_PATTERN.test(resource.id)) fail("resource.id must match ^[a-z][a-z0-9-]{2,63}$");
  parseDecimal(resource?.price ?? fail("resource.price is required"));
  if (resource.price !== transfer.amount) fail("resource.price must exactly equal verification.transfer.amount");
  if (typeof request?.sellerAccount !== "string" || request.sellerAccount !== transfer.to) fail("sellerAccount must exactly equal verification.transfer.to");
  if (typeof request?.date !== "string" || !DATE_PATTERN.test(request.date)) fail("date must match ^\\d{4}-\\d{2}-\\d{2}$");
  const { sellerAccount, date } = request;
  const network = "hive:mainnet";
  const graphId = settlementWitnessGraphId({ network, transaction: transfer.transactionId });
  const assetAccount = `Assets:Hive:HBD:${capitalizeAccountComponent(sellerAccount)}`;
  const incomeAccount = `Income:Sales:X402:${capitalizeAccountComponent(resource.id)}`;
  const narration = `x402 hbd-transfer sale: ${resource.id} to ${transfer.from}`;
  const postings = [
    { account: assetAccount, amount: resource.price, commodity: transfer.asset },
    { account: incomeAccount, amount: `-${resource.price}`, commodity: transfer.asset },
  ];
  return {
    type: "HbdPurchaseSettlement",
    version: 1,
    witnessRecord: {
      type: "HbdPurchaseSettlementWitness",
      version: 1,
      graphId,
      network,
      transaction: transfer.transactionId,
      resourceId: resource.id,
      sellerAccount,
      buyerAccount: transfer.from,
      amount: resource.price,
      asset: transfer.asset,
      memo: transfer.memo,
      block: transfer.block,
      settledAt: date,
    },
    beancount: { date, narration, postings, text: renderTransaction(date, narration, postings) },
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "settle-hbd-purchase", description: "Settles one verified hbd-transfer x402 payment into a witness record and a Beancount double-entry transaction directive with capitalized account-path components, reusing the house settlement-witness identity and exact-decimal primitives; performs no filesystem or network access itself, leaving the actual journal write to its caller.", operation: settleHbdPurchase }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
