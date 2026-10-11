import test from "node:test";
import assert from "node:assert/strict";
import { notePeerHealth, observeIdlePeers, observePeerHealth, PEER_HEALTH_MAX_BYTES } from "../src/peer-liveness.mjs";

const peer = "https://cold-red-gate.561.group/actors/metroplat";
const contract = { actor: peer, kind: "metroplat-supervised-health", service: "cold-red-gate.561.group" };
const healthy = { service: "cold-red-gate.561.group", ok: true, state: "ready", nativeActor: { ok: true } };
const answer = (body = healthy) => Response.json(body);
const at = minutes => new Date(Date.UTC(2026, 9, 10, 0, minutes)).toISOString();
const journal = () => {
  const records = [];
  return { records, query: () => records, record: row => { records.push(row); return row; } };
};

test("idle observation uses the declared peer origin and the real supervised health contract", async () => {
  let seen;
  const result = await observePeerHealth(peer, { contract, probe: async (url, options) => { seen = { url, options }; return answer(); } });
  assert.equal(result.ready, true);
  assert.equal(result.reason, "health-ready");
  assert.equal(result.readiness.state, "ready");
  assert.equal(seen.url, "https://cold-red-gate.561.group/healthz");
  assert.equal(seen.options.redirect, "error");
  assert.equal(seen.options.credentials, "omit");
  assert.equal(seen.options.method, "GET");
  assert.equal(seen.options.headers.authorization, undefined);
  assert.ok(seen.options.signal instanceof AbortSignal);
  assert.equal((await observePeerHealth(peer, { contract, probe: async () => answer({ ...healthy, state: "degraded" }) })).ready, true);
});

test("HTTP success, HTML, another service and failed native actor never supply recovery", async () => {
  for (const body of [{}, { ok: true }, { ...healthy, ok: false }, { ...healthy, state: "starting" },
    { ...healthy, nativeActor: { ok: false } }, { ...healthy, nativeActor: undefined },
    { ...healthy, service: "bare-cedar-fog.561.group" }]) {
    assert.equal((await observePeerHealth(peer, { contract, probe: async () => answer(body) })).ready, false);
  }
  assert.equal((await observePeerHealth(peer, { contract, probe: async () => new Response("<html>proxy</html>") })).ready, false);
  assert.equal((await observePeerHealth(peer, { contract, probe: async () => new Response("", { status: 302 }) })).ready, false);
});

test("unreachable, stalled body and oversized body remain bounded observations", async () => {
  assert.equal((await observePeerHealth(peer, { contract, probe: async () => { throw Error("offline"); } })).reason, "health-unreachable");
  assert.equal((await observePeerHealth(peer, { contract, timeoutMs: 5, probe: () => new Promise(() => {}) })).reason, "health-timeout");
  let cancelled = 0;
  const body = new ReadableStream({ start() {}, cancel() { cancelled++; } });
  assert.equal((await observePeerHealth(peer, { contract, timeoutMs: 5, probe: async () => new Response(body) })).reason, "health-timeout");
  assert.equal(cancelled, 1, "stalled response reader is explicitly cancelled");
  let customCancelled = 0, released = 0;
  const stubborn = { status: 200, body: { getReader: () => ({
    read: () => new Promise(() => {}),
    cancel: () => { customCancelled++; return new Promise(() => {}); },
    releaseLock: () => { released++; },
  }) } };
  assert.equal((await observePeerHealth(peer, { contract, timeoutMs: 5, probe: async () => stubborn })).reason, "health-timeout");
  assert.equal(customCancelled, 1, "an uncooperative provider cannot make cleanup unbounded");
  assert.equal(released, 1);
  const large = new Response(" ".repeat(PEER_HEALTH_MAX_BYTES + 1));
  assert.equal((await observePeerHealth(peer, { contract, probe: async () => large })).reason, "health-body-too-large");
});

test("an existing work delivery is not repeated or delayed by a health probe", async () => {
  const active = { peer, shipped: 1, failed: [] };
  const failed = { peer, shipped: 0, failed: [{ away: true }] };
  let calls = 0;
  const observed = await observeIdlePeers([active, failed], { contracts: [contract], probe: async () => { calls++; throw Error("must not run"); } });
  assert.equal(calls, 0);
  assert.strictEqual(observed[0], active);
  assert.strictEqual(observed[1], failed);
  const idle = await observeIdlePeers([{ peer, shipped: 0, failed: [] }], { contracts: [contract], probe: async () => { calls++; return answer(); } });
  assert.equal(calls, 1);
  assert.equal(idle[0].shipped, 0, "a health read is not a fabricated delivered work move");
  assert.equal(idle[0].health.ready, true);
});

