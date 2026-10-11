import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { installedMetroplatInstance } from "@red-cup-engineering/metroplat/instance";
import { installedEnterpriseWeb } from "../src/installed-web.mjs";

test("FeltOS host selects a MetroPlat instance; MetroPlat refuses host configuration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feltos-host-declaration-"));
  try {
    const instancePath = join(directory, "metroplat-instance.json");
    const hostPath = join(directory, "feltos-enterprise-host.json");
    const instance = {
      version: 1,
      instanceOf: "@red-cup-engineering/metroplat",
      identity: { id: "example.test", title: "Example" },
      operationSources: [],
    };
    await writeFile(instancePath, JSON.stringify(instance));
    await writeFile(hostPath, JSON.stringify({
      version: 1, hostKind: "feltos.enterprise-host",
      instance: "./metroplat-instance.json",
      web: { networkSources: [], companions: [] },
    }));
    const host = await installedEnterpriseWeb(hostPath);
    assert.equal(host.instancePath, instancePath);
    const installed = await installedMetroplatInstance(host.instancePath, null);
    assert.equal(installed.identity.id, "example.test");
    await writeFile(instancePath, JSON.stringify({ ...instance, web: { networkSources: [] } }));
    await assert.rejects(
      installedMetroplatInstance(instancePath, null),
      /unsupported fields: web/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a host declares its own presence and its peers' presences", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feltos-host-presence-"));
  try {
    const hostPath = join(directory, "host.json");
    const declare = (web) => writeFile(hostPath, JSON.stringify({ version: 1, hostKind: "feltos.enterprise-host", instance: "./instance.json", web: { networkSources: [], companions: [], ...web } }));
    await declare({ presence: "known-intermittent", peerPresences: { "https://soft-grass-pebble.example/actors/metroplat": "known-intermittent" } });
    const host = await installedEnterpriseWeb(hostPath);
    assert.equal(host.presence, "known-intermittent");
    await declare({ presence: "sometimes" });
    await assert.rejects(installedEnterpriseWeb(hostPath), /web presence must be one of/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
