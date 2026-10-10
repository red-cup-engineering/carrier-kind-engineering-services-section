import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { healthOf, nextStepOf, reconcileWorkerSite, rollbackArgumentsOf, shippedDigestOf, versionOfDeploy, workerSitesOf } from "../../src/deployment/deploy-worker-site.mjs";

test("a declaration names each site once, by slug, with paths inside it", () => {
  const [site] = workerSitesOf({ sites: [{ id: "farstone", directory: "sites/farstone", build: ["scripts/build.mjs"] }] });
  assert.deepEqual({ ...site, build: [...site.build] }, { id: "farstone", directory: "sites/farstone", build: ["scripts/build.mjs"], config: "wrangler.jsonc", output: "dist", health: [] });
  assert.deepEqual([...workerSitesOf({ sites: [{ id: "a", directory: "x", build: ["b.mjs"], health: ["https://a.561.group/"] }] })[0].health], ["https://a.561.group/"]);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "x", build: ["b.mjs"], health: ["http://a.561.group/"] }] }), /health/u);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "x", build: ["b.mjs"] }, { id: "a", directory: "y", build: ["b.mjs"] }] }), /twice/u);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "../x", build: ["b.mjs"] }] }), /inside/u);
  assert.throws(() => workerSitesOf({ sites: [{ id: "a", directory: "x", build: [] }] }), /build/u);
});

test("a release new to a site builds; a build unlike what is live deploys; else nothing", () => {
  assert.equal(nextStepOf({ release: "r2" }), "build");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r1", digest: "d" }, deployed: { digest: "d" } }), "build");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r2", digest: "d2" }, deployed: { digest: "d1" } }), "deploy");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r2", digest: "d2" } }), "deploy");
  assert.equal(nextStepOf({ release: "r2", built: { release: "r2", digest: "d" }, deployed: { digest: "d" } }), "current");
});

test("what a build ships is addressed by its output and configuration bytes alone", () => {
  const make = (worker) => {
    const root = mkdtempSync(join(tmpdir(), "worker-site-"));
    mkdirSync(join(root, "dist", "public"), { recursive: true });
    writeFileSync(join(root, "wrangler.jsonc"), "{}");
    writeFileSync(join(root, "dist", "worker.mjs"), worker);
    writeFileSync(join(root, "dist", "public", "index.html"), "<p>hi</p>");
    writeFileSync(join(root, "notes.txt"), String(Math.random()));
    return root;
  };
  const site = { config: "wrangler.jsonc", output: "dist" };
  assert.equal(shippedDigestOf(make("a"), site), shippedDigestOf(make("a"), site));
  assert.notEqual(shippedDigestOf(make("a"), site), shippedDigestOf(make("b"), site));
});

test("the Worker version a deploy went live as is read from Wrangler", () => {
  assert.equal(versionOfDeploy("Deployed farstone triggers\nCurrent Version ID: 0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b\n"), "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b");
  assert.equal(versionOfDeploy("nothing"), undefined);
});

test("health holds when every URL answers below 400, retrying a URL until it does", async () => {
  const answers = { "https://ok.test/": [200], "https://slow.test/": [502, 503, 200], "https://down.test/": [502, 502, 502] };
  const probe = async (url) => ({ status: answers[url].shift() ?? 502 });
  assert.deepEqual(await healthOf(["https://ok.test/", "https://slow.test/"], { probe, attempts: 3, delayMs: 1 }), { ok: true, failures: [] });
  const down = await healthOf(["https://ok.test/", "https://down.test/"], { probe: async (url) => ({ status: url.includes("down") ? 502 : 200 }), attempts: 3, delayMs: 1 });
  assert.equal(down.ok, false);
  assert.deepEqual(down.failures, [{ url: "https://down.test/", status: 502 }]);
  const thrown = await healthOf(["https://x.test/"], { probe: async () => { throw new Error("ENOTFOUND"); }, attempts: 2, delayMs: 1 });
  assert.deepEqual(thrown.failures, [{ url: "https://x.test/", error: "ENOTFOUND" }]);
});

