import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareAtomicDiscordPublication, publishAtomicDiscordReport } from "../src/discord-publication.mjs";
import { invokeStateReport, solicitStateReport } from "../src/contract-state-reporting.mjs";
import { REPORTING_ACTOR, TTI_ACTOR, admitHourlyOperation, buildArtifactSourcePacket, buildNarrative, classifyPublicationDelta, createSubscriptionManifest, digest,
  freezeCurrentManifest, normalizeEconomicClaim, publicationBaselineFromReceipt, requestEconomicConversion } from "../src/state-reporting.mjs";

const period = "2026-07-18T23:00:00Z/PT1H"; const recordedAt = "2026-07-18T23:30:00.000Z";
const members = [
  { settlementActor: "urn:ame:alpha", providerActor: "urn:ame:alpha:state-report", providerEndpoint: "activitypub:https://alpha.invalid/state-report", providerContract: "constituent-state-report-v1" },
  { settlementActor: "urn:ame:beta", providerActor: "urn:ame:beta:state-report", providerEndpoint: "activitypub:https://beta.invalid/state-report", providerContract: "constituent-state-report-v1" },
];
const subscription = createSubscriptionManifest({ version: "pilot-1", effectiveAt: "2026-07-18T23:00:00.000Z", constituents: members });
function accepted(member, claims, suffix = "1", responsePeriod = period) { return { "@context": "https://www.w3.org/ns/activitystreams", id: `urn:${member.providerActor}:${suffix}`, type: "Accept", actor: member.providerActor, target: REPORTING_ACTOR,
  object: { type: "ConstituentStateEnvelope", settlementActor: member.settlementActor, period: responsePeriod, claims } }; }
function refused(member) { return { "@context": "https://www.w3.org/ns/activitystreams", id: `urn:${member.providerActor}:refusal`, type: "Reject", actor: member.providerActor, target: REPORTING_ACTOR,
  object: { type: "ConstituentStateRefusal", settlementActor: member.settlementActor, period, reason: "local-office-withheld", provenance: ["urn:local:refusal"] } }; }
function claim(value = "operating", status = "present") { return { claimId: "operations/status", status, value: status === "present" ? value : undefined, provenance: ["urn:alpha:local-record"], evidence: ["sha256:evidence"],
  economic: status === "present" ? { amount: "12.50", currencyOrUnit: "USD", period, basis: "settlement-authored-accrual-claim" } : undefined }; }

test("subscription manifest is the exclusive digest-bound coverage denominator", () => {
  assert.equal(subscription.owner, "urn:ame:turntide-islands"); assert.equal(subscription.discoveryPolicy, "manifest-only-no-filesystem-or-global-roster"); assert.equal(subscription.constituents.length, 2);
  assert.throws(() => freezeCurrentManifest({ subscription: { ...subscription, constituents: [] }, period, responses: [], recordedAt }), /digest-bound/u);
  assert.throws(() => freezeCurrentManifest({ subscription, period, responses: [{ ...accepted(members[0], [claim()]), actor: "urn:ame:ambient-directory" }], recordedAt }), /non-admitted/u);
});

test("delta compares against the previous successful manifest and preserves all mechanical states", () => {
  const previousPeriod = "2026-07-18T22:00:00Z/PT1H";
  const previous = freezeCurrentManifest({ subscription, period: previousPeriod, responses: [accepted(members[0], [claim()], "previous", previousPeriod), accepted(members[1], [{ ...claim("steady"), claimId: "beta/status", provenance: ["urn:beta:record"] }], "previous", previousPeriod)], recordedAt: "2026-07-18T22:30:00.000Z" });
  const unchanged = freezeCurrentManifest({ subscription, period, responses: [accepted(members[0], [claim()], "same"), refused(members[1])], recordedAt });
  const delta = classifyPublicationDelta({ subscription, currentManifest: unchanged, previousSuccessfulManifest: previous });
  assert.equal(delta.claims.find((item) => item.settlement === members[0].settlementActor).classification, "no-change");
  assert.equal(delta.claims.find((item) => item.settlement === members[1].settlementActor).classification, "refused");
  const unknown = classifyPublicationDelta({ subscription, currentManifest: freezeCurrentManifest({ subscription, period, responses: [accepted(members[0], [claim("changed")], "changed")], recordedAt }), previousSuccessfulManifest: previous });
  assert.equal(unknown.claims.find((item) => item.settlement === members[0].settlementActor).classification, "materially-changed");
  assert.equal(unknown.claims.find((item) => item.settlement === members[1].settlementActor).classification, "unknown-unreported");
  const retracted = classifyPublicationDelta({ subscription, currentManifest: freezeCurrentManifest({ subscription, period, responses: [accepted(members[0], [claim(undefined, "retracted")], "retracted")], recordedAt }), previousSuccessfulManifest: previous });
  assert.equal(retracted.claims.find((item) => item.settlement === members[0].settlementActor).classification, "explicitly-retracted");
  const bootstrap = classifyPublicationDelta({ subscription, currentManifest: freezeCurrentManifest({ subscription, period, responses: [accepted(members[0], [claim()], "bootstrap")], recordedAt }), previousSuccessfulManifest: null });
  assert.equal(bootstrap.claims.find((item) => item.settlement === members[0].settlementActor).classification, "added");
  const otherSubscription = createSubscriptionManifest({ version: "other", effectiveAt: recordedAt, constituents: members });
  const otherPrevious = freezeCurrentManifest({ subscription: otherSubscription, period: previousPeriod, responses: [], recordedAt: "2026-07-18T22:30:00.000Z" });
  assert.throws(() => classifyPublicationDelta({ subscription, currentManifest: unchanged, previousSuccessfulManifest: otherPrevious }), /outside the admitted subscription/u);
});

