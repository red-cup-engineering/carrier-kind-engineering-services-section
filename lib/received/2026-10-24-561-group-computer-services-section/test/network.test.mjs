import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import child from "node:child_process";
import http from "node:http";
import https from "node:https";
import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import dgram from "node:dgram";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
import { scratchDirectory } from "./support/scratch.mjs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("Group's packed public work-network surface receives offline workspace reads", async (t) => {
  const root = scratchDirectory("group-computer-network-");
  const remove = fs.rmSync.bind(fs);
  const fixture = (name) => fs.readFileSync(fileURLToPath(new URL(`./fixtures/${name}-manifest.json`, import.meta.url)), "utf8");
  const expected = new Map([
    ["package.json", fixture("root")],
    ["packages/alpha/package.json", fixture("alpha")],
    ["packages/beta/package.json", fixture("beta")],
  ]);
  for (const [path, body] of expected) {
    fs.mkdirSync(join(root, path, ".."), { recursive: true });
    fs.writeFileSync(join(root, path), body);
  }
  const effects = [];
  const replacements = [];
  const deny = (object, name, label) => {
    const original = object[name];
    if (typeof original !== "function") return;
    replacements.push(() => { object[name] = original; });
    object[name] = () => { effects.push(label); throw new Error(`Offline receiving denies ${label}`); };
  };
  // These reviewed suites construct no provider customer, job or external listener.
  // Instrumentation makes attempted operational effects fail; it is not sandboxing.
  for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) deny(child, name, `child.${name}`);
  for (const [label, module] of Object.entries({ http, https, http2, net, tls, dgram, dns })) {
    for (const name of Object.keys(module)) if (/^(request|get|connect|createConnection|createSocket|resolve|lookup)/u.test(name)) deny(module, name, `${label}.${name}`);
  }
  deny(net.Socket.prototype, "connect", "net.Socket.connect");
  deny(net.Server.prototype, "listen", "net.Server.listen");
  for (const name of Object.keys(dns.promises)) if (/^(resolve|lookup|reverse)/u.test(name)) deny(dns.promises, name, `dns.promises.${name}`);
  for (const name of ["bind", "connect", "send"]) deny(dgram.Socket.prototype, name, `dgram.Socket.${name}`);
  for (const [label, module] of [["fs", fs], ["fs.promises", fs.promises]]) {
    for (const name of Object.keys(module)) if (/^(write|append|truncate|unlink|rm|rename|copy|cp|mkdir|mkdtemp|symlink|link|chmod|chown|utimes)/u.test(name)) deny(module, name, `${label}.${name}`);
  }
  for (const name of ["fetch", "WebSocket", "setInterval"]) deny(globalThis, name, name);
  syncBuiltinESMExports();
  let client;
  try {
    let groupNetworkSources;
    await t.test("public import is inert with operational ports denied", async () => {
      ({ groupNetworkSources } = await import("@561-group/561-group-computer-services-section/network"));
      assert.equal(typeof groupNetworkSources, "function");
      assert.deepEqual(effects, []);
    });
    const config = { repositoryRoot: root, instance: { name: "isolated-read-only-receiving" } };
    await t.test("empty selection constructs no sources", () => {
      assert.deepEqual(groupNetworkSources({ config, environment: {}, configuration: { enabled: [] } }), []);
    });
    await t.test("unknown work-tool selection refuses", () => {
      assert.throws(() => groupNetworkSources({ config, environment: {}, configuration: { enabled: ["unknown"] } }), /known work tools/u);
    });
    await t.test("the real in-process provider exposes workspace discovery", async () => {
      const sources = groupNetworkSources({ config, environment: {}, configuration: { enabled: ["workspace"] } });
      assert.equal(sources.length, 1);
      assert.equal(sources[0].prefix, "workspace");
      client = sources[0].client;
      const { tools } = await client.listTools();
      assert.ok(tools.some(({ name }) => name === "jsnode_query"));
      assert.ok(tools.some(({ name }) => name === "jsnode_package"));
    });
    await t.test("workspace query returns actual authored package records", async () => {
      const query = await client.call("jsnode_query", { scope: "@fixture", return: ["name", "version", "path", "dependencies"] });
      assert.equal(query.count, 2);
      assert.deepEqual(query.packages.map(({ name }) => name), ["@fixture/read-alpha", "@fixture/read-beta"]);
    });
    await t.test("package details preserve the declared reverse dependency", async () => {
      const record = await client.call("jsnode_package", { name: "@fixture/read-beta" });
      assert.equal(record.name, "@fixture/read-beta");
      assert.equal(record.version, "2.0.0");
      assert.deepEqual(record.dependents, ["@fixture/read-alpha"]);
    });
    await client.close();
    client = undefined;
    assert.deepEqual(effects, []);
    for (const [path, body] of expected) assert.equal(fs.readFileSync(join(root, path), "utf8"), body);
  } finally {
    try { await client?.close(); }
    finally {
      for (const restore of replacements.reverse()) restore();
      syncBuiltinESMExports();
      remove(root, { recursive: true, force: true });
    }
  }
});
