import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const TTI_ACTOR = "urn:ame:turntide-islands";
export const REPORTING_ACTOR = "urn:ame:turntide-islands:state-of-harmonious-union-reporting-service";
export const DELTA_CLASSES = Object.freeze(["added", "materially-changed", "no-change", "explicitly-retracted", "unknown-unreported", "refused", "disagreed"]);

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function digest(value) { return `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : canonical(value)).digest("hex")}`; }
function finite(value, maximum = 4096) { return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0"); }
function contentRecord(body) { return { id: `urn:${digest(body)}`, ...body }; }

export function createSubscriptionManifest({ version, effectiveAt, constituents }) {
  if (!finite(version) || Number.isNaN(Date.parse(effectiveAt)) || !Array.isArray(constituents)) throw new TypeError("invalid subscription header");
  const normalized = constituents.map((entry) => {
    for (const field of ["settlementActor", "providerActor", "providerEndpoint", "providerContract"]) if (!finite(entry?.[field])) throw new TypeError(`subscription entry lacks ${field}`);
    return { settlementActor: entry.settlementActor, providerActor: entry.providerActor, providerEndpoint: entry.providerEndpoint, providerContract: entry.providerContract };
  }).sort((left, right) => canonical(left).localeCompare(canonical(right)));
  if (new Set(normalized.map((entry) => entry.settlementActor)).size !== normalized.length) throw new TypeError("subscription settlement actors must be unique");
  const body = { type: "ConstituentSubscriptionAdmissionManifest", owner: TTI_ACTOR, version, effectiveAt, discoveryPolicy: "manifest-only-no-filesystem-or-global-roster", constituents: normalized };
  return { ...body, subscriptionDigest: digest(body) };
}

export function validateSubscriptionManifest(manifest) {
  const rebuilt = createSubscriptionManifest(manifest);
  if (manifest?.subscriptionDigest !== rebuilt.subscriptionDigest || canonical(manifest) !== canonical(rebuilt)) throw new TypeError("subscription manifest is not exact or digest-bound");
  return rebuilt;
}

export function normalizeEconomicClaim(value) {
  if (value === undefined) return undefined;
  for (const field of ["amount", "currencyOrUnit", "period", "basis"]) if (!finite(value?.[field])) throw new TypeError(`economic claim lacks ${field}`);
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value.amount)) throw new TypeError("economic amount must be an exact decimal string");
  const rateClaim = value.rateClaim === undefined ? undefined : normalizeRateClaim(value.rateClaim);
  return { amount: value.amount, currencyOrUnit: value.currencyOrUnit, period: value.period, basis: value.basis,
    ...(rateClaim === undefined ? {} : { rateClaim }) };
}
function normalizeRateClaim(rate) {
  for (const field of ["fromUnit", "toUnit", "rate", "period", "basis", "sourceClaimId"]) if (!finite(rate?.[field])) throw new TypeError(`rate claim lacks ${field}`);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(rate.rate)) throw new TypeError("conversion rate must be an exact decimal string");
  return { fromUnit: rate.fromUnit, toUnit: rate.toUnit, rate: rate.rate, period: rate.period, basis: rate.basis, sourceClaimId: rate.sourceClaimId };
}
export function requestEconomicConversion(claim, toUnit) {
  const normalized = normalizeEconomicClaim(claim); const rate = normalized?.rateClaim;
  if (!rate || rate.fromUnit !== normalized.currencyOrUnit || rate.toUnit !== toUnit || rate.period !== normalized.period) return { type: "EconomicConversionRefusal", reason: "explicit-matching-rate-claim-absent", originalClaim: normalized };
  return { type: "EconomicConversionPlan", originalClaim: normalized, toUnit, rateClaim: rate, arithmetic: `${normalized.amount} * ${rate.rate}`, resultAmount: null, reason: "decimal arithmetic remains a separately contracted operation" };
}