test("multiple incompatible constituent envelopes remain visible as disagreement", () => {
  const current = freezeCurrentManifest({ subscription, period, responses: [accepted(members[0], [claim("one")], "a"), accepted(members[0], [claim("two")], "b")], recordedAt });
  const delta = classifyPublicationDelta({ subscription, currentManifest: current, previousSuccessfulManifest: null });
  assert.equal(delta.claims.find((item) => item.settlement === members[0].settlementActor).classification, "disagreed");
  assert.equal(delta.claims.find((item) => item.settlement === members[0].settlementActor).current.length, 2);
});

test("economic claims retain original units and conversion refuses without an exact rate claim", () => {
  const economic = normalizeEconomicClaim(claim().economic); assert.deepEqual(economic, claim().economic);
  const refusal = requestEconomicConversion(economic, "EUR"); assert.equal(refusal.type, "EconomicConversionRefusal"); assert.equal(refusal.originalClaim.amount, "12.50");
  const plan = requestEconomicConversion({ ...economic, rateClaim: { fromUnit: "USD", toUnit: "EUR", rate: "0.9", period, basis: "explicit market claim", sourceClaimId: "fx/usd-eur" } }, "EUR");
  assert.equal(plan.type, "EconomicConversionPlan"); assert.equal(plan.resultAmount, null);
});

test("source packet assigns NotebookLM audio only and graphic work to the deterministic provider", () => {
  const current = freezeCurrentManifest({ subscription, period, responses: [], recordedAt }); const delta = classifyPublicationDelta({ subscription, currentManifest: current, previousSuccessfulManifest: null }); const narrative = buildNarrative(delta);
  const packet = buildArtifactSourcePacket({ subscription, currentManifest: current, previousSuccessfulManifest: null, delta, narrative });
  assert.equal(packet.providers.audio.contribution, "stable-corpus-audio-only"); assert.equal(packet.providers.graphic.contribution, "deterministic-svg-and-png");
  assert.deepEqual(packet.notebooklmExcludedContributions, ["deterministic-svg", "deterministic-png", "membership-discovery", "delta-classification"]);
  assert.equal(packet.documents.every((document) => digest(document.content) === document.digest), true);
});

test("baseline advances only from one complete successful Discord receipt", () => {
  const current = freezeCurrentManifest({ subscription, period, responses: [], recordedAt });
  const partial = publicationBaselineFromReceipt({ currentManifest: current, publicationReceipt: { type: "TTIDiscordPublicationReceipt", status: "failed" }, previousBaseline: null, recordedAt });
  assert.equal(partial.type, "PublicationBaselineRefusal");
  const receipt = { id: "urn:receipt:success", type: "TTIDiscordPublicationReceipt", status: "succeeded", atomicMultipart: true, messageId: "m1", guildId: "g1", channelId: "c1", idempotencyKey: "key1", currentManifestDigest: digest(current),
    attachments: [{ mediaType: "audio/mpeg", digest: "sha256:a" }, { mediaType: "image/png", digest: "sha256:p" }, { mediaType: "image/svg+xml", digest: "sha256:s" }] };
  const baseline = publicationBaselineFromReceipt({ currentManifest: current, publicationReceipt: receipt, previousBaseline: null, recordedAt });
  assert.equal(baseline.type, "HarmoniousUnionPublicationBaseline"); assert.equal(baseline.previousSuccessfulPublication, current.id);
});

