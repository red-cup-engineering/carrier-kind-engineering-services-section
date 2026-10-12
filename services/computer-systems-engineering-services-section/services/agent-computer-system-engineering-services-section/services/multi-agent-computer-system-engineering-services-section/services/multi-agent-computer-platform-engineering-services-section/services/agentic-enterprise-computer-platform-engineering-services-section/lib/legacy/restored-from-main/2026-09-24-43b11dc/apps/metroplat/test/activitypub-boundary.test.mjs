import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeProfileUrl, isIpHost, isValidProfileUrl, isValidClientId, sameProfile, validateAuthorizationRequest, pkceChallenge, verifyPkce, createAuthorizationGrant, validateTokenExchange, normalizeScope, mintIndieAuthToken, verifyIndieAuthToken, tokenHasScope, allRelLinks, discoverRel, relMeLinks, discoverIndieAuthEndpoints, indieAuthMetadata } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/codec";
import { verifyRelMeBodies, authorizeBearerToken } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/validation";
import { verifyRelMe } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/client";
import { inMemoryGrantStore, indieAuthResources } from "../src/integrations/federation/indieauth/service.mjs";
import { scopeAllows, micropubConfigResponse, micropubCommandStatements, REQUIRED_SCOPE } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/micropub/codec";
import { parseMicropubForm, parseMicropubJson } from "@red-cup-engineering/micropub-services-section";
import { authorizeMicropubAction } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/micropub/validation";
import { micropubResource } from "../src/integrations/federation/micropub/service.mjs";
import { microsubResource } from "../src/integrations/federation/microsub/index.mjs";
import { timelineRequest, searchRequest, mutationRequest, normalizeEntry } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/microsub/codec";
import { microsubTimeline } from "../src/integrations/federation/microsub/timeline.mjs";
import { metroplatNodeFromJson, discoverMetroplatNode, replayCloudEventToMetroplatPeer, metroplatNode, metroplatNodeFromProcessEnvironment, metroplatNodeResource, METROPLAT_NODE_WELL_KNOWN_NAME, METROPLAT_NODE_CONTRACT_VERSION } from "../src/integrations/federation/node.mjs";
import { webauthnGrant, registerWebAuthnCredential, challengeWebAuthnCredential, verifyWebAuthnCredential, assertWebAuthnCredential, cutWebAuthnCeremony, canAssertWebAuthnCredential, webauthnAssertionContract, webauthnChallengeContract, webauthnCutJudgmentContract, webauthnIdentityFacetContract, webauthnRegistrationContract, challenge } from "@red-cup-engineering/feltos/capability/webauthn";
import { assertHttpUrl, validateMentionPair, parseMentionRequest, acceptsTarget, webmentionEndpointsInHtml, webmentionEndpointsInLinkHeader, linksToTarget, outboundLinks, classifyMention } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/webmention/codec";
import { verifyMentionBody, verifyVouchBody, receiveMentionRequest } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/webmention/validation";
import { discoverWebmentionEndpoint, verifyWebmention, verifyWebmentionVouch, sendWebmention, sendAllWebmentions, sendSalmentions } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/webmention/client";
import { webmentionReceiverResource } from "../src/integrations/federation/webmention/receiver.mjs";
const federation = Object.freeze({ indieauth: { canonicalizeProfileUrl, isIpHost, isValidProfileUrl, isValidClientId, sameProfile, validateAuthorizationRequest, pkceChallenge, verifyPkce, createAuthorizationGrant, validateTokenExchange, normalizeScope, mintIndieAuthToken, verifyIndieAuthToken, tokenHasScope, allRelLinks, discoverRel, relMeLinks, discoverIndieAuthEndpoints, indieAuthMetadata, verifyRelMeBodies, authorizeBearerToken, verifyRelMe, inMemoryGrantStore, indieAuthResources }, micropub: { scopeAllows, micropubConfigResponse, micropubCommandStatements, REQUIRED_SCOPE, parseMicropubForm, parseMicropubJson, authorizeMicropubAction, micropubResource }, microsub: { microsubResource, timelineRequest, searchRequest, mutationRequest, normalizeEntry, microsubTimeline }, node: { metroplatNodeFromJson, discoverMetroplatNode, replayCloudEventToMetroplatPeer, metroplatNode, metroplatNodeFromProcessEnvironment, metroplatNodeResource, METROPLAT_NODE_WELL_KNOWN_NAME, METROPLAT_NODE_CONTRACT_VERSION }, webauthn: { webauthnGrant, registerWebAuthnCredential, challengeWebAuthnCredential, verifyWebAuthnCredential, assertWebAuthnCredential, cutWebAuthnCeremony, canAssertWebAuthnCredential, webauthnAssertionContract, webauthnChallengeContract, webauthnCutJudgmentContract, webauthnIdentityFacetContract, webauthnRegistrationContract, challenge }, webmention: { assertHttpUrl, validateMentionPair, parseMentionRequest, acceptsTarget, webmentionEndpointsInHtml, webmentionEndpointsInLinkHeader, linksToTarget, outboundLinks, classifyMention, verifyMentionBody, verifyVouchBody, receiveMentionRequest, discoverWebmentionEndpoint, verifyWebmention, verifyWebmentionVouch, sendWebmention, sendAllWebmentions, sendSalmentions, webmentionReceiverResource } });

test("MetroPlat has no embedded ActivityPub protocol implementation", () => {
  assert.equal("activitypub" in federation, false);
  assert.equal("webfinger" in federation, false);
  assert.equal("nodeinfo" in federation, false);
  assert.equal(typeof federation.indieauth.validateAuthorizationRequest, "function");
  assert.equal(typeof federation.micropub.parseMicropubJson, "function");
  assert.equal(typeof federation.microsub.timelineRequest, "function");
  assert.equal(typeof federation.webmention.parseMentionRequest, "function");
});
