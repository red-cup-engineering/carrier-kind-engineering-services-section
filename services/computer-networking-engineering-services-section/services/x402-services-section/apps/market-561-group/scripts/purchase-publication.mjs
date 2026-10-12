#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { access, link, mkdir, open, readFile, stat, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentResponseHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { COMPILED_DECLARATIONS as declarations } from "../src/compiled-offers.mjs";

const MARKET_ORIGIN = "https://market.561.group";
const PUBLICATION_PATHS = new Set(declarations.filter(offer => offer.recoverable).map(offer => offer.route));
const RECOVERY_VERSION = 1;
const MAX_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 15_000;

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (!["--resume", "--url", "--max-amount-atomic", "--output", "--recovery-file"].includes(flag)) {
      throw new TypeError(`unknown option: ${flag}`);
    }
    if (options[flag] !== undefined || argv[index + 1] === undefined || argv[index + 1].startsWith("--")) {
      throw new TypeError(`option requires exactly one value: ${flag}`);
    }
    options[flag] = argv[++index];
  }
  if (options["--resume"] !== undefined) {
    if (Object.keys(options).length !== 1) throw new TypeError("--resume cannot be combined with purchase options");
    return { resume: resolve(options["--resume"]) };
  }
  const required = ["--url", "--max-amount-atomic", "--output", "--recovery-file"];
  const missing = required.filter((flag) => options[flag] === undefined);
  if (missing.length) throw new TypeError(`missing required option${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  const url = validatePublicationUrl(options["--url"]);
  const maximumAmount = options["--max-amount-atomic"];
  if (!/^[1-9][0-9]*$/u.test(maximumAmount)) throw new TypeError("--max-amount-atomic must be a positive integer in token atomic units");
  const output = resolve(options["--output"]);
  const recoveryFile = resolve(options["--recovery-file"]);
  if (output === recoveryFile || `${output}.PAYMENT-RESPONSE.json` === recoveryFile) {
    throw new TypeError("--output, its PAYMENT-RESPONSE receipt, and --recovery-file must be distinct paths");
  }
  return {
    url,
    maximumAmount,
    output,
    recoveryFile,
  };
}

export function validatePublicationUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("--url must be an absolute public market URL"); }
  if (url.origin !== MARKET_ORIGIN || !PUBLICATION_PATHS.has(url.pathname) || url.search || url.hash || url.username || url.password) {
    throw new TypeError("--url must be a current recoverable publication route on https://market.561.group");
  }
  return url.href;
}

export function retryDelayMs(value, now = Date.now()) {
  if (value === null || value === undefined || value.trim() === "") return 1000;
  let ms;
  if (/^\d+$/u.test(value.trim())) ms = Number(value.trim()) * 1000;
  else {
    const date = Date.parse(value);
    if (!Number.isFinite(date)) return 1000;
    ms = Math.max(0, date - now);
  }
  return ms > MAX_RETRY_WAIT_MS ? null : ms;
}

function helpText() {
  return [
    "Buy one of the market's recoverable digital publications using x402 exact-EVM payment.",
    "",
    "  purchase-market-publication --url URL --max-amount-atomic N --output FILE --recovery-file FILE",
    "  purchase-market-publication --resume FILE",
    "",
    "New purchases require X402_BUYER_PRIVATE_KEY in the environment. The signed request and",
    "a random X-Payment-Recovery token are saved mode 0600 before the paid request is sent.",
    "--resume reuses that exact request and does not require a private key.",
    "A 503 is retried at most twice when Retry-After is at most 15 seconds; the recovery file",
    "remains available for a later --resume if the response is still pending.",
    "Success writes the artifact and a sibling .PAYMENT-RESPONSE.json receipt.",
  ].join("\n");
}

async function assertAbsent(path, label) {
  try {
    await access(path, constants.F_OK);
    throw new Error(`${label} already exists: ${path}`);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

async function persistNewRecovery(path, request) {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(request, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.chmod(0o600);
  } finally {
    await handle.close();
  }
}

async function loadRecovery(path) {
  const file = await stat(path);
  if (!file.isFile() || (file.mode & 0o077) !== 0) {
    throw new Error("recovery file must be a regular file with no group or other permissions");
  }
  const recovery = JSON.parse(await readFile(path, "utf8"));
  if (recovery?.version !== RECOVERY_VERSION || recovery.method !== "GET"
      || validatePublicationUrl(recovery.url) !== recovery.url
      || typeof recovery.output !== "string" || recovery.output === ""
      || typeof recovery.paymentSignature !== "string" || recovery.paymentSignature === ""
      || typeof recovery.paymentRecovery !== "string" || !/^[0-9a-f]{64}$/u.test(recovery.paymentRecovery)) {
    throw new TypeError("recovery file does not contain a supported signed publication request");
  }
  if (resolve(recovery.output) === resolve(path) || `${resolve(recovery.output)}.PAYMENT-RESPONSE.json` === resolve(path)) {
    throw new TypeError("recovery file output paths overlap the recovery file");
  }
  return recovery;
}

async function fetchWithBounded503(url, init, fetchImpl, sleep) {
  const send = () => fetchImpl(url, { ...init, signal: AbortSignal.timeout(30_000) });
  let response = await send();
  for (let retry = 0; response.status === 503 && retry < MAX_RETRIES; retry += 1) {
    const delay = retryDelayMs(response.headers.get("retry-after"));
    if (delay === null) return response;
    if (response.body) await response.body.cancel().catch(() => {});
    await sleep(delay);
    response = await send();
  }
  return response;
}

const wait = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function sendExactRequest(request, fetchImpl = fetch, sleep = wait) {
  const headers = {
    "payment-signature": request.paymentSignature,
    "x-payment-recovery": request.paymentRecovery,
  };
  return fetchWithBounded503(request.url, { method: request.method, headers, redirect: "error" }, fetchImpl, sleep);
}

async function writeExclusive(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = resolve(dirname(path), `.${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

async function ensureExactFile(path, expectedBytes, label) {
  try {
    const existing = await readFile(path);
    if (!existing.equals(expectedBytes)) throw new Error(`${label} already exists with different contents: ${path}`);
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await writeExclusive(path, expectedBytes);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readFile(path);
    if (!existing.equals(expectedBytes)) throw new Error(`${label} already exists with different contents: ${path}`);
  }
}

function sameReceipt(existing, expected) {
  return existing?.type === expected.type
    && existing.url === expected.url
    && existing.method === expected.method
    && existing.status === expected.status
    && existing.contentType === expected.contentType
    && existing.artifactBytes === expected.artifactBytes
    && existing.artifactSha256 === expected.artifactSha256
    && JSON.stringify(existing.paymentResponse) === JSON.stringify(expected.paymentResponse);
}

async function savePaidResponse(response, recovery, output, recoveryFile) {
  if (!response.ok) {
    const retryAfter = response.status === 503 ? ` (Retry-After: ${response.headers.get("retry-after") ?? "unspecified"})` : "";
    throw new Error(`publication request returned HTTP ${response.status}${retryAfter}; signed request remains in ${recoveryFile}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length === 0) throw new Error(`publication response was empty; signed request remains in ${recoveryFile}`);
  const paymentResponseHeader = response.headers.get("payment-response");
  if (!paymentResponseHeader) throw new Error(`paid response lacks PAYMENT-RESPONSE receipt; signed request remains in ${recoveryFile}`);
  let paymentReceipt;
  try { paymentReceipt = decodePaymentResponseHeader(paymentResponseHeader); }
  catch { throw new Error(`paid response has an invalid PAYMENT-RESPONSE receipt; signed request remains in ${recoveryFile}`); }
  if (paymentReceipt?.success !== true) throw new Error(`payment receipt does not confirm settlement; signed request remains in ${recoveryFile}`);

  const outputPath = resolve(output);
  const receiptPath = `${outputPath}.PAYMENT-RESPONSE.json`;
  const receipt = {
    type: "X402PaymentResponseReceipt",
    url: recovery.url,
    method: recovery.method,
    status: response.status,
    contentType: response.headers.get("content-type"),
    artifactBytes: body.length,
    artifactSha256: createHash("sha256").update(body).digest("hex"),
    paymentResponse: paymentReceipt,
    receivedAt: new Date().toISOString(),
  };

  await ensureExactFile(outputPath, body, "output file");
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  try {
    const previous = JSON.parse(await readFile(receiptPath, "utf8"));
    if (!sameReceipt(previous, receipt)) throw new Error(`payment receipt already exists with different contents: ${receiptPath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    try {
      await writeExclusive(receiptPath, receiptBytes);
    } catch (writeError) {
      if (writeError?.code !== "EEXIST") throw writeError;
      const previous = JSON.parse(await readFile(receiptPath, "utf8"));
      if (!sameReceipt(previous, receipt)) {
        throw new Error(`payment receipt already exists with different contents: ${receiptPath}`);
      }
    }
  }
  try {
    await unlink(recoveryFile);
  } catch (error) {
    // Keep the recovery record until both artifacts are durable. The buyer can
    // recover the same server response and finish receipt writing safely.
    throw new Error(`artifact and receipt saved, but recovery file could not be removed: ${error.message}; recovery remains at ${recoveryFile}`);
  }
  return { outputPath, receiptPath };
}

async function createSignedRequest(options, fetchImpl = fetch, sleep = wait) {
  const privateKey = process.env.X402_BUYER_PRIVATE_KEY;
  if (typeof privateKey !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(privateKey)) {
    throw new Error("new purchase requires X402_BUYER_PRIVATE_KEY containing one 32-byte EVM private key");
  }
  const unpaid = await fetchWithBounded503(options.url, { method: "GET", redirect: "error" }, fetchImpl, sleep);
  if (unpaid.status !== 402) {
    throw new Error(`publication did not return an x402 payment challenge: HTTP ${unpaid.status}`);
  }
  const client = new x402Client();
  const account = privateKeyToAccount(privateKey);
  registerExactEvmScheme(client, { signer: account, networks: ["eip155:8453"] });
  const protocol = new x402HTTPClient(client);
  const paymentRequired = protocol.getPaymentRequiredResponse((name) => unpaid.headers.get(name));
  const eligible = (paymentRequired.accepts ?? []).filter((requirement) => requirement.scheme === "exact"
    && requirement.network === "eip155:8453"
    && requirement.asset?.toLowerCase() === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
    && /^[1-9][0-9]*$/u.test(requirement.amount ?? "")
    && BigInt(requirement.amount) <= BigInt(options.maximumAmount));
  if (eligible.length !== 1) throw new Error("challenge did not offer exactly one Base exact-payment option within --max-amount-atomic");
  const payload = await client.createPaymentPayload({ ...paymentRequired, accepts: eligible });
  const paymentSignature = encodePaymentSignatureHeader(payload);
  const paymentRecovery = randomBytes(32).toString("hex");
  return {
    version: RECOVERY_VERSION,
    method: "GET",
    url: options.url,
    output: options.output,
    paymentSignature,
    paymentRecovery,
    createdAt: new Date().toISOString(),
  };
}

export async function runPurchase(options, dependencies = {}) {
  if (options.resume) {
    const recovery = await loadRecovery(options.resume);
    const output = dependencies.output ?? recovery.output;
    const response = await sendExactRequest(recovery, dependencies.fetchImpl, dependencies.sleep);
    return savePaidResponse(response, recovery, output, options.resume);
  }
  await assertAbsent(options.recoveryFile, "recovery file");
  await assertAbsent(options.output, "output file");
  await assertAbsent(`${options.output}.PAYMENT-RESPONSE.json`, "payment receipt file");
  const request = await createSignedRequest(options, dependencies.fetchImpl, dependencies.sleep ?? wait);
  // The signed authorization and its non-public recovery token are durable
  // before the first request that can settle the charge.
  await persistNewRecovery(options.recoveryFile, request);
  const response = await sendExactRequest(request, dependencies.fetchImpl, dependencies.sleep);
  return savePaidResponse(response, request, options.output, options.recoveryFile);
}

async function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${helpText()}\n`);
    return;
  }
  const result = await runPurchase(options);
  process.stdout.write(`Publication saved: ${result.outputPath}\nPayment receipt saved: ${result.receiptPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`purchase-market-publication: ${error.message}\n`);
    process.exitCode = 1;
  });
}
