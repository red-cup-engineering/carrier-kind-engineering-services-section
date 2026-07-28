#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const PROVIDER = "urn:ame:notebooklm-inference-team";
export const RESULT_TYPE = "NotebookLMAudioArtifact";
export const RECEIPT_TYPE = "NotebookLMSourceReconciliationReceipt";
const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  return `sha256:${createHash("sha256").update(value instanceof Uint8Array ? value : canonical(value)).digest("hex")}`;
}

export function rawDigest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function contentId(body) { return `urn:${digest(body)}`; }

function filesBelow(root) {
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return []; }
  return entries.flatMap((entry) => entry.isDirectory() ? filesBelow(resolve(root, entry.name)) : [resolve(root, entry.name)]);
}

function receiptValid(record) {
  if (!record || record.type !== RECEIPT_TYPE || record.provider !== PROVIDER || record.outcome !== "reconciled") return false;
  const { id, ...body } = record;
  return id === contentId(body) && Array.isArray(record.finalSourceIds) && record.finalSourceIds.length > 0
    && record.finalSourceIds.every((item) => typeof item === "string" && item.length > 0)
    && new Set(record.finalSourceIds).size === record.finalSourceIds.length;
}

export function resolveSourceReceipt(dataRoot, receiptId) {
  if (!/^urn:sha256:[0-9a-f]{64}$/u.test(receiptId ?? "")) return null;
  for (const path of filesBelow(resolve(dataRoot, "receipts")).filter((item) => item.endsWith(".jsonl")).sort()) {
    for (const line of readFileSync(path, "utf8").split("\n").filter(Boolean)) {
      try { const record = JSON.parse(line); if (record.id === receiptId && receiptValid(record)) return record; } catch { /* malformed evidence is not admitted */ }
    }
  }
  return null;
}

function responseIdentityValid(record) {
  return record?.id === contentId({ actor: record.actor, type: record.type, inReplyTo: record.inReplyTo, object: record.object });
}

function generationWitnessValid(dataRoot, invocation, result) {
  for (const path of filesBelow(resolve(dataRoot, "journals", "events")).filter((item) => item.endsWith(".jsonl")).sort()) {
    for (const line of readFileSync(path, "utf8").split("\n").filter(Boolean)) {
      try {
        const event = JSON.parse(line);
        if (event.source === PROVIDER
          && event.type === "org.emsenn.notebooklm-inference-team.contract.completed"
          && event.subject === invocation.id
          && event.data?.activityDigest === digest(invocation)
          && event.data?.result === result.id) return true;
      } catch { /* malformed local journal evidence is not admitted */ }
    }
  }
  return false;
}

function packetBoundGenerationRequest(packet, request) {
  if (packet?.type !== "HarmoniousUnionArtifactSourcePacket" || !Array.isArray(packet.documents) || packet.documents.length === 0) return false;
  if (!packet.documents.every((document) => typeof document?.name === "string" && typeof document?.content === "string"
    && document.digest === digest(document.content))) return false;
  const documents = packet.documents.map((document) => ({ title: document.name, digest: rawDigest(Buffer.from(document.content)) }));
  const sources = request?.sources?.map((source) => ({ title: source?.title, digest: source?.digest }));
  return request?.artifactType === "audio" && request?.corpusMode === "reconciled-notebook"
    && canonical(sources) === canonical(documents);
}

function confinedArtifact(providerRoot, value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || /^https?:/iu.test(value)) return null;
  let root;
  try {
    const statedRoot = resolve(providerRoot);
    if (lstatSync(statedRoot).isSymbolicLink() || !lstatSync(statedRoot).isDirectory()) return null;
    root = realpathSync(statedRoot);
  } catch { return null; }
  const statedPath = isAbsolute(value) ? resolve(value) : resolve(root, value);
  const statedRelative = relative(root, statedPath);
  if (statedRelative === "" || statedRelative === ".." || statedRelative.startsWith(`..${sep}`) || isAbsolute(statedRelative)) return null;
  let component = root;
  try {
    for (const segment of statedRelative.split(sep)) {
      if (segment === "" || segment === "." || segment === "..") return null;
      component = resolve(component, segment);
      const evidence = lstatSync(component);
      if (evidence.isSymbolicLink()) return null;
    }
  } catch { return null; }
  let path;
  try { path = realpathSync(statedPath); } catch { return null; }
  const rel = relative(root, path);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  try { if (!existsSync(path) || !lstatSync(path).isFile()) return null; } catch { return null; }
  return path;
}

function refusal(code) {
  return { type: "NotebookLMAudioDeliveryRefusal", code, externalNetwork: false, externalSpend: 0, customerMutation: false, foreignMutation: false };
}

