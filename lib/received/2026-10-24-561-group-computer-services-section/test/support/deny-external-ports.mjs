// Test-only boundary instrumentation. Provider algorithms remain their real installed bytes.
// This is a reviewed offline assay, not a security sandbox.
import assert from "node:assert/strict";
import { after } from "node:test";
import child from "node:child_process";
import http from "node:http";
import https from "node:https";
import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import dgram from "node:dgram";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
const attempted = [];
const deny = (object, name, label) => {
  if (typeof object[name] !== "function") return;
  object[name] = () => { attempted.push(label); throw new Error(`Job receiving denies ${label}`); };
};
for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) deny(child, name, `child.${name}`);
for (const [label, module] of Object.entries({ http, https, http2, net, tls, dgram, dns })) {
  for (const name of Object.keys(module)) if (/^(request|get|connect|createConnection|createSocket|resolve|lookup)/u.test(name)) deny(module, name, `${label}.${name}`);
}
deny(net.Socket.prototype, "connect", "net.Socket.connect");
deny(net.Server.prototype, "listen", "net.Server.listen");
for (const name of Object.keys(dns.promises)) if (/^(resolve|lookup|reverse)/u.test(name)) deny(dns.promises, name, `dns.promises.${name}`);
for (const name of ["bind", "connect", "send"]) deny(dgram.Socket.prototype, name, `dgram.Socket.${name}`);
for (const name of ["fetch", "WebSocket", "setInterval"]) deny(globalThis, name, name);
syncBuiltinESMExports();
after(() => assert.deepEqual(attempted, [], "no denied operational port was attempted"));
