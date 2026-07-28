#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { REPORTING_ACTOR, createSubscriptionManifest, digest } from "./state-reporting.mjs";
import { invokeStateReport, solicitStateReport } from "./contract-state-reporting.mjs";

const customer = "urn:ame:leader-movement-team"; const subscription = createSubscriptionManifest({ version: "dry-pilot-1", effectiveAt: "2026-07-18T23:00:00.000Z", constituents: [] });
const request = { type: "HarmoniousUnionReportRequest", mode: "dry-run", period: "2026-07-18T23:00:00Z/PT1H", recordedAt: "2026-07-18T23:30:00.000Z", subscription, responses: [], previousSuccessfulManifest: null };
const solicitation = { "@context": "https://www.w3.org/ns/activitystreams", id: "urn:verify:solicitation", type: "Offer", actor: customer, target: REPORTING_ACTOR, object: { type: "HarmoniousUnionReportingSolicitation", request } };
const offer = solicitStateReport(solicitation); assert.equal(offer.type, "Offer");
const capability = { type: "PurposeBoundCapability", issuer: customer, holder: REPORTING_ACTOR, invocationTarget: REPORTING_ACTOR, requestDigest: offer.object.requestDigest,
  providerOfferDigest: digest(offer), singleUse: true, effects: offer.object.effects, expiresAt: "2026-07-19T00:00:00.000Z" };
const invocation = { "@context": solicitation["@context"], id: "urn:verify:invocation", type: "Accept", actor: customer, target: REPORTING_ACTOR, object: { offer, capability } };
const result = await invokeStateReport(invocation, { dataRoot: mkdtempSync(`${tmpdir()}/harmonious-union-verify-`) });
assert.equal(result.type, "Accept"); assert.equal(result.object.publication.externalCalls, 0); assert.equal(result.object.baselineAdvanced, false);
process.stdout.write(`${JSON.stringify({ type: "HarmoniousUnionReportingDryRunVerification", passed: true, subscriptionDigest: subscription.subscriptionDigest, currentManifest: result.object.currentManifest.id, externalCalls: 0 })}\n`);
