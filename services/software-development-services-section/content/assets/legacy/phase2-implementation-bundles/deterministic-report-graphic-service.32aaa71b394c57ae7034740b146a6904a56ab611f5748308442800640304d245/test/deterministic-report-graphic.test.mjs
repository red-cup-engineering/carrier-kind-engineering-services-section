import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACTOR, invokeGraphic, solicitGraphic } from "../src/contract-deterministic-report-graphic.mjs";
import { MECHANICAL_CLASSIFICATIONS, renderDeterministicReportGraphic } from "../src/deterministic-report-graphic.mjs";

const packet = { type: "HarmoniousUnionDeltaPacket", period: "2026-07-18T23:00:00Z/PT1H", subscriptionDigest: "sha256:subscription",
  previousSuccessfulPublicationDigest: null, currentManifestDigest: "sha256:current", claims: MECHANICAL_CLASSIFICATIONS.map((classification, index) => ({ settlement: `urn:ame:${index}`, claimId: `claim-${index}`, classification })) };

test("equal canonical delta packets produce byte-identical safe SVG and PNG", () => {
  const first = renderDeterministicReportGraphic(packet); const reordered = renderDeterministicReportGraphic({ ...packet, claims: [...packet.claims].reverse() });
  assert.equal(first.type, "DeterministicReportGraphicArtifact"); assert.equal(first.svgDigest, reordered.svgDigest); assert.equal(first.pngDigest, reordered.pngDigest);
  const svg = Buffer.from(first.svgBase64, "base64").toString("utf8"); const png = Buffer.from(first.pngBase64, "base64");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" version="1\.2" baseProfile="tiny"/u);
  assert.doesNotMatch(svg, /(?:script|style|href|url\(|foreignObject)/iu); assert.deepEqual(png.subarray(0, 8), Buffer.from([137,80,78,71,13,10,26,10]));
  assert.equal(first.rasterizedFromExactSvgDigest, first.svgDigest); assert.equal(png.includes(Buffer.from(`rasterized-from-svg-sha256\0${first.svgDigest}`)), true);
});

test("a material classification change changes both exact artifacts", () => {
  const first = renderDeterministicReportGraphic(packet); const changed = renderDeterministicReportGraphic({ ...packet, claims: packet.claims.map((claim, index) => index === 0 ? { ...claim, classification: "refused" } : claim) });
  assert.notEqual(first.svgDigest, changed.svgDigest); assert.notEqual(first.pngDigest, changed.pngDigest);
});

test("untyped, duplicate, and epistemic-state packets honestly refuse", () => {
  assert.equal(renderDeterministicReportGraphic({ type: "Dashboard" }).type, "DeterministicReportGraphicRefusal");
  assert.equal(renderDeterministicReportGraphic({ ...packet, claims: [packet.claims[0], packet.claims[0]] }).type, "DeterministicReportGraphicRefusal");
  assert.equal(renderDeterministicReportGraphic({ ...packet, claims: [{ settlement: "urn:ame:a", claimId: "x", classification: "held" }] }).type, "DeterministicReportGraphicRefusal");
});

test("contract face returns an artifact and append-only provider receipt", () => {
  const customer = "urn:ame:test-customer"; const solicitation = { "@context": "https://www.w3.org/ns/activitystreams", id: "urn:test:solicitation", type: "Offer", actor: customer, target: ACTOR, object: { type: "DeterministicReportGraphicSolicitation", request: packet } };
  const offered = solicitGraphic(solicitation); assert.equal(offered.type, "Offer");
  const capability = { type: "PurposeBoundCapability", issuer: customer, holder: ACTOR, invocationTarget: ACTOR, requestDigest: offered.object.requestDigest,
    providerOfferDigest: "pending", singleUse: true,
    effects: offered.object.effects, expiresAt: "2026-07-19T00:00:00.000Z" };
  // The contract digest uses recursive canonicalization; solicit again through a helper invocation whose capability digest is derived below.
  function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`; return JSON.stringify(value); }
  capability.providerOfferDigest = `sha256:${createHash("sha256").update(canonical(offered)).digest("hex")}`;
  const invocation = { "@context": solicitation["@context"], id: "urn:test:invocation", type: "Accept", actor: customer, target: ACTOR, object: { offer: offered, capability } };
  const result = invokeGraphic(invocation, { recordedAt: "2026-07-18T23:30:00.000Z", dataRoot: mkdtempSync(join(tmpdir(), "graphic-service-test-")) });
  assert.equal(result.type, "Accept"); assert.equal(result.object.rasterizedFromExactSvgDigest, result.object.svgDigest); assert.equal(result.object.resourceReceipt.monetaryCost.value, 0);
});

test("the child boundary refuses forged offers invalid expiry and capability replay", () => {
  const customer = "urn:ame:adversarial-customer";
  const solicitation = { "@context": "https://www.w3.org/ns/activitystreams", id: "urn:test:adversarial-solicitation", type: "Offer", actor: customer, target: ACTOR, object: { type: "DeterministicReportGraphicSolicitation", request: packet } };
  const offered = solicitGraphic(solicitation);
  function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`; return JSON.stringify(value); }
  const providerOfferDigest = `sha256:${createHash("sha256").update(canonical(offered)).digest("hex")}`;
  const baseCapability = { type: "PurposeBoundCapability", issuer: customer, holder: ACTOR, invocationTarget: ACTOR, requestDigest: offered.object.requestDigest,
    providerOfferDigest, singleUse: true, effects: offered.object.effects, expiresAt: "2026-07-19T00:00:00.000Z" };
  const invoke = (offer, capability, id) => ({ "@context": solicitation["@context"], id, type: "Accept", actor: customer, target: ACTOR, object: { offer, capability } });
  const dataRoot = mkdtempSync(join(tmpdir(), "graphic-service-adversarial-"));
  const forged = structuredClone(offered); forged.actor = customer; forged.target = customer;
  const forgedCapability = { ...baseCapability, providerOfferDigest: `sha256:${createHash("sha256").update(canonical(forged)).digest("hex")}` };
  assert.equal(invokeGraphic(invoke(forged, forgedCapability, "urn:test:forged"), { recordedAt: "2026-07-18T23:30:00.000Z", dataRoot }).type, "Reject");
  assert.equal(invokeGraphic(invoke(offered, { ...baseCapability, expiresAt: "not-a-date" }, "urn:test:invalid-expiry"), { recordedAt: "2026-07-18T23:30:00.000Z", dataRoot }).type, "Reject");
  const valid = invoke(offered, baseCapability, "urn:test:single-use");
  assert.equal(invokeGraphic(valid, { recordedAt: "2026-07-18T23:30:00.000Z", dataRoot }).type, "Accept");
  const replay = invokeGraphic(valid, { recordedAt: "2026-07-18T23:31:00.000Z", dataRoot });
  assert.equal(replay.type, "Reject");
  assert.equal(replay.object.reason, "single-use-graphic-capability-already-consumed");
});
