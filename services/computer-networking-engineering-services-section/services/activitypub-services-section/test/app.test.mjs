import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { activityPubApplication, activityPubRouteManifest, matchesActivityPubRequest } from "../src/app.mjs";

test("route ownership is exact and does not capture neighboring site routes", () => {
  const owned = [
    "/.well-known/webfinger?resource=acct:notes@example.test", "/.well-known/nodeinfo", "/nodeinfo/2.1", "/inbox",
    "/actors/notes", "/actors/notes/inbox", "/actors/notes/outbox?page=true", "/actors/notes/posts/one",
  ];
  const foreign = [
    "/", "/.well-known/security.txt", "/.well-known/webfinger-extra", "/nodeinfo/2.0", "/actors", "/actors/other",
    "/actors/notes/profile", "/actors/notes/followers", "/actors/notes/posts", "/actors/notes/posts/one/comments", "/assets/actors/notes",
  ];
  for (const path of owned) assert.equal(matchesActivityPubRequest(path, "notes"), true, path);
  for (const path of foreign) assert.equal(matchesActivityPubRequest(path, "notes"), false, path);
});

test("route manifest names the finite owned surface", () => {
  const manifest = activityPubRouteManifest({ identifier: "notes" });
  assert.equal(manifest.length, 9);
  assert.ok(Object.isFrozen(manifest));
  assert.deepEqual(manifest.map(({ route }) => route), [
    "/.well-known/webfinger", "/.well-known/nodeinfo", "/nodeinfo/2.1", "/inbox", "/activities/:activityId", "/actors/notes",
    "/actors/notes/inbox", "/actors/notes/outbox", "/actors/notes/posts/:postId",
  ]);
  const withFollowers = activityPubRouteManifest({ identifier: "notes", routeCapabilities: { followers: true } });
  assert.equal(withFollowers.length, 10);
  assert.equal(withFollowers.some(({ id }) => id === "activitypub.actor-followers"), true);
  assert.equal(matchesActivityPubRequest("/actors/notes/followers", { identifier: "notes", routeCapabilities: { followers: true } }), true);
  assert.throws(() => activityPubRouteManifest("bad/identifier"), /identifier segment/);
});

test("App adapter exposes visible resources and delegates protocol behavior", async () => {
  const requests = [];
  const provider = {
    identifier: "notes",
    fetch: async (request) => { requests.push(request); return new Response("provider", { status: 200 }); },
  };
  const app = activityPubApplication(provider);
  assert.equal(app.resources.length, 9);
  assert.deepEqual(app.resources.map(({ route }) => route), activityPubRouteManifest(provider).map(({ route }) => route));
  assert.ok(app.resources.every((resource) => resource.methods === undefined));
  const actor = app.resources.find(({ id }) => id === "activitypub.actor");
  const incoming = Readable.from([]);
  Object.assign(incoming, { method: "GET", url: "/actors/notes?view=full", headers: { host: "example.test", accept: "application/activity+json" } });
  const response = await actor.handler({ req: incoming, url: new URL("https://example.test/actors/notes?view=full"), signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "provider");
  assert.equal(requests[0].url, "https://example.test/actors/notes?view=full");
  assert.equal(requests[0].headers.get("accept"), "application/activity+json");
});

test("post matcher accepts one object-id segment only", () => {
  const app = activityPubApplication({ identifier: "notes", fetch: async () => new Response() });
  const post = app.resources.find(({ id }) => id === "activitypub.actor-post");
  assert.equal(post.match.test("/actors/notes/posts/one"), true);
  assert.equal(post.match.test("/actors/notes/posts/one/comments"), false);
  assert.equal(post.match.test("/actors/other/posts/one"), false);
});