function mp3Signature(bytes) {
  return bytes.length >= 3 && (bytes.subarray(0, 3).toString("ascii") === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
}

export function deliverNotebookLMAudio(request, options = {}) {
  if (request?.type !== "NotebookLMAudioDeliveryRequest") return refusal("invalid-request-type");
  if (!/^sha256:[0-9a-f]{64}$/u.test(request.sourcePacketDigest ?? "")) return refusal("invalid-source-packet-digest");
  if (!request.sourcePacket || typeof request.sourcePacket !== "object") return refusal("source-packet-absent-or-invalid");
  if (digest(request.sourcePacket) !== request.sourcePacketDigest) return refusal("source-packet-digest-mismatch");
  const dataRoot = options.dataRoot ?? resolve(MODULE_ROOT, "data");
  const receipt = resolveSourceReceipt(dataRoot, request.notebookSourceReceiptId);
  if (!receipt) return refusal("provider-local-source-reconciliation-receipt-absent-or-invalid");
  const offer = request.generationOffer;
  const invocation = request.generationInvocation;
  const envelope = request.generationResult;
  const generation = envelope?.object;
  const generationRequest = offer?.object?.request;
  if (offer?.type !== "Offer" || offer.actor !== PROVIDER || offer.object?.type !== "ExecutableServiceOffer"
    || !generationRequest || typeof generationRequest !== "object"
    || offer.object.requestDigest !== digest(generationRequest)
    || generationRequest?.notebookSourceReceiptId !== request.notebookSourceReceiptId
    || !packetBoundGenerationRequest(request.sourcePacket, generationRequest)
    || invocation?.type !== "Accept" || invocation.target !== PROVIDER || !invocation.object?.offer
    || digest(invocation.object.offer) !== digest(offer)
    || envelope?.type !== "Accept" || envelope.actor !== PROVIDER || envelope.inReplyTo !== invocation.id
    || !responseIdentityValid(envelope) || generation?.type !== "NotebookLMServiceResult"
    || generation.requestDigest !== offer.object.requestDigest
    || generation.notebookSourceReceiptId !== request.notebookSourceReceiptId
    || !generationWitnessValid(dataRoot, invocation, envelope)) return refusal("generation-bindings-mismatch");
  const artifact = generation.artifact ?? generation.providerExchange?.artifact;
  if (artifact?.type !== "audio") return refusal("artifact-type-mismatch");
  if (artifact.mediaType !== undefined && artifact.mediaType !== "audio/mpeg") return refusal("artifact-media-type-mismatch");
  const path = confinedArtifact(options.providerRoot ?? MODULE_ROOT, artifact.path);
  if (!path) return refusal("artifact-path-absent-or-outside-provider");
  let bytes;
  try { bytes = (options.readFile ?? readFileSync)(path); } catch { return refusal("artifact-bytes-unreadable"); }
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (!mp3Signature(bytes)) return refusal("artifact-is-not-mp3");
  if (artifact.byteLength !== undefined && artifact.byteLength !== bytes.length) return refusal("artifact-byte-length-mismatch");
  const audioDigest = digest(bytes);
  if (artifact.audioDigest !== undefined && artifact.audioDigest !== audioDigest) return refusal("artifact-digest-mismatch");
  return {
    type: RESULT_TYPE,
    audioBase64: bytes.toString("base64"),
    mediaType: "audio/mpeg",
    byteLength: bytes.length,
    audioDigest,
    sourcePacketDigest: request.sourcePacketDigest,
    notebookSourceReceiptId: request.notebookSourceReceiptId,
  };
}

function dryRun() {
  return {
    type: "NotebookLMAudioDeliveryDryRun",
    ready: true,
    contract: "notebooklm-audio-delivery",
    resultType: RESULT_TYPE,
    requiredBindings: ["sourcePacketDigest", "notebookSourceReceiptId"],
    networkCalls: 0,
    externalSpend: 0,
    customerMutation: false,
    foreignMutation: false,
    installation: false,
    publication: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--dry-run")) process.stdout.write(`${JSON.stringify(dryRun())}\n`);
  else {
    try {
      const request = JSON.parse(readFileSync(0, "utf8"));
      const result = deliverNotebookLMAudio(request, { providerRoot: process.cwd(), dataRoot: resolve(process.cwd(), "data") });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (result.type.endsWith("Refusal")) process.exitCode = 2;
    } catch (error) {
      process.stdout.write(`${JSON.stringify(refusal(`invalid-json:${error.message}`))}\n`); process.exitCode = 2;
    }
  }
}
