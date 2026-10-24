// Collects a short activity pulse describing whether this dashboard's own
// runtime and its Cloudflare connector are up, for a colony-activity
// aggregator to fold into a wider report.

export const DASHBOARD_RUNTIME_PROVIDER = "urn:ame:bare-cedar-fog-dashboard:runtime-health-pulse-provider";
const COLONY_ACTOR = "urn:ame:bare-cedar-fog-colony";

function sumMetric(text, name) {
  const values = text
    .split("\n")
    .filter((line) => line.startsWith(name) && !line.startsWith("#"))
    .map((line) => Number(line.trim().split(/\s+/u).at(-1)))
    .filter(Number.isFinite);
  return values.length ? String(values.reduce((sum, value) => sum + value, 0)) : "0";
}

async function checkHealth(fetchImpl, healthUrl, refusals) {
  try {
    const response = await fetchImpl(healthUrl);
    if (!response.ok) refusals.push({ domain: "operations", reason: `dashboard health endpoint returned HTTP ${response.status}` });
    return response.ok ? "1" : "0";
  } catch (error) {
    refusals.push({ domain: "operations", reason: `dashboard health endpoint unavailable: ${error instanceof Error ? error.message : String(error)}` });
    return "0";
  }
}

async function checkConnector(fetchImpl, connectorMetricsUrl, refusals) {
  try {
    const response = await fetchImpl(connectorMetricsUrl);
    if (!response.ok) {
      refusals.push({ domain: "operations", reason: `connector metrics endpoint returned HTTP ${response.status}` });
      return { connections: "0", requestErrors: "0" };
    }
    const body = await response.text();
    return { connections: sumMetric(body, "cloudflared_tunnel_ha_connections"), requestErrors: sumMetric(body, "cloudflared_tunnel_request_errors") };
  } catch (error) {
    refusals.push({ domain: "operations", reason: `connector metrics observation unavailable: ${error instanceof Error ? error.message : String(error)}` });
    return { connections: "0", requestErrors: "0" };
  }
}

export async function collectDashboardRuntimeActivity({
  window,
  recordedAt,
  fetchImpl = fetch,
  healthUrl = "http://127.0.0.1:19748/healthz",
  connectorMetricsUrl = "http://127.0.0.1:20241/metrics",
} = {}) {
  const refusals = [];
  const dashboardAvailable = await checkHealth(fetchImpl, healthUrl, refusals);
  const { connections, requestErrors } = await checkConnector(fetchImpl, connectorMetricsUrl, refusals);
  return {
    type: "ColonyActivityPulseEnvelope",
    providerActor: DASHBOARD_RUNTIME_PROVIDER,
    settlementActor: "urn:ame:bare-cedar-fog-dashboard",
    colonyActor: COLONY_ACTOR,
    window,
    recordedAt,
    events: [{
      id: `${DASHBOARD_RUNTIME_PROVIDER}:event:${recordedAt}`,
      kind: "dashboard-runtime-pulse",
      domain: "operations",
      outcome: dashboardAvailable === "1" ? "available" : "unavailable",
      summary: `Dashboard runtime ${dashboardAvailable === "1" ? "responded" : "did not respond"} at ${healthUrl}.`,
      occurredAt: recordedAt,
      quantities: [
        { label: "Dashboard runtime available", amount: dashboardAvailable, unit: "boolean" },
        { label: "Connector HA connections", amount: connections, unit: "connections" },
        { label: "Connector request errors", amount: requestErrors, unit: "errors" },
      ],
    }],
    refusals,
  };
}
