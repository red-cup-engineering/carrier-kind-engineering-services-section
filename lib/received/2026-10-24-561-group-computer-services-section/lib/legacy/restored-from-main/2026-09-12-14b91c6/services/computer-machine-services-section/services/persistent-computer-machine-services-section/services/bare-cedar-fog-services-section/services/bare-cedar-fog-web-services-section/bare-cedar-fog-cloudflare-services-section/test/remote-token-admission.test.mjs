import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { admitTunnelToken, tokenPathForTestRoot, validateTunnelToken } from "../src/admit-remotely-managed-tunnel-token.mjs";

const root = resolve(import.meta.dirname, "..");
const admission = join(root, "src", "admit-remotely-managed-tunnel-token.mjs");
const verifier = join(root, "lib", "hooks", "verify-laptop-cloudflare-ingress.mjs");
const binding = join(root, "content", "configs", "remotely-managed-route.json");
const unit = join(root, "data", "records", "systemd", "bare-cedar-fog-cloudflared.service");

function token(secret = "connector-secret-material-0001") {
  return Buffer.from(JSON.stringify({ a: "a".repeat(32), t: "123e4567-e89b-12d3-a456-426614174000", s: secret })).toString("base64url");
}
function runAdmission(arguments_, input) {
  return new Promise((resolveRun) => {
    const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, [admission, ...arguments_], { stdio: ["pipe", "pipe", "pipe"], env: environment });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status, signal) => resolveRun({ status, signal, stdout, stderr }));
    child.stdin.end(`${input}\n`);
  });
}
function admit(testRoot, input, ...extra) {
  return runAdmission(["--stdin", "--safe-stdin", `--test-root=${testRoot}`, ...extra], input);
}

test("admits a structurally valid token atomically without leaking it", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bare-cedar-cloudflare-token-"));
  try {
    const supplied = token();
    const path = tokenPathForTestRoot(testRoot);
    admitTunnelToken(supplied, path);
    const directory = join(testRoot, ".config", "cloudflared");
    assert.equal(statSync(directory).mode & 0o777, 0o700);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(readFileSync(path, "utf8"), `${supplied}\n`);
    assert.deepEqual(readdirSync(directory), ["bare-cedar-fog-561-group.token"]);
  } finally { rmSync(testRoot, { recursive: true, force: true }); }
});

test("atomically replaces the fixed token file without retaining displaced secret bytes", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bare-cedar-cloudflare-rotate-"));
  try {
    const path = tokenPathForTestRoot(testRoot);
    admitTunnelToken(token("connector-secret-material-0001"), path);
    const replacement = token("connector-secret-material-0002");
    admitTunnelToken(replacement, path);
    const directory = join(testRoot, ".config", "cloudflared");
    assert.equal(readFileSync(join(directory, "bare-cedar-fog-561-group.token"), "utf8"), `${replacement}\n`);
    assert.deepEqual(readdirSync(directory), ["bare-cedar-fog-561-group.token"]);
  } finally { rmSync(testRoot, { recursive: true, force: true }); }
});

test("refuses missing, malformed, or unacknowledged stdin", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bare-cedar-cloudflare-refuse-"));
  try {
    assert.notEqual((await admit(testRoot, "")).status, 0);
    assert.notEqual((await admit(testRoot, "not-a-cloudflare-token")).status, 0);
    assert.throws(() => validateTunnelToken("not-a-cloudflare-token"), /token/);
    const unsafe = await runAdmission(["--stdin", `--test-root=${testRoot}`], token());
    assert.notEqual(unsafe.status, 0);
    assert.equal(unsafe.stdout.includes(token()), false);
    assert.equal(unsafe.stderr.includes(token()), false);
  } finally { rmSync(testRoot, { recursive: true, force: true }); }
});

test("verifier accepts exact remote binding and laptop-only token-file unit", () => {
  const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [verifier, `--binding=${binding}`, `--unit=${unit}`], { encoding: "utf8", env: environment });
  assert.equal(result.status, 0, result.stderr);
});

test("verifier rejects a noncanonical numeric origin, wrong hostname, VPS execution, and missing token", () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bare-cedar-cloudflare-verify-"));
  try {
    const badBinding = join(testRoot, "binding.json");
    const changed = JSON.parse(readFileSync(binding, "utf8")); changed.hostname = "other.561.group";
    writeFileSync(badBinding, JSON.stringify(changed));
    const numericBinding = join(testRoot, "numeric-binding.json");
    const numeric = JSON.parse(readFileSync(binding, "utf8")); numeric.service = "http://127.0.0.1:19748";
    writeFileSync(numericBinding, JSON.stringify(numeric));
    const badUnit = join(testRoot, "relay.service");
    writeFileSync(badUnit, `${readFileSync(unit, "utf8")}\n# cold-red-gate\n`);
    const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
    const wrongHost = spawnSync(process.execPath, [verifier, `--binding=${badBinding}`, `--unit=${unit}`], { encoding: "utf8", env: environment });
    const numericOrigin = spawnSync(process.execPath, [verifier, `--binding=${numericBinding}`, `--unit=${unit}`], { encoding: "utf8", env: environment });
    const vps = spawnSync(process.execPath, [verifier, `--binding=${binding}`, `--unit=${badUnit}`], { encoding: "utf8", env: environment });
    const missing = spawnSync(process.execPath, [verifier, `--binding=${binding}`, `--unit=${unit}`, `--token=${join(testRoot, "missing.token")}`], { encoding: "utf8", env: environment });
    assert.notEqual(wrongHost.status, 0);
    assert.notEqual(numericOrigin.status, 0);
    assert.notEqual(vps.status, 0);
    assert.notEqual(missing.status, 0);
  } finally { rmSync(testRoot, { recursive: true, force: true }); }
});
