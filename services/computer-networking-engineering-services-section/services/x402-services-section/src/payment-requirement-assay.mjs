#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { observeX402Resource } from "./resource-observation.mjs";

function required(value, label) {
  if (typeof value !== "string" || value === "") throw new TypeError(`${label} must be a nonempty string`);
  return value;
}

function requirementValue(row, declaration, name, legacyName) {
  return row[name] ?? row[legacyName] ?? declaration[name] ?? declaration[legacyName];
}

/** Admit a JSON-declared set of x402 payment requirements. */
export function admitPaymentRequirementSet(value, { network, asset } = {}) {
  if (!value || typeof value !== "object" || !Array.isArray(value.rows) || value.rows.length === 0) throw new TypeError("payment-requirement set requires a nonempty rows array");
  return Object.freeze(value.rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new TypeError(`payment-requirement rows[${index}] must be an object`);
    for (const field of ["seller", "url", "method", "payTo"]) required(row[field], `payment-requirement rows[${index}].${field}`);
    if (typeof row.listed !== "boolean") throw new TypeError(`payment-requirement rows[${index}].listed must be a boolean`);
    const method = row.method.toUpperCase(); if (method !== "GET" && method !== "POST") throw new TypeError(`payment-requirement rows[${index}].method must be GET or POST`);
    const expectedAmount = required(requirementValue(row, value, "expectedAmount", "expectedAmountAtomicUsdc"), `payment-requirement rows[${index}].expectedAmount`);
    const expectedNetwork = required(network ?? requirementValue(row, value, "network", "network"), `payment-requirement rows[${index}].network`);
    const expectedAsset = required(asset ?? requirementValue(row, value, "asset", "assetUsdc"), `payment-requirement rows[${index}].asset`);
    return Object.freeze({ ...row, method, expectedAmount, network: expectedNetwork, asset: expectedAsset });
  }));
}

/** Compare an observed challenge with the single network/asset requirement. */
export function derivePaymentRequirementAssay(row, outcome) {
  const base = { seller: row.seller, url: row.url, method: row.method };
  if (outcome.error) { const match = /HTTP (\d+)/u.exec(outcome.error.message ?? ""); return { ...base, httpStatus: match ? Number(match[1]) : null, challengePresent: false, x402Version: null, network: null, asset: null, payToMatchesRuled: false, amountMatchesExpected: false, latencyMs: outcome.latencyMs, ok: false, reason: String(outcome.error.message ?? outcome.error) }; }
  const accepts = outcome.observation.paymentRequired?.accepts ?? [];
  const expectedNetwork = row.network;
  const expectedAsset = row.asset ?? row.assetUsdc;
  const expectedAmount = row.expectedAmount ?? row.expectedAmountAtomicUsdc;
  const accepted = accepts.find((entry) => entry.network === expectedNetwork && entry.asset?.toLowerCase() === expectedAsset.toLowerCase());
  const payToMatchesRuled = accepted ? accepted.payTo.toLowerCase() === row.payTo.toLowerCase() : false;
  const amountMatchesExpected = accepted ? accepted.amount === expectedAmount : false;
  const reason = accepts.length === 0 ? "x402 challenge carried no accepts entries" : !accepted ? `no accepts entry for expected network ${expectedNetwork} and asset ${expectedAsset}` : !payToMatchesRuled ? `payTo ${accepted.payTo} does not match the ruled address` : !amountMatchesExpected ? `amount ${accepted.amount} does not match expected ${expectedAmount}` : null;
  return { ...base, httpStatus: 402, challengePresent: accepts.length > 0, x402Version: outcome.observation.paymentRequired?.x402Version ?? null, network: accepted?.network ?? null, asset: accepted?.asset ?? null, payToMatchesRuled, amountMatchesExpected, latencyMs: outcome.latencyMs, ok: reason === null, reason };
}

export async function assayPaymentRequirementSet({ declaration, network, asset, observe = observeX402Resource, now = Date.now } = {}) {
  return Promise.all(admitPaymentRequirementSet(declaration, { network, asset }).map(async (row) => { const started = now(); try { return derivePaymentRequirementAssay(row, { observation: await observe({ resourceUrl: row.url, method: row.method, ...(row.method === "POST" ? { jsonBody: row.body } : {}) }), latencyMs: now() - started }); } catch (error) { return derivePaymentRequirementAssay(row, { error, latencyMs: now() - started }); } }));
}
export function hasListedPaymentRequirementFailure(declaration, rows, requirements) { return admitPaymentRequirementSet(declaration, requirements).some((row, index) => row.listed && rows[index]?.ok === false); }

export async function runPaymentRequirementAssayCli(argv) {
  const { values } = parseArgs({ args: argv, options: { declaration: { type: "string" }, network: { type: "string" }, asset: { type: "string" }, help: { type: "boolean" } } });
  if (values.help) return { help: true };
  if (!values.declaration || !values.network || !values.asset) throw new TypeError("--declaration, --network, and --asset are required");
  const declaration = JSON.parse(await readFile(values.declaration, "utf8"));
  const rows = await assayPaymentRequirementSet({ declaration, network: values.network, asset: values.asset });
  for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  return { declaration, rows, failed: hasListedPaymentRequirementFailure(declaration, rows, { network: values.network, asset: values.asset }) };
}
