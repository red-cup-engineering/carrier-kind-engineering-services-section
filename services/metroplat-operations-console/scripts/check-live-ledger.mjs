#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { createClientCredentialsClient } from "@red-cup-engineering/oauth-services-section/client-credentials";

function originFrom(environment, argv) {
  const index = argv.indexOf("--origin");
  const value = index >= 0 ? argv[index + 1] : environment.METROPLAT_MCP_ORIGIN;
  const origin = new URL(value);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new TypeError("origin must be a credential-free HTTPS origin");
  return origin;
}

function sameSnapshot(readings, selectedReport) {
  const batch = readings?.snapshot;
  const selected = selectedReport?.snapshot;
  return typeof batch?.id === "string" && batch.id === selected?.id;
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

/** Read-only authenticated ledger acceptance against the running MetroPlat instance. */
export async function checkLiveLedger({ environment = process.env, argv = process.argv.slice(2), fetchImpl = fetch, now = Date.now } = {}) {
  const started = now();
  const origin = originFrom(environment, argv);
  const anonymous = await fetchImpl(new URL("/books/view", origin), { redirect: "manual", headers: { accept: "text/html" }, signal: AbortSignal.timeout(15_000) });
  if (anonymous.status !== 302 || !anonymous.headers.get("location")?.startsWith("/sign-in?return_to=")) throw new Error("anonymous books view did not redirect to sign-in");
  const clientId = environment.METROPLAT_MCP_CLIENT_ID;
  const clientSecret = environment.METROPLAT_MCP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new TypeError("METROPLAT_MCP_CLIENT_ID and METROPLAT_MCP_CLIENT_SECRET are required");
  const tokenClient = createClientCredentialsClient({ tokenUrl: new URL("/oauth/token", origin), clientId, clientSecret, fetchImpl, now });
  const token = await tokenClient.getToken();
  const headers = { authorization: `Bearer ${token}` };
  const books = await fetchImpl(new URL("/books?report=register", origin), { headers, signal: AbortSignal.timeout(15_000) });
  if (!books.ok) throw new Error("authenticated ledger readings request failed");
  const readings = await books.json();
  if (readings?.kind !== "ledger-readings" || readings?.selectedReport?.report !== "register" || !sameSnapshot(readings, readings.selectedReport)) throw new Error("ledger readings did not contain a same-snapshot register report");
  const view = await fetchImpl(new URL("/books/view?report=register", origin), { headers, signal: AbortSignal.timeout(15_000) });
  if (!view.ok) throw new Error("authenticated books view request failed");
  const html = await view.text();
  const tables = count(html, /<table\b/g);
  const forms = count(html, /<form\b/g);
  const dataRows = count(html, /<tbody><tr><(?:th\b|td(?! colspan))/g);
  if (tables < 1 || forms < 1 || dataRows < 1) throw new Error("books view did not contain a ledger table and query form");
  const invalid = await fetchImpl(new URL("/books/view?report=register&begin=not-a-date", origin), { headers, signal: AbortSignal.timeout(15_000) });
  if (invalid.status !== 400) throw new Error("invalid ledger date was not rejected");
  return Object.freeze({ ok: true, origin: origin.origin, anonymousStatus: anonymous.status, booksStatus: books.status, viewStatus: view.status, invalidDateStatus: invalid.status, tables, forms, dataRows, durationMs: now() - started });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(await checkLiveLedger())}\n`);
  } catch {
    process.stdout.write(`${JSON.stringify({ ok: false })}\n`);
    process.exitCode = 1;
  }
}
