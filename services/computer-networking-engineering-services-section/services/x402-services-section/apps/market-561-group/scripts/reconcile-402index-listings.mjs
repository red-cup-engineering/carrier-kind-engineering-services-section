#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { derive402indexRegistrations } from "./derive-402index-registrations.mjs";

const INDEX = "https://402index.io";
const MARKET_HOST = "market.561.group";
const VERIFICATION_ROUTE = "/.well-known/402index-verify.txt";
// The fields a verified owner may PATCH and the derivation also owns.
const EDITABLE = ["name", "description", "category", "price_usd"];

/**
 * Reconcile 402index against the catalog: the listing set is a function of
 * what the market sells, not a one-off registration. An offer is sellable when
 * its probe answers 402 today; a sellable offer with no listing is registered,
 * a listing whose editable fields drifted from the derivation is patched as the
 * verified domain owner, and a listing for a route that is neither derived nor
 * answering 402 is withdrawn. Usage: reconcile-402index-listings [--dry-run]
 */
export async function reconcile402indexListings({ environment = process.env, fetch = globalThis.fetch, now = () => new Date().toISOString(), dryRun = false, concurrency = 6 } = {}) {
  const derived = uniqueByUrl([...derive402indexRegistrations({ runtime: "edge" }), ...derive402indexRegistrations({ runtime: "node" })]);
  const probes = await mapLimit(derived, concurrency, async (registration) => ({ registration, status: await probe(fetch, registration) }));
  const sellable = probes.filter((entry) => entry.status === 402).map((entry) => entry.registration);
  const unsellable = probes.filter((entry) => entry.status !== 402).map((entry) => ({ url: entry.registration.url, name: entry.registration.name, status: entry.status }));
  const listed = await readListings(fetch);
  const listedByUrl = new Map(listed.map((service) => [service.url, service]));
  const derivedUrls = new Set(derived.map((registration) => registration.url));
  // The edge serves sha256(token); the owner token itself is a node secret. Without a token whose
  // hash the domain serves, drift and dead listings are reported, never edited.
  const servedHash = (await (await fetch(`https://${MARKET_HOST}${VERIFICATION_ROUTE}`)).text()).trim();
  const token = environment.INDEX402_MARKET_VERIFICATION_TOKEN;
  const owns = token !== undefined && createHash("sha256").update(token).digest("hex") === servedHash;
  const owner = { domain: MARKET_HOST, verification_token: token };

  const registered = [];
  const patched = [];
  for (const registration of sellable) {
    const service = listedByUrl.get(registration.url);
    if (service === undefined) {
      registered.push(dryRun ? { url: registration.url, name: registration.name, dryRun: true }
        : { url: registration.url, name: registration.name, ...await send(fetch, "POST", "/api/v1/register", registration) });
      continue;
    }
    const drift = Object.fromEntries(EDITABLE.filter((field) => service[field] !== registration[field]).map((field) => [field, registration[field]]));
    if (Object.keys(drift).length === 0) continue;
    patched.push(dryRun || !owns ? { serviceId: service.id, url: service.url, drift, ...(dryRun ? { dryRun } : { owner: "unproven" }) }
      : { serviceId: service.id, url: service.url, drift, ...await send(fetch, "PATCH", `/api/v1/services/${service.id}`, { ...owner, ...drift }) });
  }

  const withdrawn = [];
  const aliases = [];
  for (const service of listed.filter((entry) => !derivedUrls.has(entry.url))) {
    const status = await probe(fetch, { url: service.url, http_method: service.http_method ?? "GET" });
    if (status === 402) { aliases.push({ serviceId: service.id, url: service.url, status }); continue; }
    withdrawn.push(dryRun || !owns ? { serviceId: service.id, url: service.url, status, ...(dryRun ? { dryRun } : { owner: "unproven" }) }
      : { serviceId: service.id, url: service.url, status, ...await send(fetch, "DELETE", `/api/v1/services/${service.id}`, owner) });
  }

  return Object.freeze({
    recordType: "561-group.x402-market-402index-reconciliation-receipt",
    observedAt: now(),
    index: INDEX,
    market: MARKET_HOST,
    derivedBy: "apps/market-561-group/scripts/reconcile-402index-listings.mjs",
    dryRun,
    ownership: owns ? "proven" : "unproven",
    summary: {
      derived: derived.length, sellable: sellable.length, unsellable: unsellable.length, listed: listed.length,
      registered: registered.filter((entry) => entry.status === 201 || entry.dryRun).length,
      patched: patched.filter((entry) => entry.status === 200 || entry.dryRun).length,
      withdrawn: withdrawn.filter((entry) => entry.status === 200 || entry.dryRun).length,
      aliases: aliases.length,
    },
    registered, patched, withdrawn, aliases, unsellable,
  });
}

/** Write a reconciliation receipt into the dated receipt directory. */
export async function writeReconciliationReceipt(receipt, { directory = process.env.X402_INDEX_RECEIPTS ?? join(homedir(), ".local", "state", "561-group", "x402-market", "402index") } = {}) {
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${receipt.observedAt.replace(/[:.]/gu, "-")}-402index-reconciliation-receipt.json`);
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`);
  return path;
}

function uniqueByUrl(registrations) {
  return [...new Map(registrations.map((registration) => [registration.url, registration])).values()];
}

async function probe(fetch, { url, http_method: method = "GET", probe_body: body }) {
  try {
    const response = await fetch(url, {
      method, redirect: "manual", signal: AbortSignal.timeout(20_000),
      ...(body === undefined ? {} : { body, headers: { "content-type": "application/json" } }),
    });
    await response.body?.cancel();
    return response.status;
  } catch (error) {
    return `unreachable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function readListings(fetch) {
  const listings = [];
  for (let offset = 0; ; offset += 200) {
    const response = await fetch(`${INDEX}/api/v1/services?q=${MARKET_HOST}&limit=200&offset=${offset}`);
    if (!response.ok) throw new Error(`402index listing read refused: HTTP ${response.status}`);
    const page = await response.json();
    listings.push(...page.services.filter((service) => new URL(service.url).host === MARKET_HOST));
    if (page.services.length < 200 || offset + 200 >= page.total) return listings;
  }
}

async function send(fetch, method, path, body) {
  const response = await fetch(`${INDEX}${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { body: text.slice(0, 500) }; }
  return { status: response.status, serviceId: parsed.id ?? parsed.service?.id, message: parsed.message ?? parsed.error };
}

async function mapLimit(items, limit, map) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await map(items[index]); }
  }));
  return results;
}

await runMain(async ({ argv }) => {
  const receipt = await reconcile402indexListings({ dryRun: argv.includes("--dry-run") });
  return dryRunOrWritten(receipt);
}, { moduleUrl: import.meta.url, formatResult: (result) => `${JSON.stringify(result, null, 2)}\n` });

async function dryRunOrWritten(receipt) {
  return receipt.dryRun ? receipt : { ...receipt, receiptPath: await writeReconciliationReceipt(receipt) };
}
