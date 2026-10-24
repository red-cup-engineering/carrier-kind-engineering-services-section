import assert from "node:assert/strict";
import test from "node:test";
import { collectDashboardRuntimeActivity as collectDashboardRuntimeActivityUntyped } from "../src/collect-colony-activity.mjs";

// The source module is plain JS; TypeScript's JS-inference for a destructured
// `window` parameter collides with the ambient DOM `window` global and drops
// it from the inferred parameter type. Re-declare the real call shape here so
// the tests can pass `window`/`recordedAt` without fighting that inference.
type PulseOptions = {
  window: { fromExclusive: string; toInclusive: string };
  recordedAt: string;
  fetchImpl?: typeof fetch;
};
const collectDashboardRuntimeActivity = collectDashboardRuntimeActivityUntyped as (options: PulseOptions) => Promise<{
  type: string;
  events: { outcome: string; quantities: { label: string; amount: string }[] }[];
  refusals: { domain: string; reason: string }[];
}>;

const testWindow = { fromExclusive: "2026-08-20T00:00:00.000Z", toInclusive: "2026-08-20T01:00:00.000Z" };
const recordedAt = "2026-08-20T01:00:00.000Z";

function fetchFor(healthOk: boolean, metricsBody: string) {
  return async (url: string | URL | Request): Promise<Response> => {
    if (String(url).endsWith("/healthz")) return new Response(null, { status: healthOk ? 200 : 503 });
    return new Response(metricsBody, { status: 200 });
  };
}

test("reports the dashboard as available and sums connector metrics when both endpoints answer", async () => {
  const metrics = "cloudflared_tunnel_ha_connections{edge=\"a\"} 2\ncloudflared_tunnel_ha_connections{edge=\"b\"} 1\ncloudflared_tunnel_request_errors 0\n";
  const pulse = await collectDashboardRuntimeActivity({ window: testWindow, recordedAt, fetchImpl: fetchFor(true, metrics) });
  assert.equal(pulse.type, "ColonyActivityPulseEnvelope");
  assert.equal(pulse.events[0].outcome, "available");
  const byLabel = new Map(pulse.events[0].quantities.map((q) => [q.label, q.amount]));
  assert.equal(byLabel.get("Dashboard runtime available"), "1");
  assert.equal(byLabel.get("Connector HA connections"), "3");
  assert.equal(pulse.refusals.length, 0);
});

test("records a refusal and reports unavailable when the health endpoint fails", async () => {
  const pulse = await collectDashboardRuntimeActivity({ window: testWindow, recordedAt, fetchImpl: fetchFor(false, "") });
  assert.equal(pulse.events[0].outcome, "unavailable");
  assert.ok(pulse.refusals.some((r) => r.domain === "operations"));
});

test("records a refusal when a fetch throws", async () => {
  const fetchImpl = async (): Promise<Response> => { throw new Error("network down"); };
  const pulse = await collectDashboardRuntimeActivity({ window: testWindow, recordedAt, fetchImpl });
  assert.ok(pulse.refusals.some((r) => r.reason.includes("network down")));
});
