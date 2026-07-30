import assert from "node:assert/strict";
import test from "node:test";
import { serveGithubSoftwareInductionActivityPub } from "../src/serve-activitypub.mjs";

test("public provider face is ActivityPub custody rather than a public A2A listener", async () => {
  let admitted;
  const running = await serveGithubSoftwareInductionActivityPub({
    origin: "https://github-induction.example",
    custody: { kv: {}, inbox: {}, queue: {} },
    agentCardDocuments: { card: { signatures: [{ protected: "signed" }] }, jwks: { keys: [] } },
    serve: async (options) => {
      admitted = options;
      return { provider: { federation: { startQueue: async () => {} } } };
    },
  });
  assert.ok(running.provider);
  assert.equal(admitted.identifier, "github-software-induction-service");
  assert.equal(admitted.hostname, "0.0.0.0");
  assert.deepEqual(admitted.wellKnownResources["/.well-known/agent-card.json"].signatures, [{ protected: "signed" }]);
  assert.equal(Object.hasOwn(admitted.wellKnownResources, "/a2a/jsonrpc"), false);
});