function normalizeClaim(claim) {
  if (!finite(claim?.claimId) || !["present", "retracted"].includes(claim?.status)) throw new TypeError("claim needs claimId and present or retracted status");
  if (claim.status === "present" && claim.value === undefined) throw new TypeError("present claim needs a value");
  if (!Array.isArray(claim.provenance) || claim.provenance.length === 0 || !claim.provenance.every((item) => finite(item))) throw new TypeError("claim needs provenance identifiers");
  const economic = normalizeEconomicClaim(claim.economic);
  const material = { status: claim.status, value: claim.status === "present" ? claim.value : undefined, economic };
  return { claimId: claim.claimId, status: claim.status, value: claim.status === "present" ? claim.value : undefined, economic,
    provenance: [...claim.provenance].sort(), evidence: Array.isArray(claim.evidence) ? [...claim.evidence].sort() : [], materialDigest: digest(material) };
}

function responseFor(entry, response, period) {
  if (!response) return { settlementActor: entry.settlementActor, providerActor: entry.providerActor, responseStatus: "unknown-unreported", claims: [] };
  if (response.actor !== entry.providerActor || response.target !== REPORTING_ACTOR) throw new TypeError("response crosses the wrong admitted provider boundary");
  if (response.type === "Reject") {
    if (response.object?.type !== "ConstituentStateRefusal" || response.object?.settlementActor !== entry.settlementActor || response.object?.period !== period || !finite(response.object?.reason)) throw new TypeError("invalid constituent refusal");
    return { settlementActor: entry.settlementActor, providerActor: entry.providerActor, responseStatus: "refused", refusal: { reason: response.object.reason, provenance: response.object.provenance ?? [] }, responseDigest: digest(response), claims: [] };
  }
  if (response.type !== "Accept" || response.object?.type !== "ConstituentStateEnvelope" || response.object?.settlementActor !== entry.settlementActor || response.object?.period !== period || !Array.isArray(response.object?.claims)) throw new TypeError("invalid constituent claim envelope");
  const claims = response.object.claims.map(normalizeClaim).sort((left, right) => canonical(left).localeCompare(canonical(right)));
  return { settlementActor: entry.settlementActor, providerActor: entry.providerActor, responseStatus: "accepted", responseDigest: digest(response), claims };
}

export function freezeCurrentManifest({ subscription, period, responses, recordedAt }) {
  const admitted = validateSubscriptionManifest(subscription); if (!finite(period) || Number.isNaN(Date.parse(recordedAt)) || !Array.isArray(responses)) throw new TypeError("invalid current-manifest request");
  const knownActors = new Set(admitted.constituents.map((entry) => entry.providerActor));
  if (responses.some((response) => !knownActors.has(response.actor))) throw new TypeError("response comes from a non-admitted provider");
  const records = admitted.constituents.map((entry) => {
    const candidates = responses.filter((response) => response.actor === entry.providerActor);
    if (candidates.length > 1) {
      const accepted = candidates.map((response) => responseFor(entry, response, period));
      return { settlementActor: entry.settlementActor, providerActor: entry.providerActor, responseStatus: "multiple", variants: accepted, claims: accepted.flatMap((variant) => variant.claims), responseDigests: candidates.map(digest).sort() };
    }
    return responseFor(entry, candidates[0], period);
  });
  const body = { type: "HarmoniousUnionCurrentManifest", owner: TTI_ACTOR, period, recordedAt, subscriptionDigest: admitted.subscriptionDigest, responses: records };
  return contentRecord(body);
}

function claimsBySettlement(manifest, settlementActor) {
  const response = manifest?.responses?.find((item) => item.settlementActor === settlementActor);
  return response?.claims ?? [];
}
function variantsById(claims) {
  const map = new Map();
  for (const claim of claims) { const values = map.get(claim.claimId) ?? []; values.push(claim); map.set(claim.claimId, values); }
  return map;
}

