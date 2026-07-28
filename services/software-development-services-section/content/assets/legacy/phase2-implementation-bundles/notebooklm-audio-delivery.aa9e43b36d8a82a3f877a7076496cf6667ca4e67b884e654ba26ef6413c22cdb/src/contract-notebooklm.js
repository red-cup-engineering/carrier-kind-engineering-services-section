#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deliverNotebookLMAudio } from "./contract-notebooklm-audio-delivery.js";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const NODE_ID = "notebooklm-inference-team";
const ACTOR = `urn:ame:${NODE_ID}`;
const LMT_ACTOR = "urn:ame:leader-movement-team";
const CONTRACT = "notebooklm-service";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HARNESS = join(NODE_ROOT, "run-one-exchange.py");
const PYTHON = join(NODE_ROOT, ".venv", "bin", "python3");

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function contentId(value) { return `urn:${digest(value)}`; }
function rawDigest(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function arg(flag) { const index = process.argv.indexOf(flag); return index === -1 ? undefined : process.argv[index + 1]; }
function now() { return arg("--now") ?? new Date().toISOString(); }
function operation() { return arg("--operation") ?? "solicit-service"; }
function input() { return JSON.parse(readFileSync(0, "utf8")); }
function dataPath(type, instant) {
  const day = instant.slice(0, 10); const [year, month, date] = day.split("-");
  return join(NODE_ROOT, "data", "journals", type, year, month, date, `${day}-${NODE_ID}-${type}.jsonl`);
}
function append(type, value, instant) {
  const path = dataPath(type, instant); mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(value)}\n`, "utf8");
}
function witness(activity, outcome, instant, details = {}) {
  const body = { source: ACTOR, type: `org.emsenn.${NODE_ID}.${outcome}`, subject: activity?.id ?? "urn:activity:unidentified", time: instant, data: { activityDigest: digest(activity ?? null), contract: CONTRACT, ...details } };
  const event = { specversion: "1.0", id: contentId(body), ...body, datacontenttype: "application/json" };
  append("events", event, instant);
  append("eavt", { e: body.subject, a: "activity/outcome", v: outcome, t: event.id }, instant);
  return event;
}
function response(type, source, object) {
  return { "@context": CONTEXT, id: contentId({ actor: ACTOR, type, inReplyTo: source?.id ?? null, object }), type, actor: ACTOR, target: source?.actor ?? LMT_ACTOR, inReplyTo: source?.id ?? "urn:activity:unidentified", object };
}
function emit(value, code = 0) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); process.exitCode = code; }
function reject(source, reason, instant, details = {}) {
  const value = response("Reject", source, { type: "Refusal", contract: CONTRACT, reason, ...details });
  witness(source, "activity.rejected", instant, { reason }); emit(value, 2);
}
function attachments(note) {
  if (Array.isArray(note?.attachment)) return note.attachment;
  return note?.attachment === undefined ? [] : [note.attachment];
}
function filesBelow(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? filesBelow(join(path, entry.name)) : [join(path, entry.name)]);
}
function sourceReceipt(receiptId) {
  if (typeof receiptId !== "string") return null;
  for (const path of filesBelow(join(NODE_ROOT, "data", "receipts")).filter((item) => item.endsWith(".jsonl"))) {
    for (const line of readFileSync(path, "utf8").split("\n").filter(Boolean)) {
      try {
        const record = JSON.parse(line);
        if (record?.id === receiptId && record?.type === "NotebookLMSourceReconciliationReceipt") {
          const { id, ...body } = record;
          const ids = record.finalSourceIds;
          if (id === contentId(body) && record.provider === ACTOR && record.outcome === "reconciled" && Array.isArray(ids) && ids.length > 0 && ids.every((item) => typeof item === "string") && new Set(ids).size === ids.length && record.finalSourceSetDigest === digest([...ids].sort())) return record;
        }
      } catch { /* malformed historical lines are not admitted receipts */ }
    }
  }
  return null;
}
function stableSourceManifest(sources) {
  return sources.map((source) => ({ digest: source.digest, title: source.title ?? (typeof source.path === "string" ? basename(source.path) : null) }));
}
function normalizedRequest(sourceActivity) {
  const note = sourceActivity?.object;
  const request = attachments(note).find((item) => item?.type === "NotebookLMRequest");
  if (!request) return null;
  return {
    sources: request.sources,
    prompt: request.prompt,
    artifactType: request.artifactType ?? request["artifact-type"],
    executionMode: request.executionMode ?? "live",
    corpusMode: request.corpusMode ?? "ephemeral-upload",
    notebookSourceReceiptId: request.notebookSourceReceiptId ?? null,
    sourcePacket: request.sourcePacket ?? null,
    sourcePacketDigest: request.sourcePacketDigest ?? null,
  };
}
function requestProblems(request) {
  const problems = [];
  if (!request || !Array.isArray(request.sources) || request.sources.length === 0) problems.push("sources");
  if (!request || typeof request.prompt !== "string" || request.prompt.trim() === "") problems.push("prompt");
  if (!request || !["report", "mind-map", "infographic", "audio"].includes(request.artifactType)) problems.push("artifactType(report|mind-map|infographic|audio)");
  if (!request || !["dry-run", "live"].includes(request.executionMode)) problems.push("executionMode(dry-run|live)");
  if (!request || !["ephemeral-upload", "reconciled-notebook"].includes(request.corpusMode)) problems.push("corpusMode(ephemeral-upload|reconciled-notebook)");
  if (request?.corpusMode === "ephemeral-upload" && request.executionMode === "live" && Array.isArray(request.sources)) {
    const unbound = request.sources.filter((source) => typeof source !== "object" || source === null || typeof source.path !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(source.digest ?? ""));
    if (unbound.length) problems.push("live sources must be {path,digest} records");
    for (const source of request.sources.filter((item) => item && typeof item === "object" && typeof item.path === "string" && /^sha256:[a-f0-9]{64}$/u.test(item.digest ?? ""))) {
      if (/^https?:\/\//u.test(source.path)) continue;
      if (!isAbsolute(source.path)) problems.push(`live local source must use an absolute path: ${source.path}`);
      else if (!existsSync(source.path)) problems.push(`live local source does not exist: ${source.path}`);
      else if (rawDigest(readFileSync(source.path)) !== source.digest) problems.push(`live local source digest mismatch: ${source.path}`);
    }
  }
  if (request?.corpusMode === "reconciled-notebook" && Array.isArray(request.sources)) {
    if (request.artifactType === "audio") {
      if (!/^sha256:[a-f0-9]{64}$/u.test(request.sourcePacketDigest ?? "")) problems.push("sourcePacketDigest(exact HarmoniousUnionArtifactSourcePacket digest)");
      else if (!request.sourcePacket || typeof request.sourcePacket !== "object" || digest(request.sourcePacket) !== request.sourcePacketDigest) problems.push("sourcePacket(exact HarmoniousUnionArtifactSourcePacket)");
    }
    const unbound = request.sources.filter((source) => typeof source !== "object" || source === null || typeof source.path !== "string" || source.path.trim() === "" || !/^sha256:[a-f0-9]{64}$/u.test(source.digest ?? "") || typeof source.title !== "string" || source.title.trim() === "");
    if (unbound.length) problems.push("reconciled-notebook sources must be {path,digest,title} manifest records");
    if (!/^urn:sha256:[a-f0-9]{64}$/u.test(request.notebookSourceReceiptId ?? "")) problems.push("notebookSourceReceiptId(provider receipt)");
    else {
      const receipt = sourceReceipt(request.notebookSourceReceiptId);
      if (!receipt) problems.push("notebookSourceReceiptId(provider-local receipt not found)");
      else {
        if (receipt.outcome !== "reconciled") problems.push("notebookSourceReceiptId(receipt outcome must be reconciled)");
        if (typeof receipt.notebookId !== "string" || !Array.isArray(receipt.finalSourceIds) || receipt.finalSourceIds.length === 0) problems.push("notebookSourceReceiptId(receipt lacks stable notebook/source IDs)");
        if (canonical(receipt.desiredSources) !== canonical(stableSourceManifest(request.sources))) problems.push("sources do not match reconciliation receipt desiredSources");
      }
    }
  }
  return problems;
}
function recognizes(sourceActivity) {
  const content = sourceActivity?.object?.content;
  return typeof content === "string" && /notebook\s*lm/i.test(content);
}

function solicit(activity, instant) {
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || activity.target !== ACTOR || activity.object?.type !== "ServiceSolicitation") {
    reject(activity, "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider", instant); return;
  }
  const sourceActivity = activity.object.sourceActivity;
  if (!recognizes(sourceActivity) && normalizedRequest(sourceActivity) === null) {
    reject(activity, "source intent does not request NotebookLM service", instant); return;
  }
  const request = normalizedRequest(sourceActivity);
  const missing = requestProblems(request);
  if (missing.length) {
    const question = response("Question", activity, { type: "ServiceTermsRequired", contract: CONTRACT, sourceActivity: sourceActivity?.id, missing });
    witness(activity, "terms.requested", instant, { missing }); emit(question); return;
  }
  const effects = request.executionMode === "live" ? ["external-network", ...(request.corpusMode === "ephemeral-upload" ? ["source-egress"] : [])] : [];
  const receipt = request.corpusMode === "reconciled-notebook" ? sourceReceipt(request.notebookSourceReceiptId) : null;
  const object = {
    type: "ExecutableServiceOffer",
    contract: CONTRACT,
    sourceActivity: sourceActivity.id,
    intentSignature: "urn:service-intent:notebooklm-source-grounded-artifact",
    request,
    requestDigest: digest(request),
    scope: { sources: request.sources, sourceSetDigest: digest(request.sources), artifactType: request.artifactType, corpusMode: request.corpusMode, notebookSourceReceiptId: request.notebookSourceReceiptId, sourcePacketDigest: request.sourcePacketDigest, notebookId: receipt?.notebookId ?? null },
    operation: "invoke-service",
    effects,
    requirements: effects.map((effect) => ({ type: "ResourceGrant", effect })),
    evidence: ["provider-local-exchange-record", "artifact-or-refusal", "provider-local-causal-events"],
  };
  const offer = response("Offer", activity, object);
  witness(activity, "offer.emitted", instant, { offer: offer.id, requestDigest: object.requestDigest }); emit(offer);
}

function validateInvocation(activity) {
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Accept" || activity.target !== ACTOR) return "invocation must be an ActivityStreams Accept addressed to this provider";
  const contract = activity.object;
  if (contract?.type !== "ServiceContract" || contract.contract !== CONTRACT) return `invocation must accept ${CONTRACT}`;
  const offer = contract.offer;
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || offer.object?.type !== "ExecutableServiceOffer") return "ServiceContract must carry this provider's executable Offer";
  const request = offer.object.request;
  if (offer.object.requestDigest !== digest(request)) return "accepted request does not match the provider offer digest";
  const changedTerms = requestProblems(request);
  if (changedTerms.length) return `accepted request no longer satisfies provider terms: ${changedTerms.join(", ")}`;
  const capability = contract.capability;
  if (capability?.type !== "Capability" || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR) return "accepted contract requires a capability held by this provider";
  if (capability.parentOffer !== offer.id || capability.attenuation?.requestDigest !== offer.object.requestDigest) return "capability is not attenuated to the accepted offer and request";
  if (canonical(capability.attenuation?.providerScope) !== canonical(offer.object.scope)) return "capability does not preserve the provider-authored source and artifact scope";
  if (!Array.isArray(capability.allowedActions) || !capability.allowedActions.includes("invoke-service")) return "capability does not grant invoke-service";
  for (const effect of offer.object.effects ?? []) if (!capability.allowedActions.includes(effect)) return `capability does not grant required effect ${effect}`;
  return null;
}

export function settleNotebookLMAudio(request, harnessResult, options = {}) {
  const record = harnessResult?.record;
  const generationOffer = options.generationOffer;
  const generationInvocation = options.generationInvocation;
  const generationResult = {
    type: "NotebookLMServiceResult",
    requestDigest: generationOffer?.object?.requestDigest,
    notebookSourceReceiptId: record?.notebookSourceReceiptId ?? request.notebookSourceReceiptId,
    artifact: record?.artifact ?? null,
  };
  const generationEnvelope = response("Accept", generationInvocation, generationResult);
  if (typeof options.recordGenerationWitness === "function") options.recordGenerationWitness(generationEnvelope);
  return deliverNotebookLMAudio({
    type: "NotebookLMAudioDeliveryRequest",
    sourcePacket: request.sourcePacket,
    sourcePacketDigest: request.sourcePacketDigest,
    notebookSourceReceiptId: request.notebookSourceReceiptId,
    generationOffer,
    generationInvocation,
    generationResult: generationEnvelope,
  }, { providerRoot: options.providerRoot ?? NODE_ROOT, dataRoot: options.dataRoot ?? join(NODE_ROOT, "data"), readFile: options.readFile });
}

function invoke(activity, instant) {
  const invalid = validateInvocation(activity);
  if (invalid) { reject(activity, invalid, instant); return; }
  const offer = activity.object.offer;
  const request = offer.object.request;
  const temp = mkdtempSync(join(tmpdir(), "notebooklm-contract-"));
  const packetPath = join(temp, "packet.json");
  const receipt = request.corpusMode === "reconciled-notebook" ? sourceReceipt(request.notebookSourceReceiptId) : null;
  const notebookContext = receipt ? { notebookId: receipt.notebookId, sourceReceiptId: receipt.id, finalSourceIds: receipt.finalSourceIds, finalSourceSetDigest: receipt.finalSourceSetDigest } : undefined;
  writeFileSync(packetPath, `${JSON.stringify({ sources: request.sources, prompt: request.prompt, "artifact-type": request.artifactType, ...(notebookContext ? { "notebook-context": notebookContext } : {}) }, null, 2)}\n`);
  const args = [HARNESS, packetPath, ...(request.executionMode === "dry-run" ? ["--dry-run"] : [])];
  const execution = spawnSync(PYTHON, args, { cwd: NODE_ROOT, encoding: "utf8", timeout: request.executionMode === "dry-run" ? 60_000 : 5_500_000, env: process.env });
  rmSync(temp, { recursive: true, force: true });
  let harnessResult;
  try { harnessResult = JSON.parse(execution.stdout); } catch { harnessResult = undefined; }
  if (execution.status !== 0 || !harnessResult?.ok) {
    reject(activity, "NotebookLM harness failed before settling a typed provider result", instant, { status: execution.status, providerDiagnostic: harnessResult ?? "harness-untyped-failure", providerStderr: execution.stderr?.slice(0, 1000) || null }); return;
  }
  if (harnessResult.outcome === "refusal") {
    reject(activity, harnessResult.record?.refusal?.grounds ?? "NotebookLM refused the exchange", instant, { providerExchange: harnessResult.record }); return;
  }
  const settledAudio = request.artifactType === "audio" && request.executionMode === "live"
    ? settleNotebookLMAudio(request, harnessResult, {
      generationOffer: offer,
      generationInvocation: activity,
      recordGenerationWitness: (generationResult) => witness(activity, "contract.completed", instant, { result: generationResult.id, disposition: "artifact", phase: "provider-local-generation" }),
    })
    : null;
  if (settledAudio?.type === "NotebookLMAudioDeliveryRefusal") {
    reject(activity, settledAudio.code, instant, { audioDeliveryRefusal: settledAudio }); return;
  }
  const object = {
    type: "NotebookLMServiceResult",
    contract: CONTRACT,
    disposition: request.executionMode === "dry-run" ? "ready" : "artifact",
    sourceActivity: offer.object.sourceActivity,
    requestDigest: offer.object.requestDigest,
    providerExchange: request.executionMode === "dry-run" || settledAudio ? null : harnessResult.record,
    artifact: settledAudio ?? harnessResult.record?.artifact ?? null,
    sourcePacketDigest: request.sourcePacketDigest,
    observations: request.executionMode === "dry-run" ? { networkCalls: 0, recordsWritten: 0 } : harnessResult.record?.cost ?? {},
    dryRun: request.executionMode === "dry-run",
    corpusMode: request.corpusMode,
    notebookSourceReceiptId: request.notebookSourceReceiptId,
  };
  const result = response("Accept", activity, object);
  witness(activity, "contract.completed", instant, { result: result.id, disposition: object.disposition }); emit(result);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const instant = now();
  let activity;
  try { activity = input(); } catch (error) { reject({}, `invalid JSON input: ${error.message}`, instant); }
  if (activity !== undefined) {
    if (operation() === "solicit-service") solicit(activity, instant);
    else if (operation() === "invoke-service") invoke(activity, instant);
    else reject(activity, `unknown provider operation ${operation()}`, instant);
  }
}
