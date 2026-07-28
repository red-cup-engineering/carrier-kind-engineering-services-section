#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendOwnedRecord, buildArtifactSourcePacket, buildNarrative, canonical, classifyPublicationDelta, digest, freezeCurrentManifest,
  publicationBaselineFromReceipt, REPORTING_ACTOR, validateSubscriptionManifest } from "./state-reporting.mjs";
import { prepareAtomicDiscordPublication, publishAtomicDiscordReport } from "./discord-publication.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams"; const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DRY_EFFECTS = Object.freeze(["tti-consumer-local-manifest-freeze", "tti-consumer-local-delta-classification", "provider-request-construction", "tti-consumer-local-append-only-evidence"]);
const LIVE_EFFECTS = Object.freeze([...DRY_EFFECTS, "contracted-artifact-use", "discord-message-create:one-atomic-multipart"]);
function reply(type, source, object) { return { "@context": CONTEXT, id: `urn:${digest({ type, source: source?.id ?? null, object })}`, type, actor: REPORTING_ACTOR, target: source?.actor ?? "urn:ame:unknown", inReplyTo: source?.id ?? null, object }; }
function refusal(source, reason, effects = []) { return reply("Reject", source, { type: "HarmoniousUnionReportingRefusal", reason, effects }); }

function recordsBelow(root) {
  if (!existsSync(root)) return [];
  const records = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) records.push(...recordsBelow(path));
    else if (name.endsWith(".jsonl")) {
      try { records.push(...readFileSync(path, "utf8").split("\n").filter(Boolean).map(JSON.parse)); }
      catch { /* Malformed bytes are not positive consumption evidence. */ }
    }
  }
  return records;
}

function validRequest(request) {
  try { validateSubscriptionManifest(request?.subscription); }
  catch { return false; }
  return request?.type === "HarmoniousUnionReportRequest" && ["dry-run", "live-pilot", "live"].includes(request.mode)
    && typeof request.period === "string" && Array.isArray(request.responses) && Number.isFinite(Date.parse(request.recordedAt))
    && (request.previousSuccessfulManifest === null || request.previousSuccessfulManifest?.type === "HarmoniousUnionCurrentManifest");
}

export function solicitStateReport(source) {
  const request = source?.object?.request;
  if (source?.["@context"] !== CONTEXT || source.type !== "Offer" || source.target !== REPORTING_ACTOR || source.object?.type !== "HarmoniousUnionReportingSolicitation" || !validRequest(request)) return refusal(source, "invalid-reporting-solicitation");
  const effects = request.mode === "dry-run" ? DRY_EFFECTS : LIVE_EFFECTS;
  return reply("Offer", source, { type: "ExecutableHarmoniousUnionReportingOffer", contract: "state-of-harmonious-union-reporting-service", customer: source.actor,
    request, requestDigest: digest(request), effects, operation: "invoke-state-of-harmonious-union-report", externalSpend: request.mode === "dry-run" ? 0 : "separately-granted-only" });
}

function capabilityValid(source, offered, recordedAt) {
  const offer = offered.object; const capability = source?.object?.capability;
  const expiresAt = Date.parse(capability?.expiresAt); const now = Date.parse(recordedAt);
  return capability?.type === "PurposeBoundCapability" && capability.issuer === offer.customer && capability.holder === REPORTING_ACTOR && capability.invocationTarget === REPORTING_ACTOR
    && capability.requestDigest === offer.requestDigest && capability.providerOfferDigest === digest(offered) && capability.singleUse === true
    && canonical(capability.effects) === canonical(offer.effects) && Number.isFinite(expiresAt) && Number.isFinite(now) && expiresAt >= now;
}