export function classifyPublicationDelta({ subscription, currentManifest, previousSuccessfulManifest }) {
  const admitted = validateSubscriptionManifest(subscription);
  if (currentManifest?.subscriptionDigest !== admitted.subscriptionDigest || currentManifest?.type !== "HarmoniousUnionCurrentManifest") throw new TypeError("current manifest is outside the admitted subscription");
  if (previousSuccessfulManifest !== null &&
      (previousSuccessfulManifest?.type !== "HarmoniousUnionCurrentManifest" ||
       previousSuccessfulManifest.subscriptionDigest !== admitted.subscriptionDigest)) {
    throw new TypeError("previous successful publication manifest is outside the admitted subscription");
  }
  const entries = [];
  for (const member of admitted.constituents) {
    const response = currentManifest.responses.find((item) => item.settlementActor === member.settlementActor);
    const current = variantsById(claimsBySettlement(currentManifest, member.settlementActor));
    const previous = variantsById(claimsBySettlement(previousSuccessfulManifest, member.settlementActor));
    if (["unknown-unreported", "refused"].includes(response.responseStatus)) {
      const claimIds = previous.size ? [...previous.keys()] : ["@settlement"];
      for (const claimId of claimIds) entries.push({ settlement: member.settlementActor, claimId, classification: response.responseStatus, current: [], previous: previous.get(claimId) ?? [], refusal: response.refusal });
      continue;
    }
    const claimIds = new Set([...current.keys(), ...previous.keys()]);
    for (const claimId of [...claimIds].sort()) {
      const currentVariants = current.get(claimId) ?? []; const previousVariants = previous.get(claimId) ?? [];
      const currentDigests = [...new Set(currentVariants.map((claim) => claim.materialDigest))].sort(); const previousDigests = [...new Set(previousVariants.map((claim) => claim.materialDigest))].sort();
      let classification;
      if (currentDigests.length > 1) classification = "disagreed";
      else if (currentVariants.length === 0) classification = "unknown-unreported";
      else if (currentVariants[0].status === "retracted") classification = "explicitly-retracted";
      else if (previousVariants.length === 0) classification = "added";
      else if (canonical(currentDigests) === canonical(previousDigests)) classification = "no-change";
      else classification = "materially-changed";
      entries.push({ settlement: member.settlementActor, claimId, classification, current: currentVariants, previous: previousVariants });
    }
  }
  const counts = Object.fromEntries(DELTA_CLASSES.map((classification) => [classification, entries.filter((entry) => entry.classification === classification).length]));
  const body = { type: "HarmoniousUnionDeltaPacket", period: currentManifest.period, subscriptionDigest: admitted.subscriptionDigest,
    previousSuccessfulPublicationDigest: previousSuccessfulManifest?.id ? digest(previousSuccessfulManifest) : null, currentManifestDigest: digest(currentManifest), claims: entries, counts,
    coverage: { admitted: admitted.constituents.length, accepted: currentManifest.responses.filter((item) => ["accepted", "multiple"].includes(item.responseStatus)).length,
      refused: currentManifest.responses.filter((item) => item.responseStatus === "refused").length, unknownUnreported: currentManifest.responses.filter((item) => item.responseStatus === "unknown-unreported").length } };
  return contentRecord(body);
}

export function buildNarrative(delta) {
  if (delta?.type !== "HarmoniousUnionDeltaPacket") throw new TypeError("narrative requires a mechanical delta packet");
  const c = delta.counts; const text = `State of the Harmonious Union — delta since the previous successful publication. ${c.added} added; ${c["materially-changed"]} materially changed; ${c["no-change"]} unchanged; ${c["explicitly-retracted"]} explicitly retracted; ${c["unknown-unreported"]} unknown or unreported; ${c.refused} refused; ${c.disagreed} disagreed. Coverage: ${delta.coverage.accepted}/${delta.coverage.admitted} admitted constituents responded with claims; ${delta.coverage.refused} refused and ${delta.coverage.unknownUnreported} did not report. Absence is not removal, and disagreement remains visible.`;
  return { type: "HarmoniousUnionSourceGroundedNarrative", text, sourceDeltaDigest: digest(delta), narrativeDigest: digest(text) };
}

