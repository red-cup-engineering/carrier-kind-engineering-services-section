import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireKindleMarketSnapshots, robotsAllows } from "../src/market-acquisition.mjs";

test("robots longest match governs category acquisition", () => {
  const robots = "User-agent: *\nDisallow: /best\nAllow: /best/kindle\n";
  assert.equal(robotsAllows(robots, "https://www.amazon.com/best/kindle"), true);
  assert.equal(robotsAllows(robots, "https://www.amazon.com/best/print"), false);
});

test("fixture acquisition rate-limits and writes addressed snapshots", async () => {
  const root = await mkdtemp(join(tmpdir(), "kindle-market-"));
  const calls = [], sleeps = [];
  const acquire = async ({ urls }) => {
    const url = urls[0]; calls.push(url);
    const body = url.endsWith("robots.txt") ? "User-agent: *\nAllow: /best/kindle\n" : `<li data-asin="B000000001"><span data-field="rank">#100</span><b data-field="title">Fixture</b><i data-category="romance"></i><i data-quality="romance"></i></li>`;
    return { status: "settled", results: [{ requestedUrl: url, finalUrl: url, text: body, markup: body, textDigest: "ni:///sha-256;text", responseDigest: "ni:///sha-256;response", rights: "observed" }], obstructions: [] };
  };
  const result = await acquireKindleMarketSnapshots({ categories: [{ id: "romance", url: "https://www.amazon.com/best/kindle" }], dataRoot: root, observedAt: "2026-09-29T00:00:00Z", policy: { termsBasis: "fixture-policy-v1", permission: "permitted", reviewedAt: "2026-09-29", minimumIntervalMs: 5000 }, demands: [{ id: "romance", wants: ["romance"], evidence: { for: [{ source: "fixture" }], against: [] } }] }, { acquire, sleep: async (ms) => sleeps.push(ms) });
  assert.deepEqual(calls, ["https://www.amazon.com/robots.txt", "https://www.amazon.com/best/kindle"]);
  assert.deepEqual(sleeps, [5000]);
  assert.equal(result.snapshots.length, 1);
  assert.match(result.analysis.id, /^ni:\/\/\/sha-256;/u);
  assert.equal((await readdir(join(root, "snapshots"))).length, 1);
  assert.equal((await readdir(join(root, "analyses"))).length, 1);
});