test("unsupported peer locations do not probe or fail the existing work return", async () => {
  for (const peer of ["invalid", "http://local.invalid/actor", "https://name:secret@example.invalid/actor"]) {
    const observed = await observeIdlePeers([{ peer, shipped: 0, failed: [] }], { contracts: [contract], probe: () => { throw Error("must not read"); } });
    assert.equal(observed[0].health.observed, false);
    const kept = journal();
    notePeerHealth(kept, { observer: "bare-cedar-fog", peer, now: at(0), health: observed[0].health });
    assert.equal(kept.records.length, 0);
  }
});

test("idle health absence preserves the existing threshold, then qualified recovery opens a new window", () => {
  const kept = journal();
  const base = { observer: "bare-cedar-fog", peer };
  const missing = { ready: false, reason: "health-unreachable" };
  assert.equal(notePeerHealth(kept, { ...base, now: at(0), health: missing }).reading, "unknown");
  assert.equal(notePeerHealth(kept, { ...base, now: at(59), health: missing }).reading, "unknown");
  assert.equal(notePeerHealth(kept, { ...base, now: at(65), health: missing }).reading, "denied");
  assert.equal(notePeerHealth(kept, { ...base, now: at(70), health: { ready: false, reason: "health-unready" } }).reading, "denied");
  assert.equal(notePeerHealth(kept, { ...base, now: at(75), health: { ready: true, reason: "health-ready" } }).reading, "held");
  assert.ok(kept.records.some(row => row.record.why === "health-ready"));
  assert.ok(kept.records.some(row => row.told.against === true), "past fault witness stays in custody");
});

test("a known-intermittent peer remains unknown rather than becoming a production fault", () => {
  const kept = journal();
  for (const minutes of [0, 65, 600]) {
    assert.equal(notePeerHealth(kept, { observer: "cold-red-gate", peer, presence: "known-intermittent",
      now: at(minutes), health: { ready: false, reason: "health-unreachable" } }).reading, "unknown");
  }
  assert.ok(kept.records.every(row => row.told.against === false));
});

test("a work peer without a participating health contract stays unobserved and unknown", async () => {
  let calls = 0;
  for (const contracts of [undefined, [], [{ ...contract, actor: "https://other.example/actors/node" }],
    [{ ...contract, kind: "activitypub" }], [{ ...contract, service: "" }]]) {
    const rows = await observeIdlePeers([{ peer, shipped: 0, failed: [] }], { contracts,
      probe: async () => { calls++; return new Response("no health endpoint", { status: 404 }); } });
    assert.equal(rows[0].health.observed, false);
    const kept = journal();
    for (const minutes of [0, 65, 120])
      assert.equal(notePeerHealth(kept, { observer: "bare-cedar-fog", peer, now: at(minutes), health: rows[0].health }).reading, "unknown");
    assert.equal(kept.records.length, 0);
  }
  assert.equal(calls, 0, "declared work authority alone does not enable HTTP observation");
});

test("qualified explicit unready bodies are retained immediately without changing liveness suspicion", async () => {
  const result = await observePeerHealth(peer, { contract, probe: async () => Response.json({
    ...healthy, ok: false, nativeActor: { ok: false },
  }, { status: 503 }) });
  assert.equal(result.ready, false);
  assert.equal(result.readiness.state, "failed");
  assert.equal(result.readiness.service, contract.service);
  const kept = journal();
  assert.equal(notePeerHealth(kept, { observer: "bare-cedar-fog", peer, now: at(0), health: result }).reading, "unknown");
  assert.equal(kept.records[0].record.serviceHealth.state, "failed");
  assert.equal(kept.records[0].told.against, false, "readiness failure does not rewrite the liveness threshold");
  const timeout = await observePeerHealth(peer, { contract, timeoutMs: 5, probe: () => new Promise(() => {}) });
  assert.equal(timeout.readiness, undefined, "transport silence supplies no direct service diagnosis");
});
