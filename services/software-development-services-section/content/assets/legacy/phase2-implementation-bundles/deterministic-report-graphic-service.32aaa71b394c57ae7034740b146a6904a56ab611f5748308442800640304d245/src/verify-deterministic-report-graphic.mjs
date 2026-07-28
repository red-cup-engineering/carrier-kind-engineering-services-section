#!/usr/bin/env node
import assert from "node:assert/strict";
import { renderDeterministicReportGraphic } from "./deterministic-report-graphic.mjs";

const packet = { type: "HarmoniousUnionDeltaPacket", period: "2026-07-18T23:00:00Z/PT1H", subscriptionDigest: "sha256:subscription",
  previousSuccessfulPublicationDigest: null, currentManifestDigest: "sha256:current", claims: [
    { settlement: "urn:ame:a", claimId: "delivery", classification: "added" },
    { settlement: "urn:ame:b", claimId: "price", classification: "unknown-unreported" },
    { settlement: "urn:ame:c", claimId: "border", classification: "disagreed" },
  ] };
const first = renderDeterministicReportGraphic(packet); const second = renderDeterministicReportGraphic({ ...packet, claims: [...packet.claims].reverse() });
assert.equal(first.type, "DeterministicReportGraphicArtifact"); assert.equal(first.svgDigest, second.svgDigest); assert.equal(first.pngDigest, second.pngDigest);
assert.equal(first.rasterizedFromExactSvgDigest, first.svgDigest);
assert.equal(Buffer.from(first.pngBase64, "base64").includes(Buffer.from(`rasterized-from-svg-sha256\0${first.svgDigest}`)), true);
process.stdout.write(`${JSON.stringify({ type: "DeterministicReportGraphicVerification", passed: true, svgDigest: first.svgDigest, pngDigest: first.pngDigest })}\n`);