export function buildArtifactSourcePacket({ subscription, currentManifest, previousSuccessfulManifest, delta, narrative }) {
  validateSubscriptionManifest(subscription);
  const documents = [
    { name: "subscription.json", mediaType: "application/json", content: canonical(subscription) },
    { name: "current-manifest.json", mediaType: "application/json", content: canonical(currentManifest) },
    { name: "previous-successful-manifest.json", mediaType: "application/json", content: canonical(previousSuccessfulManifest) },
    { name: "delta.json", mediaType: "application/json", content: canonical(delta) },
    { name: "narrative.txt", mediaType: "text/plain", content: narrative.text },
  ].map((document) => ({ ...document, digest: digest(document.content) }));
  const body = { type: "HarmoniousUnionArtifactSourcePacket", subscriptionDigest: subscription.subscriptionDigest, currentManifestDigest: digest(currentManifest),
    previousSuccessfulPublicationDigest: previousSuccessfulManifest ? digest(previousSuccessfulManifest) : null, deltaDigest: digest(delta), narrativeDigest: narrative.narrativeDigest, documents,
    providers: { audio: { actor: "urn:ame:notebooklm-inference-team", contribution: "stable-corpus-audio-only", operations: ["reconcile-notebook-sources", "generate-audio"] },
      graphic: { actor: "urn:ame:deterministic-report-graphic-service", contribution: "deterministic-svg-and-png", operation: "invoke-deterministic-report-graphic" } },
    notebooklmExcludedContributions: ["deterministic-svg", "deterministic-png", "membership-discovery", "delta-classification"] };
  return contentRecord(body);
}

export function appendOwnedRecord({ dataRoot, category, recordedAt, record }) {
  if (!finite(dataRoot) || !finite(category) || Number.isNaN(Date.parse(recordedAt))) throw new TypeError("invalid append-owned-record request");
  const [year, month, day] = recordedAt.slice(0, 10).split("-"); const path = join(dataRoot, category, year, month, day, `${recordedAt.slice(0, 10)}-state-of-harmonious-union-reporting-service-${category}.jsonl`);
  mkdirSync(dirname(path), { recursive: true }); appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8"); return path;
}

export function publicationBaselineFromReceipt({ currentManifest, publicationReceipt, previousBaseline, recordedAt }) {
  if (publicationReceipt?.type !== "TTIDiscordPublicationReceipt" || publicationReceipt.status !== "succeeded" || publicationReceipt.atomicMultipart !== true || !finite(publicationReceipt.messageId) || !finite(publicationReceipt.guildId) || !finite(publicationReceipt.channelId) || !finite(publicationReceipt.idempotencyKey)) return { type: "PublicationBaselineRefusal", reason: "successful-atomic-tti-discord-receipt-absent", previousBaseline };
  if (publicationReceipt.currentManifestDigest !== digest(currentManifest) || !Array.isArray(publicationReceipt.attachments) || !["audio/mpeg", "image/png", "image/svg+xml"].every((mediaType) => publicationReceipt.attachments.some((item) => item.mediaType === mediaType && finite(item.digest)))) return { type: "PublicationBaselineRefusal", reason: "publication-receipt-does-not-bind-complete-report", previousBaseline };
  return contentRecord({ type: "HarmoniousUnionPublicationBaseline", recordedAt, previousBaseline: previousBaseline?.id ?? null, previousSuccessfulPublication: currentManifest.id,
    previousSuccessfulPublicationDigest: digest(currentManifest), publicationReceipt: publicationReceipt.id ?? `urn:${digest(publicationReceipt)}`, messageId: publicationReceipt.messageId });
}

export function readSuccessfulReceiptByIdempotency(dataRoot, key) {
  try { return readFileSync(dataRoot, "utf8").split("\n").filter(Boolean).map(JSON.parse).find((record) => record.type === "TTIDiscordPublicationReceipt" && record.status === "succeeded" && record.idempotencyKey === key); }
  catch { return undefined; }
}

export function admitHourlyOperation(livePilotReceipt) {
  if (livePilotReceipt?.type !== "TTIDiscordPublicationReceipt" || livePilotReceipt.status !== "succeeded" || livePilotReceipt.pilot !== true || livePilotReceipt.atomicMultipart !== true) return { type: "HourlyOperationRefusal", reason: "authorized-successful-live-pilot-receipt-absent" };
  return { type: "HourlyOperationAdmissionCandidate", period: "PT1H", basedOnLivePilotReceipt: livePilotReceipt.id, schedulingStillRequiresReceiverAuthority: true };
}
