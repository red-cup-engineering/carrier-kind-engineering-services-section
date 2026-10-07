import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createEnterpriseServicePlatform } from "../src/serve-instance.mjs";
import { linkLiveModules, liveLinkTargets } from "../src/probe-link.mjs";

async function probeReading(directory, probeLinks) {
  const platform = createEnterpriseServicePlatform({
    installed: {
      identity: { id: "test-metroplat", title: "Test MetroPlat" },
      applications: [], schedules: [],
      web: { companions: [], networkSources: [], hostPath: join(directory, "host.json") },
    },
    config: {
      instance: { name: "test-metroplat", title: "Test MetroPlat" },
      stateDir: directory, metroplatDataRoot: directory, agencyRoot: directory, host: "127.0.0.1", port: 0, upstreams: [],
    },
    environment: { METROPLAT_PROBE: "1", METROPLAT_PROBE_LISTEN: "127.0.0.1:0" },
    services: {
      openMetroplatMcp: async () => ({ handle: async () => undefined, close: async () => undefined, operationSurface: async () => ({ operations: [] }) }),
      federateMcpServers: async () => Object.freeze({ clients: new Map(), tools: Object.freeze([]), unavailable: Object.freeze([]), close: async () => undefined }),
      createEnterpriseEntrance: () => ({ app: { resources: [] } }),
      startNativeApplication: async (app) => ({ port: 0, health: () => app.resources.find((resource) => resource.match === "/healthz").handler(), close: async () => undefined }),
      probeLinks,
    },
  });
  const capabilities = await platform.start();
  for (let waited = 0; platform.state() !== "ready" && waited < 200; waited += 1) await new Promise((resolve) => setTimeout(resolve, 10));
  const response = await capabilities["http-listener"].health();
  const body = await response.json();
  await platform.close();
  return { status: response.status, body };
}

test("a probe whose carrier module fails to link reports unready; a healthy one reports ready", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "probe-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const broken = join(directory, "broken-carrier.mjs");
  const healthy = join(directory, "healthy-carrier.mjs");
  await writeFile(join(directory, "workspace.mjs"), "export const present = 1;\n");
  await writeFile(broken, 'import { carrierWorkspaces } from "./workspace.mjs";\nexport default carrierWorkspaces;\n');
  await writeFile(healthy, 'import { present } from "./workspace.mjs";\nexport default present;\n');
  const linking = (...files) => async () => linkLiveModules({ targets: files.map((file) => ({ specifier: file, url: pathToFileURL(file).href })) });

  const refused = await probeReading(directory, linking(healthy, broken));
  assert.equal(refused.status, 503);
  assert.equal(refused.body.ok, false);
  assert.equal(refused.body.state, "unready");
  assert.deepEqual(refused.body.families.failed.map((family) => family.verb), [`link:${broken}`]);
  assert.match(refused.body.families.failed[0].error, /carrierWorkspaces/u);

  const accepted = await probeReading(directory, linking(healthy));
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.state, "ready");
  assert.deepEqual(accepted.body.families.failed, []);
  assert.equal(accepted.body.families.linked, 1);
});

test("the live link targets cover every carrier dialect, its workspace layer and the lazy imports", () => {
  const specifiers = liveLinkTargets().map((target) => target.specifier);
  for (const suffix of ["carrier/workspace", "carrier/inference-receiving-carrier", "codex/agency-work", "claude-code/agency-work", "antigravity/agency-work"]) {
    assert.ok(specifiers.some((specifier) => specifier.endsWith(`/${suffix}`)), suffix);
  }
  assert.ok(specifiers.includes("@red-cup-engineering/computer-inference-engine/openai/tool-agent"));
});