test("a rollback names the version last live, the site's configuration and why", () => {
  assert.deepEqual([...rollbackArgumentsOf({ config: "wrangler.jsonc" }, "v-1", "health failed")], ["rollback", "v-1", "--config", "wrangler.jsonc", "--message", "health failed", "--yes"]);
});

/** A release tree with one site whose build writes its Worker, and a Wrangler that records its calls. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "worker-reconcile-"));
  const site = join(root, "release", "sites", "a");
  mkdirSync(join(site, "scripts"), { recursive: true });
  mkdirSync(join(site, "node_modules"), { recursive: true });
  writeFileSync(join(site, "wrangler.jsonc"), "{}");
  writeFileSync(join(site, "scripts", "build.mjs"), "import { mkdirSync, writeFileSync } from 'node:fs'; mkdirSync('dist', { recursive: true }); writeFileSync('dist/worker.mjs', 'export default {}');");
  const calls = join(root, "wrangler-calls");
  const wrangler = join(root, "wrangler");
  writeFileSync(wrangler, `#!/bin/sh\necho "$@" >> ${calls}\nif [ "$1" = deploy ]; then echo "Current Version ID: 11111111-2222-3333-4444-555555555555"; fi\n`);
  chmodSync(wrangler, 0o755);
  return { root, releaseRoot: join(root, "release"), stateRoot: join(root, "state"), calls, wrangler };
}

test("a deploy whose health fails is rolled back to the version last live and not recorded live", async () => {
  const { releaseRoot, stateRoot, calls, wrangler } = fixture();
  const [site] = workerSitesOf({ sites: [{ id: "a", directory: "sites/a", build: ["scripts/build.mjs"], health: ["https://a.test/"] }] });
  mkdirSync(join(stateRoot, "a"), { recursive: true });
  const before = { release: "r0", digest: "sha256:old", version: "00000000-0000-0000-0000-000000000000" };
  writeFileSync(join(stateRoot, "a", "deployed.json"), JSON.stringify(before));
  const result = await reconcileWorkerSite(site, { release: "r1", releaseRoot, stateRoot, wranglerPath: wrangler,
    probe: async () => ({ status: 502 }), healthOptions: { attempts: 2, delayMs: 1 } });
  assert.equal(result.ok, false);
  assert.equal(result.step, "rollback");
  assert.equal(result.rolledBackTo, before.version);
  const invoked = readFileSync(calls, "utf8").trim().split("\n");
  assert.match(invoked[0], /^deploy --config wrangler.jsonc/u);
  assert.match(invoked[1], /^rollback 00000000-0000-0000-0000-000000000000 --config wrangler.jsonc --message health failed after release r1 --yes$/u);
  assert.deepEqual(JSON.parse(readFileSync(join(stateRoot, "a", "deployed.json"), "utf8")), before, "only a healthy deploy is recorded live");
  const steps = readFileSync(join(stateRoot, "a", "receipts.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line).step);
  assert.deepEqual(steps, ["build", "health", "rollback"]);
});

test("a deploy whose health holds is recorded live with its version", async () => {
  const { releaseRoot, stateRoot, calls, wrangler } = fixture();
  const [site] = workerSitesOf({ sites: [{ id: "a", directory: "sites/a", build: ["scripts/build.mjs"], health: ["https://a.test/"] }] });
  const result = await reconcileWorkerSite(site, { release: "r1", releaseRoot, stateRoot, wranglerPath: wrangler, probe: async () => ({ status: 200 }) });
  assert.equal(result.ok, true);
  assert.equal(result.version, "11111111-2222-3333-4444-555555555555");
  assert.equal(JSON.parse(readFileSync(join(stateRoot, "a", "deployed.json"), "utf8")).version, result.version);
  assert.equal(readFileSync(calls, "utf8").trim().split("\n").length, 1, "no rollback");
  assert.ok(existsSync(join(stateRoot, "a", "build", "dist", "worker.mjs")));
});
