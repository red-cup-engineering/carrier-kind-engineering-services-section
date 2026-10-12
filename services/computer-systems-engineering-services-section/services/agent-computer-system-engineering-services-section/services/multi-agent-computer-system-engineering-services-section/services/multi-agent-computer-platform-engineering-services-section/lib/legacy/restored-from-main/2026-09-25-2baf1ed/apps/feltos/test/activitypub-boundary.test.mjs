import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeProfileUrl, isIpHost, isValidProfileUrl, isValidClientId, sameProfile, validateAuthorizationRequest, pkceChallenge, verifyPkce, createAuthorizationGrant, validateTokenExchange, normalizeScope, mintIndieAuthToken, verifyIndieAuthToken, tokenHasScope, allRelLinks, discoverRel, relMeLinks, discoverIndieAuthEndpoints, indieAuthMetadata } from "@red-cup-engineering/indieauth-profile-service/codec";
import { verifyRelMeBodies, authorizeBearerToken } from "@red-cup-engineering/indieauth-profile-service/validation";
import { verifyRelMe } from "@red-cup-engineering/indieauth-profile-service/client";
import { inMemoryGrantStore, indieAuthResources } from "@red-cup-engineering/indieauth-profile-service/resources";
import { scopeAllows, micropubConfigResponse, micropubCommandStatements, REQUIRED_SCOPE } from "@red-cup-engineering/micropub-services-section/codec";
import { parseMicropubForm, parseMicropubJson } from "@red-cup-engineering/micropub-services-section/codec";
import { authorizeMicropubAction } from "@red-cup-engineering/micropub-services-section/validation";
import { micropubResource } from "@red-cup-engineering/micropub-services-section/resource";
import { microsubResource } from "@red-cup-engineering/microsub-services-section/resource";
import { timelineRequest, searchRequest, mutationRequest, normalizeEntry } from "@red-cup-engineering/microsub-services-section/codec";
import { microsubTimeline } from "@red-cup-engineering/microsub-services-section/timeline";
import { metroplatNodeFromJson, discoverMetroplatNode, replayCloudEventToMetroplatPeer, metroplatNode, metroplatNodeFromProcessEnvironment, metroplatNodeResource, METROPLAT_NODE_WELL_KNOWN_NAME, METROPLAT_NODE_CONTRACT_VERSION } from "@red-cup-engineering/feltos/operations/federation/node";
import { webauthnGrant, registerWebAuthnCredential, challengeWebAuthnCredential, verifyWebAuthnCredential, assertWebAuthnCredential, cutWebAuthnCeremony, canAssertWebAuthnCredential, webauthnAssertionContract, webauthnChallengeContract, webauthnCutJudgmentContract, webauthnIdentityFacetContract, webauthnRegistrationContract, challenge } from "@red-cup-engineering/feltos/capability/webauthn";
import { assertHttpUrl } from "@red-cup-engineering/uri-services-section/http-url";
import { validateMentionPair, parseMentionRequest, acceptsTarget, webmentionEndpointsInHtml, webmentionEndpointsInLinkHeader, linksToTarget, outboundLinks, classifyMention } from "@red-cup-engineering/webmention-service/codec";
import { verifyMentionBody, verifyVouchBody, receiveMentionRequest } from "@red-cup-engineering/webmention-service/validation";
import { discoverWebmentionEndpoint, verifyWebmention, verifyWebmentionVouch, sendWebmention, sendAllWebmentions, sendSalmentions } from "@red-cup-engineering/webmention-service/client";
import { webmentionReceiverResource } from "@red-cup-engineering/webmention-service/receiver";
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