export async function invokeStateReport(source, { dataRoot = join(ROOT, "data"), transport, priorPublicationReceipt } = {}) {
  const offered = source?.object?.offer; const offer = offered?.object; const request = offer?.request;
  if (source?.["@context"] !== CONTEXT || source?.type !== "Accept" || source.target !== REPORTING_ACTOR || offered?.type !== "Offer" ||
      offered.actor !== REPORTING_ACTOR || offered.target !== source.actor || offer?.customer !== source.actor ||
      offer?.type !== "ExecutableHarmoniousUnionReportingOffer" || offer.requestDigest !== digest(request) || !validRequest(request)) return refusal(source, "invalid-reporting-contract");
  if (!capabilityValid(source, offered, request.recordedAt)) return refusal(source, "absent-or-overbroad-reporting-capability");
  const capabilityDigest = digest(source.object.capability);
  if (recordsBelow(join(dataRoot, "invocation-receipts")).some((record) => record.capabilityDigest === capabilityDigest)) return refusal(source, "single-use-reporting-capability-already-consumed");
  appendOwnedRecord({ dataRoot, category: "invocation-receipts", recordedAt: request.recordedAt,
    record: { type: "HarmoniousUnionReportingInvocationReceipt", recordedAt: request.recordedAt, invocation: source.id, capabilityDigest, disposition: "admitted-into-execution" } });
  let current; let delta; let narrative; let sourcePacket;
  try {
    current = freezeCurrentManifest({ subscription: request.subscription, period: request.period, responses: request.responses, recordedAt: request.recordedAt });
    delta = classifyPublicationDelta({ subscription: request.subscription, currentManifest: current, previousSuccessfulManifest: request.previousSuccessfulManifest });
    narrative = buildNarrative(delta); sourcePacket = buildArtifactSourcePacket({ subscription: request.subscription, currentManifest: current, previousSuccessfulManifest: request.previousSuccessfulManifest, delta, narrative });
    appendOwnedRecord({ dataRoot, category: "publication-manifests", recordedAt: request.recordedAt, record: current });
  } catch (error) { return refusal(source, `manifest-or-delta-refused:${error instanceof Error ? error.message : String(error)}`); }
  const graphicPacket = { type: delta.type, period: delta.period, subscriptionDigest: delta.subscriptionDigest, previousSuccessfulPublicationDigest: delta.previousSuccessfulPublicationDigest,
    currentManifestDigest: delta.currentManifestDigest, claims: delta.claims.map(({ settlement, claimId, classification }) => ({ settlement, claimId, classification })) };
  if (request.mode === "dry-run") return reply("Accept", source, { type: "HarmoniousUnionReportDryRunProduct", currentManifest: current, delta, narrative, sourcePacket, graphicPacket,
    publication: { type: "TTIDiscordPublicationDryRun", status: "not-attempted", externalCalls: 0 }, baselineAdvanced: false,
    resourceReceipt: { type: "ResourceReceipt", externalCalls: 0, externalSpend: 0, inferenceTokens: { status: "unknown", value: null }, coordination: "Leader-contributed interactive execution" } });
  const dependencies = source.object.dependencies;
  if (dependencies?.graphic?.type !== "DeterministicReportGraphicArtifact" ||
      dependencies.graphic.packetDigest !== digest(graphicPacket) ||
      dependencies.graphic.rasterizedFromExactSvgDigest !== dependencies.graphic.svgDigest ||
      dependencies?.audio?.type !== "NotebookLMAudioArtifact" || dependencies.audio.sourcePacketDigest !== digest(sourcePacket)) return refusal(source, "exact-contracted-audio-and-graphic-artifacts-absent");
  let multipart;
  try { multipart = prepareAtomicDiscordPublication({ guildId: source.object.destination?.guildId, channelId: source.object.destination?.channelId, narrative, currentManifest: current,
    artifacts: { svgBase64: dependencies.graphic.svgBase64, svgDigest: dependencies.graphic.svgDigest, pngBase64: dependencies.graphic.pngBase64, pngDigest: dependencies.graphic.pngDigest,
      audioBase64: dependencies.audio.audioBase64, audioDigest: dependencies.audio.audioDigest }, idempotencyKey: source.object.idempotencyKey }); }
  catch (error) { return refusal(source, `discord-multipart-refused:${error instanceof Error ? error.message : String(error)}`); }
  const publication = await publishAtomicDiscordReport({ request: multipart, grant: source.object.publicationGrant, transport, mode: "live", recordedAt: request.recordedAt, priorReceipt: priorPublicationReceipt });
  appendOwnedRecord({ dataRoot, category: "publication-receipts", recordedAt: request.recordedAt, record: publication });
  const baseline = publicationBaselineFromReceipt({ currentManifest: current, publicationReceipt: publication, previousBaseline: source.object.previousBaseline ?? null, recordedAt: request.recordedAt });
  if (baseline.type === "HarmoniousUnionPublicationBaseline") appendOwnedRecord({ dataRoot, category: "publication-baselines", recordedAt: request.recordedAt, record: baseline });
  return reply(publication.status === "succeeded" ? "Accept" : "Reject", source, { type: publication.status === "succeeded" ? "HarmoniousUnionPublishedReportProduct" : "HarmoniousUnionPublicationRefusal",
    currentManifest: current, delta, narrative, sourcePacket, artifacts: { graphic: dependencies.graphic, audio: dependencies.audio }, publication, baseline, baselineAdvanced: baseline.type === "HarmoniousUnionPublicationBaseline" });
}

function operation() { const index = process.argv.indexOf("--operation"); return index >= 0 ? process.argv[index + 1] : basename(process.argv[1]); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = JSON.parse(readFileSync(0, "utf8")); const op = operation();
  const result = op === "solicit-state-of-harmonious-union-report" ? solicitStateReport(source) : op === "invoke-state-of-harmonious-union-report" ? await invokeStateReport(source) : refusal(source, "unknown-operation");
  process.stdout.write(`${JSON.stringify(result)}\n`); process.exitCode = result.type === "Reject" ? 2 : 0;
}
