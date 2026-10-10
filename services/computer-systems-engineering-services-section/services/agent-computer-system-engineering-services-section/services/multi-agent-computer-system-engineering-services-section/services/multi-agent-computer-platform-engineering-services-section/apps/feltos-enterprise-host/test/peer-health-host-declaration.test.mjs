import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { installedEnterpriseWeb } from "../src/installed-web.mjs";
import { enterpriseWebConfig } from "../src/instance-config.mjs";

// The health declaration prepared for Bare Cedar Fog, through the real host-file loader.
// No factory, provider, network request, grant admission, or replacement loader is used here.
const contract = {
  actor: "https://cold-red-gate.561.group/actors/metroplat",
  kind: "metroplat-supervised-health",
  service: "cold-red-gate.561.group",
};

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "peer-health-host-declaration-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "pnpm-workspace.yaml"), "packages: []\n");
  const hostPath = join(directory, "host.json");
  const declare = async (web) => {
    await writeFile(hostPath, JSON.stringify({
      version: 1, hostKind: "feltos.enterprise-host", instance: "./instance.json",
      web: { networkSources: [], companions: [], ...web },
    }));
    return installedEnterpriseWeb(hostPath);
  };
  // These are input data for the genuine config function, not an instance-loader substitute.
  const configure = (web) => enterpriseWebConfig({
    identity: { id: "bare-cedar-fog.561.group", title: "Fixture host" },
    capabilities: [], web,
  }, web.instancePath, {
    PUBLIC_BASE_URL: "https://bare-cedar-fog.561.group",
    SESSION_SECRET: "fixture-only-not-a-secret",
    METROPLAT_WEB_STATE_DIR: join(directory, "state"),
    METROPLAT_DATA_ROOT: join(directory, "data"),
    ACTIVITYPUB_ORIGIN: "https://bare-cedar-fog.561.group",
    ACTIVITYPUB_NODE_HOST: "bare-cedar-fog",
    ACTIVITYPUB_INSTANCE_ACTOR_IDENTIFIER: "metroplat",
  });
  return { declare, configure, hostPath, directory };
}

test("the real host loader admits the prepared peer-health declaration and config receives it", async (t) => {
  const { declare, configure, directory } = await fixture(t);
  const web = await declare({
    workPeerActor: contract.actor,
    workPeerHealth: [contract],
    workPeerPresence: "known-intermittent",
    workPeerSuspicionSeconds: 7200,
    deliverWorkToPeer: false,
  });
  assert.equal(web.instancePath, join(directory, "instance.json"));
  assert.deepEqual(web.workPeerHealth, [contract]);
  const config = configure(web);
  assert.deepEqual(config.workPeerHealth, [contract]);
  assert.deepEqual(config.workPeers.map(({ actor }) => actor), [contract.actor]);
  assert.equal(config.workPeerPresence, "known-intermittent");
  assert.equal(config.workPeerSuspicionSeconds, 7200);
  assert.equal(config.deliverWorkToPeer, false);
});

test("a health declaration alone creates no work peer, and omission or an empty list stays optional", async (t) => {
  const { declare, configure } = await fixture(t);
  const web = await declare({ workPeerHealth: [contract] });
  assert.deepEqual(configure(web).workPeers, []);
  assert.equal(web.workPeerActor, undefined);
  assert.equal(web.workPeers, undefined);
  assert.equal((await declare({})).workPeerHealth, undefined);
  assert.deepEqual((await declare({ workPeerHealth: [] })).workPeerHealth, []);
});

test("the real host loader refuses malformed health contracts before resolving network exports", async (t) => {
  const { declare } = await fixture(t);
  const invalid = [
    null, {}, "health", [null], [[]], ["health"], [{}],
    [{ ...contract, kind: "activitypub" }],
    [{ ...contract, service: "" }],
    [{ ...contract, service: "   " }],
    [{ ...contract, service: 1 }],
    [{ ...contract, actor: undefined }],
    [{ ...contract, actor: 1 }],
    [{ ...contract, actor: "invalid" }],
    [{ ...contract, actor: "http://cold-red-gate.561.group/actors/metroplat" }],
    [{ ...contract, actor: "https://name:fixture@example.invalid/actors/metroplat" }],
    [{ ...contract, actor: contract.actor + "?query=1" }],
    [{ ...contract, actor: contract.actor + "#fragment" }],
    [{ ...contract, actor: "https://cold-red-gate.561.group/healthz" }],
    [{ ...contract, actor: "https://COLD-RED-GATE.561.group/actors/metroplat" }],
    [{ ...contract, url: "https://elsewhere.invalid/healthz" }],
    [contract, { ...contract, service: "another-service" }],
  ];
  for (const workPeerHealth of invalid) {
    await assert.rejects(declare({
      workPeerHealth,
      networkSources: [{ module: "@uninstalled-health-fixture/never-import", export: "never" }],
    }), /Enterprise host web workPeerHealth/, JSON.stringify(workPeerHealth));
  }
});

test("admitting workPeerHealth does not admit unrelated host or web fields", async (t) => {
  const { declare, hostPath } = await fixture(t);
  await assert.rejects(declare({ workPeerHealth: [contract], unexpected: true }), /unsupported fields: unexpected/);
  await writeFile(hostPath, JSON.stringify({
    version: 1, hostKind: "feltos.enterprise-host", instance: "./instance.json",
    web: { workPeerHealth: [contract] }, unexpected: true,
  }));
  await assert.rejects(installedEnterpriseWeb(hostPath), /unsupported fields: unexpected/);
});


test("held-pull presence and health contracts survive the same real host declaration", async (t) => {
  const { declare, configure } = await fixture(t);
  const web = await declare({
    workPeerActor: contract.actor,
    workPeerHealth: [contract],
    presence: "known-intermittent",
    peerPresences: { [contract.actor]: "continuous" },
    workPeerPresence: "known-intermittent",
  });
  const config = configure(web);
  assert.equal(config.presence, "known-intermittent");
  assert.deepEqual(config.peerPresences, { [contract.actor]: "continuous" });
  assert.deepEqual(config.workPeerHealth, [contract]);
  assert.deepEqual(config.workPeers.map(({ actor }) => actor), [contract.actor]);
  const alone = configure(await declare({ workPeerHealth: [contract], peerPresences: { [contract.actor]: "known-intermittent" } }));
  assert.deepEqual(alone.workPeers, [], "neither health nor presence grants work standing");
});
