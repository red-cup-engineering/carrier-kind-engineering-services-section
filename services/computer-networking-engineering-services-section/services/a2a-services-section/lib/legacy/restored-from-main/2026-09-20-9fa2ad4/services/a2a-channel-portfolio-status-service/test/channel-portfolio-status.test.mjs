import assert from "node:assert/strict";
import test from "node:test";

import {
  addressChannelPortfolioRecord,
  channelPortfolioStatusRequestBytes,
  channelPortfolioStatusResultFromPart,
  EMSWEB_VIDEO_FEDERATION,
  executeChannelPortfolioStatusMessage,
  formChannelPortfolioStatusResult,
} from "../src/channel-portfolio-status.mjs";
import { extractRmnPart, parseA2aMessage, userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";

const ACTOR = "urn:ame:fixture-youtube-channel";
const DAY = "2096-07-21";
const exact = addressChannelPortfolioRecord;

function request(overrides = {}) {
  return exact({
    type: "ChannelPortfolioStatusRequest",
    federation: EMSWEB_VIDEO_FEDERATION,
    channel: ACTOR,
    civilDay: DAY,
    timezone: "America/Chicago",
    ...overrides,
  });
}

function status(overrides = {}) {
  return exact({
    type: "ChannelPortfolioStatus",
    channel: ACTOR,
    civilDay: DAY,
    timezone: "America/Chicago",
    generationAdmissions: [],
    releaseClaims: [],
    publicationReceipts: [],
    privateDraftReceipts: [],
    inventory: [],
    ...overrides,
  });
}

test("shared provider wraps one channel-owned exact status without taking custody", async () => {
  let reads = 0;
  const result = await formChannelPortfolioStatusResult({
    request: request(),
    actor: ACTOR,
    formStatus: async () => {
      reads += 1;
      return status();
    },
  });
  assert.equal(reads, 1);
  assert.equal(result.delivery.actor, ACTOR);
  assert.equal(result.delivery.target, EMSWEB_VIDEO_FEDERATION);
  assert.equal(result.delivery.object.civilDay, DAY);
  assert.match(result.delivery.id, /^ni:\/\/\/sha-256;/u);
});

test("typed RMN request and result travel as independently verified token/claim packets", async () => {
  const input = request();
  const message = userRmnMessage(channelPortfolioStatusRequestBytes(input));
  const requestPart = extractRmnPart(parseA2aMessage(message).parts);
  // Golden identity for codec 0.0.4 (relation-model-notation 0.0.2): the
  // codec source itself is unchanged from 0.0.3, but 0.0.3 could never
  // actually be installed (its own dependency on relation-model-notation
  // was `workspace:*`), so no prior release of this package ever produced a
  // verified digest against this dependency graph to compare against.
  assert.equal(requestPart.ni, "ni:///sha-256;NKVS3GFjdSS-LMC6Zs8rpF6GLsim90UfqzQ_Egcn__A");

  const response = await executeChannelPortfolioStatusMessage({
    message,
    actor: ACTOR,
    formStatus: () => status(),
  });
  const resultPart = extractRmnPart(parseA2aMessage(response).parts);
  const result = channelPortfolioStatusResultFromPart(resultPart);
  assert.equal(result.disposition, "status");
  assert.equal(result.delivery.object.channel, ACTOR);
});

test("foreign request and changed callback status are refused", async () => {
  await assert.rejects(
    () => formChannelPortfolioStatusResult({ request: request({ federation: "urn:foreign" }), actor: ACTOR, formStatus: () => status() }),
    /noncanonical, foreign/u,
  );
  await assert.rejects(
    () => formChannelPortfolioStatusResult({ request: request(), actor: ACTOR, formStatus: () => status({ civilDay: "2096-07-22" }) }),
    /changed or foreign/u,
  );
});

test("legacy urn:sha256 sorted-JSON identities no longer verify", async () => {
  const current = request();
  const legacy = { ...current, id: `urn:sha256:${"a".repeat(64)}` };
  await assert.rejects(
    () => formChannelPortfolioStatusResult({ request: legacy, actor: ACTOR, formStatus: () => status() }),
    /noncanonical/u,
  );
});

test("carrier values which would silently change at the JSON/RMN boundary are refused", () => {
  assert.throws(
    () => exact({
      type: "ChannelPortfolioStatus",
      channel: ACTOR,
      civilDay: DAY,
      timezone: "America/Chicago",
      ready: true,
    }),
    /Boolean-to-FOUR/u,
  );
});

test("a Boolean nested inside inventory is refused the same as a top-level one", () => {
  assert.throws(
    () => status({
      inventory: [{
        id: "urn:inventory:fixture",
        sourceGenerationAdmission: "urn:generation:fixture",
        artifact: "urn:artifact:fixture",
        generatedCivilDay: DAY,
        admittedAt: `${DAY}T12:00:00.000Z`,
        releaseEligible: true,
        releaseClaimCivilDay: null,
      }],
    }),
    /Boolean-to-FOUR/u,
  );
});

test("portfolio predicates retain explicit FOUR charges", () => {
  for (const releaseEligible of ["held", "denied", "unknown", "contested"]) {
    const addressed = status({
      inventory: [{
        id: "urn:inventory:fixture",
        sourceGenerationAdmission: "urn:generation:fixture",
        artifact: "urn:artifact:fixture",
        generatedCivilDay: DAY,
        admittedAt: `${DAY}T12:00:00.000Z`,
        releaseEligible,
        releaseClaimCivilDay: null,
      }],
    });
    assert.match(addressed.id, /^ni:\/\/\/sha-256;/u);
    assert.equal(addressed.inventory[0].releaseEligible, releaseEligible);
  }
});
