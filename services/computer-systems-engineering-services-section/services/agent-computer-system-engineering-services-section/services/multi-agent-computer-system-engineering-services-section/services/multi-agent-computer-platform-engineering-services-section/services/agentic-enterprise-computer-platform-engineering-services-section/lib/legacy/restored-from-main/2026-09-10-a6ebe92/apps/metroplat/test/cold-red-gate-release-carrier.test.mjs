import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { compileNodeSpec, nodeSpecFromJson } from "../src/deployment/node-spec.mts";

const packageUrl = new URL("../package.json", import.meta.url);
const lockUrl = new URL("../package-lock.json", import.meta.url);
const nodeSpecUrls = ["bare-cedar-fog", "cold-red-gate"].map((name) => new URL(`../content/deployment/node-spec/${name}.json`, import.meta.url));

test("MetroPlat node release artifacts are pinned and derive from one host declaration per node", async () => {
  const manifest = JSON.parse(await readFile(packageUrl, "utf8"));
  const lock = JSON.parse(await readFile(lockUrl, "utf8"));

  for (const [name, version] of Object.entries(manifest.dependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `${name} must have an exact runtime pin`);
    assert.equal(lock.packages[""].dependencies[name], version, `${name} must match the lock root`);
    assert.equal(lock.packages[`node_modules/${name}`].version, version, `${name} must resolve to its exact runtime pin`);
  }

  const artifacts = await Promise.all(nodeSpecUrls.map(async (nodeSpecUrl) => compileNodeSpec(nodeSpecFromJson(JSON.parse(await readFile(nodeSpecUrl, "utf8"))))));
  assert.equal(artifacts[0].service, artifacts[1].service, "the service carrier has no host-specific source variant");
  for (const { service: unit, environment, node } of artifacts) {
    assert.match(unit, /^WorkingDirectory=%h\/\.local\/share\/561-group\/releases\/metroplat\/current$/m);
    assert.match(unit, /^ExecStart=\/usr\/bin\/env node %h\/\.local\/share\/561-group\/releases\/metroplat\/current\/dist\/src\/scripts\/infograph-serve\.mjs$/m);
    assert.match(unit, /^Environment=HOST=127\.0\.0\.1$/m);
    assert.match(unit, /^Environment=PORT=18811$/m);
    assert.match(unit, /^Environment=METROPLAT_DATA_ROOT=%h\/\.local\/state\/561-group\/metroplat$/m);
    assert.match(unit, /^EnvironmentFile=%h\/\.config\/561-group\/metroplat\.env$/m);
    assert.match(unit, /^Type=notify$/m);
    assert.match(unit, /^NotifyAccess=all$/m, "systemd-notify runs as the listener's child process");
    assert.match(unit, /^TimeoutStartSec=3min$/m, "the measured two-minute assembly must have a bounded startup allowance");
    assert.doesNotMatch(unit, /WWOM5azg|METROPLAT_HTTP_SUBJECT=|METROPLAT_HTTP_CAPABILITIES=/i);
    assert.match(environment, new RegExp(`^METROPLAT_NODE_ID=${node.id}$`, "m"));
    assert.match(environment, new RegExp(`^METROPLAT_NODE_ORIGIN=${node.origin}$`, "m"));
  }
});

test("published package metadata addresses compiled carriers", async () => {
  const manifest = JSON.parse(await readFile(packageUrl, "utf8"));
  const publicTargets = [manifest.main, manifest.types];
  const binTargets = Object.values(manifest.bin);
  const visitExports = (value) => {
    if (typeof value === "string") publicTargets.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(visitExports);
  };
  visitExports(manifest.exports);

  assert.deepEqual(manifest.publishConfig, { access: "public" });
  assert.equal(publicTargets.length > 2, true);
  for (const target of publicTargets) {
    assert.match(target, /^\.\/dist\//u);
    assert.match(target, /(?:\.mjs|\.d\.mts)$/u);
  }
  for (const target of binTargets) assert.match(target, /^dist\/.*\.mjs$/u);
  await assert.rejects(access(new URL("../dist/lib", import.meta.url)));
});
