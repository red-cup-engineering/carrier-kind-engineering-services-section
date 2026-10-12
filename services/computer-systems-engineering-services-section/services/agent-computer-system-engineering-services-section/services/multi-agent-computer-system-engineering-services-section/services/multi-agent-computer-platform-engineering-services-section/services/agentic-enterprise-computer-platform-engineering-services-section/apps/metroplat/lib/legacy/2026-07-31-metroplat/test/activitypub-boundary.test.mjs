import assert from "node:assert/strict";
import test from "node:test";

import * as federation from "../src/integrations/federation/index.mts";

test("MetroPlat has no embedded ActivityPub protocol implementation", () => {
  assert.equal("activitypub" in federation, false);
  assert.equal("webfinger" in federation, false);
  assert.equal("nodeinfo" in federation, false);
  assert.equal(typeof federation.indieauth.validateAuthorizationRequest, "function");
  assert.equal(typeof federation.micropub.parseMicropubJson, "function");
  assert.equal(typeof federation.microsub.timelineRequest, "function");
  assert.equal(typeof federation.webmention.parseMentionRequest, "function");
});
