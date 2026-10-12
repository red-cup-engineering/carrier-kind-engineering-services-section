import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { ephemeralAgentCardSigning } from "../src/testing.mjs";

test("ephemeralAgentCardSigning forms a public Ed25519 signing configuration", () => {
  const signing = ephemeralAgentCardSigning("https://agent.example", "assay");

  assert.equal(signing.agentCardJwks.keys.length, 1);
  assert.deepEqual(
    {
      alg: signing.agentCardJwks.keys[0].alg,
      kid: signing.agentCardJwks.keys[0].kid,
      use: signing.agentCardJwks.keys[0].use,
    },
    { alg: "EdDSA", kid: "assay-ed25519", use: "sig" },
  );
  assert.equal(Object.hasOwn(signing.agentCardJwks.keys[0], "d"), false);
  assert.equal(signing.dependencyCallbackKey.byteLength, 32);
  assert.equal(typeof signing.agentCardSignatureGenerator, "function");
});

test("provision-agent-card-key writes a private key and public JWKS without replacing either", async (context) => {
  const temporaryRoot = process.platform === "win32" ? tmpdir() : "/tmp";
  const directory = await mkdtemp(join(temporaryRoot, "a2a-agent-card-key-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const signingKey = join(directory, "private", "signing.pem");
  const jwks = join(directory, "public", "jwks.json");
  const arguments_ = [
    "src/provision-agent-card-key.mjs",
    "--signing-key", signingKey,
    "--jwks", jwks,
    "--kid", "assay-ed25519",
  ];

  const first = spawnSync(process.execPath, arguments_, { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout, "assay-ed25519\n");
  assert.match(await readFile(signingKey, "utf8"), /^-----BEGIN PRIVATE KEY-----/);
  const document = JSON.parse(await readFile(jwks, "utf8"));
  assert.equal(document.keys[0].kid, "assay-ed25519");
  assert.equal(document.keys[0].alg, "EdDSA");
  assert.equal(document.keys[0].use, "sig");
  assert.equal(Object.hasOwn(document.keys[0], "d"), false);
  if (process.platform !== "win32") assert.equal((await stat(signingKey)).mode & 0o777, 0o600);

  const second = spawnSync(process.execPath, arguments_, { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /refusing to replace existing/);
});
