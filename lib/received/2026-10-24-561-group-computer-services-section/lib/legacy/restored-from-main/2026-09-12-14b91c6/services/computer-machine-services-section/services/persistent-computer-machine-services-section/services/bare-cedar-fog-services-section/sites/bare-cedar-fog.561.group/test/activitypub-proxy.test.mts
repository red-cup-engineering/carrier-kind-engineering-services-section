import assert from "node:assert/strict";
import test from "node:test";
import { isActivityPubPath, parseActivityPubRoutes, providerPortForUrl } from "../src/activitypub-proxy.mjs";

test("isActivityPubPath matches actor, inbox, and well-known paths", () => {
  assert.ok(isActivityPubPath("/actors/example"));
  assert.ok(isActivityPubPath("/actors/example/inbox"));
  assert.ok(isActivityPubPath("/inbox"));
  assert.ok(isActivityPubPath("/.well-known/webfinger"));
  assert.ok(!isActivityPubPath("/actors/example/extra/segments"));
  assert.ok(!isActivityPubPath("/unrelated"));
});

test("parseActivityPubRoutes throws when unconfigured", () => {
  assert.throws(() => parseActivityPubRoutes(""));
});

test("parseActivityPubRoutes parses a local port binding", () => {
  const routes = parseActivityPubRoutes("codex:8794");
  assert.equal(routes.get("codex"), 8794);
});

test("parseActivityPubRoutes parses a remote HTTPS binding and rejects a credentialed or path-bearing one", () => {
  const routes = parseActivityPubRoutes("remote=https://example.com");
  assert.equal(routes.get("remote").hostname, "example.com");
  assert.throws(() => parseActivityPubRoutes("bad=https://user:pass@example.com/path"));
});

test("parseActivityPubRoutes rejects a duplicate actor binding", () => {
  assert.throws(() => parseActivityPubRoutes("a:1,a:2"));
});

test("providerPortForUrl routes an actor path to its configured provider", () => {
  const routes = new Map([["codex", 8794]]);
  const port = providerPortForUrl(new URL("https://bare-cedar-fog.561.group/actors/codex"), { routes, nodePort: 8794 });
  assert.equal(port, 8794);
});

test("providerPortForUrl rejects a URL outside the configured colony host", () => {
  const routes = new Map([["codex", 8794]]);
  assert.throws(() => providerPortForUrl(new URL("https://elsewhere.example/actors/codex"), { routes, nodePort: 8794 }));
});

test("providerPortForUrl rejects an actor with no contracted provider", () => {
  const routes = new Map();
  assert.throws(() => providerPortForUrl(new URL("https://bare-cedar-fog.561.group/actors/unknown"), { routes, nodePort: 8794 }));
});
