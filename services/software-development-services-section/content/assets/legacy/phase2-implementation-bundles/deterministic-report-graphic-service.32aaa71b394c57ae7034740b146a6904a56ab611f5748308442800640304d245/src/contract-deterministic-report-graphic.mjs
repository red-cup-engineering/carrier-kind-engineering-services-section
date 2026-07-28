#!/usr/bin/env node
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDeterministicReportGraphic } from "./deterministic-report-graphic.mjs";

export const ACTOR = "urn:ame:deterministic-report-graphic-service";
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EFFECTS = Object.freeze(["provider-local-artifact-realization", "provider-local-append-only-receipt"]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function reply(type, source, object) { return { "@context": CONTEXT, id: `urn:${digest({ type, source: source?.id ?? null, object })}`, type, actor: ACTOR, target: source?.actor ?? "urn:ame:unknown", inReplyTo: source?.id ?? null, object }; }
function refusal(source, reason) { return reply("Reject", source, { type: "DeterministicReportGraphicRefusal", reason, effects: [] }); }

function receiptRecords(root) {
  if (!existsSync(root)) return [];
  const records = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) records.push(...receiptRecords(path));
    else if (name.endsWith(".jsonl")) {
      try { records.push(...readFileSync(path, "utf8").split("\n").filter(Boolean).map(JSON.parse)); }
      catch { /* A malformed carrier is not evidence that a capability was consumed. */ }
    }
  }
  return records;
}

function capabilityConsumed(dataRoot, capabilityDigest) {
  return receiptRecords(join(dataRoot, "receipts")).some(
    (record) => record.capabilityDigest === capabilityDigest,
  );
}

export function solicitGraphic(source) {
  const request = source?.object?.request;
  if (source?.["@context"] !== CONTEXT || source.type !== "Offer" || source.target !== ACTOR || source.object?.type !== "DeterministicReportGraphicSolicitation" || request?.type !== "HarmoniousUnionDeltaPacket") return refusal(source, "invalid-graphic-solicitation");
  return reply("Offer", source, { type: "ExecutableDeterministicReportGraphicOffer", contract: "deterministic-report-graphic-service", customer: source.actor,
    request, requestDigest: digest(request), operation: "invoke-deterministic-report-graphic", effects: EFFECTS, externalSpend: 0 });
}

export function invokeGraphic(source, { recordedAt = new Date().toISOString(), dataRoot = join(ROOT, "data") } = {}) {
  const offered = source?.object?.offer; const offer = offered?.object; const capability = source?.object?.capability;
  if (source?.["@context"] !== CONTEXT || source?.type !== "Accept" || source.target !== ACTOR ||
      offered?.type !== "Offer" || offered.actor !== ACTOR || offered.target !== source.actor ||
      offer?.customer !== source.actor || offer?.type !== "ExecutableDeterministicReportGraphicOffer" ||
      offer.requestDigest !== digest(offer.request)) return refusal(source, "invalid-graphic-contract");
  const expiry = Date.parse(capability?.expiresAt); const now = Date.parse(recordedAt);
  if (capability?.type !== "PurposeBoundCapability" || capability.issuer !== offer.customer || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR || capability.requestDigest !== offer.requestDigest || capability.providerOfferDigest !== digest(offered) || capability.singleUse !== true || canonical(capability.effects) !== canonical(EFFECTS) || !Number.isFinite(expiry) || !Number.isFinite(now) || expiry < now) return refusal(source, "absent-or-overbroad-graphic-capability");
  const capabilityDigest = digest(capability);
  if (capabilityConsumed(dataRoot, capabilityDigest)) return refusal(source, "single-use-graphic-capability-already-consumed");
  const artifact = renderDeterministicReportGraphic(offer.request);
  const object = artifact.type.endsWith("Refusal") ? artifact : { ...artifact, resourceReceipt: { type: "ResourceReceipt", provider: ACTOR,
    wallTime: { status: "unknown", value: null, unit: "millisecond", reason: "pure-call-not-clock-instrumented" }, monetaryCost: { status: "measured", value: 0, unit: "currency-unit" }, externalCalls: 0 } };
  const result = reply(artifact.type.endsWith("Refusal") ? "Reject" : "Accept", source, object);
  const day = recordedAt.slice(0, 10); const [year, month, date] = day.split("-"); const path = join(dataRoot, "receipts", year, month, date, `${day}-deterministic-report-graphic-service-receipts.jsonl`);
  mkdirSync(dirname(path), { recursive: true }); appendFileSync(path, `${JSON.stringify({ type: "DeterministicReportGraphicServiceReceipt", recordedAt, invocation: source.id, result: result.id, outcome: result.type, requestDigest: offer.requestDigest, capabilityDigest, artifactDigests: artifact.type.endsWith("Refusal") ? [] : [artifact.svgDigest, artifact.pngDigest], externalSpend: 0 })}\n`);
  return result;
}

function operation() { const index = process.argv.indexOf("--operation"); return index >= 0 ? process.argv[index + 1] : basename(process.argv[1]); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, "utf8")); const op = operation();
  const result = op === "solicit-deterministic-report-graphic" ? solicitGraphic(input) : op === "invoke-deterministic-report-graphic" ? invokeGraphic(input) : refusal(input, "unknown-operation");
  process.stdout.write(`${JSON.stringify(result)}\n`); process.exitCode = result.type === "Reject" ? 2 : 0;
}
