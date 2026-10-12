#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentResponseHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { derive402indexRegistrations } from "./derive-402index-registrations.mjs";

const BAZAAR = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources";
const NETWORK = "eip155:8453";
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
// The Group wallet that buys (ANOTHER_EVM_WALLET index 1) and the market payout it buys from:
// a seeding purchase moves USDC between the Group's own custody and nothing else.
const PAYER = "0x42f72c0a340a4a55c082fe42483e87691d2bff64";
const PAYOUT = "0x32886f6f361c1d570255c2762967a2e41d0e9b1a";

/**
 * Seed the x402 Bazaar with the market's edge offers. The CDP facilitator catalogs a route in
 * its discovery listing only once it has settled a payment for that route, so an offer nobody has
 * bought yet is invisible to every agent that discovers sellers there. For each sellable edge
 * offer (the edge face settles through CDP; the Node face does not) absent from the listing, this
 * buys it once from the Group wallet, cheapest first, refusing any challenge that does not pay the
 * market's own payout in Base USDC and stopping at the run's cap. A dry run buys nothing.
 * Usage: seed-bazaar-listings [--dry-run] [--cap-usd 0.50] [--per-call-usd 0.05]
 */
export async function seedBazaarListings({ environment = process.env, fetch = globalThis.fetch, now = () => new Date().toISOString(), dryRun = false, capUsd = 0.5, perCallUsd = 0.05 } = {}) {
  const listed = await readBazaarResources(fetch);
  const missing = derive402indexRegistrations({ runtime: "edge" })
    .filter((registration) => !listed.has(registration.url))
    .sort((left, right) => left.price_usd - right.price_usd);
  const account = dryRun ? undefined : groupWallet(environment.ANOTHER_EVM_WALLET);
  const cap = atomic(capUsd);
  const perCall = atomic(perCallUsd);
  let spent = 0n;
  const purchases = [];
  const skipped = [];
  for (const registration of missing) {
    const amount = atomic(registration.price_usd);
    if (amount > perCall) { skipped.push({ url: registration.url, price_usd: registration.price_usd, reason: "above the per-call cap" }); continue; }
    if (spent + amount > cap) { skipped.push({ url: registration.url, price_usd: registration.price_usd, reason: "above the run's remaining cap" }); continue; }
    if (dryRun) { purchases.push({ url: registration.url, price_usd: registration.price_usd, dryRun: true }); spent += amount; continue; }
    // One route's failure is that route's row, never the run's: the receipt names every payment made.
    const purchase = await buyOnce(fetch, account, registration, amount)
      .catch((error) => ({ url: registration.url, status: "unreachable", error: error instanceof Error ? `${error.message}${error.cause ? `: ${error.cause.message ?? error.cause}` : ""}` : String(error) }));
    purchases.push(purchase);
    if (purchase.status === 200) spent += BigInt(purchase.amount);
  }
  return Object.freeze({
    recordType: "561-group.x402-market-bazaar-seeding-receipt",
    observedAt: now(),
    bazaar: BAZAAR,
    payer: PAYER,
    payTo: PAYOUT,
    dryRun,
    capUsd,
    perCallUsd,
    summary: { listed: listed.size, missing: missing.length, bought: purchases.filter((entry) => entry.status === 200 || entry.dryRun).length, skipped: skipped.length, spentUsd: Number(spent) / 1e6 },
    purchases,
    skipped,
  });
}

/** Write a seeding receipt beside the market's other listing receipts. */
export async function writeSeedingReceipt(receipt, { directory = process.env.X402_INDEX_RECEIPTS ?? join(homedir(), ".local", "state", "561-group", "x402-market", "bazaar") } = {}) {
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${receipt.observedAt.replace(/[:.]/gu, "-")}-bazaar-seeding-receipt.json`);
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`);
  return path;
}

function groupWallet(secret) {
  const trimmed = secret?.trim();
  if (!trimmed) throw new TypeError("seeding the Bazaar requires the Group wallet secret ANOTHER_EVM_WALLET");
  const account = /^(0x)?[0-9a-fA-F]{64}$/u.test(trimmed)
    ? privateKeyToAccount(trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`)
    : mnemonicToAccount(trimmed, { addressIndex: 1 });
  if (account.address.toLowerCase() !== PAYER) throw new TypeError(`the Group wallet secret derives to ${account.address}, not the seeding payer`);
  return account;
}

async function buyOnce(fetch, account, registration, expected) {
  const method = registration.http_method;
  const request = (headers = {}) => fetch(registration.url, {
    method, signal: AbortSignal.timeout(120_000),
    headers: { ...(registration.probe_body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    ...(registration.probe_body === undefined ? {} : { body: registration.probe_body }),
  });
  const unpaid = await request();
  if (unpaid.status !== 402) return { url: registration.url, status: unpaid.status, refused: "the route did not answer 402" };
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account, networks: [NETWORK] });
  const required = new x402HTTPClient(client).getPaymentRequiredResponse((name) => unpaid.headers.get(name));
  const terms = required.accepts.filter((accept) => accept.scheme === "exact" && accept.network === NETWORK
    && accept.asset.toLowerCase() === USDC && accept.payTo.toLowerCase() === PAYOUT && BigInt(accept.amount) === expected);
  if (terms.length !== 1) return { url: registration.url, status: 402, refused: "no exact Base USDC term paying the market payout at the catalog price" };
  const payload = await client.createPaymentPayload({ ...required, accepts: terms });
  const paid = await request({ "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) });
  await paid.body?.cancel();
  const header = paid.headers.get("PAYMENT-RESPONSE");
  const settlement = header ? decodePaymentResponseHeader(header) : undefined;
  return { url: registration.url, status: paid.status, amount: terms[0].amount, ...(settlement === undefined ? {} : { transaction: settlement.transaction, network: settlement.network, success: settlement.success }) };
}

async function readBazaarResources(fetch) {
  const resources = new Set();
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${BAZAAR}?limit=1000&offset=${offset}`);
    if (!response.ok) throw new Error(`x402 Bazaar discovery read refused: HTTP ${response.status}`);
    const page = await response.json();
    for (const item of page.items) resources.add(item.resource);
    if (page.items.length === 0 || offset + 1000 >= page.pagination.total) return resources;
  }
}

const atomic = (usd) => BigInt(Math.round(Number(usd) * 1e6));

function argument(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : Number(argv[index + 1]);
}

await runMain(async ({ argv }) => {
  const receipt = await seedBazaarListings({ dryRun: argv.includes("--dry-run"), capUsd: argument(argv, "--cap-usd") ?? 0.5, perCallUsd: argument(argv, "--per-call-usd") ?? 0.05 });
  return receipt.dryRun ? receipt : { ...receipt, receiptPath: await writeSeedingReceipt(receipt) };
}, { moduleUrl: import.meta.url, formatResult: (result) => `${JSON.stringify(result, null, 2)}\n` });