test("Discord boundary validates one idempotent atomic multipart request and discloses attempts", async () => {
  const current = freezeCurrentManifest({ subscription, period, responses: [], recordedAt }); const delta = classifyPublicationDelta({ subscription, currentManifest: current, previousSuccessfulManifest: null }); const narrative = buildNarrative(delta);
  const bytes = { svg: Buffer.from("<svg/>") , png: Buffer.from([137,80,78,71]), audio: Buffer.from("ID3audio") };
  const request = prepareAtomicDiscordPublication({ guildId: "guild", channelId: "channel", narrative, currentManifest: current, idempotencyKey: "hour-1", artifacts: {
    svgBase64: bytes.svg.toString("base64"), svgDigest: digest(bytes.svg), pngBase64: bytes.png.toString("base64"), pngDigest: digest(bytes.png), audioBase64: bytes.audio.toString("base64"), audioDigest: digest(bytes.audio) } });
  assert.equal(request.requestedMessageCount, 1); assert.equal((await publishAtomicDiscordReport({ request, mode: "dry-run" })).externalCalls, 0);
  let calls = 0; const grant = { type: "TTIDiscordPublicationGrant", issuer: TTI_ACTOR, holder: REPORTING_ACTOR, guildId: "guild", channelId: "channel", idempotencyKey: "hour-1", effects: ["discord-message-create:one-atomic-multipart"], expiresAt: "2026-07-19T00:00:00.000Z", pilot: true };
  const receipt = await publishAtomicDiscordReport({ request, grant, mode: "live", recordedAt, transport: { async createAtomicMultipartMessage(value) { calls += 1; assert.equal(value.attachments.length, 3); return { messageId: "message", guildId: "guild", channelId: "channel" }; } } });
  assert.equal(receipt.status, "succeeded"); assert.equal(calls, 1);
  const duplicate = await publishAtomicDiscordReport({ request, grant, mode: "live", recordedAt, priorReceipt: receipt, transport: { async createAtomicMultipartMessage() { calls += 1; } } });
  assert.equal(duplicate.type, "TTIDiscordPublicationNoDuplicate"); assert.equal(calls, 1);
});

test("hourly operation remains prohibited until an authorized successful pilot receipt", () => {
  assert.equal(admitHourlyOperation(null).type, "HourlyOperationRefusal");
  assert.equal(admitHourlyOperation({ id: "urn:pilot", type: "TTIDiscordPublicationReceipt", status: "succeeded", pilot: true, atomicMultipart: true }).type, "HourlyOperationAdmissionCandidate");
});

test("contract dry run freezes evidence without Google or Discord calls", async () => {
  const customer = "urn:ame:leader-movement-team"; const request = { type: "HarmoniousUnionReportRequest", mode: "dry-run", period, recordedAt, subscription, responses: [], previousSuccessfulManifest: null };
  const solicitation = { "@context": "https://www.w3.org/ns/activitystreams", id: "urn:test:report-solicitation", type: "Offer", actor: customer, target: REPORTING_ACTOR, object: { type: "HarmoniousUnionReportingSolicitation", request } };
  const offer = solicitStateReport(solicitation); assert.equal(offer.type, "Offer");
  const capability = { type: "PurposeBoundCapability", issuer: customer, holder: REPORTING_ACTOR, invocationTarget: REPORTING_ACTOR, requestDigest: offer.object.requestDigest, providerOfferDigest: digest(offer), singleUse: true, effects: offer.object.effects, expiresAt: "2026-07-19T00:00:00.000Z" };
  const invocation = { "@context": solicitation["@context"], id: "urn:test:report-invocation", type: "Accept", actor: customer, target: REPORTING_ACTOR, object: { offer, capability } };
  const dataRoot = mkdtempSync(join(tmpdir(), "union-report-contract-test-"));
  const result = await invokeStateReport(invocation, { dataRoot, transport: { async createAtomicMultipartMessage() { throw new Error("must not call"); } } });
  assert.equal(result.type, "Accept"); assert.equal(result.object.publication.externalCalls, 0); assert.equal(result.object.baselineAdvanced, false);
  const replay = await invokeStateReport(invocation, { dataRoot }); assert.equal(replay.type, "Reject"); assert.equal(replay.object.reason, "single-use-reporting-capability-already-consumed");
  const forged = structuredClone(offer); forged.actor = customer; forged.target = customer;
  const forgedCapability = { ...capability, providerOfferDigest: digest(forged) };
  const forgedResult = await invokeStateReport({ ...invocation, id: "urn:test:forged-report-invocation", object: { offer: forged, capability: forgedCapability } }, { dataRoot: mkdtempSync(join(tmpdir(), "union-report-forged-test-")) });
  assert.equal(forgedResult.type, "Reject"); assert.equal(forgedResult.object.reason, "invalid-reporting-contract");
});
